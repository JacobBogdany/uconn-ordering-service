import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MOCK_LOCATIONS, MOCK_MENU_ITEMS, MOCK_USER } from '../mockData';
import type {
  CartItem,
  Location,
  MenuItem,
  Order,
  OrderItem,
  PaymentMethod,
  UserSession,
  ViewRole,
} from '../types';

const ORDERS_KEY = 'huskybite_orders';
const SESSION_KEY = 'huskybite_session';
const AVAIL_KEY = 'huskybite_availability';

function loadOrders(): Order[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOrders(orders: Order[]) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

function loadSession(): UserSession {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : { ...MOCK_USER };
  } catch {
    return { ...MOCK_USER };
  }
}

function saveSession(session: UserSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function loadAvailability(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(AVAIL_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAvailability(avail: Record<string, boolean>) {
  localStorage.setItem(AVAIL_KEY, JSON.stringify(avail));
}

function generatePickupCode(locationId: string, orderCount: number): string {
  const prefix = locationId === 'beanery' ? 'B' : locationId === 'bookworms' ? 'BW' : 'P';
  const num = (100 + orderCount) % 999;
  return `#${prefix}-${num}`;
}



interface DemoContextType {
  // Role
  viewRole: ViewRole;
  setViewRole: (role: ViewRole) => void;

  // Session
  session: UserSession;
  resetSession: () => void;

  // Locations
  locations: Location[];

  // Menu
  menuItems: MenuItem[];
  toggleItemAvailability: (itemId: string) => void;
  getMenuForLocation: (locationId: string) => MenuItem[];

  // Cart
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (index: number) => void;
  updateCartQty: (index: number, qty: number) => void;
  clearCart: () => void;
  cartTotal: number;

  // Orders
  orders: Order[];
  placeOrder: (locationId: string, paymentMethod: PaymentMethod) => Order | null;
  advanceOrderStatus: (orderId: string) => void;
  cancelOrder: (orderId: string) => void;
  getOrderById: (orderId: string) => Order | undefined;
}

const DemoContext = createContext<DemoContextType | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [viewRole, setViewRole] = useState<ViewRole>('student');
  const [session, setSession] = useState<UserSession>(loadSession);
  const [orders, setOrders] = useState<Order[]>(loadOrders);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [availabilityOverrides, setAvailabilityOverrides] = useState<Record<string, boolean>>(loadAvailability);

  // Sync orders to localStorage and listen for changes from other tabs
  useEffect(() => {
    saveOrders(orders);
  }, [orders]);

  useEffect(() => {
    saveSession(session);
  }, [session]);

  useEffect(() => {
    saveAvailability(availabilityOverrides);
  }, [availabilityOverrides]);

  // Cross-tab sync via storage event
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === ORDERS_KEY && e.newValue) {
        setOrders(JSON.parse(e.newValue));
      }
      if (e.key === SESSION_KEY && e.newValue) {
        setSession(JSON.parse(e.newValue));
      }
      if (e.key === AVAIL_KEY && e.newValue) {
        setAvailabilityOverrides(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const menuItems: MenuItem[] = MOCK_MENU_ITEMS.map((item) => ({
    ...item,
    is_available: availabilityOverrides[item.id] ?? item.is_available,
  }));

  const toggleItemAvailability = useCallback((itemId: string) => {
    setAvailabilityOverrides((prev) => {
      const current = prev[itemId] ?? (MOCK_MENU_ITEMS.find((i) => i.id === itemId)?.is_available ?? true);
      return { ...prev, [itemId]: !current };
    });
  }, []);

  const getMenuForLocation = useCallback(
    (locationId: string) => menuItems.filter((i) => i.location_id === locationId),
    [menuItems]
  );

  const addToCart = useCallback((item: CartItem) => {
    setCart((prev) => {
      // Try to merge if same item + same options + same notes
      const idx = prev.findIndex(
        (c) =>
          c.menu_item_id === item.menu_item_id &&
          JSON.stringify(c.selected_options) === JSON.stringify(item.selected_options) &&
          c.notes === item.notes
      );
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + item.quantity };
        return updated;
      }
      return [...prev, item];
    });
  }, []);

  const removeFromCart = useCallback((index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateCartQty = useCallback((index: number, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((_, i) => i !== index));
    } else {
      setCart((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], quantity: qty };
        return updated;
      });
    }
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const cartTotal = cart.reduce((sum, c) => sum + c.unit_price * c.quantity, 0);

  const placeOrder = useCallback(
    (locationId: string, paymentMethod: PaymentMethod): Order | null => {
      if (cart.length === 0) return null;

      const location = MOCK_LOCATIONS.find((l) => l.id === locationId);
      if (!location) return null;

      const total = Math.round(cartTotal * 100) / 100;

      // Balance check
      if (paymentMethod === 'HUSKYBUCKS' && session.huskybucks_balance < total) return null;
      if (paymentMethod === 'FLEX_PASS' && session.flex_passes <= 0) return null;
      if (paymentMethod === 'POINTS' && session.dining_points < total * 10) return null;

      const allOrders = loadOrders();
      const orderCount = allOrders.length + 1;
      const orderId = `ord-${uuidv4().slice(0, 8)}`;
      const pickupCode = generatePickupCode(locationId, orderCount);
      const now = new Date();
      const estimatedReady = new Date(now.getTime() + 10 * 60 * 1000);

      const orderItems: OrderItem[] = cart.map((c) => ({
        id: uuidv4(),
        menu_item_id: c.menu_item_id,
        name: c.name,
        quantity: c.quantity,
        unit_price: c.unit_price,
        selected_options: c.selected_options,
        notes: c.notes,
      }));

      const order: Order = {
        order_id: orderId,
        pickup_code: pickupCode,
        status: 'RECEIVED',
        location_id: locationId,
        location_name: location.name,
        total_amount: total,
        payment_method: paymentMethod,
        remaining_balance: session.huskybucks_balance - (paymentMethod === 'HUSKYBUCKS' ? total : 0),
        estimated_ready_time: estimatedReady.toISOString(),
        created_at: now.toISOString(),
        ready_at: null,
        completed_at: null,
        items: orderItems,
        customer_name: session.name,
      };

      // Deduct balance
      setSession((prev) => {
        if (paymentMethod === 'HUSKYBUCKS') return { ...prev, huskybucks_balance: Math.round((prev.huskybucks_balance - total) * 100) / 100 };
        if (paymentMethod === 'FLEX_PASS') return { ...prev, flex_passes: prev.flex_passes - 1 };
        if (paymentMethod === 'POINTS') return { ...prev, dining_points: prev.dining_points - Math.ceil(total * 10) };
        return prev;
      });

      setOrders((prev) => [order, ...prev]);
      clearCart();
      return order;
    },
    [cart, cartTotal, session, clearCart]
  );

  const advanceOrderStatus = useCallback((orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.order_id !== orderId) return o;
        const transitions: Record<string, Order['status']> = {
          RECEIVED: 'PREPPING',
          PREPPING: 'READY',
          READY: 'COMPLETED',
        };
        const next = transitions[o.status];
        if (!next) return o;
        const now = new Date().toISOString();
        return {
          ...o,
          status: next,
          ready_at: next === 'READY' ? now : o.ready_at,
          completed_at: next === 'COMPLETED' ? now : o.completed_at,
        };
      })
    );
  }, []);

  const cancelOrder = useCallback((orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.order_id !== orderId || o.status !== 'RECEIVED') return o;
        // Refund
        setSession((s) => {
          if (o.payment_method === 'HUSKYBUCKS') return { ...s, huskybucks_balance: Math.round((s.huskybucks_balance + o.total_amount) * 100) / 100 };
          if (o.payment_method === 'FLEX_PASS') return { ...s, flex_passes: s.flex_passes + 1 };
          return s;
        });
        return { ...o, status: 'CANCELLED' };
      })
    );
  }, []);

  const resetSession = useCallback(() => {
    setSession({ ...MOCK_USER });
    setOrders([]);
    setCart([]);
    setAvailabilityOverrides({});
    localStorage.removeItem(ORDERS_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(AVAIL_KEY);
  }, []);

  const getOrderById = useCallback(
    (orderId: string) => orders.find((o) => o.order_id === orderId),
    [orders]
  );

  return (
    <DemoContext.Provider
      value={{
        viewRole,
        setViewRole,
        session,
        resetSession,
        locations: MOCK_LOCATIONS,
        menuItems,
        toggleItemAvailability,
        getMenuForLocation,
        cart,
        addToCart,
        removeFromCart,
        updateCartQty,
        clearCart,
        cartTotal,
        orders,
        placeOrder,
        advanceOrderStatus,
        cancelOrder,
        getOrderById,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used inside DemoProvider');
  return ctx;
}
