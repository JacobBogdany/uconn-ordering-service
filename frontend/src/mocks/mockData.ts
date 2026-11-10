import type { Location, MenuItem, UserSession } from '../types';

export const DEFAULT_STUDENT_PROFILE: UserSession = {
  user_id: 'user-uconn-jonathan-01',
  name: 'Jonathan Husky',
  email: 'jonathan.husky@uconn.edu',
  huskybucks_balance: 50.00,
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
    active_orders_count: 5,
    estimated_wait_minutes: 8,
  },
  {
    id: 'bookworms',
    name: 'Bookworms Cafe',
    building: 'Homer Babbidge Library',
    hours: '8:00 AM – 8:00 PM',
    is_open: true,
    active_orders_count: 9,
    estimated_wait_minutes: 12,
  },
];

// Common modifier presets
const ESPRESSO_MODIFIERS = [
  {
    group_name: 'Size',
    required: true,
    max_select: 1,
    options: [
      { name: 'Small (12oz)', price_delta: 0.00 },
      { name: 'Medium (16oz)', price_delta: 0.65 },
      { name: 'Large (20oz)', price_delta: 1.15 },
    ],
  },
  {
    group_name: 'Milk Choice',
    required: false,
    max_select: 1,
    options: [
      { name: 'Whole Milk', price_delta: 0.00 },
      { name: 'Skim Milk', price_delta: 0.00 },
      { name: 'Oat Milk', price_delta: 0.80 },
      { name: 'Almond Milk', price_delta: 0.80 },
    ],
  },
  {
    group_name: 'Syrup Flavor',
    required: false,
    max_select: 2,
    options: [
      { name: 'Vanilla', price_delta: 0.50 },
      { name: 'Sugar-Free Vanilla', price_delta: 0.50 },
      { name: 'Caramel', price_delta: 0.50 },
      { name: 'Hazelnut', price_delta: 0.50 },
    ],
  },
  {
    group_name: 'Espresso Shots',
    required: false,
    max_select: 2,
    options: [
      { name: 'Single Shot', price_delta: 0.00 },
      { name: 'Extra Espresso Shot', price_delta: 1.00 },
      { name: 'Double Extra Shot', price_delta: 1.90 },
      { name: 'Decaf Espresso', price_delta: 0.00 },
    ],
  },
];

export const MOCK_MENU_ITEMS: MenuItem[] = [
  // ==========================================
  // THE BEANERY (Benton Center) - 8 items
  // ==========================================
  {
    id: 'beanery-01',
    location_id: 'beanery',
    name: 'Benton Signature Iced Vanilla Latte',
    description: 'Double shot of UConn roast espresso chilled over Madagascar vanilla and creamy milk.',
    category: 'Espresso & Coffee',
    base_price: 4.85,
    dietary_tags: ['vegetarian', 'gluten-free'],
    customization_groups: ESPRESSO_MODIFIERS,
    is_available: true,
  },
  {
    id: 'beanery-02',
    location_id: 'beanery',
    name: 'Cold Brew Reserve',
    description: 'Slow-steeped 18-hour cold brew blend served over ice with intense chocolate notes.',
    category: 'Espresso & Coffee',
    base_price: 3.95,
    dietary_tags: ['vegan', 'gluten-free', 'dairy-free'],
    customization_groups: [
      {
        group_name: 'Size',
        required: true,
        max_select: 1,
        options: [
          { name: 'Medium (16oz)', price_delta: 0.00 },
          { name: 'Large (20oz)', price_delta: 0.65 },
        ],
      },
      {
        group_name: 'Milk Choice',
        required: false,
        max_select: 1,
        options: [
          { name: 'Whole Milk Splash', price_delta: 0.00 },
          { name: 'Oat Milk Splash', price_delta: 0.60 },
          { name: 'Almond Milk Splash', price_delta: 0.60 },
        ],
      },
      {
        group_name: 'Flavor Sweetener',
        required: false,
        max_select: 1,
        options: [
          { name: 'Sweet Cream Cold Foam', price_delta: 1.00 },
          { name: 'Vanilla Syrup', price_delta: 0.50 },
          { name: 'Caramel Drizzle', price_delta: 0.50 },
        ],
      },
    ],
    is_available: true,
  },
  {
    id: 'beanery-03',
    location_id: 'beanery',
    name: 'Caramel Macchiato',
    description: 'Freshly steamed milk with vanilla-flavored syrup marked with espresso and topped with caramel drizzle.',
    category: 'Espresso & Coffee',
    base_price: 5.15,
    dietary_tags: ['vegetarian', 'gluten-free'],
    customization_groups: ESPRESSO_MODIFIERS,
    is_available: true,
  },
  {
    id: 'beanery-04',
    location_id: 'beanery',
    name: 'Storrs Morning Drip Coffee',
    description: 'Fresh-ground daily medium roast, smooth and rich.',
    category: 'Espresso & Coffee',
    base_price: 2.65,
    dietary_tags: ['vegan', 'gluten-free', 'dairy-free'],
    customization_groups: [
      {
        group_name: 'Size',
        required: true,
        max_select: 1,
        options: [
          { name: 'Small (12oz)', price_delta: 0.00 },
          { name: 'Medium (16oz)', price_delta: 0.55 },
          { name: 'Large (20oz)', price_delta: 0.95 },
        ],
      },
      {
        group_name: 'Milk Choice',
        required: false,
        max_select: 1,
        options: [
          { name: 'Whole Milk', price_delta: 0.00 },
          { name: 'Oat Milk', price_delta: 0.50 },
          { name: 'Almond Milk', price_delta: 0.50 },
        ],
      },
    ],
    is_available: true,
  },
  {
    id: 'beanery-05',
    location_id: 'beanery',
    name: 'Asiago Bacon, Egg & Vermont Cheddar',
    description: 'Crispy bacon, cage-free fried egg, and sharp cheddar melted on a toasted bakery asiago bagel.',
    category: 'Breakfast Sandwiches',
    base_price: 5.95,
    dietary_tags: [],
    customization_groups: [
      {
        group_name: 'Bagel Choice',
        required: true,
        max_select: 1,
        options: [
          { name: 'Asiago Bagel', price_delta: 0.00 },
          { name: 'Everything Bagel', price_delta: 0.00 },
          { name: 'Plain Bagel', price_delta: 0.00 },
          { name: 'Gluten-Free Bagel', price_delta: 1.00 },
        ],
      },
      {
        group_name: 'Preparation',
        required: false,
        max_select: 1,
        options: [
          { name: 'Toasted', price_delta: 0.00 },
          { name: 'Not Toasted', price_delta: 0.00 },
          { name: 'Extra Butter', price_delta: 0.25 },
        ],
      },
    ],
    is_available: true,
  },
  {
    id: 'beanery-06',
    location_id: 'beanery',
    name: 'Southwest Avocado & Egg White Wrap',
    description: 'Fluffy egg whites, smashed Hass avocado, black bean salsa, and pepper jack in a warm spinach tortilla.',
    category: 'Breakfast Sandwiches',
    base_price: 6.45,
    dietary_tags: ['vegetarian', 'halal'],
    customization_groups: [
      {
        group_name: 'Sauce',
        required: false,
        max_select: 1,
        options: [
          { name: 'Chipotle Aioli', price_delta: 0.00 },
          { name: 'Salsa Verde', price_delta: 0.00 },
          { name: 'No Sauce', price_delta: 0.00 },
        ],
      },
    ],
    is_available: true,
  },
  {
    id: 'beanery-07',
    location_id: 'beanery',
    name: 'Wild Maine Blueberry Muffin',
    description: 'Baked fresh every morning with pure cane sugar crumb topping.',
    category: 'Bakery',
    base_price: 2.95,
    dietary_tags: ['vegetarian'],
    customization_groups: [
      {
        group_name: 'Service Option',
        required: false,
        max_select: 1,
        options: [
          { name: 'Warmed Up', price_delta: 0.00 },
          { name: 'Room Temperature', price_delta: 0.00 },
        ],
      },
    ],
    is_available: true,
  },
  {
    id: 'beanery-08',
    location_id: 'beanery',
    name: 'Matcha Green Tea Latte',
    description: 'Japanese ceremonial grade Uji matcha whisked with oat or whole milk and hint of honey.',
    category: 'Teas & Specialty',
    base_price: 5.25,
    dietary_tags: ['vegetarian', 'gluten-free'],
    customization_groups: [
      {
        group_name: 'Size',
        required: true,
        max_select: 1,
        options: [
          { name: 'Medium (16oz)', price_delta: 0.00 },
          { name: 'Large (20oz)', price_delta: 0.75 },
        ],
      },
      {
        group_name: 'Milk Choice',
        required: false,
        max_select: 1,
        options: [
          { name: 'Oat Milk', price_delta: 0.80 },
          { name: 'Almond Milk', price_delta: 0.80 },
          { name: 'Whole Milk', price_delta: 0.00 },
        ],
      },
      {
        group_name: 'Sweetness',
        required: false,
        max_select: 1,
        options: [
          { name: 'Regular Sweet', price_delta: 0.00 },
          { name: 'Light Honey', price_delta: 0.00 },
          { name: 'Unsweetened', price_delta: 0.00 },
        ],
      },
    ],
    is_available: true,
  },

  // ==========================================
  // BOOKWORMS CAFE (Homer Babbidge Library) - 8 items
  // ==========================================
  {
    id: 'bookworms-01',
    location_id: 'bookworms',
    name: 'All-Nighter Library Red Eye',
    description: 'Dark roast brewed coffee spiked with two shots of intense espresso to power late night study sessions.',
    category: 'Espresso & Brews',
    base_price: 4.45,
    dietary_tags: ['vegan', 'gluten-free', 'dairy-free'],
    customization_groups: ESPRESSO_MODIFIERS,
    is_available: true,
  },
  {
    id: 'bookworms-02',
    location_id: 'bookworms',
    name: 'Iced Spiced Chai Latte',
    description: 'Black tea infused with cardamom, cinnamon, clove, ginger, and honey poured over ice and milk.',
    category: 'Teas & Specialty',
    base_price: 4.95,
    dietary_tags: ['vegetarian', 'gluten-free'],
    customization_groups: [
      {
        group_name: 'Size',
        required: true,
        max_select: 1,
        options: [
          { name: 'Medium (16oz)', price_delta: 0.00 },
          { name: 'Large (20oz)', price_delta: 0.70 },
        ],
      },
      {
        group_name: 'Milk Choice',
        required: false,
        max_select: 1,
        options: [
          { name: 'Oat Milk', price_delta: 0.80 },
          { name: 'Almond Milk', price_delta: 0.80 },
          { name: 'Whole Milk', price_delta: 0.00 },
        ],
      },
      {
        group_name: 'Espresso Addition',
        required: false,
        max_select: 1,
        options: [
          { name: 'Dirty Chai (Add Espresso Shot)', price_delta: 1.00 },
        ],
      },
    ],
    is_available: true,
  },
  {
    id: 'bookworms-03',
    location_id: 'bookworms',
    name: 'Nitro Cold Brew on Tap',
    description: 'Nitrogen-infused cold brew poured cold without ice, delivering a creamy head and velvety texture.',
    category: 'Espresso & Brews',
    base_price: 4.65,
    dietary_tags: ['vegan', 'gluten-free', 'dairy-free'],
    customization_groups: [
      {
        group_name: 'Syrup Flavor',
        required: false,
        max_select: 1,
        options: [
          { name: 'Vanilla Syrup', price_delta: 0.50 },
          { name: 'Hazelnut Syrup', price_delta: 0.50 },
        ],
      },
    ],
    is_available: true,
  },
  {
    id: 'bookworms-04',
    location_id: 'bookworms',
    name: 'Roast Turkey, Apple & Brie Panini',
    description: 'Thin-sliced deli turkey, crisp Honeycrisp apples, melted French brie, and cranberry Dijon on sourdough.',
    category: 'Gourmet Sandwiches',
    base_price: 7.95,
    dietary_tags: [],
    customization_groups: [
      {
        group_name: 'Bread Selection',
        required: true,
        max_select: 1,
        options: [
          { name: 'Rustic Sourdough', price_delta: 0.00 },
          { name: 'Multi-Grain Ciabatta', price_delta: 0.00 },
          { name: 'Gluten-Free Bread', price_delta: 1.25 },
        ],
      },
      {
        group_name: 'Pressing',
        required: false,
        max_select: 1,
        options: [
          { name: 'Hot Panini Pressed', price_delta: 0.00 },
          { name: 'Cold Deli Style', price_delta: 0.00 },
        ],
      },
    ],
    is_available: true,
  },
  {
    id: 'bookworms-05',
    location_id: 'bookworms',
    name: 'Tuscan Caprese Baguette',
    description: 'Fresh mozzarella ovalini, ripe vine tomatoes, basil pesto drizzle, and balsamic glaze on crusty baguette.',
    category: 'Gourmet Sandwiches',
    base_price: 7.25,
    dietary_tags: ['vegetarian', 'halal'],
    customization_groups: [
      {
        group_name: 'Cheese Option',
        required: false,
        max_select: 1,
        options: [
          { name: 'Standard Mozzarella', price_delta: 0.00 },
          { name: 'Double Mozzarella', price_delta: 1.50 },
        ],
      },
    ],
    is_available: true,
  },
  {
    id: 'bookworms-06',
    location_id: 'bookworms',
    name: 'Mediterranean Mezze Hummus Box',
    description: 'House garlic hummus with kalamata olives, crisp Persian cucumbers, baby carrots, and warm pita chips.',
    category: 'Study Snacks',
    base_price: 5.25,
    dietary_tags: ['vegan', 'dairy-free', 'halal'],
    customization_groups: [
      {
        group_name: 'Pita Type',
        required: false,
        max_select: 1,
        options: [
          { name: 'Sea Salt Pita Chips', price_delta: 0.00 },
          { name: 'Extra Veggie Crudite (Gluten-Free)', price_delta: 0.50 },
        ],
      },
    ],
    is_available: true,
  },
  {
    id: 'bookworms-07',
    location_id: 'bookworms',
    name: 'Dark Chocolate Sea Salt Scone',
    description: 'Tender buttery crumb filled with Belgian dark chocolate chunks and topped with flake Maldon salt.',
    category: 'Pastries',
    base_price: 3.45,
    dietary_tags: ['vegetarian'],
    customization_groups: [
      {
        group_name: 'Heating',
        required: false,
        max_select: 1,
        options: [
          { name: 'Warmed', price_delta: 0.00 },
          { name: 'As Is', price_delta: 0.00 },
        ],
      },
    ],
    is_available: true,
  },
  {
    id: 'bookworms-08',
    location_id: 'bookworms',
    name: 'Gluten-Free Almond Butter Energy Bar',
    description: 'Clean raw energy bar with rolled oats, roasted almond butter, chia seeds, and raw agave nectar.',
    category: 'Study Snacks',
    base_price: 3.15,
    dietary_tags: ['vegan', 'gluten-free', 'dairy-free'],
    customization_groups: [],
    is_available: true,
  },
];
