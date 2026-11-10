import { useState } from 'react';
import { useDemo } from '../context/DemoContext';

export default function InventoryPage() {
  const { menuItems, toggleItemAvailability, locations } = useDemo();
  const [locationFilter, setLocationFilter] = useState<string>(locations[0]?.id ?? '');

  const filteredItems = menuItems.filter((i) => i.location_id === locationFilter);
  const categories = [...new Set(filteredItems.map((i) => i.category))];

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-900 mb-1">Inventory Management</h1>
      <p className="text-gray-500 text-sm mb-4">Toggle items between In Stock and Sold Out.</p>

      <div className="flex gap-2 flex-wrap mb-6">
        {locations.map((loc) => (
          <button
            key={loc.id}
            onClick={() => setLocationFilter(loc.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
              locationFilter === loc.id
                ? 'bg-blue-700 text-white border-blue-700'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
            }`}
          >
            {loc.name}
          </button>
        ))}
      </div>

      {categories.map((category) => (
        <div key={category} className="mb-6">
          <h2 className="text-base font-bold text-gray-700 mb-3 pb-1 border-b border-gray-100">{category}</h2>
          <div className="space-y-2">
            {filteredItems
              .filter((i) => i.category === category)
              .map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                  <div>
                    <div className="font-semibold text-sm text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-400">${item.base_price.toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${item.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {item.is_available ? 'In Stock' : 'Sold Out'}
                    </span>
                    <button
                      onClick={() => toggleItemAvailability(item.id)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${item.is_available ? 'bg-green-500' : 'bg-gray-300'}`}
                      aria-label={`Toggle ${item.name} availability`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${item.is_available ? 'translate-x-6' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
