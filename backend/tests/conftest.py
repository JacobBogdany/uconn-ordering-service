import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

os.environ.setdefault("DEMO_MODE", "true")
os.environ.setdefault("DEMO_SESSION_SECRET", "test-secret-" + "x" * 40)
os.environ["SUPABASE_URL"] = ""
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = ""


@pytest.fixture(autouse=True)
def _fresh_settings():
    from app.config import get_settings
    from app.database import get_supabase_client

    get_settings.cache_clear()
    get_supabase_client.cache_clear()
    yield
    get_settings.cache_clear()
    get_supabase_client.cache_clear()
