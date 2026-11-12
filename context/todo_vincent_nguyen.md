# Vincent Nguyen — Architecture and Slice 3

Own the runtime foundation, order status/tracking, KDS, and API integration. Jacob owns Supabase and Render deployment; coordinate release requirements and handoff with him and Vin.

## Milestone 1 — Week 1 (Nov 10–15): Foundation and contract

- [x] Audit existing React mock flow and identify which pages/components are reusable; report gaps and duplicate mock-data sources.
- [x] Create the FastAPI backend skeleton, health route, local run instructions, CORS for local Vite, and Render-ready start command.
- [x] Establish shared backend settings and a lazy Supabase client through environment variables; never expose the service key in frontend code.
- [x] Lock the shared order/status/payment contract, UUID conventions, API errors, and initial migration ownership in the master plan and Supabase migration. Initial checkout accepts HuskyBucks only; Vincent owns the core migration and Jacob owns catalog seed data.
- [x] Set up backend folder boundaries for catalog, checkout, and queue routes plus shared models/services.
- [x] Add a clear demo entry screen with **Log in as Student** and **Log in as Operator** buttons; connect each choice to a distinct signed session/view (operator maps to backend `staff`). Keep the demo token short-lived and server-signed, and include this acceptance criterion in AI implementation prompts.
- [x] Document a runnable frontend + backend baseline and handoff instructions.

**Acceptance:** implementation and contract are documented. Fresh-clone runtime needs installed dependencies and a generated demo secret; live Supabase connectivity needs the project credentials and seeded auth-user IDs. No credentials are committed.

## Milestone 2 — Week 2 (Nov 16–22): Order lifecycle and student tracking

- [ ] Implement `GET /api/orders/{order_id}` with owner/staff authorization and line-item snapshot response.
- [ ] Implement validated status transition service and `PATCH /api/orders/{order_id}/status`; set lifecycle timestamps server-side.
- [ ] Implement staff-scoped active queue query by location with item details and elapsed time.
- [ ] Connect the existing student tracking page to the API and poll at roughly five-second intervals with loading/error states.
- [ ] Connect or refine KDS columns/actions for received, prepping, and ready orders; ensure completed orders leave the active queue.
- [ ] Bind the demo role choice to a backend-recognized student or operator identity/session. Gate it behind explicit demo mode; do not accept a role header or arbitrary client user ID as authorization.
- [ ] Coordinate checkout response shape with Vin and catalog location/menu shape with Jacob.

**Acceptance:** an order created by checkout appears in the correct queue, advances only through legal states, and the student view reflects updates without manual refresh.

## Milestone 3 — Week 3 (Nov 23–29): Integration and Render release

- [ ] Integrate the end-to-end student and staff flow with the other owners; fix contract mismatches and deployment-specific issues.
- [ ] Provide Jacob the API build/start command, required environment-variable names, CORS requirements, and health-check path; help resolve API-side deployment issues.
- [ ] Validate order tracking, queue polling, and status transitions against Jacob’s deployed API/Supabase environment; report defects with reproduction steps.
- [ ] Complete the student/operator end-to-end integration review with Vin and Jacob and hand off API limitations/run instructions; do not own Render or Supabase configuration.

**Acceptance:** Vincent’s API is ready for Jacob to deploy, and status actions persist and appear in student tracking in the shared deployment. Jacob owns deployment configuration and the release runbook.
