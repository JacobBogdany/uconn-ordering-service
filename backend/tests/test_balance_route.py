from fastapi.testclient import TestClient

from app.main import app
from app.api.routes import checkout as checkout_routes


def token_for(client: TestClient, persona: str) -> str:
    response = client.post("/api/demo/login", json={"persona": persona})
    assert response.status_code == 200
    return response.json()["access_token"]


class FakeQuery:
    def __init__(self, rows, calls):
        self.rows, self.calls = rows, calls

    def select(self, *_):
        return self

    def eq(self, column, value):
        self.calls.append((column, value))
        self.rows = [r for r in self.rows if r.get(column) == value]
        return self

    def limit(self, _):
        return self

    def execute(self):
        return type("Result", (), {"data": self.rows})()


class FakeSupabase:
    def __init__(self, rows):
        self.rows, self.calls = rows, []

    def table(self, name):
        assert name == "profiles"
        return FakeQuery(list(self.rows), self.calls)


def test_balance_requires_session_and_student_role():
    client = TestClient(app)
    assert client.get("/api/users/me/balance").status_code == 401
    operator = token_for(client, "operator")
    assert client.get("/api/users/me/balance", headers={"Authorization": f"Bearer {operator}"}).status_code == 403


def test_balance_reports_unconfigured_supabase():
    client = TestClient(app)
    student = token_for(client, "student")
    response = client.get("/api/users/me/balance", headers={"Authorization": f"Bearer {student}"})
    assert response.status_code == 503


def test_balance_reads_only_the_session_profile(monkeypatch):
    from app.config import get_settings

    student_id = get_settings().demo_student_user_id
    fake = FakeSupabase([
        {"id": student_id, "display_name": "Demo Student", "huskybucks_balance": "42.50", "flex_passes": 10, "dining_points": 120},
        {"id": "someone-else", "display_name": "Other", "huskybucks_balance": "999.00", "flex_passes": 0, "dining_points": 0},
    ])
    monkeypatch.setattr(checkout_routes, "get_supabase_client", lambda: fake)
    client = TestClient(app)
    student = token_for(client, "student")
    response = client.get(
        "/api/users/me/balance?user_id=someone-else",
        headers={"Authorization": f"Bearer {student}"},
    )
    assert response.status_code == 200
    assert response.json() == {
        "user_id": student_id,
        "display_name": "Demo Student",
        "huskybucks_balance": 42.5,
        "flex_passes": 10,
        "dining_points": 120,
    }
    assert fake.calls == [("id", student_id)]
