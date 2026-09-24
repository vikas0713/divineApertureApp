"""Parsing helpers for shared storage folder links.

Google Drive today; Dropbox and managed storage follow behind the same
abstraction. The Drive importer will reuse ``extract_drive_folder_id``.
"""

import re

_DRIVE_PATTERNS = (
    # https://drive.google.com/drive/folders/<id>
    # https://drive.google.com/drive/u/0/folders/<id>
    re.compile(r"/folders/([A-Za-z0-9_-]{10,})"),
    # https://drive.google.com/open?id=<id>
    re.compile(r"[?&]id=([A-Za-z0-9_-]{10,})"),
)


def extract_drive_folder_id(url: str | None) -> str | None:
    """Return the folder ID in a shared Drive URL, or None if there isn't one."""
    if not url:
        return None
    for pattern in _DRIVE_PATTERNS:
        match = pattern.search(url)
        if match:
            return match.group(1)
    return None


# A Drive file link, or a bare file id pasted straight out of Drive.
_FILE_PATTERNS = (
    # https://drive.google.com/file/d/<id>/view?usp=sharing
    re.compile(r"/file/d/([A-Za-z0-9_-]{10,})"),
    # https://drive.google.com/open?id=<id>  |  .../uc?id=<id>
    re.compile(r"[?&]id=([A-Za-z0-9_-]{10,})"),
)

_BARE_ID = re.compile(r"^[A-Za-z0-9_-]{20,}$")


def extract_drive_file_id(value: str | None) -> str | None:
    """Return the file id in a Drive file link, or the value if it is already one.

    Distinct from ``extract_drive_folder_id``: ``/folders/<id>`` is a folder and
    ``/file/d/<id>`` is a file. They overlap only on the legacy ``open?id=``
    form, which Google genuinely uses for both.
    """
    if not value:
        return None
    candidate = value.strip()
    for pattern in _FILE_PATTERNS:
        match = pattern.search(candidate)
        if match:
            return match.group(1)
    return candidate if _BARE_ID.match(candidate) else None
