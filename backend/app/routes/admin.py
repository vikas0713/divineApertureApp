import re
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status

from ..config import get_settings
from ..dependencies import AuthenticatedUser, require_superadmin
from ..drive import FULL_SIZE, DriveAccessError, DriveError, has_credentials, list_folder_images
from ..image_tokens import sign, sign_drive_file
from ..schemas import (
    EventCreate,
    EventResponse,
    EventDownloadsUpdate,
    EventStatusUpdate,
    ImportResponse,
    PhotoResponse,
)
from ..storage_links import extract_drive_file_id, extract_drive_folder_id
from ..supabase_client import get_admin_client

router = APIRouter(prefix="/admin", tags=["admin"])

# Dropbox and managed storage are modelled but not wired yet. Relax this when
# their importers land.
SUPPORTED_STORAGE_TYPES = {"google_drive"}

DRIVE_MARKER = "drive:"
HERO_WIDTH = 1600
DISPLAY_WIDTH = 1600
THUMBNAIL_WIDTH = 600
# Downloads serve native resolution, not a capped width.
DOWNLOAD_WIDTH = FULL_SIZE

PHOTO_COLUMNS = "id, filename, mime_type, width, height, sort_order, drive_file_id"

EVENT_COLUMNS = (
    "id, title, subtitle, event_date, location, gallery_slug, status, plan, "
    "hero_image_url, storage_type, storage_url, drive_folder_id, created_at, "
    "original_downloads_enabled"
)


def _gallery_slug(title: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-") or "event"
    return f"{base}-{uuid4().hex[:8]}"


def _studio_id() -> str:
    studio_id = get_settings().superadmin_studio_id
    if not studio_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SUPERADMIN_STUDIO_ID is not configured",
        )
    return studio_id


def _image_url(photo_id: str, width: int, download: bool = False) -> str | None:
    """A signed, expiring URL pointing at our own proxy, not at Drive."""
    secret = get_settings().supabase_secret_key
    if not secret:
        return None
    return f"/images/{sign(photo_id, width, secret, download=download)}"


def _hero_image_url(value: str | None) -> str | None:
    """Accept a Drive file link, a bare Drive file id, or a plain image URL."""
    if not value or not value.strip():
        return None
    candidate = value.strip()
    file_id = extract_drive_file_id(candidate)
    if file_id:
        # Stored as a marker rather than a Drive URL: Drive rate-limits
        # hotlinked images, so the read path issues a fresh signed proxy URL.
        return f"{DRIVE_MARKER}{file_id}"
    if candidate.startswith(("http://", "https://")):
        return candidate
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail="Hero image must be a Google Drive file link, a Drive file ID, or an image URL",
    )


def _event_response(row: dict[str, Any]) -> EventResponse:
    """Resolve the stored hero marker into a signed proxy URL on the way out."""
    row = {**row, "downloads_enabled": row.get("original_downloads_enabled", True)}
    hero = row.get("hero_image_url")
    if hero and hero.startswith(DRIVE_MARKER):
        secret = get_settings().supabase_secret_key
        file_id = hero[len(DRIVE_MARKER):]
        row = {**row, "hero_image_url": f"/images/{sign_drive_file(file_id, HERO_WIDTH, secret)}" if secret else None}
    return EventResponse.model_validate(row)


def _photo_response(row: dict[str, Any], allow_download: bool = True) -> PhotoResponse:
    file_id = row.get("drive_file_id")
    return PhotoResponse(
        id=row["id"],
        filename=row["filename"],
        mime_type=row["mime_type"],
        width=row.get("width"),
        height=row.get("height"),
        sort_order=row.get("sort_order", 0),
        drive_file_id=file_id,
        display_url=_image_url(row["id"], DISPLAY_WIDTH) if file_id else None,
        thumbnail_url=_image_url(row["id"], THUMBNAIL_WIDTH) if file_id else None,
        download_url=(
            _image_url(row["id"], DOWNLOAD_WIDTH, download=True)
            if file_id and allow_download
            else None
        ),
    )


def _storage_fields(payload: EventCreate) -> dict[str, Any]:
    """Validate the storage source and derive the Drive folder ID from it."""
    if payload.storage_type not in SUPPORTED_STORAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Only Google Drive is supported as an event source today",
        )

    storage_url = str(payload.storage_url) if payload.storage_url else None
    folder_id = extract_drive_folder_id(storage_url)
    if storage_url and not folder_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="That does not look like a shared Google Drive folder link",
        )

    return {
        "storage_type": payload.storage_type,
        "storage_url": storage_url,
        "drive_folder_id": folder_id,
    }


@router.post("/events", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    payload: EventCreate,
    _user: AuthenticatedUser = Depends(require_superadmin),
) -> EventResponse:
    # Validate the client's input before checking server configuration, so a
    # bad link reports 422 rather than being masked by a 503.
    storage = _storage_fields(payload)
    record = {
        "studio_id": _studio_id(),
        "title": payload.title,
        "subtitle": payload.subtitle,
        "event_date": payload.event_date.isoformat() if payload.event_date else None,
        "location": payload.location,
        "hero_image_url": _hero_image_url(payload.hero_image),
        "gallery_slug": _gallery_slug(payload.title),
        "status": "draft",
        "plan": "free",
        "original_downloads_enabled": payload.downloads_enabled,
        **storage,
    }
    try:
        result = get_admin_client().table("events").insert(record).execute()
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to create event") from exc
    if not result.data:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Event was not created")
    return _event_response(result.data[0])


@router.get("/events", response_model=list[EventResponse])
async def list_events(
    _user: AuthenticatedUser = Depends(require_superadmin),
) -> list[EventResponse]:
    try:
        result = (
            get_admin_client()
            .table("events")
            .select(EVENT_COLUMNS)
            .eq("studio_id", _studio_id())
            .order("created_at", desc=True)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to load events") from exc
    return [_event_response(row) for row in result.data or []]


@router.get("/events/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: str,
    _user: AuthenticatedUser = Depends(require_superadmin),
) -> EventResponse:
    try:
        result = (
            get_admin_client()
            .table("events")
            .select(EVENT_COLUMNS)
            .eq("id", event_id)
            .eq("studio_id", _studio_id())
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to load event") from exc
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return _event_response(result.data[0])


@router.patch("/events/{event_id}/status", response_model=EventResponse)
async def update_event_status(
    event_id: str,
    payload: EventStatusUpdate,
    _user: AuthenticatedUser = Depends(require_superadmin),
) -> EventResponse:
    try:
        result = (
            get_admin_client()
            .table("events")
            .update({"status": payload.status, "updated_at": "now()"})
            .eq("id", event_id)
            .eq("studio_id", _studio_id())
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to update event") from exc
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return _event_response(result.data[0])


@router.get("/events/{event_id}/photos", response_model=list[PhotoResponse])
async def list_event_photos(
    event_id: str,
    _user: AuthenticatedUser = Depends(require_superadmin),
) -> list[PhotoResponse]:
    try:
        result = (
            get_admin_client()
            .table("photos")
            .select(PHOTO_COLUMNS)
            .eq("event_id", event_id)
            .order("sort_order")
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to load photos") from exc
    return [_photo_response(row) for row in result.data or []]


@router.patch("/events/{event_id}/downloads", response_model=EventResponse)
async def update_event_downloads(
    event_id: str,
    payload: EventDownloadsUpdate,
    _user: AuthenticatedUser = Depends(require_superadmin),
) -> EventResponse:
    try:
        result = (
            get_admin_client()
            .table("events")
            .update({"original_downloads_enabled": payload.enabled, "updated_at": "now()"})
            .eq("id", event_id)
            .eq("studio_id", _studio_id())
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to update event") from exc
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return _event_response(result.data[0])


@router.post("/events/{event_id}/import", response_model=ImportResponse)
async def import_event_photos(
    event_id: str,
    _user: AuthenticatedUser = Depends(require_superadmin),
) -> ImportResponse:
    """Pull every image in the event's shared Drive folder into `photos`.

    Idempotent: the unique (event_id, drive_file_id) constraint means a repeat
    run updates rather than duplicating.
    """
    event = await get_event(event_id, _user)
    if not event.drive_folder_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="This event has no Google Drive folder link yet",
        )

    settings = get_settings()
    # Either credential works: the service account also reads folders shared
    # with it, an API key only reads world-readable ones.
    if not has_credentials():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "No Google credentials configured. Set GOOGLE_SERVICE_ACCOUNT_B64 "
                "(or _JSON, or _FILE), or GOOGLE_API_KEY."
            ),
        )

    try:
        files = list_folder_images(event.drive_folder_id, settings.google_api_key or "")
    except DriveAccessError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except DriveError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    client = get_admin_client()
    try:
        existing = (
            client.table("photos").select("drive_file_id").eq("event_id", event_id).execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to read existing photos") from exc
    known = {row["drive_file_id"] for row in existing.data or [] if row.get("drive_file_id")}

    rows = []
    for index, item in enumerate(files):
        metadata = item.get("imageMediaMetadata") or {}
        rows.append({
            "event_id": event_id,
            "drive_file_id": item["id"],
            "filename": item.get("name") or item["id"],
            "mime_type": item.get("mimeType") or "image/jpeg",
            "byte_size": int(item["size"]) if item.get("size") else None,
            "width": metadata.get("width"),
            "height": metadata.get("height"),
            "modified_at": item.get("modifiedTime"),
            "processing_status": "drive",
            "sort_order": index,
        })

    if rows:
        try:
            client.table("photos").upsert(rows, on_conflict="event_id,drive_file_id").execute()
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to save photos") from exc

    imported = sum(1 for row in rows if row["drive_file_id"] not in known)
    return ImportResponse(imported=imported, updated=len(rows) - imported, total=len(rows))
