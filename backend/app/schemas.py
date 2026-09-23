from datetime import datetime

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, EmailStr, Field


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


class DriveImportRequest(BaseModel):
    folder_id: str = Field(min_length=10, max_length=200)
    event_id: str | None = None


class DriveImportResponse(BaseModel):
    status: str
    message: str
    folder_id: str
