"""Balance and checkout endpoints are owned by the checkout slice (Vin).

Identity strategy: every route depends on `require_student`, which verifies the
server-signed demo session and returns its `sub` claim. No route accepts a user
id, role, price, total, or balance from the browser. `POST /orders` (atomic
pricing + debit + insert) lands in Milestone 2 using `services.checkout_rules`.
"""

from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.checkout_schemas import ApiErrorResponse, BalanceResponse
from app.database import get_supabase_client
from app.security.authorization import require_student

router = APIRouter(tags=["checkout"])


@router.get(
    "/users/me/balance",
    response_model=BalanceResponse,
    responses={404: {"model": ApiErrorResponse}},
)
def get_my_balance(identity: dict[str, Any] = Depends(require_student)) -> BalanceResponse:
    client = get_supabase_client()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase is not configured; the frontend uses its mock balance.",
        )

    user_id = identity["sub"]
    result = (
        client.table("profiles")
        .select("id, display_name, huskybucks_balance, flex_passes, dining_points")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    rows = result.data or []
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "No profile exists for this demo identity. Run the seed."},
        )
    row = rows[0]
    return BalanceResponse(
        user_id=str(row["id"]),
        display_name=row["display_name"],
        huskybucks_balance=Decimal(str(row["huskybucks_balance"])),
        flex_passes=int(row["flex_passes"]),
        dining_points=int(row["dining_points"]),
    )
