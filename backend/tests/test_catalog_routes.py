from decimal import Decimal
import uuid

from fastapi.testclient import TestClient

from app.api.routes import catalog as catalog_routes
from app.main import app


def token_for(client: TestClient, persona: str) -> str:
    response = client.post("/api/demo/login", json={"persona": persona})
    assert response.status_code == 200
    return response.json()["access_token"]


class FakeQuery:
    def __init__(self, rows: list[dict], calls: list):
        self.rows = rows
        self.calls = calls

    def select(self, *_):
        return self

    def eq(self, column, value):
        self.calls.append(("eq", column, value))
        self.rows = [r for r in self.rows if r.get(column) == value]
        return self

    def in_(self, column, values):
        self.calls.append(("in_", column, values))
        val_set = set(values)
        self.rows = [r for r in self.rows if r.get(column) in val_set]
        return self

    def order(self, column, **kwargs):
        self.calls.append(("order", column))
        return self

    def limit(self, count):
        self.calls.append(("limit", count))
        self.rows = self.rows[:count]
        return self

    def update(self, values: dict):
        self.calls.append(("update", values))
        for r in self.rows:
            r.update(values)
        return self

    def execute(self):
        return type("Result", (), {"data": self.rows})()


class FakeSupabase:
    def __init__(self, tables: dict[str, list[dict]]):
        self.tables = {name: [dict(r) for r in rows] for name, rows in tables.items()}
        self.calls = []

    def table(self, name: str):
        rows = self.tables.get(name, [])
        return FakeQuery(rows, self.calls)


MOCK_LOCATION_ID = "00000000-0000-4000-8000-000000000010"
MOCK_ITEM_ID_1 = "00000000-0000-4000-8000-000000000101"
MOCK_ITEM_ID_2 = "00000000-0000-4000-8000-000000000102"
MOCK_GROUP_ID = "00000000-0000-4000-8000-000000000201"
MOCK_OPTION_ID = "00000000-0000-4000-8000-000000000301"

SAMPLE_TABLES = {
    "locations": [
        {
            "id": MOCK_LOCATION_ID,
            "slug": "beanery",
            "name": "The Beanery",
            "building": "Benton Hall",
            "hours_text": "Mon-Fri 7:30am - 4:00pm",
            "is_open": True,
        }
    ],
    "menu_items": [
        {
            "id": MOCK_ITEM_ID_1,
            "location_id": MOCK_LOCATION_ID,
            "name": "Cold Brew",
            "description": "Steeped for 20 hours",
            "category": "Drinks",
            "base_price": Decimal("4.25"),
            "dietary_tags": ["vegan", "gluten-free"],
            "is_available": True,
        },
        {
            "id": MOCK_ITEM_ID_2,
            "location_id": MOCK_LOCATION_ID,
            "name": "Ham & Cheese Croissant",
            "description": "Freshly baked",
            "category": "Bakery",
            "base_price": Decimal("5.50"),
            "dietary_tags": [],
            "is_available": True,
        },
    ],
    "modifier_groups": [
        {
            "id": MOCK_GROUP_ID,
            "menu_item_id": MOCK_ITEM_ID_1,
            "name": "Milk Choice",
            "is_required": False,
            "min_select": 0,
            "max_select": 1,
            "sort_order": 0,
        }
    ],
    "modifier_options": [
        {
            "id": MOCK_OPTION_ID,
            "group_id": MOCK_GROUP_ID,
            "name": "Oat Milk",
            "price_delta": Decimal("0.75"),
            "is_available": True,
            "sort_order": 0,
        }
    ],
    "orders": [
        {"location_id": MOCK_LOCATION_ID, "status": "RECEIVED"},
        {"location_id": MOCK_LOCATION_ID, "status": "PREPPING"},
    ],
}


def test_locations_reports_unconfigured_supabase(monkeypatch):
    client = TestClient(app)
    monkeypatch.setattr(catalog_routes, "get_supabase_client", lambda: None)
    response = client.get("/api/locations")
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "SERVICE_UNAVAILABLE"


def test_locations_success(monkeypatch):
    client = TestClient(app)
    fake_db = FakeSupabase(SAMPLE_TABLES)
    monkeypatch.setattr(catalog_routes, "get_supabase_client", lambda: fake_db)

    response = client.get("/api/locations")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    loc = data[0]
    assert loc["id"] == MOCK_LOCATION_ID
    assert loc["slug"] == "beanery"
    assert loc["name"] == "The Beanery"
    assert loc["hours"] == "Mon-Fri 7:30am - 4:00pm"
    assert loc["is_open"] is True
    assert loc["active_orders_count"] == 2
    # 5 base + 2*2 = 9
    assert loc["estimated_wait_minutes"] == 9


def test_menu_location_not_found(monkeypatch):
    client = TestClient(app)
    fake_db = FakeSupabase(SAMPLE_TABLES)
    monkeypatch.setattr(catalog_routes, "get_supabase_client", lambda: fake_db)

    response = client.get("/api/locations/nonexistent-venue/menu")
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "NOT_FOUND"


def test_menu_success_with_modifiers(monkeypatch):
    client = TestClient(app)
    fake_db = FakeSupabase(SAMPLE_TABLES)
    monkeypatch.setattr(catalog_routes, "get_supabase_client", lambda: fake_db)

    # Lookup by slug
    response = client.get("/api/locations/beanery/menu")
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 2

    cold_brew = next(i for i in items if i["id"] == MOCK_ITEM_ID_1)
    assert cold_brew["name"] == "Cold Brew"
    assert cold_brew["base_price"] == 4.25
    assert len(cold_brew["modifier_groups"]) == 1

    group = cold_brew["modifier_groups"][0]
    assert group["name"] == "Milk Choice"
    assert len(group["options"]) == 1
    assert group["options"][0]["name"] == "Oat Milk"
    assert group["options"][0]["price_delta"] == 0.75

    # Check backwards-compatible legacy customization_groups
    assert len(cold_brew["customization_groups"]) == 1
    assert cold_brew["customization_groups"][0]["group_name"] == "Milk Choice"


def test_menu_dietary_filtering(monkeypatch):
    client = TestClient(app)
    fake_db = FakeSupabase(SAMPLE_TABLES)
    monkeypatch.setattr(catalog_routes, "get_supabase_client", lambda: fake_db)

    # Filter for vegan
    response = client.get("/api/locations/beanery/menu?dietary=vegan")
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 1
    assert items[0]["id"] == MOCK_ITEM_ID_1

    # Filter for non-matching tag
    response2 = client.get("/api/locations/beanery/menu?dietary=halal")
    assert response2.status_code == 200
    assert len(response2.json()) == 0


def test_update_availability_requires_operator_role():
    client = TestClient(app)
    # No auth
    res_no_auth = client.patch(
        f"/api/menu/{MOCK_ITEM_ID_1}/availability",
        json={"is_available": False},
    )
    assert res_no_auth.status_code == 401

    # Student auth
    student_token = token_for(client, "student")
    res_student = client.patch(
        f"/api/menu/{MOCK_ITEM_ID_1}/availability",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"is_available": False},
    )
    assert res_student.status_code == 403


def test_update_availability_success(monkeypatch):
    client = TestClient(app)
    operator_token = token_for(client, "operator")
    fake_db = FakeSupabase(SAMPLE_TABLES)
    monkeypatch.setattr(catalog_routes, "get_supabase_client", lambda: fake_db)

    # Toggle to sold out
    response = client.patch(
        f"/api/menu/{MOCK_ITEM_ID_1}/availability",
        headers={"Authorization": f"Bearer {operator_token}"},
        json={"is_available": False},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == MOCK_ITEM_ID_1
    assert data["is_available"] is False
    assert "sold out" in data["message"]


def test_update_availability_not_found(monkeypatch):
    client = TestClient(app)
    operator_token = token_for(client, "operator")
    fake_db = FakeSupabase(SAMPLE_TABLES)
    monkeypatch.setattr(catalog_routes, "get_supabase_client", lambda: fake_db)

    unknown_uuid = str(uuid.uuid4())
    response = client.patch(
        f"/api/menu/{unknown_uuid}/availability",
        headers={"Authorization": f"Bearer {operator_token}"},
        json={"is_available": True},
    )
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "NOT_FOUND"
