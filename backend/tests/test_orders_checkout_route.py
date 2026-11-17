"""POST /api/orders: identity, pricing, idempotency and error mapping.

The Postgres transaction itself (atomic debit, row locks, pickup codes) lives in
supabase/migrations/20261117120000_checkout.sql and is exercised against a real
database by `backend/tests/verify_checkout_sql.py`; these tests use a fake client.
"""

import pytest
from fastapi.testclient import TestClient
from postgrest.exceptions import APIError

from app.api.routes import checkout as checkout_routes
from app.main import app
from app.services import checkout_service

LOC = "10000000-0000-4000-8000-000000000001"
LATTE = "20000000-0000-4000-8000-000000000101"
MUFFIN = "20000000-0000-4000-8000-000000000102"
G_SIZE = "30000000-0000-4000-8000-000000000101"
O_MED = "40000000-0000-4000-8000-000000000101"
O_LG = "40000000-0000-4000-8000-000000000102"
KEY = "test-key-0001"


class Result:
    def __init__(self, data):
        self.data = data


class FakeQuery:
    def __init__(self, rows):
        self.rows = rows

    def select(self, *_):
        return self

    def eq(self, column, value):
        self.rows = [r for r in self.rows if str(r.get(column)) == str(value)]
        return self

    def in_(self, column, values):
        self.rows = [r for r in self.rows if str(r.get(column)) in {str(v) for v in values}]
        return self

    def limit(self, _):
        return self

    def execute(self):
        return Result(self.rows)


class FakeSupabase:
    """Catalog tables plus a scripted `place_order` rpc."""

    def __init__(self):
        self.tables = {
            "locations": [{"id": LOC, "name": "The Beanery", "is_open": True}],
            "menu_items": [
                {"id": LATTE, "location_id": LOC, "name": "Iced Vanilla Latte", "base_price": "4.75", "is_available": True},
                {"id": MUFFIN, "location_id": LOC, "name": "Blueberry Muffin", "base_price": "2.95", "is_available": True},
            ],
            "modifier_groups": [
                {"id": G_SIZE, "menu_item_id": LATTE, "name": "Size", "is_required": True, "min_select": 1, "max_select": 1, "sort_order": 0},
            ],
            "modifier_options": [
                {"id": O_MED, "group_id": G_SIZE, "name": "Medium (16oz)", "price_delta": "0.00", "is_available": True, "sort_order": 0},
                {"id": O_LG, "group_id": G_SIZE, "name": "Large (20oz)", "price_delta": "0.75", "is_available": True, "sort_order": 1},
            ],
        }
        self.rpc_calls = []
        self.rpc_script = []  # items: dict result | Exception

    def table(self, name):
        return FakeQuery(list(self.tables[name]))

    def rpc(self, name, params):
        assert name == "place_order"
        self.rpc_calls.append(params)
        outer = self

        class Call:
            def execute(self):
                step = outer.rpc_script.pop(0) if outer.rpc_script else outer.receipt(params)
                if isinstance(step, Exception):
                    raise step
                return Result(step)

        return Call()

    def receipt(self, params, *, replayed=False, balance="32.65"):
        lines = []
        total = 0.0
        for n, line in enumerate(params["p_lines"]):
            row = next(r for r in self.tables["menu_items"] if r["id"] == line["menu_item_id"])
            unit = line["unit_price"]
            total += unit * line["quantity"]
            lines.append({
                "id": f"50000000-0000-4000-8000-00000000000{n}", "menu_item_id": row["id"], "item_name": row["name"],
                "quantity": line["quantity"], "unit_price": unit, "line_total": unit * line["quantity"],
                "selected_options": [
                    {"option_id": oid, "group_name": "Size", "name": "Large (20oz)", "price_delta": 0.75}
                    for oid in line["selected_option_ids"]
                ],
                "notes": line["notes"],
            })
        return {
            "order_id": "60000000-0000-4000-8000-000000000001", "pickup_code": "#B-101", "status": "RECEIVED",
            "location_id": LOC, "location_name": "The Beanery", "payment_method": "HUSKYBUCKS",
            "total_amount": round(total, 2), "estimated_prep_minutes": 10,
            "created_at": "2026-11-17T15:04:05.123456+00:00", "items": lines, "replayed": replayed,
            "balance": {"payment_method": "HUSKYBUCKS", "amount_charged": round(total, 2), "huskybucks_balance": float(balance)},
        }


def db_error(code, message, details="", hint=""):
    return APIError({"code": code, "message": message, "details": details, "hint": hint})


@pytest.fixture
def fake(monkeypatch):
    client = FakeSupabase()
    monkeypatch.setattr(checkout_routes, "get_supabase_client", lambda: client)
    return client


@pytest.fixture
def http():
    return TestClient(app)


def session(http, persona="student"):
    response = http.post("/api/demo/login", json={"persona": persona})
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def body(**overrides):
    payload = {
        "location_id": LOC,
        "payment_method": "HUSKYBUCKS",
        "items": [{"menu_item_id": LATTE, "quantity": 2, "selected_option_ids": [O_LG], "notes": "  extra   ice "}],
    }
    payload.update(overrides)
    return payload


def post(http, payload=None, *, key=KEY, headers=None):
    headers = dict(headers or session(http))
    if key:
        headers["Idempotency-Key"] = key
    return http.post("/api/orders", json=payload or body(), headers=headers)


def test_requires_student_session(http, fake):
    assert http.post("/api/orders", json=body()).status_code == 401
    assert post(http, headers=session(http, "operator")).status_code == 403
    assert fake.rpc_calls == []


def test_unconfigured_supabase_returns_503_for_mock_fallback(http):
    assert post(http).status_code == 503


def test_creates_order_with_server_priced_lines_and_session_identity(http, fake):
    from app.config import get_settings

    response = post(http)
    assert response.status_code == 201
    data = response.json()
    assert data["pickup_code"] == "#B-101"
    assert data["total_amount"] == 11.0  # 2 x (4.75 + 0.75)
    assert data["balance"]["huskybucks_balance"] == 32.65
    assert data["items"][0]["selected_options"][0]["name"] == "Large (20oz)"
    call = fake.rpc_calls[0]
    assert call["p_user_id"] == get_settings().demo_student_user_id
    assert call["p_idempotency_key"] == KEY
    assert call["p_lines"] == [
        {"menu_item_id": LATTE, "quantity": 2, "selected_option_ids": [O_LG], "notes": "extra ice", "unit_price": 5.5}
    ]


def test_browser_cannot_supply_identity_or_money(http, fake):
    for field, value in [("user_id", "someone-else"), ("total_amount", 0.01), ("huskybucks_balance", 999)]:
        assert post(http, body(**{field: value})).status_code == 422
    line = {"menu_item_id": LATTE, "quantity": 1, "selected_option_ids": [O_MED], "unit_price": 0.01}
    assert post(http, body(items=[line])).status_code == 422
    assert fake.rpc_calls == []


@pytest.mark.parametrize("key", [None, "short", "has spaces in it!", "x" * 101])
def test_requires_valid_idempotency_key(http, fake, key):
    response = post(http, key=key)
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "VALIDATION_ERROR"
    assert response.json()["detail"]["field"] == "Idempotency-Key"
    assert fake.rpc_calls == []


def test_repeated_key_returns_original_receipt_with_200(http, fake):
    fake.rpc_script = [fake.receipt({"p_lines": [{"menu_item_id": MUFFIN, "quantity": 1, "unit_price": 2.95, "selected_option_ids": [], "notes": None}]}, replayed=True)]
    payload = body(items=[{"menu_item_id": MUFFIN, "quantity": 1, "selected_option_ids": []}])
    assert post(http, payload).status_code == 200


def test_flex_pass_and_points_rejected_before_database(http, fake):
    for method in ("FLEX_PASS", "POINTS"):
        response = post(http, body(payment_method=method))
        assert response.status_code == 422
        assert response.json()["detail"]["code"] == "PAYMENT_METHOD_UNAVAILABLE"
    assert post(http, body(payment_method="CASH")).status_code == 422
    assert fake.rpc_calls == []


def test_invalid_modifiers_rejected_before_database(http, fake):
    missing = body(items=[{"menu_item_id": LATTE, "quantity": 1, "selected_option_ids": []}])
    response = post(http, missing)
    assert (response.status_code, response.json()["detail"]["code"]) == (422, "VALIDATION_ERROR")
    both = body(items=[{"menu_item_id": LATTE, "quantity": 1, "selected_option_ids": [O_MED, O_LG]}])
    assert post(http, both).status_code == 422
    foreign = body(items=[{"menu_item_id": MUFFIN, "quantity": 1, "selected_option_ids": [O_MED]}])
    assert post(http, foreign).status_code == 422
    assert fake.rpc_calls == []


def test_stale_availability_leaves_no_rpc_call(http, fake):
    fake.tables["menu_items"][0]["is_available"] = False
    response = post(http)
    assert (response.status_code, response.json()["detail"]["code"]) == (409, "ITEM_UNAVAILABLE")
    fake.tables["menu_items"][0]["is_available"] = True
    fake.tables["modifier_options"][1]["is_available"] = False
    assert post(http).status_code == 409
    fake.tables["modifier_options"][1]["is_available"] = True
    fake.tables["locations"][0]["is_open"] = False
    assert post(http).status_code == 409
    assert fake.rpc_calls == []


def test_unknown_or_malformed_ids_are_not_found(http, fake):
    assert post(http, body(location_id="not-a-uuid")).status_code == 404
    unknown = body(items=[{"menu_item_id": "20000000-0000-4000-8000-0000000009ff", "quantity": 1, "selected_option_ids": []}])
    response = post(http, unknown)
    assert (response.status_code, response.json()["detail"]["field"]) == (404, "items[0].menu_item_id")
    assert post(http, body(location_id="10000000-0000-4000-8000-0000000009ff")).status_code == 404
    assert fake.rpc_calls == []


def test_uppercase_ids_are_canonicalised(http, fake):
    payload = body(location_id=LOC.upper(), items=[{"menu_item_id": LATTE.upper(), "quantity": 1, "selected_option_ids": [O_MED.upper()]}])
    assert post(http, payload).status_code == 201
    assert fake.rpc_calls[0]["p_lines"][0]["menu_item_id"] == LATTE


def test_database_insufficient_balance_maps_to_409(http, fake):
    fake.rpc_script = [db_error("HB001", "INSUFFICIENT_BALANCE", "Order total $11.00 exceeds HuskyBucks balance $3.00.")]
    response = post(http)
    assert response.status_code == 409
    assert response.json() == {"detail": {"code": "INSUFFICIENT_BALANCE", "message": "Order total $11.00 exceeds HuskyBucks balance $3.00."}}


def test_stale_catalog_reprices_once_then_succeeds(http, fake):
    fake.rpc_script = [db_error("HB001", "STALE_CATALOG", "Prices changed.", "items[0]")]
    assert post(http).status_code == 201
    assert len(fake.rpc_calls) == 2


def test_stale_catalog_twice_reports_menu_changed(http, fake):
    fake.rpc_script = [db_error("HB001", "STALE_CATALOG"), db_error("HB001", "STALE_CATALOG")]
    response = post(http)
    assert (response.status_code, response.json()["detail"]["code"]) == (409, "ITEM_UNAVAILABLE")


def test_unexpected_database_error_is_hidden(http, fake):
    fake.rpc_script = [db_error("XX000", "connection secret=abc123 refused")]
    response = post(http)
    assert response.status_code == 503
    assert "abc123" not in response.text


def test_checkout_service_exports_no_user_override():
    import inspect

    assert "user_id" in inspect.signature(checkout_service.place_order).parameters
