"""Google Drive listing for publicly shared folders.

Uses the Drive v3 REST API with an API key. A folder shared as "anyone with the
link" is readable this way, so no OAuth consent flow is needed yet. When the
creator's own Drive has to be read, this module is where OAuth would land.
"""

from collections.abc import Iterator
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

import base64
import binascii
import json
import pathlib
import time

import httpx
import google.auth.transport
from google.oauth2 import service_account

from .config import get_settings

FILES_ENDPOINT = "https://www.googleapis.com/drive/v3/files"
SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]
FIELDS = "nextPageToken,files(id,name,mimeType,size,modifiedTime,imageMediaMetadata(width,height))"
PAGE_SIZE = 1000
TIMEOUT = httpx.Timeout(30.0)


class DriveError(Exception):
    """Drive could not be read. The message is safe to show a creator."""


class DriveAccessError(DriveError):
    """The folder is missing, or not shared publicly."""


@dataclass
class _HttpxResponse:
    """google-auth reads .status/.headers/.data; its ABC declares them as
    abstract properties, so plain attributes are simpler than subclassing."""

    status: int
    headers: dict
    data: bytes


class _HttpxTransport(google.auth.transport.Request):
    """google-auth's default transport needs `requests`; we already use httpx.

    Implementing the tiny transport interface avoids carrying a second HTTP
    library just to refresh a token.
    """

    def __call__(self, url, method="GET", body=None, headers=None, timeout=None, **kwargs):
        with httpx.Client(timeout=timeout or 30.0) as client:
            response = client.request(method, url, content=body, headers=headers)
        return _HttpxResponse(response.status_code, dict(response.headers), response.content)


@lru_cache
def _credentials() -> service_account.Credentials | None:
    """Service-account credentials, when a key file is configured.

    Preferred over the API key: it reads folders shared with the service
    account (not only world-readable ones), and authenticated Drive API calls
    are billed to the project's quota rather than the anonymous hotlink
    throttle that returns 429.
    """
    settings = get_settings()

    if settings.google_service_account_b64:
        try:
            info = json.loads(base64.b64decode(settings.google_service_account_b64))
        except (ValueError, binascii.Error) as exc:
            raise DriveError("GOOGLE_SERVICE_ACCOUNT_B64 is not valid base64-encoded JSON") from exc
        return service_account.Credentials.from_service_account_info(info, scopes=SCOPES)

    if settings.google_service_account_json:
        try:
            info = json.loads(settings.google_service_account_json)
        except ValueError as exc:
            raise DriveError("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON") from exc
        return service_account.Credentials.from_service_account_info(info, scopes=SCOPES)

    if settings.google_service_account_file:
        # Local convenience. In a deployment the key file is gitignored and so
        # is never uploaded — carrying this variable over from .env.example is
        # the likely mistake, so say that rather than raise FileNotFoundError.
        path = pathlib.Path(settings.google_service_account_file)
        if not path.is_file():
            raise DriveError(
                f"GOOGLE_SERVICE_ACCOUNT_FILE points at {settings.google_service_account_file}, "
                "which does not exist. In a deployment set GOOGLE_SERVICE_ACCOUNT_B64 instead."
            )
        return service_account.Credentials.from_service_account_file(str(path), scopes=SCOPES)

    return None


def _auth_header() -> dict[str, str]:
    credentials = _credentials()
    if not credentials:
        return {}
    if not credentials.valid:
        credentials.refresh(_HttpxTransport())
    return {"Authorization": f"Bearer {credentials.token}"}


def has_credentials() -> bool:
    """Whether any Google credential is configured.

    Single source of truth so callers cannot check a subset — the guard in the
    import route once tested only FILE and API_KEY, which refused a
    B64-configured deployment before it ever tried.
    """
    settings = get_settings()
    return any((
        settings.google_service_account_b64,
        settings.google_service_account_json,
        settings.google_service_account_file,
        settings.google_api_key,
    ))


def service_account_email() -> str | None:
    credentials = _credentials()
    return credentials.service_account_email if credentials else None


FULL_SIZE = 0


def source_url(file_id: str, width: int) -> str:
    """Where the bytes actually live.

    drive.google.com/thumbnail 302-redirects here, so going straight to it
    saves a hop. Never hand this to a browser: Google rate-limits hotlinked
    Drive images hard (429 with an HTML body after a handful of requests), and
    it is public to anyone holding the file id. Fetch it server-side instead —
    see fetch_image.
    """
    # `s0` asks for native resolution; anything else is a max width. A 4024x6024
    # RAW comes back as a 4024x6024 JPEG, which is what a client downloading
    # "the photo" expects.
    size = "s0" if width <= FULL_SIZE else f"w{width}"
    return f"https://lh3.googleusercontent.com/d/{file_id}={size}"


class DriveRateLimited(DriveError):
    """Google is throttling us. Worth retrying, and worth caching harder."""


def fetch_image(file_id: str, width: int, attempts: int = 3) -> tuple[bytes, str]:
    """Fetch a *rendered preview* of a Drive file. Returns (bytes, content_type).

    Deliberately NOT the original bytes. A real shoot folder is mostly RAW and
    HEIF — 337 of 546 files in the first real folder — which no browser can
    display, and the originals ran to 6.1 GB. Google's preview endpoint
    transcodes every format to a resized JPEG, so this is both renderable and
    two orders of magnitude smaller.

    Unauthenticated: this is googleusercontent, not the Drive API, and a bearer
    token is not accepted there. Google throttles it, so retry with backoff and
    lean on the proxy's cache.
    """
    delay = 0.5
    last_error: Exception = DriveError("Could not reach Google Drive")
    for attempt in range(attempts):
        try:
            with httpx.Client(timeout=TIMEOUT, follow_redirects=True) as client:
                response = client.get(source_url(file_id, width))
        except httpx.HTTPError as exc:
            last_error = DriveError("Could not reach Google Drive")
            last_error.__cause__ = exc
        else:
            throttled = response.status_code == 429 or (
                response.status_code == 200
                and not response.headers.get("content-type", "").startswith("image/")
            )
            if not throttled:
                return _image_or_raise(response)
            last_error = DriveRateLimited("Google Drive is rate limiting image requests")

        if attempt < attempts - 1:
            time.sleep(delay)
            delay *= 2
    raise last_error


def stream_image(file_id: str, width: int) -> tuple[Iterator[bytes], str]:
    """Stream a preview instead of buffering it.

    Used for bodies too large to cache (a full-resolution download is ~8.4 MB).
    Buffering those would hold each one whole in a 512 MB container while it is
    written to the client.

    The client is closed by the generator when iteration finishes, so the
    caller must consume it.
    """
    client = httpx.Client(timeout=TIMEOUT, follow_redirects=True)
    # The context manager must stay referenced: letting it fall out of scope
    # closes the stream before a single byte is read.
    stream = client.stream("GET", source_url(file_id, width))
    try:
        response = stream.__enter__()
    except httpx.HTTPError as exc:
        client.close()
        raise DriveError("Could not reach Google Drive") from exc

    try:
        if response.status_code == 429:
            raise DriveRateLimited("Google Drive is rate limiting image requests")
        if response.status_code in (403, 404):
            raise DriveAccessError("Google Drive refused this image. Check the folder is shared publicly.")
        if response.status_code >= 400:
            raise DriveError("Google Drive returned an unexpected error")
        content_type = response.headers.get("content-type", "")
        if not content_type.startswith("image/"):
            raise DriveRateLimited("Google Drive returned a page instead of an image")
    except Exception:
        stream.__exit__(None, None, None)
        client.close()
        raise

    def chunks() -> Iterator[bytes]:
        try:
            yield from response.iter_bytes()
        finally:
            stream.__exit__(None, None, None)
            client.close()

    return chunks(), content_type


def _image_or_raise(response: httpx.Response) -> tuple[bytes, str]:
    if response.status_code == 429:
        raise DriveRateLimited("Google Drive is rate limiting image requests")
    if response.status_code in (403, 404):
        raise DriveAccessError("Google Drive refused this image. Check the folder is shared publicly.")
    if response.status_code >= 400:
        raise DriveError("Google Drive returned an unexpected error")

    content_type = response.headers.get("content-type", "")
    if not content_type.startswith("image/"):
        # A throttle or an interstitial comes back as text/html with a 200.
        raise DriveRateLimited("Google Drive returned a page instead of an image")
    return response.content, content_type


def list_folder_images(folder_id: str, api_key: str) -> list[dict[str, Any]]:
    """Every non-trashed image directly inside the folder, in Drive's order."""
    query = f"'{folder_id}' in parents and mimeType contains 'image/' and trashed = false"
    params: dict[str, Any] = {
        "q": query,
        "fields": FIELDS,
        "pageSize": PAGE_SIZE,
        "orderBy": "name_natural",
        "supportsAllDrives": "true",
        "includeItemsFromAllDrives": "true",
    }

    headers = _auth_header()
    if not headers:
        if not api_key:
            raise DriveError("No Google credentials configured")
        params["key"] = api_key

    files: list[dict[str, Any]] = []
    with httpx.Client(timeout=TIMEOUT) as client:
        while True:
            try:
                response = client.get(FILES_ENDPOINT, params=params, headers=headers)
            except httpx.HTTPError as exc:
                raise DriveError("Could not reach Google Drive") from exc

            if response.status_code in (403, 404):
                raise DriveAccessError(
                    "Google Drive refused this folder. Check the folder is shared "
                    "as 'Anyone with the link' and that the API key may use the Drive API."
                )
            if response.status_code >= 400:
                raise DriveError("Google Drive returned an unexpected error")

            payload = response.json()
            files.extend(payload.get("files", []))

            token = payload.get("nextPageToken")
            if not token:
                return files
            params["pageToken"] = token
