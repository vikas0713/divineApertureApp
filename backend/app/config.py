from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    api_env: str = "development"
    supabase_url: str
    supabase_publishable_key: str
    supabase_secret_key: str | None = None
    superadmin_email: str | None = None
    superadmin_studio_id: str | None = None
    google_api_key: str | None = None
    # Three ways to supply the service account, checked in this order.
    # B64 is the portable one: a single line, no newline mangling, works on
    # every host that only offers plain env vars.
    google_service_account_b64: str | None = None
    google_service_account_json: str | None = None
    google_service_account_file: str | None = None
    frontend_origins: str = "http://localhost:5173"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]

    @property
    def cors_origin_regex(self) -> str | None:
        """In development, allow any localhost port.

        Vite falls back to 5174, 5175, ... whenever the previous port is taken,
        and 127.0.0.1 is a different origin to localhost. Pinning an explicit
        list turns that into a CORS failure every time the port shifts. Stays
        None outside development, where the explicit allowlist is the rule.
        """
        if self.api_env != "development":
            return None
        return r"http://(localhost|127\.0\.0\.1)(:\d+)?"


@lru_cache
def get_settings() -> Settings:
    return Settings()
