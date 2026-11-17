from functools import lru_cache
import re

from supabase import Client, create_client

from app.config import get_settings


def normalize_supabase_url(raw_url: str | None) -> str:
    if not raw_url:
        return ""
    url = raw_url.strip().rstrip("/")
    # Strip any trailing /rest/v1 or /rest
    url = re.sub(r"/rest(/v\d+)?$", "", url, flags=re.IGNORECASE)
    return url.rstrip("/")


@lru_cache
def get_supabase_client() -> Client | None:
    """Build a server-side Supabase client when credentials are configured.

    Local UI/API work does not require a Supabase project. The service-role
    credential is only read by this backend module and must never reach Vite.
    """
    settings = get_settings()
    if not settings.supabase_configured:
        return None
    url = normalize_supabase_url(settings.supabase_url)
    return create_client(url, settings.supabase_service_role_key or "")
