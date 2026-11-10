# HuskyBite Master Plan

## Project purpose

HuskyBite is a mobile-first ordering experience for UConn campus cafes and grab-and-go locations. Students and faculty browse menus, customize items, submit simulated payment using HuskyBucks, Flex Passes, or Dining Points, and track pickup. Dining staff manage availability and move orders through a kitchen display system (KDS).

**Team and ownership**

- **Vincent Nguyen — Architecture and Slice 3:** repository structure, API/runtime integration, order tracking, KDS, and Render deployment.
- **Jacob Bogdany — Catalog and Slice 1:** locations, menus, dietary filters, inventory, and catalog seed data.
- **Vin Gluck — Checkout and Slice 2:** user balances, customization, cart, pricing, and checkout.

The owners lead their slice and coordinate shared contracts before changing them. Work is reviewed by another teammate before merging. Keep route and feature code in the owner’s folders to reduce conflicts.

## Three-week delivery target

The project has three weeks total, including the current week. Each week ends with a demonstrable integrated increment. All three owners have one primary deliverable in each milestone; shared integration and review are part of each owner’s work rather than a separate unowned phase.

**Working files:** [Supabase migration](../supabase/migrations/20261110120000_initial_schema.sql) · [Vincent’s tasks](todo_vincent_nguyen.md) · [Jacob’s tasks](todo_jacob_bogdany.md) · [Vin’s tasks](todo_vin_gluck.md)

1. **Week 1 — Nov 10–15, Foundation and catalog:** agree on the contract and database migration; establish the backend and Supabase connection; make the existing frontend catalog a coherent API-backed or explicitly mocked experience.
2. **Week 2 — Nov 16–22, Checkout vertical slice:** server-authoritative pricing and simulated payment; persist orders and line-item snapshots; connect cart, confirmation, and order detail.
3. **Week 3 — Nov 23–29, Operations and release:** staff inventory and KDS state transitions; student tracking; integrate, verify core flows, and deploy frontend/backend on Render.

The repository already contains a substantial React/Vite UI and mock flow, despite the old roadmap marking the demo as future work. Audit it first and reuse working components. There is no backend directory, and the frontend currently has two mock-data modules with different sample users/data; resolve duplication during Week 1. The team’s stated three-week schedule supersedes the old five-week roadmap.

## Product scope and decisions

### Required demonstration

- Landing/login screen has clear **Log in as Student** and **Log in as Operator** buttons so a reviewer can enter either UI without setting up a real UConn account. Operator maps to the backend `staff` role.
- Seed demo student and operator identities and keep role choice available for a repeatable presentation. The selected identity must be recognized by the backend; do not authorize requests from a client-supplied role header or user ID. Limit this shortcut to an explicitly enabled demo mode.
- Jacob owns an idempotent Supabase seed with Beanery, Bookworms, and Putnam Grab-and-Go, plus representative menu items and modifiers for each. The menu must populate a clean database without hand-entered Supabase rows.
- Browse a small seeded set of UConn locations and categorized menu items.
- Search/filter by dietary tags and see unavailable items.
- Customize an item, add/remove/update cart quantities, and see a correct total.
- Place an order using simulated campus balance; show a unique pickup code.
- Staff can mark an item unavailable and advance an order through `RECEIVED → PREPPING → READY → COMPLETED`.
- Student can see the order’s current status. Polling about every five seconds is adequate; realtime transport is optional only if the core flow is complete.
- Deploy a working demo using Render. Keep all payment simulated; do not collect real payment credentials.

### Cut or defer

Defer real UConn authentication, real payment rails, nutrition/macros, audio alerts, reordering, advanced wait prediction, SSE/WebSockets, and a full order-history product unless the required flow is complete early. The demo role-choice login is still required; it is a controlled presentation shortcut, not production authentication. Do not claim the demo is production-ready for real student financial balances.

### Contract clarifications

- Use Supabase Postgres as the persistent database; Render hosts the API and frontend. Do not retain the obsolete SQLite-first assumption.
- Use `uuid` primary keys and `timestamptz` timestamps. Store prices as `numeric(10,2)` and calculate/validate them on the server.
- `orders` and `order_items` are canonical names. Keep the quoted legacy `Order`/`OrderItem` terms out of SQL.
- Store item options in normalized modifier tables, then snapshot selected option labels/prices into each order line so later menu edits do not rewrite receipts.
- Store the three simulated balances on a profile with nonnegative checks. Payment method is an enum; this is a demo ledger, not integration with campus payment systems. Checkout must update balance and insert order/lines in one database transaction.
- Use Supabase Auth’s `auth.users` as the identity source and a `profiles` row keyed by its UUID. Do not store passwords or invent an independent user identity table. For the demo, seed/link test profiles through a controlled seed or admin path.
- Never trust `user_id`, role headers, item price, or available balance supplied by a browser. Backend authorization must establish identity/role. Demo role choice must resolve to a seeded identity through the configured demo-session/auth mechanism; reject demo login when demo mode is disabled and keep staff-only routes server-guarded.
- Enable RLS on exposed tables. Client access should be read-only for public catalog data as appropriate; order creation and balance changes go through the trusted backend using a server-side Supabase key stored only in Render secrets. Staff mutations require a staff check.
- Use `dietary_tags text[]` for the modest fixed tag set. Use relational `modifier_groups` and `modifier_options` rather than opaque customization JSON.
- Permit cancellation only before preparation begins if cancellation is implemented; refund simulated balance in the same transaction. Otherwise omit cancellation from the demo contract.
- Availability is per menu item. Location hours can remain display text for the demo; `is_open` is the operational override. Avoid inferring open/closed from a freeform hours string.

## Initial Supabase data model

All tables live in `public`; UUID primary keys default to `gen_random_uuid()`. Add `created_at timestamptz not null default now()` to mutable records, plus `updated_at` where useful. Add indexes on foreign keys and common filters.

| Table | Initial columns and rules | Purpose |
|---|---|---|
| `profiles` | `id uuid primary key references auth.users(id) on delete cascade`; `display_name text not null`; `email text unique`; `role text not null check (role in ('student','faculty','staff','admin'))`; `huskybucks_balance numeric(10,2) not null default 50 check >= 0`; `flex_passes integer not null default 10 check >= 0`; `dining_points integer not null default 120 check >= 0`; timestamps | App profile and demo balances. Role assignment is trusted/server controlled. |
| `locations` | `id uuid primary key`; `slug text unique not null`; `name text not null`; `building text not null`; `hours_text text`; `is_open boolean not null default true`; timestamps | Campus venues. |
| `menu_items` | `id uuid primary key`; `location_id uuid not null references locations`; `name text not null`; `description text`; `category text not null`; `base_price numeric(10,2) not null check >= 0`; `dietary_tags text[] not null default '{}'`; `is_available boolean not null default true`; timestamps | Venue catalog and stock toggle. |
| `modifier_groups` | `id uuid primary key`; `menu_item_id uuid not null references menu_items on delete cascade`; `name text not null`; `is_required boolean not null default false`; `min_select integer not null default 0 check >= 0`; `max_select integer not null default 1 check > 0`; `sort_order integer not null default 0` | Valid selection rules for customization groups. |
| `modifier_options` | `id uuid primary key`; `group_id uuid not null references modifier_groups on delete cascade`; `name text not null`; `price_delta numeric(10,2) not null default 0`; `is_available boolean not null default true`; `sort_order integer not null default 0` | Choice and additional price. |
| `orders` | `id uuid primary key`; `user_id uuid not null references profiles`; `location_id uuid not null references locations`; `status text not null check in ('RECEIVED','PREPPING','READY','COMPLETED','CANCELLED')`; `payment_method text not null check in ('HUSKYBUCKS','FLEX_PASS','POINTS')`; `total_amount numeric(10,2) not null check >= 0`; `pickup_code text not null`; `estimated_prep_minutes integer not null default 10`; `created_at timestamptz not null default now()`; nullable `prepping_at`, `ready_at`, `completed_at`, `cancelled_at` | Order lifecycle and simulated charge record. Unique pickup code per location/day may be implemented with a separate date/sequence strategy; do not rely on random four-character codes without collision handling. |
| `order_items` | `id uuid primary key`; `order_id uuid not null references orders on delete cascade`; nullable `menu_item_id uuid references menu_items on delete set null`; `item_name text not null`; `quantity integer not null check > 0`; `unit_price numeric(10,2) not null check >= 0`; `selected_options jsonb not null default '[]'`; `notes text` | Immutable receipt snapshot; `unit_price` includes selected modifiers for one unit. |

### Database/API invariants

- Checkout recalculates from current menu/modifier rows, verifies availability and modifier selection rules, then atomically debits the selected simulated balance and inserts the order plus snapshots. If any step fails, nothing is charged or inserted.
- For Flex Passes and Points, define a clear demo conversion before implementation. Recommended minimum scope: treat each as one whole-item payment unit only if the project explicitly chooses that model; otherwise accept HuskyBucks only in the first demo. Never silently compare money to pass counts.
- `total_amount` equals the sum of `quantity × order_items.unit_price`; no sales tax is modeled unless the team explicitly adds it.
- State changes follow allowed transitions and are timestamped. A single API/service function enforces transitions; direct table updates from the browser are prohibited.
- Queue reads are scoped to one location and active statuses. Student order reads are scoped to the authenticated owner.

## API contract for the demo

Prefix all routes with `/api`. JSON uses snake_case and ISO 8601 UTC timestamps. Return useful `4xx` errors (`VALIDATION_ERROR`, `NOT_FOUND`, `ITEM_UNAVAILABLE`, `INSUFFICIENT_BALANCE`, `INVALID_TRANSITION`) without exposing secrets.

| Method and route | Owner | Behavior |
|---|---|---|
| `POST /demo/login` | Vincent | Demo-only role choice (`student` or `operator`); when enabled, map the persona to its seeded Supabase identity and return the app session. Reject when demo mode is disabled. |
| `GET /locations` | Jacob | List venues with operational status and derived active queue estimate if available. |
| `GET /locations/:location_id/menu` | Jacob | List categorized items and modifier groups/options; optional comma-separated `dietary` filter. |
| `PATCH /menu/:item_id/availability` | Jacob | Staff-only availability toggle. |
| `GET /users/me/balance` | Vin | Return current demo profile balances; do not accept arbitrary user ID. |
| `POST /orders` | Vin | Validate and create/charge atomically; return order, pickup code, and balance summary. |
| `GET /orders/:order_id` | Vincent | Student owner or authorized staff can retrieve order detail/status. |
| `GET /orders/queue?location_id=...` | Vincent | Staff-only active queue for their permitted location(s). |
| `PATCH /orders/:order_id/status` | Vincent | Staff-only validated state transition; server sets timestamps. |

Remove the old `X-User-Role` header as an authorization mechanism. Demo login accepts only a persona enum and maps it server-side to the seeded identity; it must not accept a user ID or arbitrary role from the caller. Keep API examples/types aligned with actual route behavior and document the auth/demo boundary.

## Architecture and deployment

- **Frontend:** existing React 19 + Vite + TypeScript SPA. Keep feature code grouped under `frontend/src/features/{catalog,checkout,queue}` (or map current page/component files deliberately); use one API client and one canonical type module.
- **Backend:** add a Python FastAPI service (Pydantic validation, Supabase/Postgres client, CORS restricted to deployed frontend plus local development). Keep catalog, checkout, and queue routes separate. One language/framework is the default unless the existing team has already built backend work.
- **Database:** Supabase Postgres; schema changes are versioned as SQL migrations committed to the repository. Enable RLS and test intended policies. Keep the Supabase service-role key and database credentials in Render environment secrets only.
- **Hosting:** Render Web Service for API and Render Static Site for Vite frontend. Configure `VITE_API_URL`, backend CORS origin, and secret database settings. Add health endpoint and SPA fallback as needed. Do not commit `.env` files.
- **Seed owner and requirement:** Jacob owns the idempotent database seed for Beanery, Bookworms, Putnam Grab-and-Go, representative menu items/modifiers, and demo student/operator profiles. This is a named deliverable, not optional sample data. It must work on an empty database and be safe to re-run; mark sample balances, hours, and menus as illustrative.
- **Demo access:** Vincent owns the role-choice screen and demo session integration. Display **Log in as Student** and **Log in as Operator** (operator maps to `staff`); both must lead to distinct role-appropriate views using backend-recognized demo identities. Keep this mode explicitly gated and document how it is enabled.
- **Mock parity:** retain a single mock adapter/data source for local UI work; switch to API using a documented environment/config flag. Avoid two divergent mock modules or storage as a substitute for cross-device server state.

## Shared working agreements

1. Week 1 locks the schema, error format, status/payment enums, API examples, and TypeScript/Pydantic models. Propose changes in the shared contract and notify affected owners.
2. Each owner works in their feature folders and opens small reviewable changes. Review another owner’s work before integration.
3. Keep `.env` and service credentials out of Git. Commit migrations, sanitized seed data, and setup instructions.
4. Every milestone includes a short integrated demo and a handoff note: completed behavior, known limitation, and how to run it.
5. Preserve working UI when refactoring. The current code is a starter to assess, not proof that every roadmap item is done.
6. When using an AI to implement a teammate’s slice, include the teammate’s explicit seed/demo-access task from their todo in the prompt; do not let the AI omit seeded records or role-entry flows as “demo setup.”

## Risks and scope controls

- **Three-week constraint:** the former plan had five weeks of work. Prioritize a single end-to-end path with seeded data; cut optional history, real auth, analytics, notifications, and advanced estimates.
- **Balance/payment ambiguity:** simulated balances and payment-unit semantics must be resolved before checkout implementation. No real transaction integrations.
- **Authorization:** role headers are trivially spoofed. Enforce identity and staff checks in the backend, even for a demo.
- **Demo readiness:** a reviewer must enter as either student or operator with one click; seed data must be present after the documented setup/reset command.
- **Supabase RLS and service key:** do not expose privileged keys in Vite variables; the `VITE_` prefix is public.
- **Existing frontend drift:** duplicate mock data, existing page implementation, and legacy contract may disagree. Audit and consolidate rather than rebuilding from assumptions.
- **Render free-instance behavior:** cold starts and persistence assumptions can affect demos. Supabase remains the persistent data source; verify deployed health and frontend API URL before final demo.

## Definition of done

- A new teammate can install/run the app from the README with documented environment variables and seeded data.
- A reviewer can use both role-choice buttons and sees distinct student and operator capabilities; demo mode cannot be used when disabled.
- A clean Supabase database can be seeded with all three venues and menus using Jacob’s documented repeatable seed procedure.
- The required browse → customize → checkout → staff queue/status → student tracking flow works against the shared Supabase-backed API in the deployed demo.
- Server rejects invalid selections, unavailable items, insufficient balance, unauthorized staff actions, and illegal status changes.
- Database migration and seed are reproducible; RLS is enabled and tested; no secrets are committed.
- Three individual task lists below record acceptance criteria and milestone ownership.
