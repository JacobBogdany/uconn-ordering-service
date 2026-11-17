"""Persisted checkout (Vin / Slice 2, Milestone 2).

`place_order` loads the current catalog rows, prices the request with the pure
rules in `checkout_rules`, then calls the `public.place_order` Postgres function
(see supabase/migrations/20261117120000_checkout.sql). That function re-verifies
availability, selection rules and prices under row locks, debits the balance, and
inserts the order and line snapshots in ONE transaction. The database result is
the receipt returned to the browser.

Nothing here accepts a user id, price, total or balance from the request.
"""

from __future__ import annotations

import logging
import uuid
from decimal import Decimal
from typing import Any

from postgrest.exceptions import APIError

from app.checkout_schemas import CreateOrderRequest, CreateOrderResponse
from app.services.checkout_rules import (
    CatalogSnapshot,
    CheckoutError,
    LocationRow,
    MenuItemRow,
    ModifierGroupRow,
    ModifierOptionRow,
    price_order,
)

logger = logging.getLogger(__name__)

DB_ERROR_SQLSTATE = "HB001"  # raised by public.checkout_fail
STALE_CATALOG = "STALE_CATALOG"
CONTRACT_CODES = {"VALIDATION_ERROR", "NOT_FOUND", "ITEM_UNAVAILABLE", "INSUFFICIENT_BALANCE"}


class CheckoutUnavailable(Exception):
    """The database call failed for a reason that is not a contract error."""


def _canonical_uuid(value: str, *, field: str) -> str:
    try:
        return str(uuid.UUID(str(value)))
    except (ValueError, AttributeError, TypeError):
        raise CheckoutError("NOT_FOUND", "Item not found.", field=field) from None


def _canonical_option(value: str) -> str:
    """Option ids that are not UUIDs can never match a row; keep them so rules report them."""
    try:
        return str(uuid.UUID(str(value)))
    except (ValueError, AttributeError, TypeError):
        return value


def normalize_request(request: CreateOrderRequest) -> CreateOrderRequest:
    """Canonicalise ids so string comparisons against database ids are reliable."""
    items = [
        line.model_copy(
            update={
                "menu_item_id": _canonical_uuid(line.menu_item_id, field=f"items[{i}].menu_item_id"),
                "selected_option_ids": [_canonical_option(o) for o in line.selected_option_ids],
            }
        )
        for i, line in enumerate(request.items)
    ]
    return request.model_copy(
        update={"location_id": _canonical_uuid(request.location_id, field="location_id"), "items": items}
    )


def load_catalog_snapshot(client: Any, request: CreateOrderRequest) -> CatalogSnapshot:
    """Read the current rows needed to price this request (request ids already canonical)."""
    loc_rows = (
        client.table("locations").select("id, name, is_open").eq("id", request.location_id).limit(1).execute().data
        or []
    )
    location = (
        LocationRow(id=str(loc_rows[0]["id"]), name=loc_rows[0]["name"], is_open=bool(loc_rows[0]["is_open"]))
        if loc_rows
        else None
    )

    item_ids = sorted({line.menu_item_id for line in request.items})
    item_rows = (
        client.table("menu_items")
        .select("id, location_id, name, base_price, is_available")
        .in_("id", item_ids)
        .execute()
        .data
        or []
    )
    group_rows = (
        client.table("modifier_groups")
        .select("id, menu_item_id, name, is_required, min_select, max_select, sort_order")
        .in_("menu_item_id", item_ids)
        .execute()
        .data
        or []
        if item_rows
        else []
    )
    group_ids = [str(g["id"]) for g in group_rows]
    option_rows = (
        client.table("modifier_options")
        .select("id, group_id, name, price_delta, is_available, sort_order")
        .in_("group_id", group_ids)
        .execute()
        .data
        or []
        if group_ids
        else []
    )

    options_by_group: dict[str, list[ModifierOptionRow]] = {}
    for o in option_rows:
        options_by_group.setdefault(str(o["group_id"]), []).append(
            ModifierOptionRow(
                id=str(o["id"]),
                group_id=str(o["group_id"]),
                name=o["name"],
                price_delta=Decimal(str(o["price_delta"])),
                is_available=bool(o["is_available"]),
                sort_order=int(o.get("sort_order") or 0),
            )
        )
    groups_by_item: dict[str, list[ModifierGroupRow]] = {}
    for g in group_rows:
        groups_by_item.setdefault(str(g["menu_item_id"]), []).append(
            ModifierGroupRow(
                id=str(g["id"]),
                menu_item_id=str(g["menu_item_id"]),
                name=g["name"],
                is_required=bool(g["is_required"]),
                min_select=int(g["min_select"]),
                max_select=int(g["max_select"]),
                sort_order=int(g.get("sort_order") or 0),
                options=tuple(options_by_group.get(str(g["id"]), [])),
            )
        )

    menu_items = {
        str(i["id"]): MenuItemRow(
            id=str(i["id"]),
            location_id=str(i["location_id"]),
            name=i["name"],
            base_price=Decimal(str(i["base_price"])),
            is_available=bool(i["is_available"]),
            groups=tuple(groups_by_item.get(str(i["id"]), [])),
        )
        for i in item_rows
    }
    return CatalogSnapshot(location=location, menu_items=menu_items)


def _db_error(exc: APIError) -> tuple[str | None, str, str | None]:
    """(contract code, message, field) for an HB001 error, else (None, ...)."""
    info = exc.args[0] if exc.args and isinstance(exc.args[0], dict) else {}
    code = getattr(exc, "code", None) or info.get("code")
    if code != DB_ERROR_SQLSTATE:
        return None, str(getattr(exc, "message", None) or info.get("message") or exc), None
    message = getattr(exc, "message", None) or info.get("message")
    details = getattr(exc, "details", None) or info.get("details") or ""
    hint = getattr(exc, "hint", None) or info.get("hint") or None
    return message, details, hint


def _call_place_order(client: Any, user_id: str, request: CreateOrderRequest, key: str) -> dict[str, Any]:
    catalog = load_catalog_snapshot(client, request)
    priced = price_order(request, catalog)
    lines = [
        {
            "menu_item_id": line.menu_item_id,
            "quantity": line.quantity,
            "selected_option_ids": [s.option_id for s in line.selected_options],
            "notes": line.notes,
            # Expected price only: the database re-derives and verifies it.
            "unit_price": float(line.unit_price),
        }
        for line in priced.lines
    ]
    try:
        result = client.rpc(
            "place_order",
            {
                "p_user_id": user_id,
                "p_location_id": priced.location_id,
                "p_idempotency_key": key,
                "p_lines": lines,
            },
        ).execute()
    except APIError as exc:
        code, message, field = _db_error(exc)
        if code is None:
            logger.error("place_order failed: %s", message)
            raise CheckoutUnavailable("Checkout is temporarily unavailable.") from exc
        if code == STALE_CATALOG:
            raise
        if code in CONTRACT_CODES:
            raise CheckoutError(code, message, field=field or None) from exc
        logger.error("place_order returned unknown code %s", code)
        raise CheckoutUnavailable("Checkout is temporarily unavailable.") from exc
    if not isinstance(result.data, dict):
        raise CheckoutUnavailable("Checkout returned an unexpected response.")
    return result.data


def place_order(
    client: Any, user_id: str, request: CreateOrderRequest, idempotency_key: str
) -> tuple[CreateOrderResponse, bool]:
    """Price, charge and persist one order. Returns (receipt, replayed).

    `replayed` is True when the idempotency key already produced an order; the
    original receipt is returned and nothing is charged again. If the menu changes
    between pricing and the transaction we re-price once, then report it.
    """
    request = normalize_request(request)
    data: dict[str, Any] | None = None
    for attempt in range(2):
        try:
            data = _call_place_order(client, user_id, request, idempotency_key)
            break
        except APIError as exc:
            code, _, _ = _db_error(exc)
            if code != STALE_CATALOG:
                raise
            if attempt == 1:
                raise CheckoutError(
                    "ITEM_UNAVAILABLE",
                    "The menu changed while you were checking out. Review your cart and try again.",
                ) from exc
    assert data is not None
    replayed = bool(data.get("replayed"))
    return CreateOrderResponse.model_validate(data), replayed
