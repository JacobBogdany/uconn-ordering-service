export type DietaryTag = 'vegan' | 'vegetarian' | 'gluten-free' | 'dairy-free' | 'halal';

export interface CustomizationOption {
  name: string;
  price_delta: number;
}

export interface CustomizationGroup {
  group_name: string;
  required: boolean;
  max_select: number;
  options: CustomizationOption[];
}

export interface MenuItem {
  id: string;
  location_id: string;
  name: string;
  description: string;
  category: string;
  base_price: number;
  dietary_tags: DietaryTag[];
  customization_groups: CustomizationGroup[];
  is_available: boolean;
}

export interface Location {
  id: string;
  name: string;
  building: string;
  hours: string;
  is_open: boolean;
  active_orders_count: number;
  estimated_wait_minutes: number;
}

export type OrderStatus = 'RECEIVED' | 'PREPPING' | 'READY' | 'COMPLETED' | 'CANCELLED';
export type PaymentMethod = 'HUSKYBUCKS' | 'FLEX_PASS' | 'POINTS';

export interface OrderItem {
  id: string;
  menu_item_id: string | null;
  item_name: string;
  quantity: number;
  unit_price: number; // one unit including selected modifiers
  line_total: number;
  selected_options: SelectedOptionSnapshot[];
  notes: string | null;
}

export interface Order {
  order_id: string;
  pickup_code: string;
  status: OrderStatus;
  location_id: string;
  location_name: string;
  total_amount: number;
  payment_method: PaymentMethod;
  remaining_balance: number;
  estimated_ready_time: string;
  created_at: string;
  ready_at: string | null;
  completed_at: string | null;
  items: OrderItem[];
  customer_name: string;
}

export type ViewRole = 'student' | 'staff';

export type DemoPersona = 'student' | 'operator';

export interface DemoAuthSession {
  access_token: string;
  token_type: 'bearer';
  persona: DemoPersona;
  role: ViewRole;
  user_id: string;
  display_name: string;
  expires_at: string;
}

// ---------------------------------------------------------------------------
// Checkout contract (Vin / Slice 2). Mirrors backend/app/checkout_schemas.py
// and context/checkout_contract.md. Money is a JSON number in dollars.
// ---------------------------------------------------------------------------

/** Schema-aligned modifier shapes (modifier_groups / modifier_options tables). */
export interface ModifierOption {
  id: string;
  name: string;
  price_delta: number;
  is_available: boolean;
  sort_order: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  is_required: boolean;
  min_select: number;
  max_select: number;
  sort_order: number;
  options: ModifierOption[];
}

/** Element of order_items.selected_options (receipt snapshot). */
export interface SelectedOptionSnapshot {
  option_id: string | null;
  group_name: string;
  name: string;
  price_delta: number;
}

/** Only HuskyBucks are accepted for the first demo. */
export type CheckoutPaymentMethod = Extract<PaymentMethod, 'HUSKYBUCKS'>;

export interface CartItem {
  line_id: string; // stable key: item + sorted option ids + notes
  location_id: string;
  menu_item_id: string;
  name: string;
  quantity: number;
  /** Display estimate only; never sent. The server recomputes all prices. */
  unit_price: number;
  selected_options: SelectedOptionSnapshot[];
  notes: string;
}

/** GET /api/users/me/balance — always the session's own profile. */
export interface BalanceResponse {
  user_id: string;
  display_name: string;
  huskybucks_balance: number;
  flex_passes: number; // informational; not a checkout method yet
  dining_points: number; // informational; not a checkout method yet
}

export interface CreateOrderLine {
  menu_item_id: string;
  quantity: number;
  selected_option_ids: string[];
  notes: string | null;
}

/** POST /api/orders body. No user_id, prices, totals, or balances. */
export interface CreateOrderRequest {
  location_id: string;
  payment_method: CheckoutPaymentMethod;
  items: CreateOrderLine[];
}

export interface CreateOrderResponse {
  order_id: string;
  pickup_code: string;
  status: OrderStatus;
  location_id: string;
  location_name: string;
  payment_method: CheckoutPaymentMethod;
  total_amount: number;
  estimated_prep_minutes: number;
  created_at: string;
  items: OrderItem[];
  balance: {
    payment_method: CheckoutPaymentMethod;
    amount_charged: number;
    huskybucks_balance: number;
  };
}

export type CheckoutErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'ITEM_UNAVAILABLE'
  | 'INSUFFICIENT_BALANCE'
  | 'PAYMENT_METHOD_UNAVAILABLE';

/** Error body: { detail: { code, message, field? } } */
export interface ApiErrorBody {
  detail: { code: CheckoutErrorCode; message: string; field?: string | null };
}
