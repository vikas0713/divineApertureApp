"""Short-lived signed URLs for proxied images.

A browser <img> cannot send an Authorization header, so the image endpoint
cannot be guarded by the usual bearer dependency. Instead the already
authenticated gallery/admin responses hand out URLs carrying a signed,
expiring token. The token *is* the authorisation: it is only ever issued to a
caller who has already passed the gallery gate, and it stops working on expiry.

This is the same shape as the signed-URL approach ARCHITECTURE.md describes for
R2, so moving to R2 later does not change the frontend contract.
"""

import base64
import hashlib
import hmac
import json
import time

DEFAULT_TTL_SECONDS = 6 * 60 * 60


def _b64encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _b64decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def _signature(payload: bytes, secret: str) -> str:
    return _b64encode(hmac.new(secret.encode(), payload, hashlib.sha256).digest())


def _sign_claims(claims: dict, secret: str, ttl: int) -> str:
    payload = json.dumps(
        {**claims, "e": int(time.time()) + ttl},
        separators=(",", ":"),
        sort_keys=True,
    ).encode()
    return f"{_b64encode(payload)}.{_signature(payload, secret)}"


def sign(
    photo_id: str,
    width: int,
    secret: str,
    ttl: int = DEFAULT_TTL_SECONDS,
    download: bool = False,
) -> str:
    """Token for a row in `photos`; the proxy looks up its drive_file_id.

    `download` makes the proxy send Content-Disposition: attachment, so the
    same signing scheme covers viewing and downloading.
    """
    claims: dict = {"p": photo_id, "w": width}
    if download:
        claims["dl"] = 1
    return _sign_claims(claims, secret, ttl)


def sign_drive_file(file_id: str, width: int, secret: str, ttl: int = DEFAULT_TTL_SECONDS) -> str:
    """Token for a bare Drive file id — the hero image, which has no photo row."""
    return _sign_claims({"d": file_id, "w": width}, secret, ttl)


def verify(token: str, secret: str) -> tuple[str, str, int, bool] | None:
    """Return (kind, value, width, download) where kind is "photo" or "drive".

    None when the token is forged, tampered with, malformed or expired.
    """
    try:
        encoded, signature = token.split(".", 1)
        payload = _b64decode(encoded)
    except (ValueError, TypeError):
        return None
    if not hmac.compare_digest(signature, _signature(payload, secret)):
        return None
    try:
        claims = json.loads(payload)
        if int(claims["e"]) < int(time.time()):
            return None
        width = int(claims["w"])
        download = bool(claims.get("dl"))
        if "p" in claims:
            return "photo", str(claims["p"]), width, download
        if "d" in claims:
            return "drive", str(claims["d"]), width, download
        return None
    except (ValueError, KeyError, TypeError):
        return None
