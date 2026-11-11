import type { Location, MenuItem } from './types';

/**
 * ============================================================================
 * ILLUSTRATIVE SAMPLE DATA ONLY
 * ============================================================================
 * NOTE: The menu items, prices, modifiers, operating hours, and balances below
 * are illustrative sample data for local frontend development and the zero-DB
 * fallback. They DO NOT represent live or verified UConn Dining data.
 *
 * In production or Supabase-connected mode, this catalog is served dynamically
 * from the database via GET /api/locations and GET /api/locations/:id/menu.
 * ============================================================================
 */

export const MOCK_STARTING_BALANCES = {
  huskybucks_balance: 50.0,
  flex_passes: 10,
  dining_points: 120,
};

export const MOCK_LOCATIONS: Location[] = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'The Beanery',
    building: 'Benton Center',
    hours: '7:30 AM – 4:00 PM',
    is_open: true,
    active_orders_count: 4,
    estimated_wait_minutes: 8,
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    name: 'Bookworms Cafe',
    building: 'Homer Babbidge Library',
    hours: '8:00 AM – 8:00 PM',
    is_open: true,
    active_orders_count: 12,
    estimated_wait_minutes: 15,
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    name: 'Putnam Grab-and-Go',
    building: 'Putnam Dining Hall',
    hours: '7:00 AM – 2:00 PM',
    is_open: false,
    active_orders_count: 0,
    estimated_wait_minutes: 0,
  },
];

export const MOCK_MENU_ITEMS: MenuItem[] = [
  // ==========================================================================
  // THE BEANERY (5 items)
  // ==========================================================================
  {
    id: '20000000-0000-4000-8000-000000000101',
    location_id: '10000000-0000-4000-8000-000000000001',
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
          { name: 'Oat Milk', price_delta: 0.8 },
          { name: 'Almond Milk', price_delta: 0.8 },
        ],
      },
      {
        group_name: 'Add-ons',
        required: false,
        max_select: 3,
        options: [
          { name: 'Extra Espresso Shot', price_delta: 1.0 },
          { name: 'Vanilla Syrup', price_delta: 0.5 },
          { name: 'Caramel Drizzle', price_delta: 0.5 },
        ],
      },
    ],
    is_available: true,
  },
  {
    id: '20000000-0000-4000-8000-000000000102',
    location_id: '10000000-0000-4000-8000-000000000001',
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
          { name: 'Large (20oz)', price_delta: 0.6 },
        ],
      },
    ],
    is_available: true,
  },
  {
    id: '20000000-0000-4000-8000-000000000103',
    location_id: '10000000-0000-4000-8000-000000000001',
    name: 'Drip Coffee',
    description: 'Fresh-brewed house blend, served hot.',
    category: 'Beverages',
    base_price: 2.5,
    dietary_tags: ['vegan', 'gluten-free', 'dairy-free'],
    customization_groups: [
      {
        group_name: 'Size',
        required: true,
        max_select: 1,
        options: [
          { name: 'Small (12oz)', price_delta: 0.0 },
          { name: 'Medium (16oz)', price_delta: 0.6 },
          { name: 'Large (20oz)', price_delta: 1.1 },
        ],
      },
    ],
    is_available: true,
  },
  {
    id: '20000000-0000-4000-8000-000000000104',
    location_id: '10000000-0000-4000-8000-000000000001',
    name: 'Asiago Bagel Sandwich',
    description: 'Toasted asiago bagel with egg, cheddar, and your choice of protein.',
    category: 'Sandwiches',
    base_price: 5.5,
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
    id: '20000000-0000-4000-8000-000000000105',
    location_id: '10000000-0000-4000-8000-000000000001',
    name: 'Blueberry Muffin',
    description: 'Freshly baked, bursting with wild blueberries.',
    category: 'Bakery',
    base_price: 2.75,
    dietary_tags: ['vegetarian'],
    customization_groups: [],
    is_available: true,
  },

  // ==========================================================================
  // BOOKWORMS CAFE (5 items)
  // ==========================================================================
  {
    id: '20000000-0000-4000-8000-000000000201',
    location_id: '10000000-0000-4000-8000-000000000002',
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
    id: '20000000-0000-4000-8000-000000000202',
    location_id: '10000000-0000-4000-8000-000000000002',
    name: 'Hummus & Veggie Plate',
    description: 'House-made hummus with sliced cucumber, carrots, and pita chips.',
    category: 'Snacks',
    base_price: 4.5,
    dietary_tags: ['vegan', 'dairy-free', 'halal'],
    customization_groups: [],
    is_available: true,
  },
  {
    id: '20000000-0000-4000-8000-000000000203',
    location_id: '10000000-0000-4000-8000-000000000002',
    name: 'Matcha Latte',
    description: 'Ceremonial grade matcha whisked with steamed milk.',
    category: 'Beverages',
    base_price: 5.0,
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
    id: '20000000-0000-4000-8000-000000000204',
    location_id: '10000000-0000-4000-8000-000000000002',
    name: 'Dark Chocolate Almond Kind Bar',
    description: 'Almond & dark chocolate flavored snack bar.',
    category: 'Snacks',
    base_price: 2.25,
    dietary_tags: ['vegan', 'gluten-free'],
    customization_groups: [],
    is_available: true,
  },
  {
    id: '20000000-0000-4000-8000-000000000205',
    location_id: '10000000-0000-4000-8000-000000000002',
    name: 'Iced Spiced Chai Latte',
    description: 'Black tea infused with cardamom, cinnamon, clove, ginger, and honey.',
    category: 'Beverages',
    base_price: 4.95,
    dietary_tags: ['vegetarian', 'gluten-free'],
    customization_groups: [
      {
        group_name: 'Milk Choice',
        required: true,
        max_select: 1,
        options: [
          { name: 'Whole Milk', price_delta: 0.0 },
          { name: 'Oat Milk', price_delta: 0.8 },
          { name: 'Almond Milk', price_delta: 0.8 },
        ],
      },
    ],
    is_available: true,
  },

  // ==========================================================================
  // PUTNAM GRAB-AND-GO (4 items)
  // ==========================================================================
  {
    id: '20000000-0000-4000-8000-000000000301',
    location_id: '10000000-0000-4000-8000-000000000003',
    name: 'Overnight Oats with Chia',
    description: 'Creamy oats with chia seeds, banana, and honey.',
    category: 'Grab-and-Go',
    base_price: 3.5,
    dietary_tags: ['vegetarian', 'gluten-free'],
    customization_groups: [],
    is_available: true,
  },
  {
    id: '20000000-0000-4000-8000-000000000302',
    location_id: '10000000-0000-4000-8000-000000000003',
    name: 'Greek Yogurt Berry Parfait',
    description: 'Layered greek yogurt with house granola and mixed berry compote.',
    category: 'Grab-and-Go',
    base_price: 4.0,
    dietary_tags: ['vegetarian', 'gluten-free'],
    customization_groups: [],
    is_available: true,
  },
  {
    id: '20000000-0000-4000-8000-000000000303',
    location_id: '10000000-0000-4000-8000-000000000003',
    name: 'Fresh Seasonal Fruit Cup',
    description: 'Seasonal mixed fruit, freshly cut daily.',
    category: 'Grab-and-Go',
    base_price: 2.75,
    dietary_tags: ['vegan', 'gluten-free', 'dairy-free', 'halal'],
    customization_groups: [],
    is_available: true,
  },
  {
    id: '20000000-0000-4000-8000-000000000304',
    location_id: '10000000-0000-4000-8000-000000000003',
    name: 'Protein Bistro Box',
    description: 'Hard-boiled egg, sharp cheddar cheese slices, apple slices, and peanut butter.',
    category: 'Grab-and-Go',
    base_price: 5.25,
    dietary_tags: ['vegetarian', 'gluten-free'],
    customization_groups: [],
    is_available: true,
  },
];
