from app.seed import (
    DEMO_OPERATOR_ID,
    DEMO_STUDENT_ID,
    LOC_BEANERY_ID,
    LOC_BOOKWORMS_ID,
    LOC_PUTNAM_ID,
    LOCATIONS_DATA,
    MENU_ITEMS_DATA,
    MODIFIER_GROUPS_DATA,
    MODIFIER_OPTIONS_DATA,
)


def test_seed_locations_structure():
    assert len(LOCATIONS_DATA) == 3
    slugs = {loc["slug"] for loc in LOCATIONS_DATA}
    assert slugs == {"beanery", "bookworms", "putnam"}

    ids = {loc["id"] for loc in LOCATIONS_DATA}
    assert ids == {LOC_BEANERY_ID, LOC_BOOKWORMS_ID, LOC_PUTNAM_ID}


def test_seed_menu_items_structure():
    # At least 4 items per location as required by Milestone 1
    assert len(MENU_ITEMS_DATA) >= 12
    beanery_items = [i for i in MENU_ITEMS_DATA if i["location_id"] == LOC_BEANERY_ID]
    bookworms_items = [i for i in MENU_ITEMS_DATA if i["location_id"] == LOC_BOOKWORMS_ID]
    putnam_items = [i for i in MENU_ITEMS_DATA if i["location_id"] == LOC_PUTNAM_ID]

    assert len(beanery_items) >= 4
    assert len(bookworms_items) >= 4
    assert len(putnam_items) >= 4

    for item in MENU_ITEMS_DATA:
        assert item["base_price"] >= 0
        assert isinstance(item["dietary_tags"], list)


def test_seed_modifier_selection_constraints():
    # Schema checks:
    #   check (min_select <= max_select)
    #   check (not is_required or min_select > 0)
    for group in MODIFIER_GROUPS_DATA:
        assert group["min_select"] <= group["max_select"], f"Group {group['name']} min > max"
        if group["is_required"]:
            assert group["min_select"] > 0, f"Required group {group['name']} has min_select == 0"

    # All options must reference an existing group
    group_ids = {g["id"] for g in MODIFIER_GROUPS_DATA}
    for opt in MODIFIER_OPTIONS_DATA:
        assert opt["group_id"] in group_ids, f"Option {opt['name']} references unknown group"


def test_seed_demo_identities():
    assert DEMO_STUDENT_ID == "00000000-0000-4000-8000-000000000001"
    assert DEMO_OPERATOR_ID == "00000000-0000-4000-8000-000000000002"
