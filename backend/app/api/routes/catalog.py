"""Catalog API endpoints owned by Jacob Bogdany (Slice 1).

Implements:
- GET /api/locations: List venues with operational status and wait estimates.
- GET /api/locations/{location_id}/menu: List categorized menu items, modifier groups, and options with dietary filtering.
- PATCH /api/menu/{item_id}/availability: Staff-only toggle for menu item availability.
"""

from decimal import Decimal
from typing import Any
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.catalog_schemas import (
    LegacyCustomizationGroup,
    LegacyCustomizationOption,
    LocationOut,
    MenuItemOut,
    ModifierGroupOut,
    ModifierOptionOut,
    UpdateAvailabilityRequest,
    UpdateAvailabilityResponse,
)
from app.database import get_supabase_client
from app.security.authorization import require_operator

router = APIRouter(tags=["catalog"])


def _is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, TypeError, AttributeError):
        return False


@router.get("/locations", response_model=list[LocationOut])
def list_locations() -> list[LocationOut]:
    """List campus dining locations with operational status and estimated wait."""
    client = get_supabase_client()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "SERVICE_UNAVAILABLE", "message": "Supabase is not configured; check server environment."},
        )

    res = client.table("locations").select("id, slug, name, building, hours_text, is_open").order("name").execute()
    rows = res.data or []

    # Derive active order counts per location if orders table is available
    active_counts: dict[str, int] = {}
    try:
        orders_res = (
            client.table("orders")
            .select("location_id")
            .in_("status", ["RECEIVED", "PREPPING"])
            .execute()
        )
        for order in (orders_res.data or []):
            loc_id = str(order.get("location_id"))
            active_counts[loc_id] = active_counts.get(loc_id, 0) + 1
    except Exception:
        # Gracefully handle when orders table isn't populated or active
        active_counts = {}

    results: list[LocationOut] = []
    for row in rows:
        loc_id = str(row["id"])
        active_orders = active_counts.get(loc_id, 0)
        # Approximate 5 mins base wait + 2 mins per active order, capped at 60
        wait_mins = min(60, 5 + (active_orders * 2)) if row.get("is_open", True) else 0

        results.append(
            LocationOut(
                id=loc_id,
                slug=row.get("slug", ""),
                name=row["name"],
                building=row.get("building", ""),
                hours=row.get("hours_text") or "Hours not specified",
                is_open=bool(row.get("is_open", True)),
                active_orders_count=active_orders,
                estimated_wait_minutes=wait_mins,
            )
        )
    return results


@router.get("/locations/{location_id}/menu", response_model=list[MenuItemOut])
def get_location_menu(
    location_id: str,
    dietary: str | None = Query(default=None, description="Optional comma-separated dietary tags (e.g. 'vegan,gluten-free')"),
) -> list[MenuItemOut]:
    """List categorized menu items for a venue with modifier groups and optional dietary filter."""
    client = get_supabase_client()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "SERVICE_UNAVAILABLE", "message": "Supabase is not configured; check server environment."},
        )

    # Resolve location by id (UUID) or slug
    if _is_valid_uuid(location_id):
        loc_res = client.table("locations").select("id, name").eq("id", location_id).limit(1).execute()
    else:
        loc_res = client.table("locations").select("id, name").eq("slug", location_id).limit(1).execute()

    loc_rows = loc_res.data or []
    if not loc_rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": f"Location '{location_id}' not found."},
        )
    real_location_id = str(loc_rows[0]["id"])

    # Query menu items for location
    items_res = (
        client.table("menu_items")
        .select("id, location_id, name, description, category, base_price, dietary_tags, is_available")
        .eq("location_id", real_location_id)
        .order("category")
        .order("name")
        .execute()
    )
    items = items_res.data or []

    # Optional dietary filter
    if dietary:
        requested_tags = {tag.strip().lower() for tag in dietary.split(",") if tag.strip()}
        if requested_tags:
            items = [
                item for item in items
                if requested_tags.issubset({str(t).lower() for t in (item.get("dietary_tags") or [])})
            ]

    if not items:
        return []

    item_ids = [str(item["id"]) for item in items]

    # Query modifier groups
    groups_res = (
        client.table("modifier_groups")
        .select("id, menu_item_id, name, is_required, min_select, max_select, sort_order")
        .in_("menu_item_id", item_ids)
        .order("sort_order")
        .execute()
    )
    groups_data = groups_res.data or []
    group_ids = [str(g["id"]) for g in groups_data]

    # Query modifier options
    options_data: list[dict[str, Any]] = []
    if group_ids:
        options_res = (
            client.table("modifier_options")
            .select("id, group_id, name, price_delta, is_available, sort_order")
            .in_("group_id", group_ids)
            .order("sort_order")
            .execute()
        )
        options_data = options_res.data or []

    # Organize options by group_id
    options_by_group: dict[str, list[ModifierOptionOut]] = {}
    for opt in options_data:
        gid = str(opt["group_id"])
        options_by_group.setdefault(gid, []).append(
            ModifierOptionOut(
                id=str(opt["id"]),
                group_id=gid,
                name=opt["name"],
                price_delta=Decimal(str(opt.get("price_delta", "0.00"))),
                is_available=bool(opt.get("is_available", True)),
                sort_order=int(opt.get("sort_order", 0)),
            )
        )

    # Organize modifier groups by menu_item_id
    groups_by_item: dict[str, list[ModifierGroupOut]] = {}
    for g in groups_data:
        mid = str(g["menu_item_id"])
        gid = str(g["id"])
        group_options = options_by_group.get(gid, [])
        groups_by_item.setdefault(mid, []).append(
            ModifierGroupOut(
                id=gid,
                menu_item_id=mid,
                name=g["name"],
                is_required=bool(g.get("is_required", False)),
                min_select=int(g.get("min_select", 0)),
                max_select=int(g.get("max_select", 1)),
                sort_order=int(g.get("sort_order", 0)),
                options=group_options,
            )
        )

    # Build response models
    result: list[MenuItemOut] = []
    for item in items:
        mid = str(item["id"])
        mod_groups = groups_by_item.get(mid, [])

        # Build legacy customization_groups for backward compatibility
        legacy_groups = [
            LegacyCustomizationGroup(
                group_name=mg.name,
                required=mg.is_required,
                max_select=mg.max_select,
                options=[
                    LegacyCustomizationOption(
                        name=opt.name,
                        price_delta=float(opt.price_delta),
                    )
                    for opt in mg.options
                ],
            )
            for mg in mod_groups
        ]

        result.append(
            MenuItemOut(
                id=mid,
                location_id=str(item["location_id"]),
                name=item["name"],
                description=item.get("description") or "",
                category=item["category"],
                base_price=Decimal(str(item["base_price"])),
                dietary_tags=list(item.get("dietary_tags") or []),
                is_available=bool(item.get("is_available", True)),
                modifier_groups=mod_groups,
                customization_groups=legacy_groups,
            )
        )

    return result


@router.patch("/menu/{item_id}/availability", response_model=UpdateAvailabilityResponse)
def update_menu_item_availability(
    item_id: str,
    payload: UpdateAvailabilityRequest,
    _operator: dict[str, Any] = Depends(require_operator),
) -> UpdateAvailabilityResponse:
    """Staff-authorized toggle for item availability."""
    client = get_supabase_client()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "SERVICE_UNAVAILABLE", "message": "Supabase is not configured; check server environment."},
        )

    if not _is_valid_uuid(item_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": f"Menu item '{item_id}' not found."},
        )

    # Verify item exists
    check_res = client.table("menu_items").select("id, name, is_available").eq("id", item_id).limit(1).execute()
    rows = check_res.data or []
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": f"Menu item '{item_id}' not found."},
        )

    item_name = rows[0]["name"]

    # Perform update
    client.table("menu_items").update({"is_available": payload.is_available}).eq("id", item_id).execute()

    status_str = "in stock" if payload.is_available else "sold out"
    return UpdateAvailabilityResponse(
        id=item_id,
        name=item_name,
        is_available=payload.is_available,
        message=f"'{item_name}' is now marked {status_str}.",
    )
