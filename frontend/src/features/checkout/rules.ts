/**
 * Checkout rules (Vin / Slice 2) — client mirror of
 * backend/app/services/checkout_rules.py. Used for instant UI feedback and by
 * the local mock adapter. The server is authoritative: prices computed here are
 * display estimates and are never sent in a checkout request.
 *
 * See context/checkout_contract.md.
 */
import type {
  CartItem,
  CheckoutErrorCode,
  CreateOrderRequest,
  Location,
  MenuItem,
  ModifierGroup,
  OrderItem,
  SelectedOptionSnapshot,
} from '../../types';

export const NOTES_MAX_LENGTH = 200;
export const MAX_QUANTITY_PER_LINE = 20;
export const MAX_LINES_PER_ORDER = 20;
export const ACCEPTED_PAYMENT_METHOD = 'HUSKYBUCKS' as const;

export class CheckoutRuleError extends Error {
  code: CheckoutErrorCode;
  field?: string;

  constructor(code: CheckoutErrorCode, message: string, field?: string) {
    super(message);
    this.name = 'CheckoutRuleError';
    this.code = code;
    this.field = field;
  }
}

// ---------------------------------------------------------------------------
// Money: integer cents internally so 0.1 + 0.2 style errors never reach a total.
// ---------------------------------------------------------------------------

export const toCents = (dollars: number): number => Math.round(dollars * 100);
export const fromCents = (cents: number): number => cents / 100;
export const formatMoney = (dollars: number): string => `$${dollars.toFixed(2)}`;

// ---------------------------------------------------------------------------
// Temporary adapter: legacy mock `customization_groups` -> schema-shaped groups.
// Delete once the catalog API (Jacob) returns ModifierGroup[] with real UUIDs.
// ---------------------------------------------------------------------------

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function modifierGroupsForItem(item: MenuItem): ModifierGroup[] {
  return item.customization_groups.map((group, groupIndex) => {
    const groupId = `${item.id}/${slug(group.group_name)}`;
    return {
      id: groupId,
      name: group.group_name,
      is_required: group.required,
      min_select: group.required ? 1 : 0,
      max_select: Math.max(1, group.max_select),
      sort_order: groupIndex,
      options: group.options.map((option, optionIndex) => ({
        id: `${groupId}/${slug(option.name)}`,
        name: option.name,
        price_delta: option.price_delta,
        is_available: true,
        sort_order: optionIndex,
      })),
    };
  });
}

// ---------------------------------------------------------------------------
// Selection rules
// ---------------------------------------------------------------------------

/** A required group needs at least one choice even if min_select is 0. */
export const effectiveMin = (group: ModifierGroup): number =>
  Math.max(group.min_select, group.is_required ? 1 : 0);

export function describeGroupRule(group: ModifierGroup): string {
  const min = effectiveMin(group);
  const max = group.max_select;
  if (min === max) return min === 1 ? 'Choose 1' : `Choose ${min}`;
  if (min === 0) return max === 1 ? 'Optional' : `Up to ${max}`;
  return `Choose ${min}–${max}`;
}

export interface SelectionValidation {
  valid: boolean;
  /** Error message per group id. */
  groupErrors: Record<string, string>;
  /** First error, for a single summary line. */
  message: string | null;
  code: CheckoutErrorCode | null;
}

const sortGroups = (groups: ModifierGroup[]) =>
  [...groups].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

/**
 * Validate one line's chosen option ids. Rules (same order as the server):
 * no duplicates; every id belongs to this item; chosen options are available;
 * each group's count is within [effectiveMin, max_select].
 */
export function validateSelections(itemName: string, groups: ModifierGroup[], selectedIds: string[]): SelectionValidation {
  const fail = (code: CheckoutErrorCode, message: string, groupErrors: Record<string, string> = {}): SelectionValidation => ({
    valid: false,
    groupErrors,
    message,
    code,
  });

  if (new Set(selectedIds).size !== selectedIds.length) {
    return fail('VALIDATION_ERROR', `Duplicate option selected for ${itemName}.`);
  }

  const lookup = new Map<string, { groupId: string; available: boolean; name: string }>();
  for (const group of groups) {
    for (const option of group.options) lookup.set(option.id, { groupId: group.id, available: option.is_available, name: option.name });
  }

  const counts: Record<string, number> = Object.fromEntries(groups.map((g) => [g.id, 0]));
  for (const id of selectedIds) {
    const match = lookup.get(id);
    if (!match) return fail('VALIDATION_ERROR', `Option is not valid for ${itemName}.`);
    if (!match.available) return fail('ITEM_UNAVAILABLE', `${match.name} is currently unavailable.`, { [match.groupId]: `${match.name} is unavailable.` });
    counts[match.groupId] += 1;
  }

  const groupErrors: Record<string, string> = {};
  let first: { code: CheckoutErrorCode; message: string } | null = null;
  for (const group of sortGroups(groups)) {
    const min = effectiveMin(group);
    const count = counts[group.id];
    let error: string | null = null;
    if (count < min) error = min === 1 ? `${group.name} needs a choice.` : `${group.name} needs at least ${min} choices.`;
    else if (count > group.max_select) error = `Choose at most ${group.max_select} for ${group.name}.`;
    if (error) {
      groupErrors[group.id] = error;
      first ??= { code: 'VALIDATION_ERROR', message: `${itemName}: ${error}` };
    }
  }
  return first ? fail(first.code, first.message, groupErrors) : { valid: true, groupErrors: {}, message: null, code: null };
}

/** Selected options as receipt snapshots, ordered by group then option sort order. */
export function selectedSnapshots(groups: ModifierGroup[], selectedIds: string[]): SelectedOptionSnapshot[] {
  const chosen = new Set(selectedIds);
  const snapshots: SelectedOptionSnapshot[] = [];
  for (const group of sortGroups(groups)) {
    const options = [...group.options].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    for (const option of options) {
      if (chosen.has(option.id)) {
        snapshots.push({ option_id: option.id, group_name: group.name, name: option.name, price_delta: option.price_delta });
      }
    }
  }
  return snapshots;
}

/** One unit: base price + sum of selected option deltas. */
export function unitPriceCents(basePrice: number, snapshots: SelectedOptionSnapshot[]): number {
  return toCents(basePrice) + snapshots.reduce((sum, s) => sum + toCents(s.price_delta), 0);
}

/** Trim/collapse whitespace; blank -> null; enforce max length. */
export function normalizeNotes(notes: string | null | undefined): string | null {
  if (notes == null) return null;
  const cleaned = notes.split(/\s+/).filter(Boolean).join(' ');
  if (!cleaned) return null;
  if (cleaned.length > NOTES_MAX_LENGTH) {
    throw new CheckoutRuleError('VALIDATION_ERROR', `Notes must be ${NOTES_MAX_LENGTH} characters or fewer.`, 'notes');
  }
  return cleaned;
}

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

/** Identical item + options + notes merge into one cart line. */
export function cartLineId(menuItemId: string, selectedIds: string[], notes: string | null): string {
  return JSON.stringify([menuItemId, [...selectedIds].sort(), notes ?? '']);
}

export const cartTotalCents = (cart: CartItem[]): number =>
  cart.reduce((sum, line) => sum + toCents(line.unit_price) * line.quantity, 0);

/** Build the POST /api/orders body. Prices, totals, and identity are never included. */
export function buildCreateOrderRequest(cart: CartItem[]): CreateOrderRequest {
  if (cart.length === 0) throw new CheckoutRuleError('VALIDATION_ERROR', 'Your cart is empty.', 'items');
  if (cart.length > MAX_LINES_PER_ORDER) {
    throw new CheckoutRuleError('VALIDATION_ERROR', `Orders are limited to ${MAX_LINES_PER_ORDER} lines.`, 'items');
  }
  const locationIds = new Set(cart.map((line) => line.location_id));
  if (locationIds.size !== 1) {
    throw new CheckoutRuleError('VALIDATION_ERROR', 'All items in an order must come from one location.', 'location_id');
  }
  return {
    location_id: cart[0].location_id,
    payment_method: ACCEPTED_PAYMENT_METHOD,
    items: cart.map((line) => ({
      menu_item_id: line.menu_item_id,
      quantity: line.quantity,
      selected_option_ids: line.selected_options.flatMap((o) => (o.option_id ? [o.option_id] : [])),
      notes: normalizeNotes(line.notes),
    })),
  };
}

// ---------------------------------------------------------------------------
// Mock-adapter pricing (stands in for the server until POST /api/orders exists)
// ---------------------------------------------------------------------------

export interface PricedOrder {
  location: Location;
  lines: Omit<OrderItem, 'id'>[];
  totalCents: number;
}

/** Recompute an order from current catalog rows, exactly as the server will. */
export function priceOrder(request: CreateOrderRequest, menuItems: MenuItem[], locations: Location[]): PricedOrder {
  if (request.payment_method !== ACCEPTED_PAYMENT_METHOD) {
    throw new CheckoutRuleError('PAYMENT_METHOD_UNAVAILABLE', 'Only HuskyBucks are accepted for this demo.', 'payment_method');
  }
  const location = locations.find((l) => l.id === request.location_id);
  if (!location) throw new CheckoutRuleError('NOT_FOUND', 'Pickup location not found.', 'location_id');
  if (!location.is_open) throw new CheckoutRuleError('ITEM_UNAVAILABLE', `${location.name} is not accepting orders right now.`, 'location_id');

  const lines = request.items.map((line, index) => {
    const item = menuItems.find((m) => m.id === line.menu_item_id);
    if (!item) throw new CheckoutRuleError('NOT_FOUND', 'Menu item not found.', `items[${index}].menu_item_id`);
    if (item.location_id !== location.id) {
      throw new CheckoutRuleError('VALIDATION_ERROR', `${item.name} is not sold at ${location.name}.`, `items[${index}].menu_item_id`);
    }
    if (!item.is_available) throw new CheckoutRuleError('ITEM_UNAVAILABLE', `${item.name} is currently unavailable.`, `items[${index}]`);
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_QUANTITY_PER_LINE) {
      throw new CheckoutRuleError('VALIDATION_ERROR', `Quantity must be 1–${MAX_QUANTITY_PER_LINE}.`, `items[${index}].quantity`);
    }

    const groups = modifierGroupsForItem(item);
    const check = validateSelections(item.name, groups, line.selected_option_ids);
    if (!check.valid) throw new CheckoutRuleError(check.code ?? 'VALIDATION_ERROR', check.message ?? 'Invalid selection.', `items[${index}].selected_option_ids`);

    const snapshots = selectedSnapshots(groups, line.selected_option_ids);
    const unit = unitPriceCents(item.base_price, snapshots);
    if (unit < 0) throw new CheckoutRuleError('VALIDATION_ERROR', `${item.name} has an invalid price configuration.`);
    return {
      menu_item_id: item.id,
      item_name: item.name,
      quantity: line.quantity,
      unit_price: fromCents(unit),
      line_total: fromCents(unit * line.quantity),
      selected_options: snapshots,
      notes: normalizeNotes(line.notes),
    };
  });

  const totalCents = lines.reduce((sum, l) => sum + toCents(l.line_total), 0);
  return { location, lines, totalCents };
}

export function assertSufficientBalance(balance: number, totalCents: number): number {
  const balanceCents = toCents(balance);
  if (balanceCents < totalCents) {
    throw new CheckoutRuleError(
      'INSUFFICIENT_BALANCE',
      `Order total ${formatMoney(fromCents(totalCents))} exceeds HuskyBucks balance ${formatMoney(balance)}.`,
    );
  }
  return fromCents(balanceCents - totalCents);
}
