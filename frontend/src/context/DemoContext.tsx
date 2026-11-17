import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MOCK_LOCATIONS, MOCK_MENU_ITEMS, MOCK_STARTING_BALANCES } from '../mockData';
import {
  assertSufficientBalance,
  buildCreateOrderRequest,
  cartTotalCents,
  CheckoutRuleError,
  fromCents,
  MAX_QUANTITY_PER_LINE,
  priceOrder,
} from '../features/checkout/rules';
import type {
  ApiErrorBody,
  BalanceResponse,
  CartItem,
  CreateOrderResponse,
  DietaryTag,
  Location,
  MenuItem,
  CreateOrderRequest,
  Order,
  DemoAuthSession,
  DemoPersona,
  ViewRole,
} from '../types';

// v2 keys: order line/option shapes changed to the checkout contract.
const ORDERS_KEY = 'huskybite_orders_v2';
const BALANCES_KEY = 'huskybite_balances_v2';
const AVAIL_KEY = 'huskybite_availability';
const AUTH_KEY = 'huskybite_demo_auth';
const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');

function loadDemoAuth(): DemoAuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const auth = JSON.parse(raw) as DemoAuthSession;
    if (!auth.access_token || new Date(auth.expires_at).getTime() <= Date.now()) {
      localStorage.removeItem(AUTH_KEY);
      return null;
    }
    return auth;
  } catch {
    localStorage.removeItem(AUTH_KEY);
    return null;
  }
}

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

type MockBalances = Omit<BalanceResponse, 'user_id' | 'display_name'>;

/** Mock balances keyed by the signed demo session's user_id (no hardcoded ids). */
function loadBalances(): Record<string, MockBalances> {
  try {
    const raw = localStorage.getItem(BALANCES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveBalances(balances: Record<string, MockBalances>) {
  localStorage.setItem(BALANCES_KEY, JSON.stringify(balances));
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

/** Mock only: unique per location among stored orders. Milestone 2 moves this to the server. */
function generatePickupCode(locationId: string, existing: Order[]): string {
  const prefix = locationId === 'beanery' ? 'B' : locationId === 'bookworms' ? 'BW' : 'P';
  const taken = new Set(existing.filter((o) => o.location_id === locationId).map((o) => o.pickup_code));
  for (let n = 100 + existing.length; n < 100 + existing.length + 900; n += 1) {
    const code = `#${prefix}-${100 + (n % 900)}`;
    if (!taken.has(code)) return code;
  }
  throw new CheckoutRuleError('VALIDATION_ERROR', 'No pickup codes available. Reset the demo.');
}

/** Convert a non-2xx checkout response into the same error type the mock adapter throws. */
async function readCheckoutError(response: Response): Promise<CheckoutRuleError> {
  let detail: unknown;
  try {
    detail = ((await response.json()) as { detail?: unknown }).detail;
  } catch {
    detail = undefined;
  }
  if (detail && typeof detail === 'object' && !Array.isArray(detail) && 'code' in detail) {
    const d = detail as ApiErrorBody['detail'];
    return new CheckoutRuleError(d.code, d.message, d.field ?? undefined);
  }
  if (response.status === 401) {
    return new CheckoutRuleError('VALIDATION_ERROR', 'Your demo session expired. Log in again to check out.');
  }
  if (response.status === 422) {
    return new CheckoutRuleError('VALIDATION_ERROR', 'Some order details were invalid. Review your cart and try again.');
  }
  return new CheckoutRuleError('VALIDATION_ERROR', `Checkout failed (${response.status}). Please try again.`);
}

export type AddToCartResult = { ok: true } | { ok: false; message: string };



interface DemoContextType {
  // Role
  viewRole: ViewRole;
  demoAuth: DemoAuthSession | null;
  loginAsPersona: (persona: DemoPersona) => Promise<void>;
  logoutDemo: () => void;

  // Session: identity from the signed demo session; balances from the mock adapter
  // (GET /api/users/me/balance once Supabase is seeded).
  session: BalanceResponse;
  /** Re-read the balance from GET /api/users/me/balance (no-op in mock mode). */
  refreshBalance: () => Promise<void>;
  resetSession: () => void;

  // Locations
  locations: Location[];
  locationsLoading: boolean;
  locationsError: string | null;
  refreshLocations: () => Promise<void>;

  // Menu
  menuItems: MenuItem[];
  catalogLoading: boolean;
  catalogError: string | null;
  toggleItemAvailability: (itemId: string) => Promise<void>;
  getMenuForLocation: (locationId: string) => MenuItem[];
  fetchMenuForLocation: (locationId: string, dietaryTags?: DietaryTag[]) => Promise<MenuItem[]>;

  // Cart
  cart: CartItem[];
  addToCart: (item: CartItem) => AddToCartResult;
  removeFromCart: (index: number) => void;
  updateCartQty: (index: number, qty: number) => void;
  clearCart: () => void;
  cartTotal: number; // display estimate; server recomputes
  cartLocationId: string | null;

  // Orders
  orders: Order[];
  /** HuskyBucks only. Rejects with CheckoutRuleError on any contract violation. */
  placeOrder: () => Promise<Order>;
  advanceOrderStatus: (orderId: string) => void;
  cancelOrder: (orderId: string) => void;
  getOrderById: (orderId: string) => Order | undefined;
}

const DemoContext = createContext<DemoContextType | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [demoAuth, setDemoAuth] = useState<DemoAuthSession | null>(loadDemoAuth);
  const [viewRole, setViewRole] = useState<ViewRole>(() => loadDemoAuth()?.role ?? 'student');
  const [balancesByUser, setBalancesByUser] = useState<Record<string, MockBalances>>(loadBalances);
  const [orders, setOrders] = useState<Order[]>(loadOrders);
  const [cart, setCart] = useState<CartItem[]>([]);
  // Server balance for the signed-in student; null means the mock adapter is in use
  // (API without Supabase, or no seeded profile yet).
  const [apiBalance, setApiBalance] = useState<BalanceResponse | null>(null);
  // One key per checkout attempt. Reused while the same cart is retried so a repeated
  // submit (double click, flaky network) cannot charge twice; replaced when the cart changes.
  const idempotencyRef = useRef<{ signature: string; key: string } | null>(null);
  const [availabilityOverrides, setAvailabilityOverrides] = useState<Record<string, boolean>>(loadAvailability);

  // Sync orders to localStorage and listen for changes from other tabs
  useEffect(() => {
    saveOrders(orders);
  }, [orders]);

  useEffect(() => {
    saveBalances(balancesByUser);
  }, [balancesByUser]);

  useEffect(() => {
    if (demoAuth) localStorage.setItem(AUTH_KEY, JSON.stringify(demoAuth));
    else localStorage.removeItem(AUTH_KEY);
  }, [demoAuth]);

  useEffect(() => {
    saveAvailability(availabilityOverrides);
  }, [availabilityOverrides]);

  // Cross-tab sync via storage event
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === ORDERS_KEY && e.newValue) {
        setOrders(JSON.parse(e.newValue));
      }
      if (e.key === BALANCES_KEY && e.newValue) {
        setBalancesByUser(JSON.parse(e.newValue));
      }
      if (e.key === AVAIL_KEY && e.newValue) {
        setAvailabilityOverrides(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const [locations, setLocations] = useState<Location[]>(MOCK_LOCATIONS);
  const [locationsLoading, setLocationsLoading] = useState<boolean>(false);
  const [locationsError, setLocationsError] = useState<string | null>(null);

  const [apiMenuItems, setApiMenuItems] = useState<MenuItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState<boolean>(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const refreshLocations = useCallback(async () => {
    setLocationsLoading(true);
    setLocationsError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/locations`);
      if (response.ok) {
        const data = await response.json() as Location[];
        if (Array.isArray(data) && data.length > 0) {
          setLocations(data);
          return;
        }
      } else if (response.status !== 503) {
        setLocationsError(`Failed to load locations (${response.status}).`);
      }
    } catch (err) {
      console.warn('Backend /api/locations unreachable; using local mock data:', err);
    } finally {
      setLocationsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function initLocations() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/locations`);
        if (!ignore && response.ok) {
          const data = await response.json() as Location[];
          if (Array.isArray(data) && data.length > 0) {
            setLocations(data);
          }
        }
      } catch {
        // Silently preserve mock locations when backend/Supabase is unconfigured
      }
    }
    void initLocations();
    return () => {
      ignore = true;
    };
  }, []);

  // Combine fetched API menu items with MOCK_MENU_ITEMS, applying availability overrides
  const baseItems = apiMenuItems.length > 0 ? apiMenuItems : MOCK_MENU_ITEMS;
  const menuItems: MenuItem[] = baseItems.map((item) => ({
    ...item,
    is_available: availabilityOverrides[item.id] ?? item.is_available,
  }));

  const toggleItemAvailability = useCallback(async (itemId: string) => {
    const current = availabilityOverrides[itemId] ?? (menuItems.find((i) => i.id === itemId)?.is_available ?? true);
    const nextState = !current;
    setAvailabilityOverrides((prev) => ({ ...prev, [itemId]: nextState }));
    setApiMenuItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, is_available: nextState } : item)));

    if (demoAuth?.access_token && demoAuth?.role === 'staff') {
      try {
        const response = await fetch(`${API_BASE_URL}/api/menu/${itemId}/availability`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${demoAuth.access_token}`,
          },
          body: JSON.stringify({ is_available: nextState }),
        });
        if (!response.ok && response.status !== 503) {
          console.warn(`PATCH /api/menu/${itemId}/availability returned ${response.status}`);
        }
      } catch (err) {
        console.warn('Network error updating item availability on backend:', err);
      }
    }
  }, [availabilityOverrides, demoAuth, menuItems]);

  const fetchMenuForLocation = useCallback(async (locationId: string, dietaryTags?: DietaryTag[]): Promise<MenuItem[]> => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const query = dietaryTags && dietaryTags.length > 0 ? `?dietary=${encodeURIComponent(dietaryTags.join(','))}` : '';
      const response = await fetch(`${API_BASE_URL}/api/locations/${locationId}/menu${query}`);
      if (response.ok) {
        const data = await response.json() as MenuItem[];
        if (Array.isArray(data)) {
          setApiMenuItems((prev) => {
            const others = prev.filter((item) => item.location_id !== locationId);
            return [...others, ...data];
          });
          return data.map((item) => ({
            ...item,
            is_available: availabilityOverrides[item.id] ?? item.is_available,
          }));
        }
      } else if (response.status !== 503) {
        setCatalogError(`Failed to load menu (${response.status}).`);
      }
    } catch (err) {
      console.warn(`Unable to fetch /api/locations/${locationId}/menu, falling back to local data:`, err);
    } finally {
      setCatalogLoading(false);
    }

    let items = MOCK_MENU_ITEMS.filter((i) => i.location_id === locationId).map((item) => ({
      ...item,
      is_available: availabilityOverrides[item.id] ?? item.is_available,
    }));
    if (dietaryTags && dietaryTags.length > 0) {
      items = items.filter((item) => dietaryTags.every((t) => item.dietary_tags.includes(t)));
    }
    return items;
  }, [availabilityOverrides]);

  const getMenuForLocation = useCallback(
    (locationId: string) => menuItems.filter((i) => i.location_id === locationId),
    [menuItems]
  );

  const studentId = demoAuth?.role === 'student' ? demoAuth.user_id : null;
  const balances: MockBalances = (studentId && balancesByUser[studentId]) || MOCK_STARTING_BALANCES;
  const session: BalanceResponse = apiBalance && apiBalance.user_id === studentId
    ? apiBalance
    : {
        user_id: studentId ?? '',
        display_name: demoAuth?.display_name ?? '',
        ...balances,
      };

  const accessToken = demoAuth?.access_token;
  const refreshBalance = useCallback(async () => {
    if (!accessToken || !studentId) return; // session ignores apiBalance for other users
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/me/balance`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) setApiBalance((await response.json()) as BalanceResponse);
      else setApiBalance(null); // 503/404: Supabase or seed missing -> mock balances
    } catch {
      // Keep whatever balance is showing if the API is briefly unreachable.
    }
  }, [accessToken, studentId]);

  useEffect(() => {
    let ignore = false;
    async function loadBalance() {
      if (!accessToken || !studentId) {
        if (!ignore) setApiBalance(null);
        return;
      }
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/me/balance`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!ignore) {
          if (response.ok) setApiBalance((await response.json()) as BalanceResponse);
          else setApiBalance(null);
        }
      } catch {
        // Keep whatever balance is showing if the API is briefly unreachable.
      }
    }
    void loadBalance();
    return () => {
      ignore = true;
    };
  }, [accessToken, studentId]);

  const updateBalances = useCallback(
    (update: (current: MockBalances) => MockBalances) => {
      if (!studentId) return;
      setBalancesByUser((prev) => ({
        ...prev,
        [studentId]: update(prev[studentId] ?? { ...MOCK_STARTING_BALANCES }),
      }));
    },
    [studentId]
  );

  const cartLocationId = cart[0]?.location_id ?? null;

  const addToCart = useCallback(
    (item: CartItem): AddToCartResult => {
      // One order = one pickup location (orders.location_id).
      if (cart.length > 0 && cart[0].location_id !== item.location_id) {
        const current = MOCK_LOCATIONS.find((l) => l.id === cart[0].location_id)?.name ?? 'another location';
        return { ok: false, message: `Your cart has items from ${current}. Check out or clear it first.` };
      }
      const existing = cart.find((c) => c.line_id === item.line_id);
      if (existing && existing.quantity + item.quantity > MAX_QUANTITY_PER_LINE) {
        return { ok: false, message: `Limit ${MAX_QUANTITY_PER_LINE} of the same item per order.` };
      }
      setCart((prev) => {
        // Merge identical item + options + notes into one line.
        const idx = prev.findIndex((c) => c.line_id === item.line_id);
        if (idx === -1) return [...prev, item];
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + item.quantity };
        return updated;
      });
      return { ok: true };
    },
    [cart]
  );

  const removeFromCart = useCallback((index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateCartQty = useCallback((index: number, rawQty: number) => {
    const qty = Math.min(rawQty, MAX_QUANTITY_PER_LINE);
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

  const loginAsPersona = useCallback(async (persona: DemoPersona) => {
    const response = await fetch(`${API_BASE_URL}/api/demo/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona }),
    });
    if (!response.ok) {
      let message = `Demo login failed (${response.status}).`;
      try {
        const body = await response.json() as { detail?: string };
        if (body.detail) message = body.detail;
      } catch {
        // Keep the status-based message when the API returns no JSON body.
      }
      throw new Error(message);
    }

    const auth = await response.json() as DemoAuthSession;
    setDemoAuth(auth);
    setViewRole(auth.role);
  }, []);

  const logoutDemo = useCallback(() => {
    setDemoAuth(null);
    setViewRole('student');
    setApiBalance(null);
    idempotencyRef.current = null;
  }, []);

  const cartTotal = fromCents(cartTotalCents(cart));

  /**
   * Mock stand-in for POST /api/orders, used only when the API reports that Supabase
   * is not configured (503). Follows the server contract: sends only
   * ids/quantities/options/notes, re-prices from current catalog rows (ignoring
   * cart prices), accepts HuskyBucks only, checks funds, then debits and records.
   */
  const placeMockOrder = useCallback(async (request: CreateOrderRequest): Promise<Order> => {
    if (!demoAuth || !studentId) {
      throw new CheckoutRuleError('VALIDATION_ERROR', 'Sign in as a student to check out.');
    }
    await new Promise((r) => setTimeout(r, 400)); // simulate network latency

    const priced = priceOrder(request, menuItems, MOCK_LOCATIONS);
    const remaining = assertSufficientBalance(balances.huskybucks_balance, priced.totalCents);

    const existing = loadOrders();
    const now = new Date();
    const order: Order = {
      order_id: `ord-${uuidv4().slice(0, 8)}`,
      pickup_code: generatePickupCode(priced.location.id, existing),
      status: 'RECEIVED',
      location_id: priced.location.id,
      location_name: priced.location.name,
      total_amount: fromCents(priced.totalCents),
      payment_method: request.payment_method,
      estimated_prep_minutes: 10,
      created_at: now.toISOString(),
      items: priced.lines.map((line) => ({ id: uuidv4(), ...line })),
      customer_name: demoAuth.display_name,
    };

    updateBalances((b) => ({ ...b, huskybucks_balance: remaining }));
    setOrders((prev) => [order, ...prev]);
    clearCart();
    return order;
  }, [demoAuth, studentId, menuItems, balances.huskybucks_balance, updateBalances, clearCart]);

  /**
   * POST /api/orders. The server prices from current menu rows, then debits
   * HuskyBucks and stores the order atomically; the request carries only ids,
   * quantities, option ids and notes. Falls back to the mock adapter only when the
   * API says Supabase is not configured (503).
   */
  const placeOrder = useCallback(async (): Promise<Order> => {
    if (!demoAuth || demoAuth.role !== 'student' || !studentId) {
      throw new CheckoutRuleError('VALIDATION_ERROR', 'Sign in as a student to check out.');
    }
    const request = buildCreateOrderRequest(cart);

    const signature = JSON.stringify(request);
    if (idempotencyRef.current?.signature !== signature) {
      idempotencyRef.current = { signature, key: uuidv4() };
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${demoAuth.access_token}`,
          'Idempotency-Key': idempotencyRef.current.key,
        },
        body: JSON.stringify(request),
      });
    } catch {
      // Keep the key: retrying the same cart cannot double charge.
      throw new Error('Could not reach the server. You have not been charged; please try again.');
    }

    if (response.status === 503) {
      const order = await placeMockOrder(request);
      idempotencyRef.current = null;
      return order;
    }
    if (!response.ok) {
      const error = await readCheckoutError(response);
      if (error.code === 'ITEM_UNAVAILABLE' || error.code === 'NOT_FOUND') {
        // Menu changed under the cart: refresh so the UI shows current availability.
        void fetchMenuForLocation(request.location_id);
      }
      throw error;
    }

    const { balance, ...receipt } = (await response.json()) as CreateOrderResponse;
    const order: Order = { ...receipt, customer_name: demoAuth.display_name };
    setApiBalance((prev) => (prev ? { ...prev, huskybucks_balance: balance.huskybucks_balance } : prev));
    void refreshBalance();
    idempotencyRef.current = null;
    clearCart();
    return order;
  }, [demoAuth, studentId, cart, placeMockOrder, fetchMenuForLocation, refreshBalance, clearCart]);

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
        return {
          ...o,
          status: next,
        };
      })
    );
  }, []);

  const cancelOrder = useCallback((orderId: string) => {
    const order = orders.find((o) => o.order_id === orderId);
    if (!order || order.status !== 'RECEIVED') return;
    setOrders((prev) =>
      prev.map((o) => (o.order_id === orderId && o.status === 'RECEIVED' ? { ...o, status: 'CANCELLED' } : o))
    );
    // Refund simulated HuskyBucks (the only accepted method). Kept outside the
    // setOrders updater so StrictMode's double-invoke cannot refund twice.
    if (order.payment_method === 'HUSKYBUCKS') {
      updateBalances((b) => ({
        ...b,
        huskybucks_balance: fromCents(Math.round(b.huskybucks_balance * 100) + Math.round(order.total_amount * 100)),
      }));
    }
  }, [orders, updateBalances]);

  const resetSession = useCallback(() => {
    setBalancesByUser({});
    setOrders([]);
    setCart([]);
    setAvailabilityOverrides({});
    localStorage.removeItem(ORDERS_KEY);
    localStorage.removeItem(BALANCES_KEY);
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
        demoAuth,
        loginAsPersona,
        logoutDemo,
        session,
        refreshBalance,
        resetSession,
        locations,
        locationsLoading,
        locationsError,
        refreshLocations,
        menuItems,
        catalogLoading,
        catalogError,
        toggleItemAvailability,
        getMenuForLocation,
        fetchMenuForLocation,
        cart,
        addToCart,
        removeFromCart,
        updateCartQty,
        clearCart,
        cartTotal,
        cartLocationId,
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
