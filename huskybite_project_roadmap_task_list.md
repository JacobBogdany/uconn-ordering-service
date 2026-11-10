# HuskyBite: Project Task List & Sprint Plan

## Project Overview
* **Application:** HuskyBite (UConn Mobile-First Campus Dining Ordering Platform)
* **Team:** Vincent Nguyen (Architecture & Slice 3), Jacob Bogdany (Catalog & Slice 1), Vin Gluck (Checkout & Slice 2)
* **Stack:** React (Vite, TypeScript), Tailwind CSS, Python (Flask/FastAPI), SQLAlchemy, SQLite/PostgreSQL

---

## Phase 0: Quick-Start Zero-DB Working Demo (Immediate Milestone)
- [ ] Create `src/mockData.ts` with initial UConn seed data (Beanery, Bookworms, Putnam Grab-and-Go).
- [ ] Implement `src/context/DemoContext.tsx` or `localStorage` adapter to store:
  - [ ] Current user session (`HuskyBucks` balance = $50.00).
  - [ ] Active orders array.
  - [ ] Menu inventory availability flags.
- [ ] Create an explicit UI "Role Switcher" banner in the header (`Student View` vs. `Dining Staff KDS View`).
- [ ] Connect the complete loop without a backend/database:
  - [ ] Browse menu -> Customize coffee/sandwich -> Add to cart.
  - [ ] Submit simulated payment -> Generate order with pickup code (e.g., `#UCONN-104`).
  - [ ] View student live tracking screen (`Received`).
  - [ ] Toggle to staff view -> Click "Start Prepping" -> Click "Mark Ready".
  - [ ] Switch back to student view to verify the order status reflects `Ready for Pickup`.

---

## Phase 1: Project Scaffolding & Shared Contracts (Week 1)
### Vincent Nguyen (Architecture Lead)
- [ ] Initialize Git repository with `frontend/` and `backend/` monorepo structure.
- [ ] Configure ESLint, Prettier, and TypeScript configs for Vite + React.
- [ ] Initialize Flask/FastAPI backend with CORS enabled for `localhost:5173`.
- [ ] Setup virtual environment (`requirements.txt` with Flask/FastAPI, SQLAlchemy, Pydantic/Marshmallow, Pytest).
- [ ] Configure GitHub Actions CI pipeline for automated linting and tests.

### Vin Gluck & Jacob Bogdany (Schema & Contract Lock)
- [ ] Review and validate `specifications.md` JSON payloads.
- [ ] Create shared TypeScript interfaces (`frontend/src/types/index.ts`) matching backend API models.
- [ ] Draft SQLAlchemy models in `backend/models.py`:
  - [ ] `User`
  - [ ] `Location`
  - [ ] `MenuItem`
  - [ ] `Order`
  - [ ] `OrderItem`
- [ ] Build `backend/seed.py` with real UConn venues and menu items (Beanery breakfast sandwiches, iced lattes with oat milk options, Bookworms snacks).

---

## Phase 2: Core Vertical Slices (Weeks 2–3)

### Slice 1: Campus Locations & Menu Catalog (Jacob Bogdany)
#### Backend (`backend/routes/menu_routes.py`):
- [ ] `GET /api/locations` - List all dining halls and cafes with operating status.
- [ ] `GET /api/locations/<id>/menu` - Return categorized menu items.
- [ ] Query parameter filtering for dietary tags: `?dietary=vegan,gluten-free,dairy-free`.
- [ ] `PATCH /api/menu/<id>/availability` - Toggle `is_available` boolean (Staff only).
- [ ] `POST /api/menu` & `DELETE /api/menu/<id>` - Add/remove catalog items.

#### Frontend (`frontend/src/features/catalog/`):
- [ ] Venue selector component (cards displaying venue name, building, hours, and status badge).
- [ ] Search input and dietary filter pills (Vegan, GF, Dairy-Free, Halal).
- [ ] Menu item grid and category sectioning (Beverages, Sandwiches, Grab-and-Go).
- [ ] Staff Inventory Toggle view (`/staff/inventory`) to flip items between "In Stock" and "Sold Out".

---

### Slice 2: Cart, Customizations & Checkout (Vin Gluck)
#### Backend (`backend/routes/checkout_routes.py`):
- [ ] `GET /api/users/<id>` & `GET /api/users/<id>/balance` - Retrieve simulated balances.
- [ ] Server-side price calculator utility to prevent client tampering.
- [ ] `POST /api/orders` - Atomic order creation transaction:
  - [ ] Verify that all menu items exist and `is_available == True`.
  - [ ] Calculate total price from base prices + modifier costs.
  - [ ] Validate student balance (HuskyBucks or Flex Passes).
  - [ ] Deduct balance from user account.
  - [ ] Generate 4-character pickup code (e.g., `HB-42`).
  - [ ] Commit `Order` and `OrderItem` records to the database.

#### Frontend (`frontend/src/features/checkout/`):
- [ ] Item Customization Modal:
  - [ ] Radio groups for required single-choice options (Size, Bread choice).
  - [ ] Checkboxes for modifiers (Extra espresso shot, oat milk, sauce).
  - [ ] Freeform text area for allergen notes / special instructions.
  - [ ] Dynamic modal price tally updating with selections.
- [ ] Slide-out Cart Drawer:
  - [ ] Increment/decrement quantity controls.
  - [ ] Subtotal and estimated tax/fee calculation.
  - [ ] Payment selection tabs (`HuskyBucks`, `Flex Pass`, `Points`).
  - [ ] Checkout validation and loading states.
- [ ] Order Confirmation modal with order summary and direct link to tracker.

---

### Slice 3: Live Order Queue & Kitchen Portal (Vincent Nguyen)
#### Backend (`backend/routes/queue_routes.py`):
- [ ] `GET /api/orders/queue?location_id=<id>` - Active orders sorted by creation/pickup time.
- [ ] `GET /api/orders/<id>` - Single order detail and status lookup.
- [ ] `GET /api/users/<id>/orders` - Customer's historical and active orders.
- [ ] `PATCH /api/orders/<id>/status` - Order state-machine transitions:
  - [ ] Allowed transitions: `Received` -> `Prepping` -> `Ready` -> `Completed` (or `Cancelled`).
  - [ ] Record status timestamps (`received_at`, `ready_at`, `completed_at`).

#### Frontend (`frontend/src/features/queue/`):
- [ ] Student Order Tracking Screen (`/order/:id`):
  - [ ] Visual 4-step progress tracker (Received -> Prepping -> Ready -> Completed).
  - [ ] Prominent display of pickup code and estimated ready time.
  - [ ] Short-interval polling hook (`useInterval` or `useEffect` polling `/api/orders/:id` every 5 seconds).
- [ ] Order History list view showing past orders and receipts.
- [ ] Staff Kitchen Display System (KDS) Kanban Board (`/staff/kds`):
  - [ ] 3 columns: "New Orders", "In Preparation", "Ready for Express Shelf".
  - [ ] Order cards displaying item modifiers, customer name, and time elapsed.
  - [ ] Action buttons on cards: "Start Prep", "Mark Ready", "Complete / Hand Off".

---

## Phase 3: Integration & State Sync (Week 4)
- [ ] Link routing across all views with React Router.
- [ ] Implement global notification toast system for status updates and cart additions.
- [ ] Configure environment variables (`VITE_API_URL` for frontend, `DATABASE_URL` for backend).
- [ ] Test cross-origin requests (CORS) between frontend client and backend server.
- [ ] Verify simulated payment rollbacks if an item goes out of stock during checkout.

---

## Phase 4: Testing, Polish & Stretch Goals (Week 5)
### Quality Assurance & Polish
- [ ] Write backend unit tests with `pytest` for checkout calculation and order status transitions.
- [ ] Write frontend component tests with `Vitest` and `React Testing Library` for cart calculations.
- [ ] Mobile viewport audit (ensure touch targets are $\ge 48\text{px}$, responsive drawers, no horizontal scroll).
- [ ] Deploy backend and SQLite/PostgreSQL to Render.
- [ ] Deploy frontend to Vercel or Netlify.

### Stretch Goals (If Time Permits)
- [ ] Dynamic wait time estimator based on active queue count ($T = \text{base} + n \times 3\text{ min}$).
- [ ] One-click reordering from order history.
- [ ] Cart macro/calorie calculator.
- [ ] Web Audio / sound chime when a new order arrives on the KDS board.