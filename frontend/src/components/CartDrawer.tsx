import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../context/DemoContext';
import { CheckoutRuleError, formatMoney, MAX_QUANTITY_PER_LINE } from '../features/checkout/rules';

interface Props {
  onClose: () => void;
}

export default function CartDrawer({ onClose }: Props) {
  const { cart, session, cartTotal, cartLocationId, removeFromCart, updateCartQty, placeOrder, clearCart, locations } = useDemo();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // Pickup location is the cart's location; one order = one location.
  const pickupLocation = locations.find((l) => l.id === cartLocationId);
  // No sales tax is modeled (master contract). Display estimate; server re-prices.
  const canAfford = session.huskybucks_balance >= cartTotal;

  async function handleCheckout() {
    if (loading) return; // guard against double submit
    setCheckoutError('');
    setLoading(true);
    try {
      const order = await placeOrder();
      onClose();
      navigate(`/order/${order.order_id}`);
    } catch (cause) {
      setCheckoutError(cause instanceof CheckoutRuleError ? cause.message : 'Could not place order. Please try again.');
    } finally {
      setLoading(false);
    }
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
            <div key={item.line_id} className="flex gap-3 items-start bg-gray-50 p-3 rounded-xl">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-900 truncate">{item.name}</div>
                {item.selected_options.length > 0 && (
                  <div className="text-xs text-gray-500 mt-0.5">{item.selected_options.map((o) => o.name).join(', ')}</div>
                )}
                {item.notes && <div className="text-xs text-orange-600 italic mt-0.5">"{item.notes}"</div>}
                <div className="text-sm font-bold text-blue-800 mt-1">${(item.unit_price * item.quantity).toFixed(2)}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => updateCartQty(idx, item.quantity - 1)} className="w-7 h-7 rounded-full border border-gray-200 text-blue-700 font-bold hover:bg-blue-50 flex items-center justify-center text-sm">−</button>
                <span className="text-sm font-semibold w-4 text-center">{item.quantity}</span>
                <button onClick={() => updateCartQty(idx, item.quantity + 1)} disabled={item.quantity >= MAX_QUANTITY_PER_LINE} className="w-7 h-7 rounded-full border border-gray-200 text-blue-700 font-bold hover:bg-blue-50 disabled:opacity-40 flex items-center justify-center text-sm">+</button>
                <button onClick={() => removeFromCart(idx)} className="w-7 h-7 rounded-full text-red-400 hover:bg-red-50 flex items-center justify-center text-sm ml-1">🗑</button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-5 space-y-4">
          {/* Pickup + payment */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Pickup at</span>
              <span className="font-semibold">{pickupLocation?.name ?? 'Unknown location'}</span>
            </div>
            {pickupLocation && !pickupLocation.is_open && (
              <div className="text-xs text-red-500 text-right">This location is closed right now.</div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Payment</span>
              <span className="font-semibold">💳 HuskyBucks (simulated)</span>
            </div>
            <div className="text-xs text-gray-500 text-right">Balance: {formatMoney(session.huskybucks_balance)}</div>
          </div>

          {/* Totals */}
          <div className="flex justify-between font-bold text-blue-900 pt-2 border-t border-gray-100 text-sm">
            <span>Total</span><span>{formatMoney(cartTotal)}</span>
          </div>
          {!canAfford && <div className="text-xs text-red-500 text-center">Not enough HuskyBucks for this order.</div>}

          {checkoutError && <div className="text-xs text-red-500 text-center">{checkoutError}</div>}

          <button
            onClick={handleCheckout}
            disabled={loading || !canAfford || !pickupLocation?.is_open}
            className="w-full bg-blue-700 text-white font-bold py-3.5 rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Placing Order...' : `Place Order · ${formatMoney(cartTotal)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
