import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDemo } from '../context/DemoContext';
import type { CartItem, DietaryTag, MenuItem } from '../types';
import CustomizationModal from '../components/CustomizationModal';

const DIETARY_FILTERS: { label: string; tag: DietaryTag }[] = [
  { label: '🌱 Vegan', tag: 'vegan' },
  { label: '🥗 Vegetarian', tag: 'vegetarian' },
  { label: '🌾 Gluten-Free', tag: 'gluten-free' },
  { label: '🥛 Dairy-Free', tag: 'dairy-free' },
  { label: '☪️ Halal', tag: 'halal' },
];

export default function MenuPage() {
  const { locationId } = useParams<{ locationId: string }>();
  const { locations, fetchMenuForLocation, addToCart, getMenuForLocation } = useDemo();
  const navigate = useNavigate();

  const location = locations.find((l) => l.id === locationId);

  const [search, setSearch] = useState('');
  const [activeTags, setActiveTags] = useState<DietaryTag[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => getMenuForLocation(locationId ?? ''));
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadMenu = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    setError(null);
    try {
      const items = await fetchMenuForLocation(locationId, activeTags);
      setMenuItems(items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load menu.');
    } finally {
      setLoading(false);
    }
  }, [locationId, activeTags, fetchMenuForLocation]);

  useEffect(() => {
    let ignore = false;
    async function syncMenu() {
      if (!locationId) return;
      try {
        const items = await fetchMenuForLocation(locationId, activeTags);
        if (!ignore) {
          setMenuItems(items);
        }
      } catch (cause) {
        if (!ignore) {
          setError(cause instanceof Error ? cause.message : 'Unable to load menu.');
        }
      }
    }
    void syncMenu();
    return () => {
      ignore = true;
    };
  }, [locationId, activeTags, fetchMenuForLocation]);

  if (!location) {
    return (
      <div className="text-center py-20">
        <div className="text-3xl mb-2">📍</div>
        <div className="text-gray-600 font-bold text-lg">Location not found.</div>
        <button
          onClick={() => navigate('/locations')}
          className="mt-4 text-blue-700 text-sm hover:underline font-semibold"
        >
          ← Return to locations
        </button>
      </div>
    );
  }

  const toggleTag = (tag: DietaryTag) => {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const filtered = menuItems.filter((item) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
    const matchesTags = activeTags.length === 0 || activeTags.every((tag) => item.dietary_tags.includes(tag));
    return matchesSearch && matchesTags;
  });

  const categories = [...new Set(filtered.map((i) => i.category))];

  return (
    <div>
      {/* Back + Header */}
      <button onClick={() => navigate('/locations')} className="text-blue-700 text-sm hover:underline mb-4 flex items-center gap-1 font-medium">
        ← Back to Locations
      </button>

      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">{location.name}</h1>
          <p className="text-gray-500 text-sm">{location.building} · {location.hours}</p>
        </div>
        <span
          className={`text-xs font-bold px-3 py-1 rounded-full self-start mt-1 ${
            location.is_open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
          }`}
        >
          {location.is_open ? 'Open' : 'Closed'}
        </span>
      </div>

      {/* Search & Refresh */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Search menu items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          type="button"
          onClick={() => void loadMenu()}
          disabled={loading}
          className="px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 disabled:opacity-60 transition-colors"
          title="Reload menu from server"
        >
          {loading ? '…' : '🔄'}
        </button>
      </div>

      {/* Dietary Filter Pills */}
      <div className="flex gap-2 flex-wrap mb-6">
        {DIETARY_FILTERS.map(({ label, tag }) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              activeTags.includes(tag)
                ? 'bg-blue-700 text-white border-blue-700'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="font-semibold">Unable to fetch menu from server</div>
          <p className="mt-1 text-xs text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => void loadMenu()}
            className="mt-2 text-xs font-semibold text-red-900 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && menuItems.length === 0 ? (
        <div className="py-20 text-center text-gray-500 animate-pulse">
          <div className="text-3xl mb-2">🍽️</div>
          <div className="font-semibold text-sm">Loading menu items…</div>
        </div>
      ) : categories.length === 0 ? (
        /* Empty states */
        <div className="text-center py-20 text-gray-400">
          <div className="text-3xl mb-2">🔍</div>
          <div className="font-semibold text-gray-600">No items match your criteria.</div>
          <p className="text-xs text-gray-400 mt-1">
            {search || activeTags.length > 0 ? 'Try clearing your search or filters.' : 'Check back later for menu updates.'}
          </p>
          {(search || activeTags.length > 0) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setActiveTags([]);
              }}
              className="mt-3 text-xs font-semibold text-blue-700 underline"
            >
              Reset filters
            </button>
          )}
        </div>
      ) : (
        /* Menu by Category */
        categories.map((category) => (
          <div key={category} className="mb-8">
            <h2 className="text-lg font-bold text-gray-700 mb-3 pb-1 border-b border-gray-100">{category}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered
                .filter((item) => item.category === category)
                .map((item) => (
                  <MenuItemCard key={item.id} item={item} onSelect={() => setSelectedItem(item)} />
                ))}
            </div>
          </div>
        ))
      )}

      {selectedItem && (
        <CustomizationModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onAddToCart={(cartItem: CartItem) => {
            const result = addToCart(cartItem);
            if (result.ok) setSelectedItem(null);
            return result;
          }}
        />
      )}
    </div>
  );
}

function MenuItemCard({ item, onSelect }: { item: MenuItem; onSelect: () => void }) {
  const tagColors: Record<string, string> = {
    vegan: 'bg-green-50 text-green-700',
    vegetarian: 'bg-lime-50 text-lime-700',
    'gluten-free': 'bg-yellow-50 text-yellow-700',
    'dairy-free': 'bg-sky-50 text-sky-700',
    halal: 'bg-purple-50 text-purple-700',
  };

  return (
    <div
      className={`bg-white rounded-2xl border-2 p-4 transition-all ${
        item.is_available
          ? 'border-gray-100 hover:border-blue-300 hover:shadow-sm cursor-pointer'
          : 'border-gray-100 opacity-50 cursor-not-allowed'
      }`}
      onClick={() => item.is_available && onSelect()}
    >
      <div className="flex justify-between items-start mb-1">
        <div className="font-semibold text-gray-900 text-sm">{item.name}</div>
        <div className="font-bold text-blue-800 text-sm ml-2 shrink-0">${item.base_price.toFixed(2)}</div>
      </div>
      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{item.description}</p>

      <div className="flex gap-1 flex-wrap">
        {item.dietary_tags.map((tag) => (
          <span key={tag} className={`text-xs px-2 py-0.5 rounded-full font-medium ${tagColors[tag] || 'bg-gray-100 text-gray-600'}`}>
            {tag}
          </span>
        ))}
        {!item.is_available && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-50 text-red-600 ml-auto">Sold Out</span>
        )}
      </div>

      {item.is_available && (
        <div className="mt-3 text-xs text-blue-600 font-semibold">Tap to customize & add →</div>
      )}
    </div>
  );
}
