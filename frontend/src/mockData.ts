import type { Location, MenuItem } from './types';

/**
 * Illustrative starting balances for the local mock adapter only. Identity comes
 * from the signed demo session (user_id/display_name); there is no mock user id.
 * Mirrors the profiles table defaults. With Supabase connected, use
 * GET /api/users/me/balance instead.
 */
export const MOCK_STARTING_BALANCES = {
  huskybucks_balance: 50.0,
  flex_passes: 10,
  dining_points: 120,
};

export const MOCK_LOCATIONS: Location[] = [
  {
    id: 'beanery',
    name: 'The Beanery',
    building: 'Benton Center',
    hours: '7:30 AM – 4:00 PM',
    is_open: true,
    active_orders_count: 4,
    estimated_wait_minutes: 8,
  },
  {
    id: 'bookworms',
    name: 'Bookworms Cafe',
    building: 'Homer Babbidge Library',
    hours: '8:00 AM – 8:00 PM',
    is_open: true,
    active_orders_count: 12,
    estimated_wait_minutes: 15,
  },
  {
    id: 'putnam',
    name: 'Putnam Grab-and-Go',
    building: 'Putnam Dining Hall',
    hours: '7:00 AM – 2:00 PM',
    is_open: false,
    active_orders_count: 0,
    estimated_wait_minutes: 0,
  },
];

export const MOCK_MENU_ITEMS: MenuItem[] = [
  // --- The Beanery ---
  {
    id: 'item-101',
    location_id: 'beanery',
    name: 'Iced Vanilla Latte',
    description: 'Espresso with cold milk and sweet Madagascar vanilla syrup.',
    category: 'Beverages',
    base_price: 4.75,
    dietary_tags: ['vegetarian', 'gluten-free'],
    customization_groups: [
      {
        group_name: 'Size',
        required: true,
        max_select: 1,
        options: [
          { name: 'Medium (16oz)', price_delta: 0.0 },
          { name: 'Large (20oz)', price_delta: 0.75 },
        ],
      },
      {
        group_name: 'Milk Alternative',
        required: false,
        max_select: 1,
        options: [
          { name: 'Whole Milk', price_delta: 0.0 },
          { name: 'Oat Milk', price_delta: 0.80 },
          { name: 'Almond Milk', price_delta: 0.80 },
        ],
      },
      {
        group_name: 'Add-ons',
        required: false,
        max_select: 3,
        options: [
          { name: 'Extra Espresso Shot', price_delta: 1.00 },
          { name: 'Vanilla Syrup', price_delta: 0.50 },
          { name: 'Caramel Drizzle', price_delta: 0.50 },
        ],
      },
    ],
    is_available: true,
  },
  {
    id: 'item-102',
    location_id: 'beanery',
    name: 'Cold Brew Coffee',
    description: 'Smooth, slow-steeped cold brew served over ice.',
    category: 'Beverages',
    base_price: 3.75,
    dietary_tags: ['vegan', 'gluten-free', 'dairy-free'],
    customization_groups: [
      {
        group_name: 'Size',
        required: true,
        max_select: 1,
        options: [
          { name: 'Medium (16oz)', price_delta: 0.0 },
          { name: 'Large (20oz)', price_delta: 0.60 },
        ],
      },
    ],
    is_available: true,
  },
  {
    id: 'item-103',
    location_id: 'beanery',
    name: 'Drip Coffee',
    description: 'Fresh-brewed house blend, served hot.',
    category: 'Beverages',
    base_price: 2.50,
    dietary_tags: ['vegan', 'gluten-free', 'dairy-free'],
    customization_groups: [
      {
        group_name: 'Size',
        required: true,
        max_select: 1,
        options: [
          { name: 'Small (12oz)', price_delta: 0.0 },
          { name: 'Medium (16oz)', price_delta: 0.60 },
          { name: 'Large (20oz)', price_delta: 1.10 },
        ],
      },
    ],
    is_available: true,
  },
  {
    id: 'item-104',
    location_id: 'beanery',
    name: 'Asiago Bagel Sandwich',
    description: 'Toasted asiago bagel with egg, cheddar, and your choice of protein.',
    category: 'Sandwiches',
    base_price: 5.50,
    dietary_tags: ['vegetarian'],
    customization_groups: [
      {
        group_name: 'Bagel',
        required: true,
        max_select: 1,
        options: [
          { name: 'Asiago', price_delta: 0.0 },
          { name: 'Everything', price_delta: 0.0 },
          { name: 'Plain', price_delta: 0.0 },
        ],
      },
      {
        group_name: 'Protein',
        required: false,
        max_select: 1,
        options: [
          { name: 'Bacon', price_delta: 1.25 },
          { name: 'Sausage', price_delta: 1.25 },
          { name: 'No Protein', price_delta: 0.0 },
        ],
      },
      {
        group_name: 'Toast',
        required: false,
        max_select: 1,
        options: [
          { name: 'Toasted', price_delta: 0.0 },
          { name: 'Not Toasted', price_delta: 0.0 },
        ],
      },
    ],
    is_available: true,
  },
  {
    id: 'item-105',
    location_id: 'beanery',
    name: 'Blueberry Muffin',
    description: 'Freshly baked, bursting with wild blueberries.',
    category: 'Bakery',
    base_price: 2.75,
    dietary_tags: ['vegetarian'],
    customization_groups: [],
    is_available: true,
  },

  // --- Bookworms Cafe ---
  {
    id: 'item-201',
    location_id: 'bookworms',
    name: 'Turkey Avocado Wrap',
    description: 'Sliced turkey, creamy avocado, romaine lettuce and tomato in a whole-wheat wrap.',
    category: 'Sandwiches',
    base_price: 7.25,
    dietary_tags: ['dairy-free'],
    customization_groups: [
      {
        group_name: 'Wrap',
        required: true,
        max_select: 1,
        options: [
          { name: 'Whole Wheat', price_delta: 0.0 },
          { name: 'Spinach', price_delta: 0.0 },
          { name: 'Plain Flour', price_delta: 0.0 },
        ],
      },
    ],
    is_available: true,
  },
  {
    id: 'item-202',
    location_id: 'bookworms',
    name: 'Hummus & Veggie Plate',
    description: 'House-made hummus with sliced cucumber, carrots, and pita chips.',
    category: 'Snacks',
    base_price: 4.50,
    dietary_tags: ['vegan', 'dairy-free'],
    customization_groups: [],
    is_available: true,
  },
  {
    id: 'item-203',
    location_id: 'bookworms',
    name: 'Matcha Latte',
    description: 'Ceremonial grade matcha whisked with steamed milk.',
    category: 'Beverages',
    base_price: 5.00,
    dietary_tags: ['vegetarian', 'gluten-free'],
    customization_groups: [
      {
        group_name: 'Milk',
        required: true,
        max_select: 1,
        options: [
          { name: 'Whole Milk', price_delta: 0.0 },
          { name: 'Oat Milk', price_delta: 0.75 },
          { name: 'Almond Milk', price_delta: 0.75 },
        ],
      },
      {
        group_name: 'Sweetness',
        required: false,
        max_select: 1,
        options: [
          { name: 'Unsweetened', price_delta: 0.0 },
          { name: 'Lightly Sweet', price_delta: 0.0 },
          { name: 'Sweet', price_delta: 0.0 },
        ],
      },
    ],
    is_available: true,
  },
  {
    id: 'item-204',
    location_id: 'bookworms',
    name: 'Kind Bar',
    description: 'Almond & dark chocolate flavored snack bar.',
    category: 'Snacks',
    base_price: 2.25,
    dietary_tags: ['vegan', 'gluten-free'],
    customization_groups: [],
    is_available: true,
  },

  // --- Putnam Grab-and-Go ---
  {
    id: 'item-301',
    location_id: 'putnam',
    name: 'Overnight Oats',
    description: 'Creamy oats with chia seeds, banana, and honey.',
    category: 'Grab-and-Go',
    base_price: 3.50,
    dietary_tags: ['vegetarian', 'gluten-free'],
    customization_groups: [],
    is_available: true,
  },
  {
    id: 'item-302',
    location_id: 'putnam',
    name: 'Greek Yogurt Parfait',
    description: 'Layered greek yogurt with house granola and mixed berry compote.',
    category: 'Grab-and-Go',
    base_price: 4.00,
    dietary_tags: ['vegetarian', 'gluten-free'],
    customization_groups: [],
    is_available: true,
  },
  {
    id: 'item-303',
    location_id: 'putnam',
    name: 'Fresh Fruit Cup',
    description: 'Seasonal mixed fruit, freshly cut daily.',
    category: 'Grab-and-Go',
    base_price: 2.75,
    dietary_tags: ['vegan', 'gluten-free', 'dairy-free', 'halal'],
    customization_groups: [],
    is_available: true,
  },
];
