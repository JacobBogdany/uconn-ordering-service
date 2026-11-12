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

- [x] Implement `GET /api/orders/{order_id}` with student-owner/operator authorization and line-item snapshot response.
- [x] Implement validated status transitions and `PATCH /api/orders/{order_id}/status`; set lifecycle timestamps server-side and use a status compare-and-update to catch concurrent actions.
- [x] Implement operator active queue query by location with item details and elapsed time.
- [x] Connect the existing student tracking page to the API and poll every five seconds with loading/error states.
- [x] Connect KDS columns/actions for received, prepping, and ready orders; completed orders leave the active queue.
- [x] Bind the existing demo role choice to the backend-recognized signed student/operator session. Order routes require that bearer token; operator maps to `staff` and request bodies cannot choose a user ID or role.
- [ ] Integrate the routes with Vin’s persisted checkout and Jacob’s catalog IDs. Current UI uses mock fallback when Supabase is unavailable; final cross-slice flow needs their API work/configured Supabase data.

**Acceptance:** route and UI implementation is in place. End-to-end persisted acceptance remains pending the checkout/catalog integration above and configured Supabase data.

## Milestone 3 — Week 3 (Nov 23–29): Integration and Render release

- [ ] Integrate the end-to-end student and staff flow with the other owners; fix contract mismatches and deployment-specific issues.
- [x] Align persisted `GET /api/orders/{id}` with the checkout response contract (order snapshot without balance); derive the displayed ready estimate from `created_at` plus `estimated_prep_minutes`, and keep mock-only cancellation from appearing on persisted orders.
- [x] Provide Jacob the API build/start command, required environment-variable names, CORS requirements, and health-check path in the README; help resolve API-side deployment issues if they arise.
- [ ] Validate order tracking, queue polling, and status transitions against Jacob’s deployed API/Supabase environment; report defects with reproduction steps.
- [ ] Complete the student/operator end-to-end integration review with Vin and Jacob and hand off API limitations/run instructions; do not own Render or Supabase configuration.

**Acceptance:** Vincent’s API build/start and configuration handoff are documented and ready for Jacob to deploy. Persisted end-to-end verification remains dependent on Vin’s checkout implementation, Jacob’s catalog/Supabase setup, and Jacob’s Render deployment.
