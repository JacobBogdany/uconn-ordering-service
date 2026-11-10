import { useNavigate } from 'react-router-dom';
import { useDemo } from '../context/DemoContext';

export default function LocationsPage() {
  const { locations } = useDemo();
  const navigate = useNavigate();

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-900 mb-1">Campus Dining</h1>
      <p className="text-gray-500 text-sm mb-6">Select a location to browse the menu and order.</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {locations.map((loc) => (
          <button
            key={loc.id}
            onClick={() => loc.is_open && navigate(`/locations/${loc.id}/menu`)}
            disabled={!loc.is_open}
            className={`text-left p-5 rounded-2xl border-2 transition-all shadow-sm ${
              loc.is_open
                ? 'border-blue-100 bg-white hover:border-blue-400 hover:shadow-md cursor-pointer'
                : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-bold text-blue-900 text-lg">{loc.name}</div>
                <div className="text-gray-500 text-sm">{loc.building}</div>
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  loc.is_open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                }`}
              >
                {loc.is_open ? 'Open' : 'Closed'}
              </span>
            </div>

            <div className="text-xs text-gray-500 mb-3">🕐 {loc.hours}</div>

            {loc.is_open && (
              <div className="flex gap-3 text-xs text-gray-600">
                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                  {loc.active_orders_count} active orders
                </span>
                <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded-full">
                  ~{loc.estimated_wait_minutes} min wait
                </span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
