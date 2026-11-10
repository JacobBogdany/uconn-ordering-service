# Jacob Bogdany — Catalog and Slice 1

Own location/menu catalog, dietary filters, availability management, and representative seed data. Coordinate API and shared schema changes before implementation.

## Milestone 1 — Week 1 (Nov 10–15): Catalog contract and database foundation

- [ ] Audit the current location/menu pages and both mock-data modules; identify reusable UI and choose one canonical data source with the team.
- [ ] Review the proposed Supabase catalog schema and API examples; settle venue slugs, dietary tag vocabulary, categories, and modifier relationships with Vin and Vincent.
- [ ] Create or co-author the initial SQL migration and idempotent seed for Beanery, Bookworms, Putnam, representative items, and customization options.
- [ ] Align TypeScript catalog types with the agreed backend response; preserve stable API field names and UUID IDs.
- [ ] Document the seed data’s illustrative nature and avoid presenting sample hours/menu as verified live UConn data.

**Acceptance:** migration applies cleanly in Supabase; seeded catalog can be read consistently by the UI; duplicate mock catalog sources are retired or clearly isolated.

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
- [ ] Review the final demo flow and resolve catalog defects before release.

**Acceptance:** deployed catalog, filters, modifiers, and inventory state agree with checkout and remain correct after refresh.
