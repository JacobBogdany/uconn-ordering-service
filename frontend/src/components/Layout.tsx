import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useDemo } from '../context/DemoContext';
import CartDrawer from './CartDrawer';
import { useState } from 'react';

export default function Layout() {
  const { viewRole, demoAuth, logoutDemo, session, cart, orders } = useDemo();
  const [cartOpen, setCartOpen] = useState(false);
  const navigate = useNavigate();

  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);
  const activeOrder = orders.find((o) => o.status === 'RECEIVED' || o.status === 'PREPPING' || o.status === 'READY');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Role Switcher Banner */}
      <div className="bg-blue-900 text-white text-center text-sm py-1.5 flex items-center justify-center gap-4">
        <span className="font-medium">🎓 Demo Mode</span>
        <span className="text-blue-100">Signed in as {demoAuth?.persona === 'operator' ? 'Operator' : 'Student'}</span>
        <button
          type="button"
          onClick={() => { logoutDemo(); navigate('/login'); }}
          className="rounded-full border border-blue-300 px-3 py-0.5 text-xs font-semibold text-white transition-colors hover:bg-blue-800"
        >
          Switch demo role
        </button>
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/locations" className="flex items-center gap-2 no-underline">
            <span className="text-2xl">🐾</span>
            <div>
              <div className="font-bold text-blue-900 text-lg leading-none">HuskyBite</div>
              <div className="text-xs text-gray-500 leading-none">UConn Campus Dining</div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {viewRole === 'student' && (
              <>
                <div className="text-right hidden sm:block">
                  <div className="text-xs text-gray-500">{session.name}</div>
                  <div className="text-sm font-semibold text-green-700">${session.huskybucks_balance.toFixed(2)} HuskyBucks</div>
                </div>

                {activeOrder && (
                  <button
                    onClick={() => navigate(`/order/${activeOrder.order_id}`)}
                    className="flex items-center gap-1.5 bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-orange-200 transition-colors"
                  >
                    <span className="animate-pulse">●</span> Track Order
                  </button>
                )}

                <button
                  onClick={() => setCartOpen(true)}
                  className="relative flex items-center gap-1.5 bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-blue-800 transition-colors"
                >
                  🛒 Cart
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </button>
              </>
            )}

            {viewRole === 'staff' && (
              <div className="flex gap-2">
                <Link
                  to="/staff/kds"
                  className="text-sm font-medium text-blue-700 hover:underline"
                >
                  KDS Queue
                </Link>
                <span className="text-gray-300">|</span>
                <Link
                  to="/staff/inventory"
                  className="text-sm font-medium text-blue-700 hover:underline"
                >
                  Inventory
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>

      {/* Cart Drawer */}
      {cartOpen && <CartDrawer onClose={() => setCartOpen(false)} />}
    </div>
  );
}
