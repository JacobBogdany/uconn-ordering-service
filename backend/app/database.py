from functools import lru_cache

from supabase import Client, create_client

from app.config import get_settings


@lru_cache
def get_supabase_client() -> Client | None:
    """Build a server-side Supabase client when credentials are configured.

    Local UI/API work does not require a Supabase project. The service-role
    credential is only read by this backend module and must never reach Vite.
    """
    settings = get_settings()
    if not settings.supabase_configured:
        return None
    return create_client(settings.supabase_url or "", settings.supabase_service_role_key or "")
