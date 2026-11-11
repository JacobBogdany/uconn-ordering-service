# Checkout Contract — Slice 2 (Vin Gluck)

Milestone 1 output: audit of the existing checkout UI, the selection/pricing rules, the balance and order request/response types, and the demo identity strategy. Read it with [master.md](master.md). The server rules are authoritative; the frontend copy is for UI feedback and the mock adapter only.

| Concern | Backend (authoritative) | Frontend mirror |
|---|---|---|
| Rules + pricing | `backend/app/services/checkout_rules.py` | `frontend/src/features/checkout/rules.ts` |
| Request/response models | `backend/app/checkout_schemas.py` | `frontend/src/types/index.ts` (checkout section) |
| Tests | `backend/tests/test_checkout_rules.py`, `test_balance_route.py` | — |

## 1. Audit of the existing UI

| Piece | Verdict | What changed |
|---|---|---|
| `CustomizationModal` | **Reused** layout and controls | It now selects by option id and uses the shared validator, so min/max and required rules match the server. Unavailable options are disabled, an optional single-choice group can be cleared, notes are limited to 200 characters, quantity is capped at 20, and a rejected add-to-cart shows an error. |
| `CartDrawer` | **Reused** item list and quantity controls | Removed the Flex Pass and Points tabs, which converted money to points. Removed the 6.35% tax, which the master contract doesn't include. Removed the pickup-location dropdown, which let Beanery items be picked up at Bookworms; the pickup location is now the cart's location. It shows server-shaped errors and blocks a second submit while one is in progress. |
| `DemoContext.placeOrder` | **Rewritten** to follow the contract | It builds a `CreateOrderRequest` (ids only, no prices), re-prices from the current catalog with the shared rules, accepts HuskyBucks only, checks funds, then debits. Fixed a StrictMode bug that could refund a cancelled order twice. |
| `MOCK_USER` (`user-uconn-01`) | **Removed** | The user id and display name now come from the signed demo session. Mock balances are keyed by the session's `user_id`. |
| Cart line merge | **Kept, made stable** | `line_id` = item + sorted option ids + normalized notes. |
| UI types | **Reconciled** | `OrderItem` now matches `order_items`: `item_name`, `line_total`, and `selected_options` as snapshot objects instead of strings. `CartItem` carries `location_id` and snapshots. `UserSession` is replaced by `BalanceResponse`. The KDS and tracking pages only needed small display changes. localStorage keys moved to `_v2` so old-shaped orders don't crash. |
| Legacy `customization_groups` | **Isolated** behind `modifierGroupsForItem()` | This adapter turns the mock's name-based groups into schema-shaped `ModifierGroup`s with deterministic ids. Delete it when Jacob's menu API returns `modifier_groups` with UUIDs. |

## 2. Selection and pricing rules

Both sides check in this order and stop at the first error.

1. **Payment:** `payment_method` must be `HUSKYBUCKS`. `FLEX_PASS` and `POINTS` return `PAYMENT_METHOD_UNAVAILABLE`. Passes and points are never converted to or from money.
2. **Location:** it must exist (`NOT_FOUND`) and have `is_open = true` (`ITEM_UNAVAILABLE`). One order has exactly one location, and every line must belong to it (`VALIDATION_ERROR`). The cart enforces the same rule.
3. **Item:** it must exist (`NOT_FOUND`) and have `is_available = true` (`ITEM_UNAVAILABLE`).
4. **Quantity:** an integer from 1 to 20 per line, with 1 to 20 lines per order (request validation).
5. **Modifiers**, for each line:
   - The same option id can't appear twice (`VALIDATION_ERROR`).
   - Every option id must belong to one of that item's groups (`VALIDATION_ERROR`).
   - Every chosen option must have `is_available = true` (`ITEM_UNAVAILABLE`).
   - For each group, the number chosen must be between **effective min** and `max_select` (`VALIDATION_ERROR`). Effective min = `max(min_select, is_required ? 1 : 0)`.
6. **Notes:** whitespace is trimmed and collapsed, a blank note becomes `null`, and the limit is **200 characters** (`VALIDATION_ERROR`).
7. **Price:**
   - `unit_price = base_price + Σ selected price_delta`, rounded to cents (half-up). It must be ≥ 0.
   - `line_total = unit_price × quantity`.
   - `total_amount = Σ line_total`.
   - **No tax, fees, or tips.** The backend uses `Decimal` and the frontend uses integer cents.
8. **Funds:** `huskybucks_balance ≥ total_amount`, otherwise `INSUFFICIENT_BALANCE`. In Milestone 2 this check must run inside the transaction, using a row lock or a conditional `update ... where huskybucks_balance >= total`.

The snapshot stored in `order_items.selected_options` is ordered by group `sort_order`, then option `sort_order`:
`[{"option_id": "...", "group_name": "Size", "name": "Large (20oz)", "price_delta": "0.75"}]`

## 3. Request and response shapes

All routes are under `/api` and use snake_case. Money is a JSON number in dollars (e.g. `17.35`).

### `GET /api/users/me/balance` (implemented; needs Supabase + seeded profile)

```json
{ "user_id": "uuid", "display_name": "Demo Student", "huskybucks_balance": 50.0, "flex_passes": 10, "dining_points": 120 }
```

The route reads only the profile matching the session's `sub` and ignores any `?user_id=`. Flex passes and points are informational only.

| Status | When |
|---|---|
| 401 | No session or an invalid session |
| 403 | Operator session |
| 404 | No profile for the identity (run the seed) |
| 503 | Supabase isn't configured (the frontend then uses mock balances) |

### `POST /api/orders` (models and rules ready; route and transaction come in Milestone 2)

Request (`extra` fields are forbidden, so a body containing `user_id`, `unit_price`, or `total_amount` gets a 422):

```json
{
  "location_id": "uuid",
  "payment_method": "HUSKYBUCKS",
  "items": [
    { "menu_item_id": "uuid", "quantity": 2, "selected_option_ids": ["uuid", "uuid"], "notes": "extra ice" }
  ]
}
```

Response `201`:

```json
{
  "order_id": "uuid", "pickup_code": "B-104", "status": "RECEIVED",
  "location_id": "uuid", "location_name": "The Beanery",
  "payment_method": "HUSKYBUCKS", "total_amount": 17.35, "estimated_prep_minutes": 10,
  "created_at": "2026-11-17T15:04:05Z",
  "items": [
    { "id": "uuid", "menu_item_id": "uuid", "item_name": "Iced Vanilla Latte", "quantity": 2,
      "unit_price": 7.30, "line_total": 14.60,
      "selected_options": [{ "option_id": "uuid", "group_name": "Size", "name": "Large (20oz)", "price_delta": 0.75 }],
      "notes": "extra ice" }
  ],
  "balance": { "payment_method": "HUSKYBUCKS", "amount_charged": 17.35, "huskybucks_balance": 32.65 }
}
```

### Errors

The body is `{"detail": {"code": "...", "message": "...", "field": "items[0].selected_option_ids"}}`. `field` is optional.

| Code | HTTP status |
|---|---|
| `VALIDATION_ERROR` | 422 |
| `PAYMENT_METHOD_UNAVAILABLE` | 422 |
| `NOT_FOUND` | 404 |
| `ITEM_UNAVAILABLE` | 409 |
| `INSUFFICIENT_BALANCE` | 409 |

Pydantic shape errors keep FastAPI's default 422 list format.

## 4. Demo identity strategy

- **Who is checking out** is decided only by the bearer token from `POST /api/demo/login`, which is server-signed and short-lived. `require_student` (in `security/authorization.py`) verifies the token, requires `role == "student"`, and returns the signed `sub` (the `DEMO_STUDENT_USER_ID` seeded `auth.users` UUID).
- **Nothing the browser sends is trusted as identity or money.** Requests have no user-id field, and unknown fields are rejected. Query strings like `?user_id=` are ignored. Prices, totals, and balances are always recomputed or read on the server.
- **Operators can't check out or read balances** (403). Staff routes use `require_operator`.
- **Demo mode off** means every checkout route returns 401, because `require_demo_identity` rejects all sessions.
- **Frontend:** `demoAuth.user_id` and `display_name` come from the login response and are used only for display and for keying mock balances. They are never sent as authorization. The token is sent as `Authorization: Bearer` once the API calls are wired up in Milestone 2.

## 5. Coordination and open items

- **Jacob:**
  - The menu response should include `modifier_groups: ModifierGroup[]` (`id`, `name`, `is_required`, `min_select`, `max_select`, `sort_order`, `options[]` with `id`, `name`, `price_delta`, `is_available`, `sort_order`). The seed should satisfy the migration's checks: `is_required` implies `min_select ≥ 1`, and `min_select ≤ max_select`.
  - Once that ships, delete `modifierGroupsForItem()`.
- **Vincent:**
  - `GET /api/orders/{id}` should return the same order shape as the `POST /api/orders` response, minus `balance`.
  - Please confirm the `{"detail": {code, message, field}}` error body.
  - The tracking and KDS pages now read `item.item_name`, `item.line_total`, and `selected_options[].name`.
  - I added `require_student` next to `require_operator`.
- **Milestone 2:**
  - Pickup codes must be collision-safe per location. A retry on the `(location_id, pickup_code)` unique constraint is acceptable.
  - Add an idempotency key so a repeated submit can't charge twice.
  - Do the debit and the inserts in one Postgres function or transaction.
- **Out of scope:** Flex Pass and Points redemption, tax, and cancellation refunds through the API (the mock refunds HuskyBucks only).
