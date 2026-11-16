# Jacob Bogdany — Catalog and Slice 1

Own location/menu catalog, dietary filters, availability management, and representative seed data. Coordinate API and shared schema changes before implementation.

## Milestone 1 — Week 1 (Nov 10–15): Catalog contract and database foundation

- [x] Audit the current location/menu pages and both mock-data modules; identify reusable UI and choose one canonical data source with the team.
- [x] Review the proposed Supabase catalog schema and API examples; settle venue slugs, dietary tag vocabulary, categories, and modifier relationships with Vin and Vincent.
- [x] Own the idempotent Supabase seed for Beanery, Bookworms, and Putnam Grab-and-Go: create all three locations, at least four representative menu items per location, and useful modifier groups/options for customizable items. Make it safe to re-run and populate an empty database without manual dashboard edits.
- [x] Create/link the seeded demo student and operator profiles needed by the demo login flow, coordinating identity/session details with Vincent. Clearly mark menu, hours, and balances as illustrative sample data.
- [x] Include this seed ownership and acceptance requirement in prompts to your AI coding assistant; do not let it return only API/UI code or leave Supabase empty.
- [x] Align TypeScript catalog types with the agreed backend response; preserve stable API field names and UUID IDs.
- [x] Document the seed data’s illustrative nature and avoid presenting sample hours/menu as verified live UConn data.

**Acceptance:** migration applies cleanly in Supabase; a documented seed command creates all three venues, at least twelve menu items, customization data, and demo identities on an empty database and can be re-run; catalog can be read consistently by the UI; duplicate mock catalog sources are retired or clearly isolated.

**Handoff (Milestone 1):**
- **SQL Seed:** `supabase/seed.sql` contains an idempotent migration script creating all 3 venues (`beanery`, `bookworms`, `putnam`), 14 representative menu items, relational modifier groups and modifier options, and the demo identities (`auth.users` + `public.profiles` for `00000000-0000-4000-8000-000000000001` and `00000000-0000-4000-8000-000000000002`).
- **Python Seeder:** `backend/app/seed.py` provides a runnable script (`python -m app.seed`) to populate Supabase programmatically via service-role credentials.
- **Contract Verification:** `backend/tests/test_seed_contract.py` validates the venue slugs, item counts, UUID format, and modifier group check constraints (`min_select <= max_select`, `is_required => min_select > 0`).
- **Canonical Mock Data:** `frontend/src/mockData.ts` unified with the exact UUIDs and categories of the Supabase seed, with prominent disclaimers documenting that menus, hours, and balances are illustrative sample data.

## Milestone 2 — Week 2 (Nov 16–22): Catalog API and staff inventory

- [x] Implement `GET /api/locations` and `GET /api/locations/{id}/menu`, including category, modifiers, and optional dietary filtering.
- [x] Implement staff-authorized `PATCH /api/menu/{item_id}/availability` with validation and useful errors.
- [x] Connect location/menu browsing and dietary/search controls to the API, with explicit loading, empty, and failure states.
- [x] Connect staff inventory toggles to persisted availability and show the resulting state to student browsing.
- [x] Coordinate catalog price/modifier shape with Vin’s server-side checkout calculator.

**Acceptance:** catalog is read from seeded Supabase-backed API; filtering works; staff availability change persists and is reflected on reload.

**Handoff (Milestone 2):**
- **Catalog Schemas:** `backend/app/catalog_schemas.py` defines models for locations, categorized menu items, relational modifier groups and options, availability updates, and legacy backwards-compatibility adapters.
- **Catalog Routes:** `backend/app/api/routes/catalog.py` provides:
  - `GET /api/locations`: lists active dining venues, operational status, and active order wait estimates.
  - `GET /api/locations/{id}/menu`: returns menu items with modifier groups and options, supporting optional comma-separated `?dietary=...` filtering. Accepts location ID or slug.
  - `PATCH /api/menu/{item_id}/availability`: staff-authorized toggle (`require_operator`) updating `is_available` in Supabase `menu_items`.
- **Automated Tests:** `backend/tests/test_catalog_routes.py` provides 8 unit tests covering status codes, dietary subset filtering, modifiers, wait calculations, role gating (401/403), and 404 validation.
- **Frontend Integration:**
  - `frontend/src/context/DemoContext.tsx`: connects locations, menu items, and staff availability toggles to the API with graceful fallback to mock data when Supabase is unconfigured.
  - `frontend/src/pages/LocationsPage.tsx`: connected with explicit loading skeleton, failure retry banner, and empty state.
  - `frontend/src/pages/MenuPage.tsx`: connected to API menu query with dietary tag filters, search filtering, loading state, error retry, and empty state.
  - `frontend/src/pages/InventoryPage.tsx`: connected to API menu fetch and real-time persisted availability toggle.
- **Checkout Coordination:** aligned with `services/checkout_rules.py` (`MenuItemRow`, `ModifierGroupRow`, `ModifierOptionRow`) so checkout calculator and catalog data shapes agree.

## Milestone 3 — Week 3 (Nov 23–29): Catalog integration and release readiness

- [ ] Integrate catalog with Vin’s checkout customization data and Vincent’s queue/location requirements.
- [ ] Verify unavailable items cannot be added/checked out and modifier options/prices shown to the customer match the server contract.
- [ ] Review deployed catalog behavior on mobile-sized screens and fix the highest-impact layout/accessibility issues.
- [ ] Verify seed and migration instructions from a clean database and record how to refresh demo data safely.
- [ ] Confirm the deployed demo has all three seeded venues and menu items/modifiers, and both demo identities can use them.
- [ ] Review the final demo flow and resolve catalog defects before release.

**Acceptance:** deployed catalog, filters, modifiers, and inventory state agree with checkout and remain correct after refresh.
