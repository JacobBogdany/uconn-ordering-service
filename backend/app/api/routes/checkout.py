"""Balance and checkout endpoints are owned by the checkout slice (Vin).

Identity strategy: every route depends on `require_student`, which verifies the
server-signed demo session and returns its `sub` claim. No route accepts a user
id, role, price, total, or balance from the browser. `POST /orders` (atomic
pricing + debit + insert) uses `services.checkout_rules` and `services.checkout_service`.
"""

import re
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Response, status

from app.checkout_schemas import (
    ApiErrorResponse,
    BalanceResponse,
    CreateOrderRequest,
    CreateOrderResponse,
)
from app.database import get_supabase_client
from app.security.authorization import require_student
from app.services import checkout_service
from app.services.checkout_rules import CheckoutError

IDEMPOTENCY_KEY_PATTERN = re.compile(r"^[A-Za-z0-9_-]{8,100}$")

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


@router.post(
    "/orders",
    response_model=CreateOrderResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        200: {"model": CreateOrderResponse, "description": "Idempotent replay of an earlier order."},
        404: {"model": ApiErrorResponse},
        409: {"model": ApiErrorResponse},
        422: {"model": ApiErrorResponse},
    },
)
def create_order(
    payload: CreateOrderRequest,
    response: Response,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    identity: dict[str, Any] = Depends(require_student),
) -> CreateOrderResponse:
    """Price from current menu rows, then charge HuskyBucks and persist atomically.

    The student is the signed session's `sub`; the body has no user id, prices or
    totals. `Idempotency-Key` (one per checkout attempt) makes retries safe: a
    repeated key returns the original receipt with 200 and charges nothing.
    """
    client = get_supabase_client()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase is not configured; the frontend uses its mock checkout.",
        )
    if not idempotency_key or not IDEMPOTENCY_KEY_PATTERN.match(idempotency_key):
        error = CheckoutError(
            "VALIDATION_ERROR",
            "Send an Idempotency-Key header (8-100 letters, digits, '-' or '_') with each checkout.",
            field="Idempotency-Key",
        )
        raise HTTPException(status_code=error.status_code, detail=error.to_detail())

    try:
        receipt, replayed = checkout_service.place_order(client, identity["sub"], payload, idempotency_key)
    except CheckoutError as error:
        raise HTTPException(status_code=error.status_code, detail=error.to_detail()) from error
    except checkout_service.CheckoutUnavailable as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error
    if replayed:
        response.status_code = status.HTTP_200_OK
    return receipt
