"""Run with: python backend/tests/verify_supabase_live.py

Verifies live connectivity to Supabase, checks all seeded tables,
and tests staff availability updates and reversion against live Supabase data.
"""

from pathlib import Path
import sys

from dotenv import dotenv_values
from supabase import create_client

env_path = Path("backend/.env")
config = dotenv_values(env_path)
url = (config.get("SUPABASE_URL") or "").rstrip("/")
key = config.get("SUPABASE_SERVICE_ROLE_KEY") or ""

if not url or not key:
    print("FAIL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be in backend/.env")
    sys.exit(1)

print(f"Connecting to Supabase at: {url}")
client = create_client(url, key)

# 1. Check locations
locations = client.table("locations").select("*").execute().data or []
print(f"✓ Locations found: {len(locations)}")
for loc in locations:
    print(f"   - {loc['name']} ({loc['slug']}): is_open={loc['is_open']}")
assert len(locations) == 3, f"Expected 3 locations, found {len(locations)}"

# 2. Check menu items
items = client.table("menu_items").select("*").execute().data or []
print(f"✓ Menu items found: {len(items)}")
assert len(items) >= 12, f"Expected at least 12 menu items, found {len(items)}"

# 3. Check modifier groups and options
groups = client.table("modifier_groups").select("*").execute().data or []
options = client.table("modifier_options").select("*").execute().data or []
print(f"✓ Modifier groups: {len(groups)}, options: {len(options)}")
assert len(groups) > 0 and len(options) > 0

# 4. Check demo profiles
profiles = client.table("profiles").select("*").execute().data or []
print(f"✓ Demo profiles: {len(profiles)}")
for p in profiles:
    print(f"   - {p['display_name']} ({p['role']}): HuskyBucks=${p['huskybucks_balance']}")
assert len(profiles) >= 2, f"Expected 2 profiles, found {len(profiles)}"

# 5. Live update test (toggle Blueberry Muffin availability and revert)
test_item = next((i for i in items if i.get("name") == "Blueberry Muffin"), items[0])
item_id = test_item["id"]
orig_status = test_item["is_available"]

# Toggle to opposite
client.table("menu_items").update({"is_available": not orig_status}).eq("id", item_id).execute()
toggled = client.table("menu_items").select("is_available").eq("id", item_id).execute().data[0]["is_available"]
assert toggled != orig_status, "Failed to toggle availability in Supabase"
print(f"✓ Live PATCH test: successfully toggled {test_item['name']} to is_available={toggled}")

# Revert back
client.table("menu_items").update({"is_available": orig_status}).eq("id", item_id).execute()
reverted = client.table("menu_items").select("is_available").eq("id", item_id).execute().data[0]["is_available"]
assert reverted == orig_status, "Failed to revert availability in Supabase"
print(f"✓ Live PATCH test: successfully reverted {test_item['name']} to is_available={reverted}")

print("\n🎉 ALL SUPABASE CONNECTION AND PERSISTENCE CHECKS PASSED!")
