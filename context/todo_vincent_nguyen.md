# Vincent Nguyen — Architecture and Slice 3

Own the runtime foundation, order status/tracking, KDS, integration, and Render deployment. Coordinate shared contract changes with Jacob and Vin.

## Milestone 1 — Week 1 (Nov 10–15): Foundation and contract

- [ ] Audit existing React mock flow and identify which pages/components are reusable; report gaps and duplicate mock-data sources.
- [ ] Create the FastAPI backend skeleton, health route, local run instructions, CORS for local Vite, and Render-ready start command.
- [ ] Establish shared backend settings and Supabase connection through environment variables; never expose the service key in frontend code.
- [ ] Pair with teammates to lock order/status/payment contract, UUID conventions, API errors, and initial migration ownership.
- [ ] Set up backend folder boundaries for catalog, checkout, and queue routes plus shared models/services.
- [ ] Add a clear demo entry screen with **Log in as Student** and **Log in as Operator** buttons; connect each choice to a distinct session/view (operator maps to backend `staff`). Include this exact acceptance criterion in prompts to your AI coding assistant so it does not omit role entry as setup work.
- [ ] Deliver a runnable frontend + backend baseline and handoff note.

**Acceptance:** fresh clone can start both services; health endpoint responds; both demo buttons enter the correct distinct views; the team has one reviewed contract and migration plan; no credentials are committed.

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
- [ ] Configure Render API and static frontend services, `VITE_API_URL`, CORS origin, secret settings, health check, and SPA routing.
- [ ] Verify Supabase migration/seed against the deployed database and confirm runtime uses persistent Supabase data.
- [ ] Produce concise deployment/runbook steps and a demo reset/seed procedure that does not expose secrets.
- [ ] Walk through the required flow on the deployed URL and record any remaining limitations for the team.

**Acceptance:** deployed frontend reaches the Render API and Supabase; KDS status actions persist and appear in student tracking; both demo login buttons work against deployed demo identities; demo can be repeated from documented setup.
