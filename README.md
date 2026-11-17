# HuskyBite

HuskyBite is a UConn campus dining demo for browsing cafe menus, placing a simulated order, and viewing the operator order queue. The FastAPI backend provides health, signed demo-session, catalog, balance, checkout (`POST /api/orders`), order-detail, queue, and status-transition endpoints. The frontend keeps a local mock adapter that is used only when the API reports Supabase is not configured.

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

3. In another terminal, install and start the frontend:

   ```powershell
   cd frontend
   npm install
   Copy-Item .env.example .env.local
   npm run dev
   ```

   Open the URL printed by Vite (normally `http://localhost:5173`). The login page’s Student and Operator buttons request a short-lived role-scoped demo session from the API.

Backend tests: `pip install -r backend\requirements-dev.txt`, then `pytest backend\tests`.

## Database Setup & Safe Reset Runbook (Supabase)

To configure a clean Supabase database or reset sample demo data:

### 1. Initial Clean Database Setup
In the **Supabase SQL Editor**, execute the migration and seed files in this exact sequence:

1. **Base Schema**: Run [`supabase/migrations/20261110120000_initial_schema.sql`](supabase/migrations/20261110120000_initial_schema.sql)
   - Creates `profiles`, `locations`, `menu_items`, `modifier_groups`, `modifier_options`, `orders`, and `order_items` tables with RLS and trigger functions.
2. **Catalog & Identity Seed**: Run [`supabase/seed.sql`](supabase/seed.sql) (or run `python -m app.seed` from `backend/` with credentials configured in `backend/.env`)
   - Populates the 3 campus venues (`The Beanery`, `Bookworms Cafe`, `Putnam Grab-and-Go`), 14 representative menu items, 12 modifier groups with 33 options, and the demo student and operator profiles.
3. **Checkout Migration**: Run [`supabase/migrations/20261117120000_checkout.sql`](supabase/migrations/20261117120000_checkout.sql)
   - Installs the `place_order` stored procedure, `pickup_counters`, and idempotency constraints for atomic checkout.

### 2. Safe Demo Data Reset
To reset orders and restore student balances to initial demo states without dropping catalog tables:
- In the Supabase SQL Editor:
  ```sql
  truncate table public.orders cascade;
  truncate table public.pickup_counters;
  update public.profiles set huskybucks_balance = 50.00, flex_passes = 10, dining_points = 120;
  update public.menu_items set is_available = true;
  ```
- Re-run [`supabase/seed.sql`](supabase/seed.sql) if any menu items or locations were modified or deleted.

## Deployment Runbook (Render)

### Option A: 1-Click Deployment via Render Blueprint (`render.yaml`)
1. Push your repository to GitHub.
2. Log into [dashboard.render.com](https://dashboard.render.com).
3. Click **New +** $\rightarrow$ **Blueprint**.
4. Select your `uconn-ordering-service` repository.
5. In the blueprint configuration screen, populate the two secret variables:
   - `SUPABASE_URL`: Your Supabase Project URL (`https://<project-ref>.supabase.co`).
   - `SUPABASE_SERVICE_ROLE_KEY`: Your server-side service role secret key.
   - `FRONTEND_ORIGINS`: Set to your deployed frontend URL (e.g. `https://huskybite-frontend.onrender.com`).
6. Click **Apply**. Render will automatically build and link both services.

### Option B: Manual Service Setup in Render Dashboard

#### 1. FastAPI Web Service (`huskybite-api`)
- **Type**: Web Service
- **Environment**: Python
- **Root Directory**: `.` (leave empty / repository root)
- **Build Command**: `pip install -r backend/requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --app-dir backend`
- **Health Check Path**: `/api/health`
- **Environment Variables**:
  - `APP_ENV`: `production`
  - `DEMO_MODE`: `true`
  - `DEMO_SESSION_SECRET`: Generate a 48+ character random token (`python -c "import secrets; print(secrets.token_urlsafe(48))"`).
  - `DEMO_SESSION_TTL_MINUTES`: `60`
  - `DEMO_STUDENT_USER_ID`: `00000000-0000-4000-8000-000000000001`
  - `DEMO_OPERATOR_USER_ID`: `00000000-0000-4000-8000-000000000002`
  - `SUPABASE_URL`: `https://<your-project-ref>.supabase.co`
  - `SUPABASE_SERVICE_ROLE_KEY`: `<your-supabase-service-role-key>`
  - `FRONTEND_ORIGINS`: `https://huskybite-frontend.onrender.com`

#### 2. Vite Frontend Static Site (`huskybite-frontend`)
- **Type**: Static Site
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_URL`: `https://huskybite-api.onrender.com` (your backend URL)
- **Redirects / Rewrites**:
  - Add Rule: **Source**: `/*` $\rightarrow$ **Destination**: `/index.html` $\rightarrow$ **Action**: `Rewrite` (ensures client-side routing works for `/locations`, `/staff/kds`, etc.).

## Project structure

```text
backend/app/
  api/routes/    health, demo, catalog, checkout, and order route boundaries
  security/      signed demo sessions and role guards (require_student / require_operator)
  services/      shared catalog, checkout, and order services (checkout_rules.py, checkout_service.py)
  catalog_schemas.py   catalog models and modifiers
  checkout_schemas.py  balance and order request/response models
  config.py      environment-backed settings
  database.py    lazy server-side Supabase client with URL normalization
backend/tests/   pytest suite
frontend/src/
  pages/         reusable student and operator screens (Locations, Menu, Inventory, KDS, Tracking)
  features/checkout/  shared checkout rules (validation, pricing, request builder)
  context/       local demo state adapter
supabase/migrations/
  20261110120000_initial_schema.sql  initial Postgres schema & RLS
  20261117120000_checkout.sql        atomic checkout, idempotency & pickup codes
supabase/seed.sql                     idempotent venue and menu seed
render.yaml                           infrastructure-as-code deployment blueprint
```

The shared project decisions and individual three-week tasks are in [`context/master.md`](context/master.md) and the `context/todo_*.md` files. The checkout contract (rules, request/response, errors, identity) is in [`context/checkout_contract.md`](context/checkout_contract.md).
