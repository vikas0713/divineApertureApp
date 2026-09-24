import pytest

from app.storage_links import extract_drive_folder_id

FOLDER_ID = "1A2b3C4d5E6f7G8h9I0jKlMnOpQrStUv"


@pytest.mark.parametrize(
    "url",
    [
        f"https://drive.google.com/drive/folders/{FOLDER_ID}",
        f"https://drive.google.com/drive/folders/{FOLDER_ID}?usp=sharing",
        f"https://drive.google.com/drive/u/0/folders/{FOLDER_ID}",
        f"https://drive.google.com/open?id={FOLDER_ID}",
        f"https://drive.google.com/open?usp=sharing&id={FOLDER_ID}",
    ],
)
def test_extracts_folder_id(url: str) -> None:
    assert extract_drive_folder_id(url) == FOLDER_ID


@pytest.mark.parametrize(
    "url",
    [
        None,
        "",
        "https://drive.google.com/",
        "https://example.com/some/folder",
        "not a url at all",
    ],
)
def test_returns_none_when_unparseable(url: str | None) -> None:
    assert extract_drive_folder_id(url) is None


def test_ignores_short_ids() -> None:
    assert extract_drive_folder_id("https://drive.google.com/drive/folders/abc") is None


from app.storage_links import extract_drive_file_id

FILE_ID = "1zYxWvUtSrQpOnMlKjIhGfEdCbA98765"


@pytest.mark.parametrize(
    "value",
    [
        f"https://drive.google.com/file/d/{FILE_ID}/view?usp=sharing",
        f"https://drive.google.com/file/d/{FILE_ID}/view",
        f"https://drive.google.com/open?id={FILE_ID}",
        f"https://drive.google.com/uc?id={FILE_ID}",
        FILE_ID,
        f"  {FILE_ID}  ",
    ],
)
def test_extracts_file_id(value: str) -> None:
    assert extract_drive_file_id(value) == FILE_ID


@pytest.mark.parametrize(
    "value",
    [
        None,
        "",
        "https://example.com/photo.jpg",
        "https://images.unsplash.com/photo-1519741497674",
        "short",
    ],
)
def test_file_id_returns_none_when_not_a_drive_file(value: str | None) -> None:
    assert extract_drive_file_id(value) is None
