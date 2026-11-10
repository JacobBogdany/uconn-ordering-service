import { useState } from 'react';
import type { CartItem, CustomizationGroup, MenuItem } from '../types';

interface Props {
  item: MenuItem;
  onClose: () => void;
  onAddToCart: (cartItem: CartItem) => void;
}

export default function CustomizationModal({ item, onClose, onAddToCart }: Props) {
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [notes, setNotes] = useState('');
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');

  function calcUnitPrice(): number {
    let price = item.base_price;
    for (const group of item.customization_groups) {
      for (const opt of group.options) {
        if ((selections[group.group_name] ?? []).includes(opt.name)) {
          price += opt.price_delta;
        }
      }
    }
    return Math.round(price * 100) / 100;
  }

  function handleRadio(groupName: string, optName: string) {
    setSelections((prev) => ({ ...prev, [groupName]: [optName] }));
  }

  function handleCheckbox(group: CustomizationGroup, optName: string) {
    setSelections((prev) => {
      const current = prev[group.group_name] ?? [];
      if (current.includes(optName)) {
        return { ...prev, [group.group_name]: current.filter((n) => n !== optName) };
      }
      if (current.length >= group.max_select) return prev; // at max
      return { ...prev, [group.group_name]: [...current, optName] };
    });
  }

  function handleAdd() {
    // Validate required groups
    for (const group of item.customization_groups) {
      if (group.required && !(selections[group.group_name]?.length)) {
        setError(`Please select an option for "${group.group_name}".`);
        return;
      }
    }
    setError('');
    const allSelected = Object.values(selections).flat();
    const cartItem: CartItem = {
      menu_item_id: item.id,
      name: item.name,
      quantity: qty,
      base_price: item.base_price,
      unit_price: calcUnitPrice(),
      selected_options: allSelected,
      notes,
      customization_groups: item.customization_groups,
    };
    onAddToCart(cartItem);
  }

  const unitPrice = calcUnitPrice();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div>
            <div className="font-bold text-blue-900 text-lg">{item.name}</div>
            <div className="text-sm text-gray-500">{item.description}</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4 mt-0.5 text-xl leading-none">×</button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {item.customization_groups.map((group) => (
            <div key={group.group_name}>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-sm text-gray-800">{group.group_name}</span>
                {group.required && <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">Required</span>}
                {!group.required && group.max_select > 1 && (
                  <span className="text-xs text-gray-400">Pick up to {group.max_select}</span>
                )}
              </div>

              <div className="space-y-2">
                {group.options.map((opt) => {
                  const selected = (selections[group.group_name] ?? []).includes(opt.name);
                  const isRadio = group.max_select === 1;

                  return (
                    <label
                      key={opt.name}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                        selected ? 'border-blue-400 bg-blue-50' : 'border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type={isRadio ? 'radio' : 'checkbox'}
                          checked={selected}
                          onChange={() => isRadio ? handleRadio(group.group_name, opt.name) : handleCheckbox(group, opt.name)}
                          className="accent-blue-600"
                        />
                        <span className="text-sm text-gray-800">{opt.name}</span>
                      </div>
                      {opt.price_delta !== 0 && (
                        <span className="text-sm font-medium text-blue-700">+${opt.price_delta.toFixed(2)}</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Special Instructions / Allergen Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. No onions, extra ice, nut allergy..."
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        {error && <div className="px-5 pb-2 text-sm text-red-500">{error}</div>}
        <div className="border-t border-gray-100 p-5 flex items-center gap-3">
          {/* Qty */}
          <div className="flex items-center gap-2 border border-gray-200 rounded-full px-2 py-1">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-7 h-7 rounded-full text-blue-700 font-bold hover:bg-blue-50 flex items-center justify-center">−</button>
            <span className="text-sm font-semibold w-4 text-center">{qty}</span>
            <button onClick={() => setQty((q) => q + 1)} className="w-7 h-7 rounded-full text-blue-700 font-bold hover:bg-blue-50 flex items-center justify-center">+</button>
          </div>

          <button
            onClick={handleAdd}
            className="flex-1 bg-blue-700 text-white font-bold py-3 rounded-xl hover:bg-blue-800 transition-colors text-sm"
          >
            Add to Cart · ${(unitPrice * qty).toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}
