# HuskyBite

HuskyBite is a UConn campus dining demo for browsing cafe menus, placing a simulated order, and viewing the operator order queue. The FastAPI backend provides health, signed demo-session, balance, order-detail, queue, and status-transition endpoints. Catalog routes and persistent checkout still depend on the other feature slices; the frontend retains a local mock adapter where those APIs are not yet available.

## Existing frontend audit

The React/Vite app already contains location browsing, menu customization, a cart, order tracking, staff KDS, and inventory screens. Those pages are being reused. The active mock source was `frontend/src/mockData.ts`; the additional `frontend/src/mocks/mockData.ts` and its only consumer, `MockOrderContext.tsx`, were unused duplicate fixtures/logic and have been removed. The demo provider remains the current local state adapter until the feature slices connect to the API.

## Run locally

Requirements: Node.js/npm and Python 3.11 or newer.

1. In one terminal, create and activate a Python virtual environment, then install the backend packages:

   ```powershell
   py -m venv backend\.venv
   backend\.venv\Scripts\Activate.ps1
   pip install -r backend\requirements.txt
   Copy-Item backend\.env.example backend\.env
   ```

   Set `DEMO_SESSION_SECRET` in `backend/.env` to a long random value. For example, generate one with `py -c "import secrets; print(secrets.token_urlsafe(48))"` and paste the output into the file. Keep that file private.

2. Start the API from the repository root:

   ```powershell
   uvicorn app.main:app --reload --app-dir backend
   ```

   The API runs at `http://localhost:8000`. `GET /api/health` reports API health and whether Supabase credentials are configured. `POST /api/demo/login` is available only when `DEMO_MODE=true`.

   **Render API handoff (Jacob owns deployment):** set the service root to the repository root, build with `pip install -r backend/requirements.txt`, and start with `uvicorn app.main:app --host 0.0.0.0 --port $PORT --app-dir backend`.

3. In another terminal, install and start the frontend:

   ```powershell
   cd frontend
   npm install
   Copy-Item .env.example .env.local
   npm run dev
   ```

   Open the URL printed by Vite (normally `http://localhost:5173`). The login page’s Student and Operator buttons request a short-lived role-scoped demo session from the API.

Backend tests: `pip install -r backend\requirements-dev.txt`, then `pytest backend\tests`.

## Configuration

- `backend/.env` is read only by the Python API. Use `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` there when connecting Supabase. The service-role key bypasses RLS and must never be added to a `VITE_*` variable or frontend file.
- `DEMO_MODE=true` enables the demo login endpoint. Set a private `DEMO_SESSION_SECRET`; use `DEMO_STUDENT_USER_ID` and `DEMO_OPERATOR_USER_ID` for the corresponding seeded Supabase Auth UUIDs when the data-backed endpoints are connected.
- `FRONTEND_ORIGINS` is a comma-separated allowlist. Add the exact deployed frontend origin in Render settings.
- `frontend/.env.local` may set `VITE_API_URL`; the default is `http://localhost:8000`.
- The initial database migration is `supabase/migrations/20261110120000_initial_schema.sql`; sample data is in `supabase/seed.sql` with the Python runner `python -m app.seed`. Jacob owns applying and verifying these against the team’s Supabase project and configuring Render.
- The Render API health check is `GET /api/health`. It reports API health and whether both Supabase server credentials are configured; it does not expose secret values.
- Keep the Supabase service-role key and demo-session secret in Render’s backend environment settings only. Set `DEMO_STUDENT_USER_ID` and `DEMO_OPERATOR_USER_ID` to the seeded profile UUIDs.
- The single demo operator can access every seeded venue. Location-specific staff assignment is outside the demo schema and must be added before using real staff accounts.

## Project structure

```text
backend/app/
  api/routes/    health, demo, catalog, checkout, and order route boundaries
  security/      signed demo sessions and role guards (require_student / require_operator)
  services/      shared catalog, checkout, and order services (checkout_rules.py)
  checkout_schemas.py  balance and order request/response models
  config.py      environment-backed settings
  database.py    lazy server-side Supabase client
backend/tests/   pytest suite
frontend/src/
  pages/         reusable student and operator screens
  features/checkout/  shared checkout rules (validation, pricing, request builder)
  context/       local demo state adapter
supabase/migrations/
  initial Postgres schema
```

The shared project decisions and individual three-week tasks are in [`context/master.md`](context/master.md) and the `context/todo_*.md` files. The checkout contract (rules, request/response, errors, identity) is in [`context/checkout_contract.md`](context/checkout_contract.md).
