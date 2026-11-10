import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../context/DemoContext';
import type { PaymentMethod } from '../types';

interface Props {
  onClose: () => void;
}

const PAYMENT_TABS: { method: PaymentMethod; label: string }[] = [
  { method: 'HUSKYBUCKS', label: '💳 HuskyBucks' },
  { method: 'FLEX_PASS', label: '🍽️ Flex Pass' },
  { method: 'POINTS', label: '⭐ Points' },
];

export default function CartDrawer({ onClose }: Props) {
  const { cart, session, cartTotal, removeFromCart, updateCartQty, placeOrder, clearCart, locations } = useDemo();
  const navigate = useNavigate();

  const [payment, setPayment] = useState<PaymentMethod>('HUSKYBUCKS');
  const [locationId, setLocationId] = useState(locations.find((l) => l.is_open)?.id ?? '');
  const [loading, setLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  const tax = Math.round(cartTotal * 0.0635 * 100) / 100;
  const grandTotal = Math.round((cartTotal + tax) * 100) / 100;

  function getBalanceLabel() {
    if (payment === 'HUSKYBUCKS') return `Balance: $${session.huskybucks_balance.toFixed(2)}`;
    if (payment === 'FLEX_PASS') return `Passes remaining: ${session.flex_passes}`;
    if (payment === 'POINTS') return `Points: ${session.dining_points}`;
    return '';
  }

  function canAfford() {
    if (payment === 'HUSKYBUCKS') return session.huskybucks_balance >= grandTotal;
    if (payment === 'FLEX_PASS') return session.flex_passes > 0;
    if (payment === 'POINTS') return session.dining_points >= grandTotal * 10;
    return false;
  }

  async function handleCheckout() {
    setCheckoutError('');
    if (!locationId) { setCheckoutError('Please select a location.'); return; }
    if (!canAfford()) { setCheckoutError('Insufficient balance for this payment method.'); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600)); // simulate async
    const order = placeOrder(locationId, payment);
    setLoading(false);
    if (!order) { setCheckoutError('Could not place order. Please try again.'); return; }
    onClose();
    navigate(`/order/${order.order_id}`);
  }

  if (cart.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative bg-white w-full max-w-sm shadow-2xl flex flex-col">
          <div className="p-5 border-b flex items-center justify-between">
            <span className="font-bold text-blue-900 text-lg">Your Cart</span>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
            <span className="text-5xl">🛒</span>
            <span className="text-sm">Your cart is empty</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between">
          <span className="font-bold text-blue-900 text-lg">Your Cart</span>
          <div className="flex gap-2 items-center">
            <button onClick={() => { clearCart(); }} className="text-xs text-red-400 hover:text-red-600">Clear</button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl ml-2">×</button>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {cart.map((item, idx) => (
            <div key={idx} className="flex gap-3 items-start bg-gray-50 p-3 rounded-xl">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-900 truncate">{item.name}</div>
                {item.selected_options.length > 0 && (
                  <div className="text-xs text-gray-500 mt-0.5">{item.selected_options.join(', ')}</div>
                )}
                {item.notes && <div className="text-xs text-orange-600 italic mt-0.5">"{item.notes}"</div>}
                <div className="text-sm font-bold text-blue-800 mt-1">${(item.unit_price * item.quantity).toFixed(2)}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => updateCartQty(idx, item.quantity - 1)} className="w-7 h-7 rounded-full border border-gray-200 text-blue-700 font-bold hover:bg-blue-50 flex items-center justify-center text-sm">−</button>
                <span className="text-sm font-semibold w-4 text-center">{item.quantity}</span>
                <button onClick={() => updateCartQty(idx, item.quantity + 1)} className="w-7 h-7 rounded-full border border-gray-200 text-blue-700 font-bold hover:bg-blue-50 flex items-center justify-center text-sm">+</button>
                <button onClick={() => removeFromCart(idx)} className="w-7 h-7 rounded-full text-red-400 hover:bg-red-50 flex items-center justify-center text-sm ml-1">🗑</button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-5 space-y-4">
          {/* Location */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Pickup Location</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {locations.filter((l) => l.is_open).map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          {/* Payment Tabs */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Payment</label>
            <div className="flex border border-gray-200 rounded-xl overflow-hidden">
              {PAYMENT_TABS.map(({ method, label }) => (
                <button
                  key={method}
                  onClick={() => setPayment(method)}
                  className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                    payment === method ? 'bg-blue-700 text-white' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-1 text-right">{getBalanceLabel()}</div>
          </div>

          {/* Totals */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span><span>${cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Tax (6.35% CT)</span><span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-blue-900 pt-1 border-t border-gray-100">
              <span>Total</span><span>${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {checkoutError && <div className="text-xs text-red-500 text-center">{checkoutError}</div>}

          <button
            onClick={handleCheckout}
            disabled={loading || !canAfford()}
            className="w-full bg-blue-700 text-white font-bold py-3.5 rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Placing Order...' : `Place Order · $${grandTotal.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
