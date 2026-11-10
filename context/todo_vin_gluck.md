# Vin Gluck — Checkout and Slice 2

Own balance display, customization, cart, server-side pricing, and simulated checkout. Coordinate schema and response contracts with Jacob and Vincent.

## Milestone 1 — Week 1 (Nov 10–15): Checkout rules and shared types

- [ ] Audit existing customization/cart/checkout UI and note which pieces can be reused; reconcile UI types with the proposed database/API model.
- [ ] Agree with the team on payment semantics. Recommend HuskyBucks-only for the first end-to-end demo unless pass/points conversion is explicitly specified.
- [ ] Define selection validation rules for required groups, max selections, unavailable modifiers, notes, and price calculation.
- [ ] Align profile/balance and order request/response types with the Supabase schema; use `/api/users/me/balance` rather than arbitrary user IDs once identity is available.
- [ ] Use the logged-in demo student identity for balance and checkout; remove any hardcoded user IDs from requests and coordinate the session type with Vincent.
- [ ] Specify a development demo identity strategy that does not treat a client-supplied ID as authorization.

**Acceptance:** checkout inputs, price rules, payment behavior, and response shape are written down and accepted by all owners before implementation.

## Milestone 2 — Week 2 (Nov 16–22): Persisted checkout vertical slice

- [ ] Implement balance lookup through the backend.
- [ ] Implement server-authoritative price calculation from current menu and modifier rows; never accept client totals/prices.
- [ ] Implement atomic checkout: verify item availability and selections, check funds, debit simulated balance, create order and item snapshots in one transaction.
- [ ] Generate collision-safe pickup codes and return order confirmation, remaining simulated balance, and item snapshots.
- [ ] Connect customization modal, cart quantity controls, payment choice (only agreed methods), loading/errors, and confirmation to the API.
- [ ] Coordinate new order response and status read expectations with Vincent’s tracking/KDS work.

**Acceptance:** valid checkout persists a correctly priced order once; insufficient funds, invalid modifiers, or stale availability leave balance and orders unchanged; repeated submission does not double charge.

## Milestone 3 — Week 3 (Nov 23–29): Checkout integration and edge cases

- [ ] Integrate checkout with Jacob’s live catalog/modifier response and Vincent’s order lifecycle endpoints.
- [ ] Verify that cart display and server total agree for combinations, quantities, and notes; handle changed/unavailable menu items gracefully.
- [ ] Confirm balance remains nonnegative and order snapshots preserve the purchased item/options if catalog data later changes.
- [ ] Support any agreed cancellation/refund behavior only if time permits and implement it transactionally; otherwise document it as out of scope.
- [ ] Walk through checkout on the deployed app and fix the highest-impact mobile and error-state issues.

**Acceptance:** deployed customer flow can browse, customize, pay with the agreed simulated method, receive one pickup code, and enter tracking with accurate receipt details.
