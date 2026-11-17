import { useNavigate } from 'react-router-dom';
import { useDemo } from '../context/DemoContext';

export default function LocationsPage() {
  const { locations, locationsLoading, locationsError, refreshLocations } = useDemo();
  const navigate = useNavigate();

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-blue-900">Campus Dining</h1>
        <button
          type="button"
          onClick={() => void refreshLocations()}
          className="text-xs text-blue-700 hover:text-blue-900 font-semibold px-2.5 py-1 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
          disabled={locationsLoading}
        >
          {locationsLoading ? 'Refreshing…' : '🔄 Refresh'}
        </button>
      </div>
      <p className="text-gray-500 text-sm mb-6">Select a location to browse the menu and order.</p>

      {locationsError && (
        <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="font-semibold">Unable to load locations from server</div>
          <p className="mt-1 text-xs text-red-700">{locationsError}</p>
          <button
            type="button"
            onClick={() => void refreshLocations()}
            className="mt-3 inline-flex rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-900 hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {locationsLoading && locations.length === 0 ? (
        <div className="py-16 text-center text-gray-500 animate-pulse">
          <div className="text-3xl mb-2">🍽️</div>
          <div className="font-semibold">Loading campus dining venues…</div>
        </div>
      ) : locations.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <div className="text-3xl mb-2">📍</div>
          <div className="font-semibold text-gray-600">No dining locations available.</div>
          <p className="text-xs mt-1">Check back later or refresh.</p>
        </div>
      ) : (
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
      )}
    </div>
  );
}
