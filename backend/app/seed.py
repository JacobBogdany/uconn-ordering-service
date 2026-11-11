"""Idempotent database seeder for HuskyBite catalog and demo identities.

Owner: Jacob Bogdany (Catalog and Slice 1).

Populates:
  - Demo auth users and public profiles (Demo Student & Demo Operator).
  - 3 campus dining locations (The Beanery, Bookworms Cafe, Putnam Grab-and-Go).
  - 14 representative menu items across all 3 venues with dietary tags.
  - Relational modifier groups and modifier options adhering to check constraints.

Safe to re-run multiple times on empty or populated databases.
"""

from __future__ import annotations

import logging
from typing import Any

from app.config import get_settings
from app.database import get_supabase_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("huskybite.seed")

# Deterministic UUID constants
DEMO_STUDENT_ID = "00000000-0000-4000-8000-000000000001"
DEMO_OPERATOR_ID = "00000000-0000-4000-8000-000000000002"

LOC_BEANERY_ID = "10000000-0000-4000-8000-000000000001"
LOC_BOOKWORMS_ID = "10000000-0000-4000-8000-000000000002"
LOC_PUTNAM_ID = "10000000-0000-4000-8000-000000000003"

LOCATIONS_DATA = [
    {
        "id": LOC_BEANERY_ID,
        "slug": "beanery",
        "name": "The Beanery",
        "building": "Benton Center",
        "hours_text": "7:30 AM – 4:00 PM",
        "is_open": True,
    },
    {
        "id": LOC_BOOKWORMS_ID,
        "slug": "bookworms",
        "name": "Bookworms Cafe",
        "building": "Homer Babbidge Library",
        "hours_text": "8:00 AM – 8:00 PM",
        "is_open": True,
    },
    {
        "id": LOC_PUTNAM_ID,
        "slug": "putnam",
        "name": "Putnam Grab-and-Go",
        "building": "Putnam Dining Hall",
        "hours_text": "7:00 AM – 2:00 PM",
        "is_open": False,
    },
]

MENU_ITEMS_DATA = [
    # --- The Beanery (5 items) ---
    {
        "id": "20000000-0000-4000-8000-000000000101",
        "location_id": LOC_BEANERY_ID,
        "name": "Iced Vanilla Latte",
        "description": "Espresso with cold milk and sweet Madagascar vanilla syrup.",
        "category": "Beverages",
        "base_price": 4.75,
        "dietary_tags": ["vegetarian", "gluten-free"],
        "is_available": True,
    },
    {
        "id": "20000000-0000-4000-8000-000000000102",
        "location_id": LOC_BEANERY_ID,
        "name": "Cold Brew Coffee",
        "description": "Smooth, slow-steeped cold brew served over ice.",
        "category": "Beverages",
        "base_price": 3.75,
        "dietary_tags": ["vegan", "gluten-free", "dairy-free"],
        "is_available": True,
    },
    {
        "id": "20000000-0000-4000-8000-000000000103",
        "location_id": LOC_BEANERY_ID,
        "name": "Drip Coffee",
        "description": "Fresh-brewed house blend, served hot.",
        "category": "Beverages",
        "base_price": 2.50,
        "dietary_tags": ["vegan", "gluten-free", "dairy-free"],
        "is_available": True,
    },
    {
        "id": "20000000-0000-4000-8000-000000000104",
        "location_id": LOC_BEANERY_ID,
        "name": "Asiago Bagel Sandwich",
        "description": "Toasted asiago bagel with egg, cheddar, and your choice of protein.",
        "category": "Sandwiches",
        "base_price": 5.50,
        "dietary_tags": ["vegetarian"],
        "is_available": True,
    },
    {
        "id": "20000000-0000-4000-8000-000000000105",
        "location_id": LOC_BEANERY_ID,
        "name": "Blueberry Muffin",
        "description": "Freshly baked, bursting with wild blueberries.",
        "category": "Bakery",
        "base_price": 2.75,
        "dietary_tags": ["vegetarian"],
        "is_available": True,
    },
    # --- Bookworms Cafe (5 items) ---
    {
        "id": "20000000-0000-4000-8000-000000000201",
        "location_id": LOC_BOOKWORMS_ID,
        "name": "Turkey Avocado Wrap",
        "description": "Sliced turkey, creamy avocado, romaine lettuce and tomato in a whole-wheat wrap.",
        "category": "Sandwiches",
        "base_price": 7.25,
        "dietary_tags": ["dairy-free"],
        "is_available": True,
    },
    {
        "id": "20000000-0000-4000-8000-000000000202",
        "location_id": LOC_BOOKWORMS_ID,
        "name": "Hummus & Veggie Plate",
        "description": "House-made hummus with sliced cucumber, carrots, and pita chips.",
        "category": "Snacks",
        "base_price": 4.50,
        "dietary_tags": ["vegan", "dairy-free", "halal"],
        "is_available": True,
    },
    {
        "id": "20000000-0000-4000-8000-000000000203",
        "location_id": LOC_BOOKWORMS_ID,
        "name": "Matcha Latte",
        "description": "Ceremonial grade matcha whisked with steamed milk.",
        "category": "Beverages",
        "base_price": 5.00,
        "dietary_tags": ["vegetarian", "gluten-free"],
        "is_available": True,
    },
    {
        "id": "20000000-0000-4000-8000-000000000204",
        "location_id": LOC_BOOKWORMS_ID,
        "name": "Dark Chocolate Almond Kind Bar",
        "description": "Almond & dark chocolate flavored snack bar.",
        "category": "Snacks",
        "base_price": 2.25,
        "dietary_tags": ["vegan", "gluten-free"],
        "is_available": True,
    },
    {
        "id": "20000000-0000-4000-8000-000000000205",
        "location_id": LOC_BOOKWORMS_ID,
        "name": "Iced Spiced Chai Latte",
        "description": "Black tea infused with cardamom, cinnamon, clove, ginger, and honey.",
        "category": "Beverages",
        "base_price": 4.95,
        "dietary_tags": ["vegetarian", "gluten-free"],
        "is_available": True,
    },
    # --- Putnam Grab-and-Go (4 items) ---
    {
        "id": "20000000-0000-4000-8000-000000000301",
        "location_id": LOC_PUTNAM_ID,
        "name": "Overnight Oats with Chia",
        "description": "Creamy oats with chia seeds, banana, and honey.",
        "category": "Grab-and-Go",
        "base_price": 3.50,
        "dietary_tags": ["vegetarian", "gluten-free"],
        "is_available": True,
    },
    {
        "id": "20000000-0000-4000-8000-000000000302",
        "location_id": LOC_PUTNAM_ID,
        "name": "Greek Yogurt Berry Parfait",
        "description": "Layered greek yogurt with house granola and mixed berry compote.",
        "category": "Grab-and-Go",
        "base_price": 4.00,
        "dietary_tags": ["vegetarian", "gluten-free"],
        "is_available": True,
    },
    {
        "id": "20000000-0000-4000-8000-000000000303",
        "location_id": LOC_PUTNAM_ID,
        "name": "Fresh Seasonal Fruit Cup",
        "description": "Seasonal mixed fruit, freshly cut daily.",
        "category": "Grab-and-Go",
        "base_price": 2.75,
        "dietary_tags": ["vegan", "gluten-free", "dairy-free", "halal"],
        "is_available": True,
    },
    {
        "id": "20000000-0000-4000-8000-000000000304",
        "location_id": LOC_PUTNAM_ID,
        "name": "Protein Bistro Box",
        "description": "Hard-boiled egg, sharp cheddar cheese slices, apple slices, and peanut butter.",
        "category": "Grab-and-Go",
        "base_price": 5.25,
        "dietary_tags": ["vegetarian", "gluten-free"],
        "is_available": True,
    },
]

MODIFIER_GROUPS_DATA = [
    # Item: Iced Vanilla Latte (item-101)
    {
        "id": "30000000-0000-4000-8000-000000000101",
        "menu_item_id": "20000000-0000-4000-8000-000000000101",
        "name": "Size",
        "is_required": True,
        "min_select": 1,
        "max_select": 1,
        "sort_order": 1,
    },
    {
        "id": "30000000-0000-4000-8000-000000000102",
        "menu_item_id": "20000000-0000-4000-8000-000000000101",
        "name": "Milk Alternative",
        "is_required": False,
        "min_select": 0,
        "max_select": 1,
        "sort_order": 2,
    },
    {
        "id": "30000000-0000-4000-8000-000000000103",
        "menu_item_id": "20000000-0000-4000-8000-000000000101",
        "name": "Add-ons",
        "is_required": False,
        "min_select": 0,
        "max_select": 3,
        "sort_order": 3,
    },
    # Item: Cold Brew (item-102)
    {
        "id": "30000000-0000-4000-8000-000000000104",
        "menu_item_id": "20000000-0000-4000-8000-000000000102",
        "name": "Size",
        "is_required": True,
        "min_select": 1,
        "max_select": 1,
        "sort_order": 1,
    },
    # Item: Drip Coffee (item-103)
    {
        "id": "30000000-0000-4000-8000-000000000105",
        "menu_item_id": "20000000-0000-4000-8000-000000000103",
        "name": "Size",
        "is_required": True,
        "min_select": 1,
        "max_select": 1,
        "sort_order": 1,
    },
    # Item: Asiago Bagel Sandwich (item-104)
    {
        "id": "30000000-0000-4000-8000-000000000106",
        "menu_item_id": "20000000-0000-4000-8000-000000000104",
        "name": "Bagel",
        "is_required": True,
        "min_select": 1,
        "max_select": 1,
        "sort_order": 1,
    },
    {
        "id": "30000000-0000-4000-8000-000000000107",
        "menu_item_id": "20000000-0000-4000-8000-000000000104",
        "name": "Protein",
        "is_required": False,
        "min_select": 0,
        "max_select": 1,
        "sort_order": 2,
    },
    {
        "id": "30000000-0000-4000-8000-000000000108",
        "menu_item_id": "20000000-0000-4000-8000-000000000104",
        "name": "Toast",
        "is_required": False,
        "min_select": 0,
        "max_select": 1,
        "sort_order": 3,
    },
    # Item: Turkey Avocado Wrap (item-201)
    {
        "id": "30000000-0000-4000-8000-000000000201",
        "menu_item_id": "20000000-0000-4000-8000-000000000201",
        "name": "Wrap",
        "is_required": True,
        "min_select": 1,
        "max_select": 1,
        "sort_order": 1,
    },
    # Item: Matcha Latte (item-203)
    {
        "id": "30000000-0000-4000-8000-000000000202",
        "menu_item_id": "20000000-0000-4000-8000-000000000203",
        "name": "Milk",
        "is_required": True,
        "min_select": 1,
        "max_select": 1,
        "sort_order": 1,
    },
    {
        "id": "30000000-0000-4000-8000-000000000203",
        "menu_item_id": "20000000-0000-4000-8000-000000000203",
        "name": "Sweetness",
        "is_required": False,
        "min_select": 0,
        "max_select": 1,
        "sort_order": 2,
    },
    # Item: Iced Chai Latte (item-205)
    {
        "id": "30000000-0000-4000-8000-000000000204",
        "menu_item_id": "20000000-0000-4000-8000-000000000205",
        "name": "Milk Choice",
        "is_required": True,
        "min_select": 1,
        "max_select": 1,
        "sort_order": 1,
    },
]

MODIFIER_OPTIONS_DATA = [
    # Item-101 Size
    {"id": "40000000-0000-4000-8000-000000000101", "group_id": "30000000-0000-4000-8000-000000000101", "name": "Medium (16oz)", "price_delta": 0.00, "is_available": True, "sort_order": 1},
    {"id": "40000000-0000-4000-8000-000000000102", "group_id": "30000000-0000-4000-8000-000000000101", "name": "Large (20oz)", "price_delta": 0.75, "is_available": True, "sort_order": 2},
    # Item-101 Milk
    {"id": "40000000-0000-4000-8000-000000000103", "group_id": "30000000-0000-4000-8000-000000000102", "name": "Whole Milk", "price_delta": 0.00, "is_available": True, "sort_order": 1},
    {"id": "40000000-0000-4000-8000-000000000104", "group_id": "30000000-0000-4000-8000-000000000102", "name": "Oat Milk", "price_delta": 0.80, "is_available": True, "sort_order": 2},
    {"id": "40000000-0000-4000-8000-000000000105", "group_id": "30000000-0000-4000-8000-000000000102", "name": "Almond Milk", "price_delta": 0.80, "is_available": True, "sort_order": 3},
    # Item-101 Add-ons
    {"id": "40000000-0000-4000-8000-000000000106", "group_id": "30000000-0000-4000-8000-000000000103", "name": "Extra Espresso Shot", "price_delta": 1.00, "is_available": True, "sort_order": 1},
    {"id": "40000000-0000-4000-8000-000000000107", "group_id": "30000000-0000-4000-8000-000000000103", "name": "Vanilla Syrup", "price_delta": 0.50, "is_available": True, "sort_order": 2},
    {"id": "40000000-0000-4000-8000-000000000108", "group_id": "30000000-0000-4000-8000-000000000103", "name": "Caramel Drizzle", "price_delta": 0.50, "is_available": True, "sort_order": 3},
    # Item-102 Size
    {"id": "40000000-0000-4000-8000-000000000109", "group_id": "30000000-0000-4000-8000-000000000104", "name": "Medium (16oz)", "price_delta": 0.00, "is_available": True, "sort_order": 1},
    {"id": "40000000-0000-4000-8000-000000000110", "group_id": "30000000-0000-4000-8000-000000000104", "name": "Large (20oz)", "price_delta": 0.60, "is_available": True, "sort_order": 2},
    # Item-103 Size
    {"id": "40000000-0000-4000-8000-000000000111", "group_id": "30000000-0000-4000-8000-000000000105", "name": "Small (12oz)", "price_delta": 0.00, "is_available": True, "sort_order": 1},
    {"id": "40000000-0000-4000-8000-000000000112", "group_id": "30000000-0000-4000-8000-000000000105", "name": "Medium (16oz)", "price_delta": 0.60, "is_available": True, "sort_order": 2},
    {"id": "40000000-0000-4000-8000-000000000113", "group_id": "30000000-0000-4000-8000-000000000105", "name": "Large (20oz)", "price_delta": 1.10, "is_available": True, "sort_order": 3},
    # Item-104 Bagel
    {"id": "40000000-0000-4000-8000-000000000114", "group_id": "30000000-0000-4000-8000-000000000106", "name": "Asiago", "price_delta": 0.00, "is_available": True, "sort_order": 1},
    {"id": "40000000-0000-4000-8000-000000000115", "group_id": "30000000-0000-4000-8000-000000000106", "name": "Everything", "price_delta": 0.00, "is_available": True, "sort_order": 2},
    {"id": "40000000-0000-4000-8000-000000000116", "group_id": "30000000-0000-4000-8000-000000000106", "name": "Plain", "price_delta": 0.00, "is_available": True, "sort_order": 3},
    # Item-104 Protein
    {"id": "40000000-0000-4000-8000-000000000117", "group_id": "30000000-0000-4000-8000-000000000107", "name": "Bacon", "price_delta": 1.25, "is_available": True, "sort_order": 1},
    {"id": "40000000-0000-4000-8000-000000000118", "group_id": "30000000-0000-4000-8000-000000000107", "name": "Sausage", "price_delta": 1.25, "is_available": True, "sort_order": 2},
    {"id": "40000000-0000-4000-8000-000000000119", "group_id": "30000000-0000-4000-8000-000000000107", "name": "No Protein", "price_delta": 0.00, "is_available": True, "sort_order": 3},
    # Item-104 Toast
    {"id": "40000000-0000-4000-8000-000000000120", "group_id": "30000000-0000-4000-8000-000000000108", "name": "Toasted", "price_delta": 0.00, "is_available": True, "sort_order": 1},
    {"id": "40000000-0000-4000-8000-000000000121", "group_id": "30000000-0000-4000-8000-000000000108", "name": "Not Toasted", "price_delta": 0.00, "is_available": True, "sort_order": 2},
    # Item-201 Wrap
    {"id": "40000000-0000-4000-8000-000000000201", "group_id": "30000000-0000-4000-8000-000000000201", "name": "Whole Wheat", "price_delta": 0.00, "is_available": True, "sort_order": 1},
    {"id": "40000000-0000-4000-8000-000000000202", "group_id": "30000000-0000-4000-8000-000000000201", "name": "Spinach", "price_delta": 0.00, "is_available": True, "sort_order": 2},
    {"id": "40000000-0000-4000-8000-000000000203", "group_id": "30000000-0000-4000-8000-000000000201", "name": "Plain Flour", "price_delta": 0.00, "is_available": True, "sort_order": 3},
    # Item-203 Milk
    {"id": "40000000-0000-4000-8000-000000000204", "group_id": "30000000-0000-4000-8000-000000000202", "name": "Whole Milk", "price_delta": 0.00, "is_available": True, "sort_order": 1},
    {"id": "40000000-0000-4000-8000-000000000205", "group_id": "30000000-0000-4000-8000-000000000202", "name": "Oat Milk", "price_delta": 0.75, "is_available": True, "sort_order": 2},
    {"id": "40000000-0000-4000-8000-000000000206", "group_id": "30000000-0000-4000-8000-000000000202", "name": "Almond Milk", "price_delta": 0.75, "is_available": True, "sort_order": 3},
    # Item-203 Sweetness
    {"id": "40000000-0000-4000-8000-000000000207", "group_id": "30000000-0000-4000-8000-000000000203", "name": "Unsweetened", "price_delta": 0.00, "is_available": True, "sort_order": 1},
    {"id": "40000000-0000-4000-8000-000000000208", "group_id": "30000000-0000-4000-8000-000000000203", "name": "Lightly Sweet", "price_delta": 0.00, "is_available": True, "sort_order": 2},
    {"id": "40000000-0000-4000-8000-000000000209", "group_id": "30000000-0000-4000-8000-000000000203", "name": "Sweet", "price_delta": 0.00, "is_available": True, "sort_order": 3},
    # Item-205 Milk Choice
    {"id": "40000000-0000-4000-8000-000000000210", "group_id": "30000000-0000-4000-8000-000000000204", "name": "Whole Milk", "price_delta": 0.00, "is_available": True, "sort_order": 1},
    {"id": "40000000-0000-4000-8000-000000000211", "group_id": "30000000-0000-4000-8000-000000000204", "name": "Oat Milk", "price_delta": 0.80, "is_available": True, "sort_order": 2},
    {"id": "40000000-0000-4000-8000-000000000212", "group_id": "30000000-0000-4000-8000-000000000204", "name": "Almond Milk", "price_delta": 0.80, "is_available": True, "sort_order": 3},
]


def seed_database() -> dict[str, int]:
    """Execute the idempotent seed against Supabase."""
    client = get_supabase_client()
    if not client:
        raise RuntimeError(
            "Supabase client is not configured. Set SUPABASE_URL and "
            "SUPABASE_SERVICE_ROLE_KEY to seed the database."
        )

    logger.info("Seeding profiles...")
    profiles = [
        {
            "id": DEMO_STUDENT_ID,
            "display_name": "Demo Student",
            "email": "demo.student@uconn.edu",
            "role": "student",
            "huskybucks_balance": 50.00,
            "flex_passes": 10,
            "dining_points": 120,
        },
        {
            "id": DEMO_OPERATOR_ID,
            "display_name": "Demo Operator",
            "email": "demo.operator@uconn.edu",
            "role": "staff",
            "huskybucks_balance": 50.00,
            "flex_passes": 10,
            "dining_points": 120,
        },
    ]
    client.table("profiles").upsert(profiles, on_conflict="id").execute()

    logger.info("Seeding %d locations...", len(LOCATIONS_DATA))
    client.table("locations").upsert(LOCATIONS_DATA, on_conflict="slug").execute()

    logger.info("Seeding %d menu items...", len(MENU_ITEMS_DATA))
    client.table("menu_items").upsert(MENU_ITEMS_DATA, on_conflict="id").execute()

    logger.info("Seeding %d modifier groups...", len(MODIFIER_GROUPS_DATA))
    client.table("modifier_groups").upsert(MODIFIER_GROUPS_DATA, on_conflict="id").execute()

    logger.info("Seeding %d modifier options...", len(MODIFIER_OPTIONS_DATA))
    client.table("modifier_options").upsert(MODIFIER_OPTIONS_DATA, on_conflict="id").execute()

    counts = {
        "profiles": len(profiles),
        "locations": len(LOCATIONS_DATA),
        "menu_items": len(MENU_ITEMS_DATA),
        "modifier_groups": len(MODIFIER_GROUPS_DATA),
        "modifier_options": len(MODIFIER_OPTIONS_DATA),
    }
    logger.info("Seeding complete: %s", counts)
    return counts


if __name__ == "__main__":
    settings = get_settings()
    logger.info("Running HuskyBite seed script against: %s", settings.supabase_url or "unconfigured")
    try:
        seed_database()
    except Exception as exc:
        logger.error("Seeding failed: %s", exc)
        raise
