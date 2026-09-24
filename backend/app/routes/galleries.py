"""Client-facing gallery access.

Any authenticated user may open a published gallery. This endpoint exists to
break a chicken-and-egg in the RLS: the "published event by gallery access"
policy requires a gallery_visitors row before a client can select the event,
but the client needs the event id to create one. The server resolves the slug
with the secret-key client and self-registers the visitor, so it must do its
own authorization rather than leaning on RLS.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from ..dependencies import AuthenticatedUser, get_current_user
from ..schemas import GalleryResponse
from ..supabase_client import get_admin_client
from .admin import EVENT_COLUMNS, PHOTO_COLUMNS, _event_response, _photo_response

router = APIRouter(prefix="/galleries", tags=["galleries"])


@router.get("/{slug}", response_model=GalleryResponse)
async def read_gallery(
    slug: str,
    user: AuthenticatedUser = Depends(get_current_user),
) -> GalleryResponse:
    client = get_admin_client()
    try:
        found = (
            client.table("events")
            .select(EVENT_COLUMNS)
            .eq("gallery_slug", slug)
            .eq("status", "published")
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to load gallery") from exc
    if not found.data:
        # Same response for "no such slug" and "not published yet", so an
        # unpublished gallery is not discoverable by probing.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gallery not found")

    event = found.data[0]
    now = datetime.now(timezone.utc).isoformat()
    try:
        client.table("gallery_visitors").upsert(
            {"event_id": event["id"], "user_id": user.id, "last_seen_at": now},
            on_conflict="event_id,user_id",
        ).execute()
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to record gallery access") from exc

    try:
        photos = (
            client.table("photos")
            .select(PHOTO_COLUMNS)
            .eq("event_id", event["id"])
            .order("sort_order")
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to load photos") from exc

    return GalleryResponse(
        event=_event_response(event),
        photos=[
            _photo_response(row, allow_download=bool(event.get("original_downloads_enabled")))
            for row in photos.data or []
        ],
    )
