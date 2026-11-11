from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "HuskyBite API"
    app_env: str = "development"
    demo_mode: bool = False
    demo_session_secret: str = ""
    demo_session_ttl_minutes: int = 60
    demo_student_user_id: str = "00000000-0000-4000-8000-000000000001"
    demo_operator_user_id: str = "00000000-0000-4000-8000-000000000002"
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    frontend_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(
        env_file=("backend/.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
