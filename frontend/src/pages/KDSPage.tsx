import { useCallback, useEffect, useState } from 'react';
import { useDemo } from '../context/DemoContext';
import type { Order, OrderStatus } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');
type QueueResponse = { received: Order[]; prepping: Order[]; ready: Order[] };

function timeElapsed(createdAt: string): string {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  return diff < 1 ? 'just now' : `${diff}m ago`;
}

function OrderCard({ order, onAdvance, busy }: { order: Order; onAdvance: () => void; busy: boolean }) {
  const action: Partial<Record<OrderStatus, string>> = { RECEIVED: 'Start Prepping', PREPPING: 'Mark Ready', READY: 'Complete / Hand Off' };
  const colors: Partial<Record<OrderStatus, string>> = { RECEIVED: 'bg-blue-50 border-blue-200', PREPPING: 'bg-orange-50 border-orange-200', READY: 'bg-green-50 border-green-200' };
  const buttons: Partial<Record<OrderStatus, string>> = { RECEIVED: 'bg-blue-700 hover:bg-blue-800', PREPPING: 'bg-orange-500 hover:bg-orange-600', READY: 'bg-green-600 hover:bg-green-700' };
  return (
    <div className={`rounded-xl border-2 p-4 shadow-sm ${colors[order.status] ?? 'bg-gray-50'}`}>
      <div className="mb-2 flex items-start justify-between"><div><div className="text-xl font-black text-blue-900">{order.pickup_code}</div><div className="text-xs text-gray-500">{order.customer_name ?? 'Student'}</div></div><div className="text-right text-xs text-gray-400"><div>🕐 {timeElapsed(order.created_at)}</div><div className="mt-0.5">{order.location_name}</div></div></div>
      <div className="mb-3 space-y-1">{order.items.map((item) => <div key={item.id} className="text-sm"><span className="font-semibold">{item.quantity}× {item.item_name}</span>{item.selected_options.length > 0 && <div className="ml-3 text-xs text-gray-500">{item.selected_options.map((option) => option.name).join(' · ')}</div>}{item.notes && <div className="ml-3 text-xs italic text-orange-600">⚠️ {item.notes}</div>}</div>)}</div>
      {action[order.status] && <button disabled={busy} onClick={onAdvance} className={`w-full rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-60 ${buttons[order.status]}`}>{busy ? 'Updating…' : action[order.status]}</button>}
    </div>
  );
}

function Column({ title, color, orders, busyId, onAdvance }: { title: string; color: string; orders: Order[]; busyId: string | null; onAdvance: (orderId: string) => void }) {
  return <div className="flex min-w-0 flex-col gap-3"><div className={`flex items-center gap-2 border-b-2 pb-2 ${color}`}><span className="font-bold text-gray-700">{title}</span><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">{orders.length}</span></div>{orders.length ? orders.map((order) => <OrderCard key={order.order_id} order={order} busy={busyId === order.order_id} onAdvance={() => onAdvance(order.order_id)} />) : <div className="py-8 text-center text-sm text-gray-300">No orders</div>}</div>;
}

export default function KDSPage() {
  const { orders: mockOrders, advanceOrderStatus, locations, demoAuth } = useDemo();
  const [locationFilter, setLocationFilter] = useState('all');
  const [queue, setQueue] = useState<Order[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    if (!demoAuth) return;
    const selected = locationFilter === 'all' ? locations : locations.filter((location) => location.id === locationFilter);
    try {
      const results = await Promise.all(selected.map(async (location) => {
        const response = await fetch(`${API_BASE_URL}/api/orders/queue?location_id=${encodeURIComponent(location.id)}`, { headers: { Authorization: `Bearer ${demoAuth.access_token}` } });
        if (response.status === 503) return null;
        if (!response.ok) throw new Error(`Queue refresh failed (${response.status}).`);
        return await response.json() as QueueResponse;
      }));
      if (results.some((result) => result === null)) {
        setQueue(mockOrders.filter((order) => (locationFilter === 'all' || order.location_id === locationFilter) && ['RECEIVED', 'PREPPING', 'READY'].includes(order.status)));
      } else {
        setQueue(results.flatMap((result) => result ? [...result.received, ...result.prepping, ...result.ready] : []));
      }
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to refresh the queue.');
    }
  }, [demoAuth, locations, locationFilter, mockOrders]);

  useEffect(() => {
    void loadQueue();
    const timer = window.setInterval(() => void loadQueue(), 5000);
    return () => window.clearInterval(timer);
  }, [loadQueue]);

  async function advance(orderId: string) {
    const order = queue.find((item) => item.order_id === orderId);
    if (!order || !demoAuth) return;
    const next: Partial<Record<OrderStatus, OrderStatus>> = { RECEIVED: 'PREPPING', PREPPING: 'READY', READY: 'COMPLETED' };
    const status = next[order.status];
    if (!status) return;
    setBusyId(orderId);
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(orderId)}/status`, { method: 'PATCH', headers: { Authorization: `Bearer ${demoAuth.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      if (response.status === 503) advanceOrderStatus(orderId);
      else if (!response.ok) throw new Error(`Order update failed (${response.status}).`);
      await loadQueue();
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update the order.');
    } finally {
      setBusyId(null);
    }
  }

  const received = queue.filter((order) => order.status === 'RECEIVED');
  const prepping = queue.filter((order) => order.status === 'PREPPING');
  const ready = queue.filter((order) => order.status === 'READY');
  return <div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h1 className="text-2xl font-bold text-blue-900">Kitchen Display System</h1><p className="text-sm text-gray-500">Live order queue — refreshes every 5 seconds</p></div><select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm"><option value="all">All Locations</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></div>
    {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {queue.length === 0 ? <div className="py-24 text-center text-gray-400"><div className="mb-4 text-6xl">🍳</div><div className="text-lg font-semibold">No active orders</div><div className="mt-1 text-sm">Orders appear here after checkout.</div></div> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><Column title="New Orders" orders={received} color="border-blue-400" busyId={busyId} onAdvance={advance} /><Column title="In Preparation" orders={prepping} color="border-orange-400" busyId={busyId} onAdvance={advance} /><Column title="Ready for Pickup" orders={ready} color="border-green-500" busyId={busyId} onAdvance={advance} /></div>}
  </div>;
}
