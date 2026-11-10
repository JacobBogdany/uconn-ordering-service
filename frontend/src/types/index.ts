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
  menu_item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  selected_options: string[];
  notes: string;
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

export interface CartItem {
  menu_item_id: string;
  name: string;
  quantity: number;
  base_price: number;
  unit_price: number;
  selected_options: string[];
  notes: string;
  customization_groups: CustomizationGroup[];
}

export interface UserSession {
  user_id: string;
  name: string;
  email: string;
  huskybucks_balance: number;
  flex_passes: number;
  dining_points: number;
}

export type ViewRole = 'student' | 'staff';
