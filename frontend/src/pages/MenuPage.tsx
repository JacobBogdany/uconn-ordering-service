import { useState } from 'react';
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
  const { locations, getMenuForLocation, addToCart } = useDemo();
  const navigate = useNavigate();

  const location = locations.find((l) => l.id === locationId);
  const allItems = getMenuForLocation(locationId ?? '');

  const [search, setSearch] = useState('');
  const [activeTags, setActiveTags] = useState<DietaryTag[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  if (!location) return <div className="text-center py-20 text-gray-400">Location not found.</div>;

  const toggleTag = (tag: DietaryTag) => {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const filtered = allItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.description.toLowerCase().includes(search.toLowerCase());
    const matchesTags = activeTags.every((tag) => item.dietary_tags.includes(tag));
    return matchesSearch && matchesTags;
  });

  const categories = [...new Set(filtered.map((i) => i.category))];

  return (
    <div>
      {/* Back + Header */}
      <button onClick={() => navigate('/locations')} className="text-blue-700 text-sm hover:underline mb-4 flex items-center gap-1">
        ← Back to Locations
      </button>

      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">{location.name}</h1>
          <p className="text-gray-500 text-sm">{location.building} · {location.hours}</p>
        </div>
        <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full self-start mt-1">Open</span>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search menu..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      {/* Dietary Filter Pills */}
      <div className="flex gap-2 flex-wrap mb-6">
        {DIETARY_FILTERS.map(({ label, tag }) => (
          <button
            key={tag}
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

      {/* Menu by Category */}
      {categories.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No items match your filters.</div>
      ) : (
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
            addToCart(cartItem);
            setSelectedItem(null);
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
