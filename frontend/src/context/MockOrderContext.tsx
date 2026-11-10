import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_STUDENT_PROFILE, MOCK_LOCATIONS } from '../mocks/mockData';
import type {
  CartItem,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  UserSession,
} from '../types';

export const ORDERS_STORAGE_KEY = 'huskybite_orders';
export const USER_STORAGE_KEY = 'huskybite_user';

export interface CreateOrderParams {
  cartItems: CartItem[];
  locationId?: string;
  paymentMethod?: PaymentMethod;
}

export interface MockOrderContextValue {
  orders: Order[];
  currentUser: UserSession;
  createOrder: (cartItemsOrParams: CartItem[] | CreateOrderParams) => Order | null;
  getOrder: (orderId: string) => Order | undefined;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
  cancelOrder: (orderId: string) => void;
  resetMockData: () => void;
}

const MockOrderContext = createContext<MockOrderContextValue | null>(null);

function loadStoredOrders(): Order[] {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to parse orders from localStorage', err);
    return [];
  }
}

function loadStoredUser(): UserSession {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { ...DEFAULT_STUDENT_PROFILE };
  } catch (err) {
    console.error('Failed to parse user session from localStorage', err);
    return { ...DEFAULT_STUDENT_PROFILE };
  }
}

function generatePickupCode(locationId: string, count: number): string {
  const prefix = locationId.toLowerCase().includes('bean')
    ? 'B'
    : locationId.toLowerCase().includes('worm')
    ? 'BW'
    : 'UCONN';
  const num = (100 + count) % 999;
  return `#${prefix}-${num}`;
}

export const MockOrderProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [orders, setOrders] = useState<Order[]>(loadStoredOrders);
  const [currentUser, setCurrentUser] = useState<UserSession>(loadStoredUser);

  // Synchronize orders to localStorage whenever local state changes
  useEffect(() => {
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    } catch (err) {
      console.error('Failed to save orders to localStorage', err);
    }
  }, [orders]);

  // Synchronize user session to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));
    } catch (err) {
      console.error('Failed to save user session to localStorage', err);
    }
  }, [currentUser]);

  // Real-time synchronization across browser tabs (Student Tracker <-> Staff KDS)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ORDERS_STORAGE_KEY && e.newValue) {
        try {
          const syncedOrders = JSON.parse(e.newValue);
          setOrders(syncedOrders);
        } catch (err) {
          console.error('Failed to parse updated orders from storage event', err);
        }
      }

      if (e.key === USER_STORAGE_KEY && e.newValue) {
        try {
          const syncedUser = JSON.parse(e.newValue);
          setCurrentUser(syncedUser);
        } catch (err) {
          console.error('Failed to parse updated user from storage event', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  /**
   * Retrieves an active or past order by ID
   */
  const getOrder = useCallback(
    (orderId: string): Order | undefined => {
      return orders.find((o) => o.order_id === orderId);
    },
    [orders]
  );

  /**
   * Creates an order from cart items, calculates totals, deducts from HuskyBucks balance,
   * generates a pickup code, and persists the record.
   */
  const createOrder = useCallback(
    (cartItemsOrParams: CartItem[] | CreateOrderParams): Order | null => {
      let items: CartItem[] = [];
      let locationId = 'beanery';
      let paymentMethod: PaymentMethod = 'HUSKYBUCKS';

      if (Array.isArray(cartItemsOrParams)) {
        items = cartItemsOrParams;
      } else {
        items = cartItemsOrParams.cartItems;
        if (cartItemsOrParams.locationId) locationId = cartItemsOrParams.locationId;
        if (cartItemsOrParams.paymentMethod) paymentMethod = cartItemsOrParams.paymentMethod;
      }

      if (items.length === 0) return null;

      const location = MOCK_LOCATIONS.find((l) => l.id === locationId) || MOCK_LOCATIONS[0];
      const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
      const ctTax = Math.round(subtotal * 0.0635 * 100) / 100;
      const totalAmount = Math.round((subtotal + ctTax) * 100) / 100;

      // Validate HuskyBucks balance
      if (paymentMethod === 'HUSKYBUCKS' && currentUser.huskybucks_balance < totalAmount) {
        console.warn('Insufficient HuskyBucks balance to place order.');
        return null;
      }

      const existingOrders = loadStoredOrders();
      const pickupCode = generatePickupCode(location.id, existingOrders.length + 1);
      const now = new Date();
      const estimatedReady = new Date(now.getTime() + (location.estimated_wait_minutes || 10) * 60000);

      const orderLineItems: OrderItem[] = items.map((cartItem) => ({
        id: uuidv4(),
        menu_item_id: cartItem.menu_item_id,
        name: cartItem.name,
        quantity: cartItem.quantity,
        unit_price: cartItem.unit_price,
        selected_options: cartItem.selected_options || [],
        notes: cartItem.notes || '',
      }));

      const newOrder: Order = {
        order_id: `ord-${uuidv4().slice(0, 8)}`,
        pickup_code: pickupCode,
        status: 'RECEIVED',
        location_id: location.id,
        location_name: location.name,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        remaining_balance:
          paymentMethod === 'HUSKYBUCKS'
            ? Math.round((currentUser.huskybucks_balance - totalAmount) * 100) / 100
            : currentUser.huskybucks_balance,
        estimated_ready_time: estimatedReady.toISOString(),
        created_at: now.toISOString(),
        ready_at: null,
        completed_at: null,
        items: orderLineItems,
        customer_name: currentUser.name,
      };

      // Deduct balance
      if (paymentMethod === 'HUSKYBUCKS') {
        setCurrentUser((prev) => ({
          ...prev,
          huskybucks_balance: Math.round((prev.huskybucks_balance - totalAmount) * 100) / 100,
        }));
      }

      setOrders((prev) => [newOrder, ...prev]);
      return newOrder;
    },
    [currentUser]
  );

  /**
   * Updates an order's status and records state machine timestamps.
   * Dispatches updates to localStorage which automatically notifies other tabs.
   */
  const updateOrderStatus = useCallback((orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.order_id !== orderId) return order;

        const now = new Date().toISOString();
        return {
          ...order,
          status: newStatus,
          ready_at: newStatus === 'READY' ? now : order.ready_at,
          completed_at: newStatus === 'COMPLETED' ? now : order.completed_at,
        };
      })
    );
  }, []);

  /**
   * Cancels an order if it is still in RECEIVED state and refunds the balance.
   */
  const cancelOrder = useCallback((orderId: string) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.order_id !== orderId || order.status !== 'RECEIVED') return order;

        if (order.payment_method === 'HUSKYBUCKS') {
          setCurrentUser((user) => ({
            ...user,
            huskybucks_balance:
              Math.round((user.huskybucks_balance + order.total_amount) * 100) / 100,
          }));
        }

        return {
          ...order,
          status: 'CANCELLED',
        };
      })
    );
  }, []);

  const resetMockData = useCallback(() => {
    setOrders([]);
    setCurrentUser({ ...DEFAULT_STUDENT_PROFILE });
    localStorage.removeItem(ORDERS_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }, []);

  return (
    <MockOrderContext.Provider
      value={{
        orders,
        currentUser,
        createOrder,
        getOrder,
        updateOrderStatus,
        cancelOrder,
        resetMockData,
      }}
    >
      {children}
    </MockOrderContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useMockOrder() {
  const context = useContext(MockOrderContext);
  if (!context) {
    throw new Error('useMockOrder must be used within a MockOrderProvider');
  }
  return context;
}
