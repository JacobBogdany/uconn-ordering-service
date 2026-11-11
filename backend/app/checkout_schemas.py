"""Checkout request/response contract (Vin / Slice 2).

Mirrors `frontend/src/types/index.ts` (checkout section) and the Supabase
`profiles`, `orders`, and `order_items` tables. Requests forbid unknown fields so
a browser cannot smuggle in `user_id`, `unit_price`, `total_amount`, or a balance.
See `context/checkout_contract.md`.
"""

from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer

# Money crosses the wire as a JSON number with two decimals (e.g. 5.55).
Money = Annotated[Decimal, PlainSerializer(lambda v: float(v), return_type=float, when_used="json")]

PaymentMethod = Literal["HUSKYBUCKS", "FLEX_PASS", "POINTS"]
OrderStatus = Literal["RECEIVED", "PREPPING", "READY", "COMPLETED", "CANCELLED"]
CheckoutErrorCode = Literal[
    "VALIDATION_ERROR",
    "NOT_FOUND",
    "ITEM_UNAVAILABLE",
    "INSUFFICIENT_BALANCE",
    "PAYMENT_METHOD_UNAVAILABLE",
]

MAX_LINES_PER_ORDER = 20
MAX_QUANTITY_PER_LINE = 20
MAX_OPTIONS_PER_LINE = 20


class BalanceResponse(BaseModel):
    """`GET /api/users/me/balance` — the caller's own profile, never another user's."""

    user_id: str
    display_name: str
    huskybucks_balance: Money
    # Informational only. Not accepted at checkout until redemption rules are approved.
    flex_passes: int
    dining_points: int


class CreateOrderLine(BaseModel):
    model_config = ConfigDict(extra="forbid")

    menu_item_id: str = Field(min_length=1)
    quantity: int = Field(ge=1, le=MAX_QUANTITY_PER_LINE)
    selected_option_ids: list[str] = Field(default_factory=list, max_length=MAX_OPTIONS_PER_LINE)
    notes: str | None = Field(default=None, max_length=500)  # trimmed/limited to 200 by rules


class CreateOrderRequest(BaseModel):
    """`POST /api/orders` body. Identity comes from the bearer session, not the body."""

    model_config = ConfigDict(extra="forbid")

    location_id: str = Field(min_length=1)
    # The enum is accepted so FLEX_PASS/POINTS get PAYMENT_METHOD_UNAVAILABLE rather
    # than a generic 422; checkout_rules accepts HUSKYBUCKS only.
    payment_method: PaymentMethod
    items: list[CreateOrderLine] = Field(min_length=1, max_length=MAX_LINES_PER_ORDER)


class SelectedOptionOut(BaseModel):
    option_id: str | None = None
    group_name: str
    name: str
    price_delta: Money


class OrderLineOut(BaseModel):
    id: str
    menu_item_id: str | None
    item_name: str
    quantity: int
    unit_price: Money  # includes selected modifiers for one unit
    line_total: Money
    selected_options: list[SelectedOptionOut]
    notes: str | None


class BalanceSummary(BaseModel):
    payment_method: Literal["HUSKYBUCKS"] = "HUSKYBUCKS"
    amount_charged: Money
    huskybucks_balance: Money  # remaining after the charge


class CreateOrderResponse(BaseModel):
    """`POST /api/orders` 201 response. `GET /api/orders/{id}` should reuse `order`."""

    order_id: str
    pickup_code: str
    status: OrderStatus
    location_id: str
    location_name: str
    payment_method: Literal["HUSKYBUCKS"]
    total_amount: Money
    estimated_prep_minutes: int
    created_at: datetime
    items: list[OrderLineOut]
    balance: BalanceSummary


class ApiErrorDetail(BaseModel):
    code: CheckoutErrorCode
    message: str
    field: str | None = None


class ApiErrorResponse(BaseModel):
    """Error body: `{"detail": {"code": ..., "message": ..., "field": ...}}`."""

    detail: ApiErrorDetail
