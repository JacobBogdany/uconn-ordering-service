import { useMemo, useState } from 'react';
import type { CartItem, MenuItem, ModifierGroup } from '../types';
import type { AddToCartResult } from '../context/DemoContext';
import {
  cartLineId,
  CheckoutRuleError,
  describeGroupRule,
  effectiveMin,
  formatMoney,
  fromCents,
  MAX_QUANTITY_PER_LINE,
  modifierGroupsForItem,
  normalizeNotes,
  NOTES_MAX_LENGTH,
  selectedSnapshots,
  unitPriceCents,
  validateSelections,
} from '../features/checkout/rules';

interface Props {
  item: MenuItem;
  onClose: () => void;
  onAddToCart: (cartItem: CartItem) => AddToCartResult;
}

export default function CustomizationModal({ item, onClose, onAddToCart }: Props) {
  // TODO(catalog API): use item.modifier_groups directly once Jacob's response ships.
  const groups = useMemo(() => modifierGroupsForItem(item), [item]);
  // group id -> selected option ids
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [notes, setNotes] = useState('');
  const [qty, setQty] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const selectedIds = groups.flatMap((g) => selections[g.id] ?? []);
  const validation = validateSelections(item.name, groups, selectedIds);
  const snapshots = selectedSnapshots(groups, selectedIds);
  const unitCents = unitPriceCents(item.base_price, snapshots);

  function toggleOption(group: ModifierGroup, optionId: string) {
    setError('');
    setSelections((prev) => {
      const current = prev[group.id] ?? [];
      if (current.includes(optionId)) {
        // A required single-choice group keeps its choice; switch by picking another.
        if (group.max_select === 1 && effectiveMin(group) === 1) return prev;
        return { ...prev, [group.id]: current.filter((id) => id !== optionId) };
      }
      if (group.max_select === 1) return { ...prev, [group.id]: [optionId] };
      if (current.length >= group.max_select) return prev;
      return { ...prev, [group.id]: [...current, optionId] };
    });
  }

  function handleAdd() {
    setSubmitted(true);
    if (!item.is_available) { setError(`${item.name} is currently unavailable.`); return; }
    if (!validation.valid) { setError(validation.message ?? 'Check your selections.'); return; }
    let cleanNotes: string | null;
    try {
      cleanNotes = normalizeNotes(notes);
    } catch (cause) {
      setError(cause instanceof CheckoutRuleError ? cause.message : 'Invalid notes.');
      return;
    }
    const result = onAddToCart({
      line_id: cartLineId(item.id, selectedIds, cleanNotes),
      location_id: item.location_id,
      menu_item_id: item.id,
      name: item.name,
      quantity: qty,
      unit_price: fromCents(unitCents),
      selected_options: snapshots,
      notes: cleanNotes ?? '',
    });
    if (!result.ok) setError(result.message);
  }

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
          {groups.map((group) => {
            const groupError = submitted ? validation.groupErrors[group.id] : undefined;
            const chosen = selections[group.id] ?? [];
            const isRadio = group.max_select === 1;
            return (
              <div key={group.id}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-sm text-gray-800">{group.name}</span>
                  {effectiveMin(group) > 0
                    ? <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">Required</span>
                    : null}
                  <span className="text-xs text-gray-400">{describeGroupRule(group)}</span>
                </div>

                <div className="space-y-2">
                  {group.options.map((opt) => {
                    const selected = chosen.includes(opt.id);
                    const atMax = !isRadio && !selected && chosen.length >= group.max_select;
                    const disabled = !opt.is_available || atMax;
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                          selected ? 'border-blue-400 bg-blue-50' : 'border-gray-100 hover:border-gray-300'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type={isRadio ? 'radio' : 'checkbox'}
                            name={group.id}
                            checked={selected}
                            disabled={disabled}
                            // onClick (not onChange) so an optional radio can be deselected.
                            onClick={() => toggleOption(group, opt.id)}
                            onChange={() => {}}
                            className="accent-blue-600"
                          />
                          <span className="text-sm text-gray-800">{opt.name}</span>
                          {!opt.is_available && <span className="text-xs text-gray-400">Unavailable</span>}
                        </div>
                        {opt.price_delta !== 0 && (
                          <span className="text-sm font-medium text-blue-700">
                            {opt.price_delta > 0 ? '+' : '−'}{formatMoney(Math.abs(opt.price_delta))}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
                {groupError && <div className="text-xs text-red-500 mt-1">{groupError}</div>}
              </div>
            );
          })}

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Special Instructions / Allergen Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={NOTES_MAX_LENGTH}
              placeholder="e.g. No onions, extra ice, nut allergy..."
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
            <div className="text-xs text-gray-400 text-right">{notes.length}/{NOTES_MAX_LENGTH}</div>
          </div>
        </div>

        {/* Footer */}
        {error && <div className="px-5 pb-2 text-sm text-red-500">{error}</div>}
        <div className="border-t border-gray-100 p-5 flex items-center gap-3">
          {/* Qty */}
          <div className="flex items-center gap-2 border border-gray-200 rounded-full px-2 py-1">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-7 h-7 rounded-full text-blue-700 font-bold hover:bg-blue-50 flex items-center justify-center">−</button>
            <span className="text-sm font-semibold w-4 text-center">{qty}</span>
            <button onClick={() => setQty((q) => Math.min(MAX_QUANTITY_PER_LINE, q + 1))} className="w-7 h-7 rounded-full text-blue-700 font-bold hover:bg-blue-50 flex items-center justify-center">+</button>
          </div>

          <button
            onClick={handleAdd}
            disabled={!item.is_available}
            className="flex-1 bg-blue-700 text-white font-bold py-3 rounded-xl hover:bg-blue-800 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add to Cart · {formatMoney(fromCents(unitCents * qty))}
          </button>
        </div>
      </div>
    </div>
  );
}
