# Vin Gluck — Checkout and Slice 2

Own balance display, customization, cart, server-side pricing, and simulated checkout. Coordinate schema and response contracts with Jacob and Vincent.

## Milestone 1 — Week 1 (Nov 10–15): Checkout rules and shared types

- [x] Audit existing customization/cart/checkout UI and note which pieces can be reused; reconcile UI types with the proposed database/API model.
- [x] Use the locked first-demo payment rule: accept HuskyBucks only. Keep Flex Passes and Points out of checkout until redemption rules are explicitly approved; never infer a conversion.
- [x] Define selection validation rules for required groups, max selections, unavailable modifiers, notes, and price calculation.
- [x] Align profile/balance and order request/response types with the Supabase schema; use `/api/users/me/balance` rather than arbitrary user IDs once identity is available.
- [x] Use the logged-in demo student identity for balance and checkout; remove any hardcoded user IDs from requests and coordinate the session type with Vincent.
- [x] Specify a development demo identity strategy that does not treat a client-supplied ID as authorization.

**Acceptance:** checkout inputs, price rules, and response shape follow the master contract; first-demo payment behavior is HuskyBucks-only, with no pass/points conversion.

**Handoff (Milestone 1):** see [checkout_contract.md](checkout_contract.md) for the audit, rules, request/response shapes, error codes, and identity strategy. Rules live in `backend/app/services/checkout_rules.py` (authoritative, unit-tested) and `frontend/src/features/checkout/rules.ts` (UI mirror). `GET /api/users/me/balance` is implemented and session-scoped; it needs Supabase plus Jacob's seeded profile to return data. Known limitation: the frontend still runs checkout through the mock adapter until `POST /api/orders` lands in Milestone 2.

## Milestone 2 — Week 2 (Nov 16–22): Persisted checkout vertical slice

- [x] Implement balance lookup through the backend.
- [x] Implement server-authoritative price calculation from current menu and modifier rows; never accept client totals/prices.
- [x] Implement atomic checkout: verify item availability and selections, check funds, debit simulated balance, create order and item snapshots in one transaction.
- [x] Generate collision-safe pickup codes and return order confirmation, remaining simulated balance, and item snapshots.
- [x] Connect customization modal, cart quantity controls, payment choice (only agreed methods), loading/errors, and confirmation to the API.
- [x] Coordinate new order response and status read expectations with Vincent’s tracking/KDS work.

**Acceptance:** valid checkout persists a correctly priced order once; insufficient funds, invalid modifiers, or stale availability leave balance and orders unchanged; repeated submission does not double charge.

**Handoff (Milestone 2):**
- **Migration:** `supabase/migrations/20261117120000_checkout.sql` adds `orders.idempotency_key` (unique per user), `order_items.line_no`, `pickup_counters`, and the service-role-only function `place_order`. Jacob must apply it to the Supabase project after the initial migration and seed.
- **API:** `POST /api/orders` (`routes/checkout.py`, `services/checkout_service.py`) needs an `Idempotency-Key` header; CORS now allows it. `GET /api/users/me/balance` is unchanged.
- **Frontend:** cart/checkout calls the API (balance from `/users/me/balance`, receipt from the response); the mock checkout is used only on a `503`.
- **Tests:** `pytest backend/tests` (19 new route tests with a fake client). `backend/tests/verify_checkout_sql.py` runs the migration on a throwaway Postgres: atomic debit, replay, stale price/availability, insufficient funds, concurrent codes, overdraw race.
- **For Vincent:** `GET /api/orders/{id}` now returns lines in order and snapshots written by checkout (`price_delta` is a number). Persisted orders are fetched by the tracking page, not stored in local mock state.
- **Not yet verified:** against Jacob's live Supabase project (needs the migration applied and `DEMO_*` ids set), and in the browser end to end.

## Milestone 3 — Week 3 (Nov 23–29): Checkout integration and edge cases

- [ ] Integrate checkout with Jacob’s live catalog/modifier response and Vincent’s order lifecycle endpoints.
- [ ] Verify that cart display and server total agree for combinations, quantities, and notes; handle changed/unavailable menu items gracefully.
- [ ] Confirm balance remains nonnegative and order snapshots preserve the purchased item/options if catalog data later changes.
- [ ] Support any agreed cancellation/refund behavior only if time permits and implement it transactionally; otherwise document it as out of scope.
- [ ] Walk through checkout on Jacob’s deployed app and fix the highest-impact mobile and error-state issues; send deployment/configuration issues to Jacob rather than changing deployment settings.

**Acceptance:** deployed customer flow can browse, customize, pay with the agreed simulated method, receive one pickup code, and enter tracking with accurate receipt details.
