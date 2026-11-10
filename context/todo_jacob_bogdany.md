# Jacob Bogdany — Catalog and Slice 1

Own location/menu catalog, dietary filters, availability management, and representative seed data. Coordinate API and shared schema changes before implementation.

## Milestone 1 — Week 1 (Nov 10–15): Catalog contract and database foundation

- [ ] Audit the current location/menu pages and both mock-data modules; identify reusable UI and choose one canonical data source with the team.
- [ ] Review the proposed Supabase catalog schema and API examples; settle venue slugs, dietary tag vocabulary, categories, and modifier relationships with Vin and Vincent.
- [ ] Own the idempotent Supabase seed for Beanery, Bookworms, and Putnam Grab-and-Go: create all three locations, at least four representative menu items per location, and useful modifier groups/options for customizable items. Make it safe to re-run and populate an empty database without manual dashboard edits.
- [ ] Create/link the seeded demo student and operator profiles needed by the demo login flow, coordinating identity/session details with Vincent. Clearly mark menu, hours, and balances as illustrative sample data.
- [ ] Include this seed ownership and acceptance requirement in prompts to your AI coding assistant; do not let it return only API/UI code or leave Supabase empty.
- [ ] Align TypeScript catalog types with the agreed backend response; preserve stable API field names and UUID IDs.
- [ ] Document the seed data’s illustrative nature and avoid presenting sample hours/menu as verified live UConn data.

**Acceptance:** migration applies cleanly in Supabase; a documented seed command creates all three venues, at least twelve menu items, customization data, and demo identities on an empty database and can be re-run; catalog can be read consistently by the UI; duplicate mock catalog sources are retired or clearly isolated.

## Milestone 2 — Week 2 (Nov 16–22): Catalog API and staff inventory

- [ ] Implement `GET /api/locations` and `GET /api/locations/{id}/menu`, including category, modifiers, and optional dietary filtering.
- [ ] Implement staff-authorized `PATCH /api/menu/{item_id}/availability` with validation and useful errors.
- [ ] Connect location/menu browsing and dietary/search controls to the API, with explicit loading, empty, and failure states.
- [ ] Connect staff inventory toggles to persisted availability and show the resulting state to student browsing.
- [ ] Coordinate catalog price/modifier shape with Vin’s server-side checkout calculator.

**Acceptance:** catalog is read from seeded Supabase-backed API; filtering works; staff availability change persists and is reflected on reload.

## Milestone 3 — Week 3 (Nov 23–29): Catalog integration and release readiness

- [ ] Integrate catalog with Vin’s checkout customization data and Vincent’s queue/location requirements.
- [ ] Verify unavailable items cannot be added/checked out and modifier options/prices shown to the customer match the server contract.
- [ ] Review deployed catalog behavior on mobile-sized screens and fix the highest-impact layout/accessibility issues.
- [ ] Verify seed and migration instructions from a clean database and record how to refresh demo data safely.
- [ ] Confirm the deployed demo has all three seeded venues and menu items/modifiers, and both demo identities can use them.
- [ ] Review the final demo flow and resolve catalog defects before release.

**Acceptance:** deployed catalog, filters, modifiers, and inventory state agree with checkout and remain correct after refresh.
