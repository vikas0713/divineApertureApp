import re
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status

from ..config import get_settings
from ..dependencies import AuthenticatedUser, require_superadmin
from ..schemas import DriveImportRequest, DriveImportResponse, EventCreate, EventResponse
from ..supabase_client import get_admin_client

router = APIRouter(prefix="/admin", tags=["admin"])


def _gallery_slug(title: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-") or "event"
    return f"{base}-{uuid4().hex[:8]}"


@router.post("/events", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    payload: EventCreate,
    _user: AuthenticatedUser = Depends(require_superadmin),
) -> EventResponse:
    settings = get_settings()
    if not settings.superadmin_studio_id:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="SUPERADMIN_STUDIO_ID is not configured")

    record = {
        "studio_id": settings.superadmin_studio_id,
        "title": payload.title,
        "subtitle": payload.subtitle,
        "event_date": payload.event_date.isoformat() if payload.event_date else None,
        "location": payload.location,
        "gallery_slug": _gallery_slug(payload.title),
        "status": "draft",
        "plan": "free",
    }
    try:
        result = get_admin_client().table("events").insert(record).execute()
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to create event") from exc
    if not result.data:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Event was not created")
    return EventResponse.model_validate(result.data[0])


@router.post("/drive/import", response_model=DriveImportResponse)
async def import_drive_folder(
    payload: DriveImportRequest,
    _user: AuthenticatedUser = Depends(require_superadmin),
) -> DriveImportResponse:
    """Queue a Drive import; the worker will be connected after provider setup."""
    return DriveImportResponse(
        status="queued",
        message="Drive import endpoint is authenticated and ready for the importer worker.",
        folder_id=payload.folder_id,
    )
