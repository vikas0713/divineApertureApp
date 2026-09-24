from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routes import admin, galleries, health, images, waitlist

settings = get_settings()
app = FastAPI(title="Divine Aperture API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(health.router, prefix="/api")
app.include_router(waitlist.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(galleries.router, prefix="/api")
app.include_router(images.router, prefix="/api")
