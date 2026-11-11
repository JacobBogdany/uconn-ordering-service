"""Server-authoritative checkout rules (Vin / Slice 2).

Pure functions with no database access so they can be unit-tested and reused by
the `POST /api/orders` transaction in Milestone 2. The caller loads the current
catalog rows for the requested items and passes them in; these functions never
trust prices, totals, balances, or identities supplied by the browser.

The same rules are mirrored for UI feedback in
`frontend/src/features/checkout/rules.ts`. The server copy is authoritative.
See `context/checkout_contract.md`.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from app.checkout_schemas import CreateOrderRequest

CENT = Decimal("0.01")
ACCEPTED_PAYMENT_METHODS = frozenset({"HUSKYBUCKS"})
NOTES_MAX_LENGTH = 200


def money(value: Decimal | int | float | str) -> Decimal:
    """Round to cents. Floats are converted through str to avoid binary artifacts."""
    if isinstance(value, float):
        value = str(value)
    return Decimal(value).quantize(CENT, rounding=ROUND_HALF_UP)


# --------------------------------------------------------------------------- #
# Errors
# --------------------------------------------------------------------------- #

ERROR_STATUS: dict[str, int] = {
    "VALIDATION_ERROR": 422,
    "PAYMENT_METHOD_UNAVAILABLE": 422,
    "NOT_FOUND": 404,
    "ITEM_UNAVAILABLE": 409,
    "INSUFFICIENT_BALANCE": 409,
}


class CheckoutError(Exception):
    """A contract error with a stable code. Converted to an HTTP error by the route."""

    def __init__(self, code: str, message: str, *, field: str | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.field = field

    @property
    def status_code(self) -> int:
        return ERROR_STATUS.get(self.code, 400)

    def to_detail(self) -> dict[str, Any]:
        detail: dict[str, Any] = {"code": self.code, "message": self.message}
        if self.field:
            detail["field"] = self.field
        return detail


# --------------------------------------------------------------------------- #
# Catalog rows (mirror the Supabase tables the checkout reads)
# --------------------------------------------------------------------------- #


@dataclass(frozen=True)
class ModifierOptionRow:
    id: str
    group_id: str
    name: str
    price_delta: Decimal
    is_available: bool = True
    sort_order: int = 0


@dataclass(frozen=True)
class ModifierGroupRow:
    id: str
    menu_item_id: str
    name: str
    is_required: bool = False
    min_select: int = 0
    max_select: int = 1
    sort_order: int = 0
    options: tuple[ModifierOptionRow, ...] = ()

    @property
    def effective_min(self) -> int:
        """A required group needs at least one choice even if min_select is 0."""
        return max(self.min_select, 1 if self.is_required else 0)


@dataclass(frozen=True)
class MenuItemRow:
    id: str
    location_id: str
    name: str
    base_price: Decimal
    is_available: bool = True
    groups: tuple[ModifierGroupRow, ...] = ()


@dataclass(frozen=True)
class LocationRow:
    id: str
    name: str
    is_open: bool = True


@dataclass(frozen=True)
class CatalogSnapshot:
    """Current catalog rows needed to price one order request."""

    location: LocationRow | None
    menu_items: dict[str, MenuItemRow] = field(default_factory=dict)


# --------------------------------------------------------------------------- #
# Priced result (becomes `orders` + `order_items` rows in Milestone 2)
# --------------------------------------------------------------------------- #


@dataclass(frozen=True)
class SelectedOptionSnapshot:
    option_id: str
    group_name: str
    name: str
    price_delta: Decimal

    def to_json(self) -> dict[str, Any]:
        """Shape stored in `order_items.selected_options` (jsonb array element)."""
        return {
            "option_id": self.option_id,
            "group_name": self.group_name,
            "name": self.name,
            "price_delta": str(self.price_delta),
        }


@dataclass(frozen=True)
class PricedLine:
    menu_item_id: str
    item_name: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal
    selected_options: tuple[SelectedOptionSnapshot, ...]
    notes: str | None


@dataclass(frozen=True)
class PricedOrder:
    location_id: str
    payment_method: str
    lines: tuple[PricedLine, ...]
    total_amount: Decimal


# --------------------------------------------------------------------------- #
# Rules
# --------------------------------------------------------------------------- #


def normalize_notes(notes: str | None) -> str | None:
    if notes is None:
        return None
    cleaned = " ".join(notes.split())
    if not cleaned:
        return None
    if len(cleaned) > NOTES_MAX_LENGTH:
        raise CheckoutError(
            "VALIDATION_ERROR",
            f"Notes must be {NOTES_MAX_LENGTH} characters or fewer.",
            field="notes",
        )
    return cleaned


def assert_payment_method(method: str) -> None:
    if method not in ACCEPTED_PAYMENT_METHODS:
        raise CheckoutError(
            "PAYMENT_METHOD_UNAVAILABLE",
            "Only HuskyBucks are accepted for this demo.",
            field="payment_method",
        )


def resolve_selections(item: MenuItemRow, option_ids: list[str], *, line: int) -> tuple[SelectedOptionSnapshot, ...]:
    """Validate a line's modifier choices against the item's groups.

    Rules: no duplicate ids; every id belongs to one of this item's groups; each
    chosen option is available; each group's count is within
    [effective_min, max_select]. Returns snapshots ordered by group/option sort order.
    """
    prefix = f"items[{line}].selected_option_ids"
    if len(set(option_ids)) != len(option_ids):
        raise CheckoutError("VALIDATION_ERROR", f"Duplicate option selected for {item.name}.", field=prefix)

    option_lookup: dict[str, tuple[ModifierGroupRow, ModifierOptionRow]] = {
        option.id: (group, option) for group in item.groups for option in group.options
    }
    chosen: dict[str, list[ModifierOptionRow]] = {group.id: [] for group in item.groups}
    for option_id in option_ids:
        match = option_lookup.get(option_id)
        if match is None:
            raise CheckoutError("VALIDATION_ERROR", f"Option is not valid for {item.name}.", field=prefix)
        group, option = match
        if not option.is_available:
            raise CheckoutError("ITEM_UNAVAILABLE", f"{option.name} is currently unavailable.", field=prefix)
        chosen[group.id].append(option)

    snapshots: list[SelectedOptionSnapshot] = []
    for group in sorted(item.groups, key=lambda g: (g.sort_order, g.name)):
        picks = chosen[group.id]
        if len(picks) < group.effective_min:
            need = "a choice" if group.effective_min == 1 else f"at least {group.effective_min} choices"
            raise CheckoutError("VALIDATION_ERROR", f"{item.name}: {group.name} needs {need}.", field=prefix)
        if len(picks) > group.max_select:
            raise CheckoutError(
                "VALIDATION_ERROR",
                f"{item.name}: choose at most {group.max_select} for {group.name}.",
                field=prefix,
            )
        for option in sorted(picks, key=lambda o: (o.sort_order, o.name)):
            snapshots.append(
                SelectedOptionSnapshot(
                    option_id=option.id,
                    group_name=group.name,
                    name=option.name,
                    price_delta=money(option.price_delta),
                )
            )
    return tuple(snapshots)


def unit_price(item: MenuItemRow, selections: tuple[SelectedOptionSnapshot, ...]) -> Decimal:
    price = money(item.base_price) + sum((s.price_delta for s in selections), Decimal("0"))
    price = money(price)
    if price < 0:
        raise CheckoutError("VALIDATION_ERROR", f"{item.name} has an invalid price configuration.")
    return price


def price_order(request: CreateOrderRequest, catalog: CatalogSnapshot) -> PricedOrder:
    """Validate a checkout request against current catalog rows and compute totals.

    No sales tax is modeled. total_amount == sum(quantity * unit_price).
    """
    assert_payment_method(request.payment_method)

    location = catalog.location
    if location is None or location.id != request.location_id:
        raise CheckoutError("NOT_FOUND", "Pickup location not found.", field="location_id")
    if not location.is_open:
        raise CheckoutError("ITEM_UNAVAILABLE", f"{location.name} is not accepting orders right now.", field="location_id")

    lines: list[PricedLine] = []
    for index, line in enumerate(request.items):
        item = catalog.menu_items.get(line.menu_item_id)
        if item is None:
            raise CheckoutError("NOT_FOUND", "Menu item not found.", field=f"items[{index}].menu_item_id")
        if item.location_id != location.id:
            raise CheckoutError(
                "VALIDATION_ERROR",
                f"{item.name} is not sold at {location.name}.",
                field=f"items[{index}].menu_item_id",
            )
        if not item.is_available:
            raise CheckoutError("ITEM_UNAVAILABLE", f"{item.name} is currently unavailable.", field=f"items[{index}]")

        selections = resolve_selections(item, list(line.selected_option_ids), line=index)
        price = unit_price(item, selections)
        lines.append(
            PricedLine(
                menu_item_id=item.id,
                item_name=item.name,
                quantity=line.quantity,
                unit_price=price,
                line_total=money(price * line.quantity),
                selected_options=selections,
                notes=normalize_notes(line.notes),
            )
        )

    total = money(sum((l.line_total for l in lines), Decimal("0")))
    return PricedOrder(
        location_id=location.id,
        payment_method=request.payment_method,
        lines=tuple(lines),
        total_amount=total,
    )


def assert_sufficient_balance(huskybucks_balance: Decimal, total_amount: Decimal) -> Decimal:
    """Return the balance after the debit, or raise INSUFFICIENT_BALANCE.

    Milestone 2 must repeat this check inside the database transaction (row lock or
    conditional update) so concurrent orders cannot overdraw the balance.
    """
    balance = money(huskybucks_balance)
    if balance < total_amount:
        raise CheckoutError(
            "INSUFFICIENT_BALANCE",
            f"Order total ${total_amount} exceeds HuskyBucks balance ${balance}.",
        )
    return money(balance - total_amount)
