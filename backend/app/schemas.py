from datetime import date, datetime
from typing import Literal

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, EmailStr, Field

StorageType = Literal["google_drive", "dropbox", "divine_aperture"]
EventStatus = Literal["draft", "published", "archived"]


class HealthResponse(BaseModel):
    status: str
    environment: str


class WaitlistCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    studio_name: str | None = Field(default=None, max_length=160)
    city: str | None = Field(default=None, max_length=100)
    country: str | None = Field(default="India", max_length=100)
    photography_type: str = Field(default="Wedding", max_length=80)
    monthly_volume: str | None = Field(default=None, max_length=80)
    website_url: AnyHttpUrl | None = None
    message: str | None = Field(default=None, max_length=1000)
    marketing_consent: bool = False


class WaitlistResponse(BaseModel):
    id: str
    status: str
    created_at: datetime


class EventCreate(BaseModel):
    """Event fields the creator supplies.

    studio_id, gallery_slug, status and plan are server-owned and must never
    appear here.
    """

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=160)
    location: str | None = Field(default=None, max_length=160)
    subtitle: str | None = Field(default=None, max_length=240)
    event_date: date | None = None
    # A Drive file link, a bare Drive file id, or a plain image URL. Normalised
    # to a renderable URL on write, so the column stays directly usable.
    hero_image: str | None = Field(default=None, max_length=512)
    storage_type: StorageType = "google_drive"
    storage_url: AnyHttpUrl | None = None
    downloads_enabled: bool = True


class EventDownloadsUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    enabled: bool


class EventStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: EventStatus


class EventResponse(BaseModel):
    id: str
    title: str
    subtitle: str | None
    event_date: date | None
    location: str | None
    gallery_slug: str
    status: str
    plan: str
    hero_image_url: str | None = None
    storage_type: str = "google_drive"
    storage_url: str | None = None
    drive_folder_id: str | None = None
    created_at: datetime | None = None
    downloads_enabled: bool = True


class PhotoResponse(BaseModel):
    id: str
    filename: str
    mime_type: str
    width: int | None = None
    height: int | None = None
    sort_order: int = 0
    drive_file_id: str | None = None
    display_url: str | None = None
    thumbnail_url: str | None = None
    download_url: str | None = None


class ImportResponse(BaseModel):
    imported: int
    updated: int
    total: int


class GalleryResponse(BaseModel):
    event: EventResponse
    photos: list[PhotoResponse]
