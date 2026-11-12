"""Order detail, operator queue, and lifecycle endpoints."""

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict

from app.database import get_supabase_client
from app.security.authorization import require_demo_identity, require_operator

router = APIRouter(tags=["orders"])
ACTIVE = ("RECEIVED", "PREPPING", "READY")
NEXT = {"RECEIVED": "PREPPING", "PREPPING": "READY", "READY": "COMPLETED"}
TIME_COLUMN = {"PREPPING": "prepping_at", "READY": "ready_at", "COMPLETED": "completed_at"}


class OrderStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str


def _client():
    client = get_supabase_client()
    if client is None:
        raise HTTPException(503, "Supabase is not configured.")
    return client


def _order_detail(client, row: dict[str, Any]) -> dict[str, Any]:
    location_result = client.table("locations").select("id,name").eq("id", row["location_id"]).limit(1).execute()
    locations = location_result.data or []
    if not locations:
        raise HTTPException(404, "Order location not found.")
    items_result = client.table("order_items").select("*").eq("order_id", row["id"]).execute()
    items = []
    for item in items_result.data or []:
        unit = float(item["unit_price"])
        items.append({
            "id": str(item["id"]), "menu_item_id": str(item["menu_item_id"]) if item.get("menu_item_id") else None,
            "item_name": item["item_name"], "quantity": int(item["quantity"]), "unit_price": unit,
            "line_total": round(unit * int(item["quantity"]), 2), "selected_options": item.get("selected_options") or [],
            "notes": item.get("notes"),
        })
    return {
        "order_id": str(row["id"]), "pickup_code": row["pickup_code"], "status": row["status"],
        "location_id": str(row["location_id"]), "location_name": locations[0]["name"],
        "total_amount": float(row["total_amount"]), "payment_method": row["payment_method"],
        "estimated_prep_minutes": int(row.get("estimated_prep_minutes", 10)),
        "created_at": row["created_at"], "items": items,
    }


@router.get("/orders/queue")
def get_queue(location_id: str = Query(min_length=1), identity: dict[str, Any] = Depends(require_operator)):
    client = _client()
    result = (client.table("orders").select("*").eq("location_id", location_id)
              .in_("status", list(ACTIVE)).order("created_at").execute())
    rows = result.data or []
    if not rows:
        return {"location_id": location_id, "received": [], "prepping": [], "ready": []}
    profile_ids = list({row["user_id"] for row in rows})
    profiles = client.table("profiles").select("id,display_name").in_("id", profile_ids).execute().data or []
    names = {p["id"]: p["display_name"] for p in profiles}
    groups = {"RECEIVED": [], "PREPPING": [], "READY": []}
    now = datetime.now(timezone.utc)
    for row in rows:
        detail = _order_detail(client, row)
        created = datetime.fromisoformat(row["created_at"].replace("Z", "+00:00"))
        groups[row["status"]].append({
            **detail, "customer_name": names.get(row["user_id"], "Student"),
            "time_elapsed_minutes": max(0, int((now - created).total_seconds() // 60)),
        })
    return {"location_id": location_id, "received": groups["RECEIVED"],
            "prepping": groups["PREPPING"], "ready": groups["READY"]}


@router.get("/orders/{order_id}")
def get_order(order_id: str, identity: dict[str, Any] = Depends(require_demo_identity)):
    client = _client()
    result = client.table("orders").select("*").eq("id", order_id).limit(1).execute()
    rows = result.data or []
    if not rows:
        raise HTTPException(404, "Order not found.")
    row = rows[0]
    if identity["role"] != "staff" and row["user_id"] != identity["sub"]:
        raise HTTPException(404, "Order not found.")
    detail = _order_detail(client, row)
    profile = client.table("profiles").select("display_name").eq("id", row["user_id"]).limit(1).execute().data or []
    detail["customer_name"] = profile[0]["display_name"] if profile else "Student"
    return detail


@router.patch("/orders/{order_id}/status")
def update_order_status(order_id: str, payload: OrderStatusUpdate, identity: dict[str, Any] = Depends(require_operator)):
    next_status = payload.status
    if next_status not in TIME_COLUMN:
        raise HTTPException(422, "Status must be PREPPING, READY, or COMPLETED.")
    client = _client()
    result = client.table("orders").select("id,location_id,status").eq("id", order_id).limit(1).execute()
    rows = result.data or []
    if not rows:
        raise HTTPException(404, "Order not found.")
    row = rows[0]
    if NEXT.get(row["status"]) != next_status:
        raise HTTPException(409, f"Invalid transition from {row['status']} to {next_status}.")
    updates = {"status": next_status, TIME_COLUMN[next_status]: datetime.now(timezone.utc).isoformat()}
    updated = (client.table("orders").update(updates).eq("id", order_id)
               .eq("status", row["status"]).select("id").execute().data or [])
    if not updated:
        raise HTTPException(409, "Order changed while processing; refresh the queue.")
    return {"order_id": order_id, "status": next_status, TIME_COLUMN[next_status]: updates[TIME_COLUMN[next_status]]}
