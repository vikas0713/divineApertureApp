"""Image proxy.

Google rate-limits hotlinked Drive images hard — a gallery loading thirty
thumbnails trips 429 and gets an HTML body instead of pixels. Fetching
server-side and caching collapses that to one request per (photo, width) per
cache window, and keeps the bytes behind a session rather than on a public URL.
"""

from collections import OrderedDict

from fastapi import APIRouter, HTTPException, Response, status
from fastapi.responses import StreamingResponse

from ..config import get_settings
from ..drive import (
    FULL_SIZE,
    DriveAccessError,
    DriveError,
    DriveRateLimited,
    fetch_image,
    stream_image,
)
from ..image_tokens import verify
from ..supabase_client import get_admin_client

router = APIRouter(prefix="/images", tags=["images"])

# Bounded in-process cache, budgeted in BYTES rather than entries.
#
# Entries range from ~20 KB (a HEIF thumbnail) to ~8.4 MB (a full-resolution
# RAW), so any fixed entry count is either wasteful or fatal depending on what
# lands in it. The deploy target is a 512 MB container, so this must be a hard
# ceiling, not an average.
#
# A shared cache or a CDN in front is the next step; R2 removes the need.
CACHE_MAX_BYTES = 64 * 1024 * 1024

# Bodies above this are served but never retained: one full-resolution download
# would otherwise evict most of the thumbnails a gallery is actively using.
CACHE_MAX_ENTRY_BYTES = 2 * 1024 * 1024

_cache: OrderedDict[str, tuple[bytes, str]] = OrderedDict()
_cache_bytes = 0


def _cache_get(key: str) -> tuple[bytes, str] | None:
    if key not in _cache:
        return None
    _cache.move_to_end(key)
    return _cache[key]


def _cache_put(key: str, value: tuple[bytes, str]) -> None:
    global _cache_bytes
    body = value[0]
    if len(body) > CACHE_MAX_ENTRY_BYTES:
        return

    existing = _cache.pop(key, None)
    if existing is not None:
        _cache_bytes -= len(existing[0])

    _cache[key] = value
    _cache_bytes += len(body)

    while _cache_bytes > CACHE_MAX_BYTES and _cache:
        _, evicted = _cache.popitem(last=False)
        _cache_bytes -= len(evicted[0])


def cache_stats() -> tuple[int, int]:
    """(entries, bytes) — exposed for tests and for debugging memory."""
    return len(_cache), _cache_bytes


# Filenames for cache hits, so a download served from cache keeps its name.
_filenames: dict[str, str] = {}


def _filename(kind: str, value: str) -> str | None:
    return _filenames.get(value) if kind == "photo" else None


def _download_name(filename: str | None) -> str:
    """Downloads are rendered JPEGs, so the extension must match the bytes.

    A client saving a file called .ARW that is actually a JPEG cannot open it.
    """
    if not filename:
        return "photo.jpg"
    stem = filename.rsplit(".", 1)[0] if "." in filename else filename
    return f"{stem}.jpg"


def _headers(download: bool, filename: str | None) -> dict[str, str]:
    headers = {"Cache-Control": "private, max-age=86400"}
    if download:
        headers["Content-Disposition"] = f'attachment; filename="{_download_name(filename)}"'
    return headers


def _respond(body: bytes, content_type: str, download: bool, filename: str | None) -> Response:
    return Response(content=body, media_type=content_type, headers=_headers(download, filename))


def _signing_secret() -> str:
    secret = get_settings().supabase_secret_key
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Image signing is not configured",
        )
    return secret


@router.get("/{token}")
async def read_image(token: str) -> Response:
    claims = verify(token, _signing_secret())
    if not claims:
        # Covers forged, tampered and expired alike — reloading the gallery
        # issues a fresh token.
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This image link has expired")
    kind, value, width, download = claims

    cached = _cache_get(f"{kind}:{value}:{width}")
    if cached:
        body, content_type = cached
        return _respond(body, content_type, download, _filename(kind, value) if download else None)

    filename: str | None = None
    if kind == "drive":
        drive_file_id = value
    else:
        try:
            found = get_admin_client().table("photos").select("drive_file_id, filename").eq("id", value).execute()
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to load photo") from exc
        if not found.data or not found.data[0].get("drive_file_id"):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")
        drive_file_id = found.data[0]["drive_file_id"]
        filename = found.data[0].get("filename")
        _filenames[value] = filename or value

    # Full-size requests are downloads: several MB each, never cached, and
    # streamed so the body is not held whole in a 512 MB container.
    if width <= FULL_SIZE:
        try:
            chunks, content_type = stream_image(drive_file_id, width)
        except DriveRateLimited as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
        except DriveAccessError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
        except DriveError as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
        return StreamingResponse(
            chunks,
            media_type=content_type,
            headers=_headers(download, filename if download else None),
        )

    try:
        body, content_type = fetch_image(drive_file_id, width)
    except DriveRateLimited as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except DriveAccessError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except DriveError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    _cache_put(f"{kind}:{value}:{width}", (body, content_type))
    return _respond(body, content_type, download, filename if download else None)
