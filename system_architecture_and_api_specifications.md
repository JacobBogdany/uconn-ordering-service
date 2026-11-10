# HuskyBite: System Specification & API Contract

## 1. Domain Models & Database Schemas

### 1.1 `User`
| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PRIMARY KEY, UUID | Unique user identifier |
| `name` | `VARCHAR(100)` | NOT NULL | Full name of student/staff |
| `email` | `VARCHAR(120)` | NOT NULL, UNIQUE | UConn email (`@uconn.edu`) |
| `role` | `ENUM` | NOT NULL | `'student'`, `'faculty'`, `'staff'` |
| `huskybucks_balance` | `DECIMAL(10,2)` | DEFAULT 50.00 | Simulated HuskyBucks balance |
| `flex_passes` | `INTEGER` | DEFAULT 10 | Simulated Flex meal passes |
| `created_at` | `TIMESTAMP` | DEFAULT NOW() | Account creation time |

### 1.2 `Location`
| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(50)` | PRIMARY KEY | Slug (e.g., `'beanery'`, `'bookworms'`) |
| `name` | `VARCHAR(100)` | NOT NULL | Display name |
| `building` | `VARCHAR(100)` | NOT NULL | Campus hall/building location |
| `hours` | `VARCHAR(100)` | NOT NULL | Operating hours (e.g., "7:30 AM - 4:00 PM") |
| `is_open` | `BOOLEAN` | DEFAULT TRUE | Operational toggle |

### 1.3 `MenuItem`
| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PRIMARY KEY, UUID | Unique item identifier |
| `location_id` | `VARCHAR(50)` | FOREIGN KEY (`Location.id`) | Venue offering this item |
| `name` | `VARCHAR(120)` | NOT NULL | Item name |
| `description` | `TEXT` | NULLABLE | Ingredients and description |
| `category` | `VARCHAR(50)` | NOT NULL | e.g., `'Coffee'`, `'Bakery'`, `'Sandwiches'` |
| `base_price` | `DECIMAL(6,2)` | NOT NULL | Starting price |
| `dietary_tags` | `JSON` | DEFAULT `[]` | Array of tags: `['vegan', 'gluten-free']` |
| `customization_groups` | `JSON` | DEFAULT `[]` | Configurable options and add-on pricing |
| `is_available` | `BOOLEAN` | DEFAULT TRUE | Stock availability toggle |

#### Structure of `customization_groups` (JSON):
```json
[
  {
    "group_name": "Size",
    "required": true,
    "max_select": 1,
    "options": [
      { "name": "Small (12oz)", "price_delta": 0.00 },
      { "name": "Medium (16oz)", "price_delta": 0.60 },
      { "name": "Large (20oz)", "price_delta": 1.10 }
    ]
  },
  {
    "group_name": "Milk Choice",
    "required": false,
    "max_select": 1,
    "options": [
      { "name": "Whole Milk", "price_delta": 0.00 },
      { "name": "Oat Milk", "price_delta": 0.75 },
      { "name": "Almond Milk", "price_delta": 0.75 }
    ]
  },
  {
    "group_name": "Add-ons",
    "required": false,
    "max_select": 3,
    "options": [
      { "name": "Extra Espresso Shot", "price_delta": 1.00 },
      { "name": "Vanilla Syrup", "price_delta": 0.50 }
    ]
  }
]
```

### 1.4 `Order`
| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PRIMARY KEY, UUID | Unique order ID |
| `user_id` | `VARCHAR(36)` | FOREIGN KEY (`User.id`) | Student who placed the order |
| `location_id` | `VARCHAR(50)` | FOREIGN KEY (`Location.id`) | Venue fulfilling the order |
| `status` | `ENUM` | NOT NULL | `'RECEIVED'`, `'PREPPING'`, `'READY'`, `'COMPLETED'`, `'CANCELLED'` |
| `total_amount` | `DECIMAL(10,2)`| NOT NULL | Total cost charged |
| `payment_method` | `ENUM` | NOT NULL | `'HUSKYBUCKS'`, `'FLEX_PASS'`, `'POINTS'` |
| `pickup_code` | `VARCHAR(10)` | NOT NULL | Short code displayed to staff & student (e.g. `#B-14`) |
| `estimated_prep_minutes` | `INTEGER` | DEFAULT 10 | Estimated turnaround |
| `created_at` | `TIMESTAMP` | DEFAULT NOW() | Order placement timestamp |
| `ready_at` | `TIMESTAMP` | NULLABLE | Marked ready for pickup |
| `completed_at` | `TIMESTAMP` | NULLABLE | Picked up by student |

### 1.5 `OrderItem`
| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PRIMARY KEY, UUID | Line item identifier |
| `order_id` | `VARCHAR(36)` | FOREIGN KEY (`Order.id`) | Parent order |
| `menu_item_id` | `VARCHAR(36)` | FOREIGN KEY (`MenuItem.id`) | Reference item |
| `quantity` | `INTEGER` | NOT NULL | Must be $\ge 1$ |
| `unit_price` | `DECIMAL(6,2)` | NOT NULL | Base price + selected options |
| `selected_options` | `JSON` | NOT NULL | Array of chosen modifier names |
| `notes` | `TEXT` | NULLABLE | Allergen / special instructions |

---

## 2. Order State Machine

```
              ┌───────────────┐
              │   RECEIVED    │ (Order placed, payment deducted)
              └───────┬───────┘
                      │ Staff clicks "Start Prepping"
                      ▼
              ┌───────────────┐
              │   PREPPING    │ (Kitchen working on food)
              └───────┬───────┘
                      │ Staff clicks "Mark Ready"
                      ▼
              ┌───────────────┐
              │     READY     │ (On express shelf, student alerted)
              └───────┬───────┘
                      │ Staff or student confirms pickup
                      ▼
              ┌───────────────┐
              │   COMPLETED   │
              └───────────────┘

* Cancellation rule: Customer may only cancel while state is 'RECEIVED'.
  Cancelling transitions state to 'CANCELLED' and refunds the balance.
```

---

## 3. REST API Contract

### 3.1 Locations & Menu (Slice 1)

#### `GET /api/locations`
* **Response** `200 OK`:
```json
[
  {
    "id": "beanery",
    "name": "The Beanery",
    "building": "Benton Center",
    "hours": "7:30 AM - 4:00 PM",
    "is_open": true,
    "active_orders_count": 4,
    "estimated_wait_minutes": 8
  },
  {
    "id": "bookworms",
    "name": "Bookworms Cafe",
    "building": "Homer Babbidge Library",
    "hours": "8:00 AM - 8:00 PM",
    "is_open": true,
    "active_orders_count": 12,
    "estimated_wait_minutes": 15
  }
]
```

#### `GET /api/locations/{location_id}/menu`
* **Query Parameters**: `?dietary=vegan,gluten-free` (optional)
* **Response** `200 OK`:
```json
[
  {
    "id": "item-101",
    "location_id": "beanery",
    "name": "Iced Vanilla Latte",
    "description": "Espresso with cold milk and sweet Madagascar vanilla syrup.",
    "category": "Beverages",
    "base_price": 4.75,
    "dietary_tags": ["vegetarian", "gluten-free"],
    "is_available": true,
    "customization_groups": [
      {
        "group_name": "Size",
        "required": true,
        "max_select": 1,
        "options": [
          { "name": "Medium (16oz)", "price_delta": 0.0 },
          { "name": "Large (20oz)", "price_delta": 0.75 }
        ]
      },
      {
        "group_name": "Milk Alternative",
        "required": false,
        "max_select": 1,
        "options": [
          { "name": "Whole Milk", "price_delta": 0.0 },
          { "name": "Oat Milk", "price_delta": 0.80 }
        ]
      }
    ]
  }
]
```

#### `PATCH /api/menu/{item_id}/availability`
* **Headers**: `X-User-Role: staff`
* **Request Body**:
```json
{
  "is_available": false
}
```
* **Response** `200 OK`:
```json
{
  "id": "item-101",
  "name": "Iced Vanilla Latte",
  "is_available": false,
  "updated_at": "2026-11-10T13:15:00Z"
}
```

---

### 3.2 Cart, Checkout & User Balance (Slice 2)

#### `GET /api/users/{user_id}/balance`
* **Response** `200 OK`:
```json
{
  "user_id": "user-uconn-01",
  "name": "Vincent Nguyen",
  "huskybucks_balance": 45.25,
  "flex_passes": 8,
  "dining_points": 120
}
```

#### `POST /api/orders`
* **Request Body**:
```json
{
  "user_id": "user-uconn-01",
  "location_id": "beanery",
  "payment_method": "HUSKYBUCKS",
  "items": [
    {
      "menu_item_id": "item-101",
      "quantity": 1,
      "selected_options": ["Medium (16oz)", "Oat Milk"],
      "notes": "Extra ice please"
    }
  ]
}
```
* **Response** `201 Created`:
```json
{
  "order_id": "ord-88392",
  "pickup_code": "#B-24",
  "status": "RECEIVED",
  "location_id": "beanery",
  "location_name": "The Beanery",
  "total_amount": 5.55,
  "payment_method": "HUSKYBUCKS",
  "remaining_balance": 39.70,
  "estimated_ready_time": "2026-11-10T13:28:00Z",
  "created_at": "2026-11-10T13:16:00Z",
  "items": [
    {
      "name": "Iced Vanilla Latte",
      "quantity": 1,
      "unit_price": 5.55,
      "selected_options": ["Medium (16oz)", "Oat Milk"],
      "notes": "Extra ice please"
    }
  ]
}
```
* **Error Response** `400 Bad Request` (Insufficient Funds / Out of Stock):
```json
{
  "error": "INSUFFICIENT_BALANCE",
  "message": "Order total $5.55 exceeds available HuskyBucks balance of $2.10."
}
```

---

### 3.3 Live Order Queue & Kitchen KDS (Slice 3)

#### `GET /api/orders/{order_id}`
* **Polled by frontend tracker every 5 seconds**
* **Response** `200 OK`:
```json
{
  "order_id": "ord-88392",
  "pickup_code": "#B-24",
  "status": "PREPPING",
  "progress_percentage": 50,
  "location_name": "The Beanery",
  "estimated_ready_time": "2026-11-10T13:28:00Z",
  "created_at": "2026-11-10T13:16:00Z",
  "items": [
    {
      "name": "Iced Vanilla Latte",
      "quantity": 1,
      "selected_options": ["Medium (16oz)", "Oat Milk"],
      "notes": "Extra ice please"
    }
  ]
}
```

#### `GET /api/orders/queue?location_id={location_id}`
* **Kitchen Staff KDS Query**
* **Response** `200 OK`:
```json
{
  "location_id": "beanery",
  "received": [
    {
      "order_id": "ord-88395",
      "pickup_code": "#B-26",
      "customer_name": "Vin Gluck",
      "time_elapsed_minutes": 2,
      "items": [{"name": "Asiago Bagel", "quantity": 1, "selected_options": ["Toasted", "Cream Cheese"]}]
    }
  ],
  "prepping": [
    {
      "order_id": "ord-88392",
      "pickup_code": "#B-24",
      "customer_name": "Vincent Nguyen",
      "time_elapsed_minutes": 6,
      "items": [{"name": "Iced Vanilla Latte", "quantity": 1, "selected_options": ["Medium (16oz)", "Oat Milk"]}]
    }
  ],
  "ready": [
    {
      "order_id": "ord-88388",
      "pickup_code": "#B-21",
      "customer_name": "Jacob Bogdany",
      "time_elapsed_minutes": 11,
      "items": [{"name": "Drip Coffee", "quantity": 1, "selected_options": ["Large (20oz)"]}]
    }
  ]
}
```

#### `PATCH /api/orders/{order_id}/status`
* **Request Body**:
```json
{
  "status": "READY"
}
```
* **Response** `200 OK`:
```json
{
  "order_id": "ord-88392",
  "status": "READY",
  "ready_at": "2026-11-10T13:25:30Z"
}
```

---

## 4. Zero-DB In-Memory Architecture (Demo Protocol)

To allow the team to work immediately without setting up or debugging database drivers:
1. **Frontend-Only Mock Mode**:
   - The UI defines a React context (`DemoProvider`) initialized from a hardcoded `mockData.ts` file containing UConn venues and menus.
   - New orders are appended to a `localStorage` key (`huskybite_orders`).
   - The polling hook reads from `localStorage`, meaning two open browser tabs (one on Student view, one on Staff KDS view) will sync in real time when storage changes.
2. **Backend In-Memory Mock Mode**:
   - If running Python/Flask or FastAPI without SQLite, declare global dictionaries:
     ```python
     MOCK_USERS = {...}
     MOCK_LOCATIONS = [...]
     MOCK_MENU = [...]
     MOCK_ORDERS = []
     ```
   - All REST routes operate on these Python data structures in memory.