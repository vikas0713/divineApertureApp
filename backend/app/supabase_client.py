from functools import lru_cache

from supabase import Client, create_client

from .config import get_settings


@lru_cache
def get_user_client() -> Client:
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_publishable_key)


@lru_cache
def get_admin_client() -> Client:
    settings = get_settings()
    if not settings.supabase_secret_key:
        raise RuntimeError("SUPABASE_SECRET_KEY is required for server-side operations")
    return create_client(settings.supabase_url, settings.supabase_secret_key)
