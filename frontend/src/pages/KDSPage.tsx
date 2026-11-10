import { useEffect, useState } from 'react';
import { useDemo } from '../context/DemoContext';
import type { Order, OrderStatus } from '../types';

function timeElapsed(createdAt: string): string {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  return diff < 1 ? 'just now' : `${diff}m ago`;
}

function OrderCard({ order, onAdvance }: { order: Order; onAdvance: () => void }) {
  const actionMap: Partial<Record<OrderStatus, string>> = {
    RECEIVED: 'Start Prepping',
    PREPPING: 'Mark Ready',
    READY: 'Complete / Hand Off',
  };
  const colorMap: Partial<Record<OrderStatus, string>> = {
    RECEIVED: 'bg-blue-50 border-blue-200',
    PREPPING: 'bg-orange-50 border-orange-200',
    READY: 'bg-green-50 border-green-200',
  };
  const btnColorMap: Partial<Record<OrderStatus, string>> = {
    RECEIVED: 'bg-blue-700 hover:bg-blue-800',
    PREPPING: 'bg-orange-500 hover:bg-orange-600',
    READY: 'bg-green-600 hover:bg-green-700',
  };

  return (
    <div className={`rounded-xl border-2 p-4 shadow-sm ${colorMap[order.status] ?? 'bg-gray-50'}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-black text-blue-900 text-xl">{order.pickup_code}</div>
          <div className="text-xs text-gray-500">{order.customer_name}</div>
        </div>
        <div className="text-xs text-gray-400 text-right">
          <div>🕐 {timeElapsed(order.created_at)}</div>
          <div className="mt-0.5">{order.location_name}</div>
        </div>
      </div>

      <div className="space-y-1 mb-3">
        {order.items.map((item, i) => (
          <div key={i} className="text-sm">
            <span className="font-semibold">{item.quantity}× {item.name}</span>
            {item.selected_options.length > 0 && (
              <div className="text-xs text-gray-500 ml-3">{item.selected_options.join(' · ')}</div>
            )}
            {item.notes && (
              <div className="text-xs text-orange-600 italic ml-3">⚠️ {item.notes}</div>
            )}
          </div>
        ))}
      </div>

      {actionMap[order.status] && (
        <button
          onClick={onAdvance}
          className={`w-full text-white font-bold py-2.5 rounded-xl text-sm transition-colors ${btnColorMap[order.status] ?? 'bg-gray-500 hover:bg-gray-600'}`}
        >
          {actionMap[order.status]}
        </button>
      )}
    </div>
  );
}

function KDSColumn({ title, orders, color, onAdvance }: {
  title: string;
  orders: Order[];
  color: string;
  onAdvance: (orderId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div className={`flex items-center gap-2 pb-2 border-b-2 ${color}`}>
        <span className="font-bold text-gray-700">{title}</span>
        <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">{orders.length}</span>
      </div>
      {orders.length === 0 ? (
        <div className="text-center text-gray-300 py-8 text-sm">No orders</div>
      ) : (
        orders.map((order) => (
          <OrderCard key={order.order_id} order={order} onAdvance={() => onAdvance(order.order_id)} />
        ))
      )}
    </div>
  );
}

export default function KDSPage() {
  const { orders, advanceOrderStatus, locations } = useDemo();
  const [locationFilter, setLocationFilter] = useState<string>('all');

  // Poll for order updates every 2s
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(interval);
  }, []);

  const filtered = orders.filter(
    (o) =>
      (locationFilter === 'all' || o.location_id === locationFilter) &&
      (o.status === 'RECEIVED' || o.status === 'PREPPING' || o.status === 'READY')
  );

  const received = filtered.filter((o) => o.status === 'RECEIVED');
  const prepping = filtered.filter((o) => o.status === 'PREPPING');
  const ready = filtered.filter((o) => o.status === 'READY');

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">Kitchen Display System</h1>
          <p className="text-gray-500 text-sm">Live order queue — updates every 2s</p>
        </div>
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="all">All Locations</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      {orders.filter((o) => ['RECEIVED','PREPPING','READY'].includes(o.status)).length === 0 ? (
        <div className="text-center py-24 text-gray-300">
          <div className="text-6xl mb-4">🍳</div>
          <div className="text-lg font-semibold">No active orders</div>
          <div className="text-sm mt-1">Switch to Student view and place an order to see it here.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KDSColumn title="New Orders" orders={received} color="border-blue-400" onAdvance={advanceOrderStatus} />
          <KDSColumn title="In Preparation" orders={prepping} color="border-orange-400" onAdvance={advanceOrderStatus} />
          <KDSColumn title="Ready for Pickup" orders={ready} color="border-green-500" onAdvance={advanceOrderStatus} />
        </div>
      )}
    </div>
  );
}
