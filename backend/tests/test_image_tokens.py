import time

from app.image_tokens import sign, sign_drive_file, verify

SECRET = "test-secret"


def test_roundtrip() -> None:
    token = sign("photo-1", 600, SECRET)
    assert verify(token, SECRET) == ("photo", "photo-1", 600, False)


def test_rejects_a_different_secret() -> None:
    assert verify(sign("photo-1", 600, SECRET), "other-secret") is None


def test_rejects_an_expired_token() -> None:
    assert verify(sign("photo-1", 600, SECRET, ttl=-1), SECRET) is None


def test_rejects_tampering_with_the_payload() -> None:
    token = sign("photo-1", 600, SECRET)
    encoded, signature = token.split(".", 1)
    forged = sign("photo-2", 600, SECRET).split(".", 1)[0]
    assert verify(f"{forged}.{signature}", SECRET) is None


def test_rejects_malformed_tokens() -> None:
    for bad in ["", "nodot", "a.b.c.d", "!!!.???"]:
        assert verify(bad, SECRET) is None


def test_tokens_expire_in_the_future_by_default() -> None:
    token = sign("photo-1", 600, SECRET)
    time.sleep(0.01)
    assert verify(token, SECRET) is not None


def test_drive_file_tokens_roundtrip() -> None:
    token = sign_drive_file("drive-file-1", 1600, SECRET)
    assert verify(token, SECRET) == ("drive", "drive-file-1", 1600, False)


def test_photo_and_drive_tokens_are_distinguishable() -> None:
    photo = verify(sign("x", 600, SECRET), SECRET)
    drive = verify(sign_drive_file("x", 600, SECRET), SECRET)
    assert photo is not None and drive is not None
    assert photo[0] == "photo" and drive[0] == "drive"


def test_download_flag_roundtrips() -> None:
    assert verify(sign("p", 2048, SECRET, download=True), SECRET) == ("photo", "p", 2048, True)


def test_download_flag_cannot_be_added_without_resigning() -> None:
    """A viewer must not be able to turn a view token into a download token."""
    view = sign("p", 2048, SECRET)
    download = sign("p", 2048, SECRET, download=True)
    assert view.split(".", 1)[1] != download.split(".", 1)[1]
    forged = f"{download.split('.', 1)[0]}.{view.split('.', 1)[1]}"
    assert verify(forged, SECRET) is None
