from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.checkout_schemas import CreateOrderRequest
from app.services.checkout_rules import (
    CatalogSnapshot,
    CheckoutError,
    LocationRow,
    MenuItemRow,
    ModifierGroupRow,
    ModifierOptionRow,
    assert_sufficient_balance,
    price_order,
)

D = Decimal


def latte(*, available=True, oat_available=True) -> MenuItemRow:
    size = ModifierGroupRow(
        id="g-size", menu_item_id="latte", name="Size", is_required=True, min_select=1, max_select=1, sort_order=0,
        options=(
            ModifierOptionRow("o-med", "g-size", "Medium", D("0.00"), sort_order=0),
            ModifierOptionRow("o-lg", "g-size", "Large", D("0.75"), sort_order=1),
        ),
    )
    milk = ModifierGroupRow(
        id="g-milk", menu_item_id="latte", name="Milk", max_select=1, sort_order=1,
        options=(ModifierOptionRow("o-oat", "g-milk", "Oat Milk", D("0.80"), is_available=oat_available),),
    )
    addons = ModifierGroupRow(
        id="g-add", menu_item_id="latte", name="Add-ons", max_select=2, sort_order=2,
        options=(
            ModifierOptionRow("o-shot", "g-add", "Extra Shot", D("1.00"), sort_order=0),
            ModifierOptionRow("o-van", "g-add", "Vanilla", D("0.50"), sort_order=1),
            ModifierOptionRow("o-car", "g-add", "Caramel", D("0.50"), sort_order=2),
        ),
    )
    return MenuItemRow("latte", "beanery", "Iced Latte", D("4.75"), available, (size, milk, addons))


def catalog(item: MenuItemRow | None = None, *, is_open=True) -> CatalogSnapshot:
    item = item or latte()
    muffin = MenuItemRow("muffin", "beanery", "Muffin", D("2.95"))
    other = MenuItemRow("bagel", "bookworms", "Bagel", D("3.00"))
    return CatalogSnapshot(
        location=LocationRow("beanery", "The Beanery", is_open),
        menu_items={i.id: i for i in (item, muffin, other)},
    )


def request(items, *, payment="HUSKYBUCKS", location="beanery") -> CreateOrderRequest:
    return CreateOrderRequest(location_id=location, payment_method=payment, items=items)


def code_of(exc: pytest.ExceptionInfo) -> str:
    return exc.value.code


def test_prices_modifiers_quantity_and_total_without_tax():
    priced = price_order(
        request([
            {"menu_item_id": "latte", "quantity": 2, "selected_option_ids": ["o-shot", "o-lg", "o-oat"]},
            {"menu_item_id": "muffin", "quantity": 1},
        ]),
        catalog(),
    )
    line = priced.lines[0]
    assert line.unit_price == D("7.30")  # 4.75 + 0.75 + 0.80 + 1.00
    assert line.line_total == D("14.60")
    assert [s.name for s in line.selected_options] == ["Large", "Oat Milk", "Extra Shot"]  # group/option order
    assert priced.total_amount == D("17.55")


def test_notes_are_trimmed_and_blank_notes_become_null():
    priced = price_order(
        request([
            {"menu_item_id": "muffin", "quantity": 1, "notes": "  warm   it  up "},
            {"menu_item_id": "muffin", "quantity": 1, "notes": "   "},
        ]),
        catalog(),
    )
    assert priced.lines[0].notes == "warm it up"
    assert priced.lines[1].notes is None


def test_notes_over_limit_rejected():
    with pytest.raises(CheckoutError) as exc:
        price_order(request([{"menu_item_id": "muffin", "quantity": 1, "notes": "a" * 201}]), catalog())
    assert code_of(exc) == "VALIDATION_ERROR"


@pytest.mark.parametrize("method", ["FLEX_PASS", "POINTS"])
def test_only_huskybucks_accepted(method):
    with pytest.raises(CheckoutError) as exc:
        price_order(request([{"menu_item_id": "muffin", "quantity": 1}], payment=method), catalog())
    assert code_of(exc) == "PAYMENT_METHOD_UNAVAILABLE"
    assert exc.value.status_code == 422


@pytest.mark.parametrize(
    "option_ids, code",
    [
        ([], "VALIDATION_ERROR"),  # required Size missing
        (["o-med", "o-lg"], "VALIDATION_ERROR"),  # over max for Size
        (["o-med", "o-shot", "o-van", "o-car"], "VALIDATION_ERROR"),  # over max for Add-ons
        (["o-med", "o-med"], "VALIDATION_ERROR"),  # duplicate
        (["o-med", "o-not-real"], "VALIDATION_ERROR"),  # foreign option
    ],
)
def test_selection_rules(option_ids, code):
    with pytest.raises(CheckoutError) as exc:
        price_order(request([{"menu_item_id": "latte", "quantity": 1, "selected_option_ids": option_ids}]), catalog())
    assert code_of(exc) == code


def test_option_from_another_item_rejected():
    with pytest.raises(CheckoutError) as exc:
        price_order(request([{"menu_item_id": "muffin", "quantity": 1, "selected_option_ids": ["o-med"]}]), catalog())
    assert code_of(exc) == "VALIDATION_ERROR"


def test_unavailable_modifier_rejected():
    with pytest.raises(CheckoutError) as exc:
        price_order(
            request([{"menu_item_id": "latte", "quantity": 1, "selected_option_ids": ["o-med", "o-oat"]}]),
            catalog(latte(oat_available=False)),
        )
    assert code_of(exc) == "ITEM_UNAVAILABLE"


def test_unavailable_item_and_closed_location_rejected():
    with pytest.raises(CheckoutError) as exc:
        price_order(
            request([{"menu_item_id": "latte", "quantity": 1, "selected_option_ids": ["o-med"]}]),
            catalog(latte(available=False)),
        )
    assert code_of(exc) == "ITEM_UNAVAILABLE"
    with pytest.raises(CheckoutError) as exc:
        price_order(request([{"menu_item_id": "muffin", "quantity": 1}]), catalog(is_open=False))
    assert code_of(exc) == "ITEM_UNAVAILABLE"


def test_unknown_item_location_and_cross_location_item():
    with pytest.raises(CheckoutError) as exc:
        price_order(request([{"menu_item_id": "ghost", "quantity": 1}]), catalog())
    assert code_of(exc) == "NOT_FOUND"
    with pytest.raises(CheckoutError) as exc:
        price_order(request([{"menu_item_id": "muffin", "quantity": 1}], location="putnam"), catalog())
    assert code_of(exc) == "NOT_FOUND"
    with pytest.raises(CheckoutError) as exc:
        price_order(request([{"menu_item_id": "bagel", "quantity": 1}]), catalog())
    assert code_of(exc) == "VALIDATION_ERROR"


@pytest.mark.parametrize(
    "body",
    [
        {"location_id": "beanery", "payment_method": "HUSKYBUCKS", "items": [{"menu_item_id": "m", "quantity": 1}], "user_id": "x"},
        {"location_id": "beanery", "payment_method": "HUSKYBUCKS", "items": [{"menu_item_id": "m", "quantity": 1, "unit_price": 0}]},
        {"location_id": "beanery", "payment_method": "HUSKYBUCKS", "items": [{"menu_item_id": "m", "quantity": 1}], "total_amount": 0},
        {"location_id": "beanery", "payment_method": "HUSKYBUCKS", "items": [{"menu_item_id": "m", "quantity": 0}]},
        {"location_id": "beanery", "payment_method": "HUSKYBUCKS", "items": []},
        {"location_id": "beanery", "payment_method": "CASH", "items": [{"menu_item_id": "m", "quantity": 1}]},
    ],
)
def test_request_rejects_client_prices_identity_and_bad_shapes(body):
    with pytest.raises(ValidationError):
        CreateOrderRequest.model_validate(body)


def test_balance_check():
    assert assert_sufficient_balance(D("50.00"), D("17.55")) == D("32.45")
    assert assert_sufficient_balance(D("17.55"), D("17.55")) == D("0.00")
    with pytest.raises(CheckoutError) as exc:
        assert_sufficient_balance(D("10.00"), D("17.55"))
    assert code_of(exc) == "INSUFFICIENT_BALANCE"
