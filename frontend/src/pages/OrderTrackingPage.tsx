import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDemo } from '../context/DemoContext';
import type { Order, OrderStatus } from '../types';

const STEPS: { status: OrderStatus; label: string; icon: string }[] = [
  { status: 'RECEIVED', label: 'Order Received', icon: '📋' },
  { status: 'PREPPING', label: 'Being Prepared', icon: '👨‍🍳' },
  { status: 'READY', label: 'Ready for Pickup', icon: '✅' },
  { status: 'COMPLETED', label: 'Picked Up', icon: '🎉' },
];
const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');

function getStepIndex(status: OrderStatus): number {
  const map: Record<OrderStatus, number> = { RECEIVED: 0, PREPPING: 1, READY: 2, COMPLETED: 3, CANCELLED: -1 };
  return map[status] ?? 0;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function OrderTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { getOrderById, cancelOrder, demoAuth } = useDemo();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | undefined>(() => getOrderById(orderId ?? ''));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (!orderId || !demoAuth) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(orderId)}`, { headers: { Authorization: `Bearer ${demoAuth.access_token}` } });
      if (response.status === 503 || response.status === 404) {
        setOrder(getOrderById(orderId));
      } else if (!response.ok) {
        throw new Error(`Order refresh failed (${response.status}).`);
      } else {
        setOrder(await response.json() as Order);
      }
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to refresh order status.');
    } finally {
      setLoading(false);
    }
  }, [orderId, demoAuth, getOrderById]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  if (loading && !order) return <div className="py-20 text-center text-gray-500">Loading order…</div>;

  if (!order) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🔍</div>
        <div className="text-gray-500">{error ?? 'Order not found.'}</div>
        <button onClick={() => navigate('/locations')} className="mt-4 text-blue-600 hover:underline text-sm">Back to Home</button>
      </div>
    );
  }

  const stepIdx = getStepIndex(order.status);
  const isCancelled = order.status === 'CANCELLED';

  return (
    <div className="max-w-md mx-auto">
      {error && <p role="status" className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Could not refresh order status. Showing the last available update.</p>}
      {/* Pickup Code Banner */}
      <div className={`rounded-2xl p-6 mb-6 text-center ${isCancelled ? 'bg-red-50 border-2 border-red-200' : 'bg-blue-700 text-white'}`}>
        <div className={`text-sm font-medium mb-1 ${isCancelled ? 'text-red-600' : 'text-blue-200'}`}>
          {isCancelled ? 'ORDER CANCELLED' : 'Your Pickup Code'}
        </div>
        <div className={`text-5xl font-black tracking-wider mb-2 ${isCancelled ? 'text-red-400 line-through' : ''}`}>
          {order.pickup_code}
        </div>
        <div className={`text-sm ${isCancelled ? 'text-red-500' : 'text-blue-200'}`}>
          {order.location_name}
        </div>
        {!isCancelled && order.status !== 'COMPLETED' && (
          <div className="text-xs text-blue-200 mt-1">
            Est. ready by {formatTime(order.estimated_ready_time)}
          </div>
        )}
      </div>

      {/* Progress Tracker */}
      {!isCancelled && (
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <div className="relative flex justify-between">
            {/* Progress bar */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-100 mx-8">
              <div
                className="h-full bg-blue-600 transition-all duration-700"
                style={{ width: `${Math.min(100, (stepIdx / (STEPS.length - 1)) * 100)}%` }}
              />
            </div>

            {STEPS.map((step, i) => {
              const done = i <= stepIdx;
              const active = i === stepIdx;
              return (
                <div key={step.status} className="flex flex-col items-center gap-1 z-10">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-500 ${
                      done
                        ? 'bg-blue-700 shadow-lg shadow-blue-200'
                        : 'bg-gray-100'
                    } ${active ? 'ring-4 ring-blue-200' : ''}`}
                  >
                    {step.icon}
                  </div>
                  <div className={`text-xs text-center max-w-14 leading-tight ${done ? 'font-semibold text-blue-800' : 'text-gray-400'}`}>
                    {step.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Order Summary */}
      <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
        <div className="font-semibold text-gray-800 mb-3">Order Summary</div>
        <div className="space-y-2">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <div>
                <span className="font-medium">{item.quantity}× {item.item_name}</span>
                {item.selected_options.length > 0 && (
                  <div className="text-xs text-gray-400">{item.selected_options.map((o) => o.name).join(', ')}</div>
                )}
                {item.notes && <div className="text-xs text-orange-500 italic">"{item.notes}"</div>}
              </div>
              <span className="font-semibold text-gray-700">${item.line_total.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between font-bold text-blue-900">
          <span>Total</span>
          <span>${order.total_amount.toFixed(2)}</span>
        </div>
        <div className="text-xs text-gray-400 mt-1">Paid via {order.payment_method.replace('_', ' ')}</div>
      </div>

      {/* Cancel Button (only while RECEIVED) */}
      {order.status === 'RECEIVED' && (
        <button
          onClick={() => cancelOrder(order.order_id)}
          className="w-full border-2 border-red-200 text-red-500 font-semibold py-3 rounded-xl hover:bg-red-50 transition-colors text-sm"
        >
          Cancel Order
        </button>
      )}

      <button onClick={() => navigate('/locations')} className="w-full text-blue-600 text-sm hover:underline mt-3">
        Browse More Locations
      </button>
    </div>
  );
}
