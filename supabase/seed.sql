-- HuskyBite Idempotent Catalog & Demo Seed Data
-- Owner: Jacob Bogdany (Catalog and Slice 1)
--
-- Populates:
--   1. Demo auth.users and public.profiles (Student & Operator)
--   2. Three campus dining locations (The Beanery, Bookworms Cafe, Putnam Grab-and-Go)
--   3. Representative menu items (>= 4 per venue, 14 total) with dietary tags
--   4. Relational modifier groups and modifier options (satisfying selection constraints)
--
-- Safe to re-run multiple times on an empty or existing Supabase database.
-- NOTE: All menu items, pricing, hours, and balances are illustrative sample data
--       and do not represent verified real-time UConn dining data.

begin;

-- ============================================================================
-- 1. DEMO AUTH USERS & PROFILES
-- ============================================================================
-- Uses the UUIDs defined in app.config:
--   Demo Student:  00000000-0000-4000-8000-000000000001
--   Demo Operator: 00000000-0000-4000-8000-000000000002

-- Insert into auth.users if missing (needed for foreign key in public.profiles)
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-4000-8000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'demo.student@uconn.edu',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Demo Student"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'demo.operator@uconn.edu',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Demo Operator"}'::jsonb,
    now(),
    now()
  )
on conflict (id) do update set
  email = excluded.email,
  updated_at = now();

-- Insert or update public.profiles
insert into public.profiles (
  id,
  display_name,
  email,
  role,
  huskybucks_balance,
  flex_passes,
  dining_points,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-4000-8000-000000000001'::uuid,
    'Demo Student',
    'demo.student@uconn.edu',
    'student',
    50.00,
    10,
    120,
    now(),
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000002'::uuid,
    'Demo Operator',
    'demo.operator@uconn.edu',
    'staff',
    50.00,
    10,
    120,
    now(),
    now()
  )
on conflict (id) do update set
  display_name = excluded.display_name,
  email = excluded.email,
  role = excluded.role,
  huskybucks_balance = excluded.huskybucks_balance,
  flex_passes = excluded.flex_passes,
  dining_points = excluded.dining_points,
  updated_at = now();

-- ============================================================================
-- 2. LOCATIONS (3 venues)
-- ============================================================================
insert into public.locations (id, slug, name, building, hours_text, is_open)
values
  (
    '10000000-0000-4000-8000-000000000001'::uuid,
    'beanery',
    'The Beanery',
    'Benton Center',
    '7:30 AM – 4:00 PM',
    true
  ),
  (
    '10000000-0000-4000-8000-000000000002'::uuid,
    'bookworms',
    'Bookworms Cafe',
    'Homer Babbidge Library',
    '8:00 AM – 8:00 PM',
    true
  ),
  (
    '10000000-0000-4000-8000-000000000003'::uuid,
    'putnam',
    'Putnam Grab-and-Go',
    'Putnam Dining Hall',
    '7:00 AM – 2:00 PM',
    false
  )
on conflict (slug) do update set
  name = excluded.name,
  building = excluded.building,
  hours_text = excluded.hours_text,
  is_open = excluded.is_open,
  updated_at = now();

-- ============================================================================
-- 3. MENU ITEMS
-- ============================================================================

-- Clean out existing modifier options and groups for seeded items so re-running is clean
delete from public.modifier_groups
where menu_item_id in (
  select id from public.menu_items
  where location_id in (
    '10000000-0000-4000-8000-000000000001'::uuid,
    '10000000-0000-4000-8000-000000000002'::uuid,
    '10000000-0000-4000-8000-000000000003'::uuid
  )
);

-- THE BEANERY (5 items)
insert into public.menu_items (id, location_id, name, description, category, base_price, dietary_tags, is_available)
values
  (
    '20000000-0000-4000-8000-000000000101'::uuid,
    '10000000-0000-4000-8000-000000000001'::uuid,
    'Iced Vanilla Latte',
    'Espresso with cold milk and sweet Madagascar vanilla syrup.',
    'Beverages',
    4.75,
    array['vegetarian', 'gluten-free']::text[],
    true
  ),
  (
    '20000000-0000-4000-8000-000000000102'::uuid,
    '10000000-0000-4000-8000-000000000001'::uuid,
    'Cold Brew Coffee',
    'Smooth, slow-steeped cold brew served over ice.',
    'Beverages',
    3.75,
    array['vegan', 'gluten-free', 'dairy-free']::text[],
    true
  ),
  (
    '20000000-0000-4000-8000-000000000103'::uuid,
    '10000000-0000-4000-8000-000000000001'::uuid,
    'Drip Coffee',
    'Fresh-brewed house blend, served hot.',
    'Beverages',
    2.50,
    array['vegan', 'gluten-free', 'dairy-free']::text[],
    true
  ),
  (
    '20000000-0000-4000-8000-000000000104'::uuid,
    '10000000-0000-4000-8000-000000000001'::uuid,
    'Asiago Bagel Sandwich',
    'Toasted asiago bagel with egg, cheddar, and your choice of protein.',
    'Sandwiches',
    5.50,
    array['vegetarian']::text[],
    true
  ),
  (
    '20000000-0000-4000-8000-000000000105'::uuid,
    '10000000-0000-4000-8000-000000000001'::uuid,
    'Blueberry Muffin',
    'Freshly baked, bursting with wild blueberries.',
    'Bakery',
    2.75,
    array['vegetarian']::text[],
    true
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  base_price = excluded.base_price,
  dietary_tags = excluded.dietary_tags,
  is_available = excluded.is_available,
  updated_at = now();

-- BOOKWORMS CAFE (5 items)
insert into public.menu_items (id, location_id, name, description, category, base_price, dietary_tags, is_available)
values
  (
    '20000000-0000-4000-8000-000000000201'::uuid,
    '10000000-0000-4000-8000-000000000002'::uuid,
    'Turkey Avocado Wrap',
    'Sliced turkey, creamy avocado, romaine lettuce and tomato in a whole-wheat wrap.',
    'Sandwiches',
    7.25,
    array['dairy-free']::text[],
    true
  ),
  (
    '20000000-0000-4000-8000-000000000202'::uuid,
    '10000000-0000-4000-8000-000000000002'::uuid,
    'Hummus & Veggie Plate',
    'House-made hummus with sliced cucumber, carrots, and pita chips.',
    'Snacks',
    4.50,
    array['vegan', 'dairy-free', 'halal']::text[],
    true
  ),
  (
    '20000000-0000-4000-8000-000000000203'::uuid,
    '10000000-0000-4000-8000-000000000002'::uuid,
    'Matcha Latte',
    'Ceremonial grade matcha whisked with steamed milk.',
    'Beverages',
    5.00,
    array['vegetarian', 'gluten-free']::text[],
    true
  ),
  (
    '20000000-0000-4000-8000-000000000204'::uuid,
    '10000000-0000-4000-8000-000000000002'::uuid,
    'Dark Chocolate Almond Kind Bar',
    'Almond & dark chocolate flavored snack bar.',
    'Snacks',
    2.25,
    array['vegan', 'gluten-free']::text[],
    true
  ),
  (
    '20000000-0000-4000-8000-000000000205'::uuid,
    '10000000-0000-4000-8000-000000000002'::uuid,
    'Iced Spiced Chai Latte',
    'Black tea infused with cardamom, cinnamon, clove, ginger, and honey.',
    'Beverages',
    4.95,
    array['vegetarian', 'gluten-free']::text[],
    true
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  base_price = excluded.base_price,
  dietary_tags = excluded.dietary_tags,
  is_available = excluded.is_available,
  updated_at = now();

-- PUTNAM GRAB-AND-GO (4 items)
insert into public.menu_items (id, location_id, name, description, category, base_price, dietary_tags, is_available)
values
  (
    '20000000-0000-4000-8000-000000000301'::uuid,
    '10000000-0000-4000-8000-000000000003'::uuid,
    'Overnight Oats with Chia',
    'Creamy oats with chia seeds, banana, and honey.',
    'Grab-and-Go',
    3.50,
    array['vegetarian', 'gluten-free']::text[],
    true
  ),
  (
    '20000000-0000-4000-8000-000000000302'::uuid,
    '10000000-0000-4000-8000-000000000003'::uuid,
    'Greek Yogurt Berry Parfait',
    'Layered greek yogurt with house granola and mixed berry compote.',
    'Grab-and-Go',
    4.00,
    array['vegetarian', 'gluten-free']::text[],
    true
  ),
  (
    '20000000-0000-4000-8000-000000000303'::uuid,
    '10000000-0000-4000-8000-000000000003'::uuid,
    'Fresh Seasonal Fruit Cup',
    'Seasonal mixed fruit, freshly cut daily.',
    'Grab-and-Go',
    2.75,
    array['vegan', 'gluten-free', 'dairy-free', 'halal']::text[],
    true
  ),
  (
    '20000000-0000-4000-8000-000000000304'::uuid,
    '10000000-0000-4000-8000-000000000003'::uuid,
    'Protein Bistro Box',
    'Hard-boiled egg, sharp cheddar cheese slices, apple slices, and peanut butter.',
    'Grab-and-Go',
    5.25,
    array['vegetarian', 'gluten-free']::text[],
    true
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  base_price = excluded.base_price,
  dietary_tags = excluded.dietary_tags,
  is_available = excluded.is_available,
  updated_at = now();

-- ============================================================================
-- 4. MODIFIER GROUPS & MODIFIER OPTIONS
-- ============================================================================
-- Selection constraints from migration:
--   check (min_select <= max_select)
--   check (not is_required or min_select > 0)
-- When is_required = true, min_select must be >= 1.

-- ----------------------------------------------------------------------------
-- Item: Iced Vanilla Latte (item-101)
-- ----------------------------------------------------------------------------
-- Group 1: Size (Required, pick 1)
insert into public.modifier_groups (id, menu_item_id, name, is_required, min_select, max_select, sort_order)
values (
  '30000000-0000-4000-8000-000000000101'::uuid,
  '20000000-0000-4000-8000-000000000101'::uuid,
  'Size',
  true,
  1,
  1,
  1
);
insert into public.modifier_options (id, group_id, name, price_delta, is_available, sort_order)
values
  ('40000000-0000-4000-8000-000000000101'::uuid, '30000000-0000-4000-8000-000000000101'::uuid, 'Medium (16oz)', 0.00, true, 1),
  ('40000000-0000-4000-8000-000000000102'::uuid, '30000000-0000-4000-8000-000000000101'::uuid, 'Large (20oz)', 0.75, true, 2);

-- Group 2: Milk Alternative (Optional, pick up to 1)
insert into public.modifier_groups (id, menu_item_id, name, is_required, min_select, max_select, sort_order)
values (
  '30000000-0000-4000-8000-000000000102'::uuid,
  '20000000-0000-4000-8000-000000000101'::uuid,
  'Milk Alternative',
  false,
  0,
  1,
  2
);
insert into public.modifier_options (id, group_id, name, price_delta, is_available, sort_order)
values
  ('40000000-0000-4000-8000-000000000103'::uuid, '30000000-0000-4000-8000-000000000102'::uuid, 'Whole Milk', 0.00, true, 1),
  ('40000000-0000-4000-8000-000000000104'::uuid, '30000000-0000-4000-8000-000000000102'::uuid, 'Oat Milk', 0.80, true, 2),
  ('40000000-0000-4000-8000-000000000105'::uuid, '30000000-0000-4000-8000-000000000102'::uuid, 'Almond Milk', 0.80, true, 3);

-- Group 3: Add-ons (Optional, pick up to 3)
insert into public.modifier_groups (id, menu_item_id, name, is_required, min_select, max_select, sort_order)
values (
  '30000000-0000-4000-8000-000000000103'::uuid,
  '20000000-0000-4000-8000-000000000101'::uuid,
  'Add-ons',
  false,
  0,
  3,
  3
);
insert into public.modifier_options (id, group_id, name, price_delta, is_available, sort_order)
values
  ('40000000-0000-4000-8000-000000000106'::uuid, '30000000-0000-4000-8000-000000000103'::uuid, 'Extra Espresso Shot', 1.00, true, 1),
  ('40000000-0000-4000-8000-000000000107'::uuid, '30000000-0000-4000-8000-000000000103'::uuid, 'Vanilla Syrup', 0.50, true, 2),
  ('40000000-0000-4000-8000-000000000108'::uuid, '30000000-0000-4000-8000-000000000103'::uuid, 'Caramel Drizzle', 0.50, true, 3);

-- ----------------------------------------------------------------------------
-- Item: Cold Brew Coffee (item-102)
-- ----------------------------------------------------------------------------
insert into public.modifier_groups (id, menu_item_id, name, is_required, min_select, max_select, sort_order)
values (
  '30000000-0000-4000-8000-000000000104'::uuid,
  '20000000-0000-4000-8000-000000000102'::uuid,
  'Size',
  true,
  1,
  1,
  1
);
insert into public.modifier_options (id, group_id, name, price_delta, is_available, sort_order)
values
  ('40000000-0000-4000-8000-000000000109'::uuid, '30000000-0000-4000-8000-000000000104'::uuid, 'Medium (16oz)', 0.00, true, 1),
  ('40000000-0000-4000-8000-000000000110'::uuid, '30000000-0000-4000-8000-000000000104'::uuid, 'Large (20oz)', 0.60, true, 2);

-- ----------------------------------------------------------------------------
-- Item: Drip Coffee (item-103)
-- ----------------------------------------------------------------------------
insert into public.modifier_groups (id, menu_item_id, name, is_required, min_select, max_select, sort_order)
values (
  '30000000-0000-4000-8000-000000000105'::uuid,
  '20000000-0000-4000-8000-000000000103'::uuid,
  'Size',
  true,
  1,
  1,
  1
);
insert into public.modifier_options (id, group_id, name, price_delta, is_available, sort_order)
values
  ('40000000-0000-4000-8000-000000000111'::uuid, '30000000-0000-4000-8000-000000000105'::uuid, 'Small (12oz)', 0.00, true, 1),
  ('40000000-0000-4000-8000-000000000112'::uuid, '30000000-0000-4000-8000-000000000105'::uuid, 'Medium (16oz)', 0.60, true, 2),
  ('40000000-0000-4000-8000-000000000113'::uuid, '30000000-0000-4000-8000-000000000105'::uuid, 'Large (20oz)', 1.10, true, 3);

-- ----------------------------------------------------------------------------
-- Item: Asiago Bagel Sandwich (item-104)
-- ----------------------------------------------------------------------------
-- Group 1: Bagel Choice (Required, pick 1)
insert into public.modifier_groups (id, menu_item_id, name, is_required, min_select, max_select, sort_order)
values (
  '30000000-0000-4000-8000-000000000106'::uuid,
  '20000000-0000-4000-8000-000000000104'::uuid,
  'Bagel',
  true,
  1,
  1,
  1
);
insert into public.modifier_options (id, group_id, name, price_delta, is_available, sort_order)
values
  ('40000000-0000-4000-8000-000000000114'::uuid, '30000000-0000-4000-8000-000000000106'::uuid, 'Asiago', 0.00, true, 1),
  ('40000000-0000-4000-8000-000000000115'::uuid, '30000000-0000-4000-8000-000000000106'::uuid, 'Everything', 0.00, true, 2),
  ('40000000-0000-4000-8000-000000000116'::uuid, '30000000-0000-4000-8000-000000000106'::uuid, 'Plain', 0.00, true, 3);

-- Group 2: Protein (Optional, pick up to 1)
insert into public.modifier_groups (id, menu_item_id, name, is_required, min_select, max_select, sort_order)
values (
  '30000000-0000-4000-8000-000000000107'::uuid,
  '20000000-0000-4000-8000-000000000104'::uuid,
  'Protein',
  false,
  0,
  1,
  2
);
insert into public.modifier_options (id, group_id, name, price_delta, is_available, sort_order)
values
  ('40000000-0000-4000-8000-000000000117'::uuid, '30000000-0000-4000-8000-000000000107'::uuid, 'Bacon', 1.25, true, 1),
  ('40000000-0000-4000-8000-000000000118'::uuid, '30000000-0000-4000-8000-000000000107'::uuid, 'Sausage', 1.25, true, 2),
  ('40000000-0000-4000-8000-000000000119'::uuid, '30000000-0000-4000-8000-000000000107'::uuid, 'No Protein', 0.00, true, 3);

-- Group 3: Toast (Optional, pick up to 1)
insert into public.modifier_groups (id, menu_item_id, name, is_required, min_select, max_select, sort_order)
values (
  '30000000-0000-4000-8000-000000000108'::uuid,
  '20000000-0000-4000-8000-000000000104'::uuid,
  'Toast',
  false,
  0,
  1,
  3
);
insert into public.modifier_options (id, group_id, name, price_delta, is_available, sort_order)
values
  ('40000000-0000-4000-8000-000000000120'::uuid, '30000000-0000-4000-8000-000000000108'::uuid, 'Toasted', 0.00, true, 1),
  ('40000000-0000-4000-8000-000000000121'::uuid, '30000000-0000-4000-8000-000000000108'::uuid, 'Not Toasted', 0.00, true, 2);

-- ----------------------------------------------------------------------------
-- Item: Turkey Avocado Wrap (item-201)
-- ----------------------------------------------------------------------------
insert into public.modifier_groups (id, menu_item_id, name, is_required, min_select, max_select, sort_order)
values (
  '30000000-0000-4000-8000-000000000201'::uuid,
  '20000000-0000-4000-8000-000000000201'::uuid,
  'Wrap',
  true,
  1,
  1,
  1
);
insert into public.modifier_options (id, group_id, name, price_delta, is_available, sort_order)
values
  ('40000000-0000-4000-8000-000000000201'::uuid, '30000000-0000-4000-8000-000000000201'::uuid, 'Whole Wheat', 0.00, true, 1),
  ('40000000-0000-4000-8000-000000000202'::uuid, '30000000-0000-4000-8000-000000000201'::uuid, 'Spinach', 0.00, true, 2),
  ('40000000-0000-4000-8000-000000000203'::uuid, '30000000-0000-4000-8000-000000000201'::uuid, 'Plain Flour', 0.00, true, 3);

-- ----------------------------------------------------------------------------
-- Item: Matcha Latte (item-203)
-- ----------------------------------------------------------------------------
-- Group 1: Milk (Required, pick 1)
insert into public.modifier_groups (id, menu_item_id, name, is_required, min_select, max_select, sort_order)
values (
  '30000000-0000-4000-8000-000000000202'::uuid,
  '20000000-0000-4000-8000-000000000203'::uuid,
  'Milk',
  true,
  1,
  1,
  1
);
insert into public.modifier_options (id, group_id, name, price_delta, is_available, sort_order)
values
  ('40000000-0000-4000-8000-000000000204'::uuid, '30000000-0000-4000-8000-000000000202'::uuid, 'Whole Milk', 0.00, true, 1),
  ('40000000-0000-4000-8000-000000000205'::uuid, '30000000-0000-4000-8000-000000000202'::uuid, 'Oat Milk', 0.75, true, 2),
  ('40000000-0000-4000-8000-000000000206'::uuid, '30000000-0000-4000-8000-000000000202'::uuid, 'Almond Milk', 0.75, true, 3);

-- Group 2: Sweetness (Optional, pick up to 1)
insert into public.modifier_groups (id, menu_item_id, name, is_required, min_select, max_select, sort_order)
values (
  '30000000-0000-4000-8000-000000000203'::uuid,
  '20000000-0000-4000-8000-000000000203'::uuid,
  'Sweetness',
  false,
  0,
  1,
  2
);
insert into public.modifier_options (id, group_id, name, price_delta, is_available, sort_order)
values
  ('40000000-0000-4000-8000-000000000207'::uuid, '30000000-0000-4000-8000-000000000203'::uuid, 'Unsweetened', 0.00, true, 1),
  ('40000000-0000-4000-8000-000000000208'::uuid, '30000000-0000-4000-8000-000000000203'::uuid, 'Lightly Sweet', 0.00, true, 2),
  ('40000000-0000-4000-8000-000000000209'::uuid, '30000000-0000-4000-8000-000000000203'::uuid, 'Sweet', 0.00, true, 3);

-- ----------------------------------------------------------------------------
-- Item: Iced Spiced Chai Latte (item-205)
-- ----------------------------------------------------------------------------
insert into public.modifier_groups (id, menu_item_id, name, is_required, min_select, max_select, sort_order)
values (
  '30000000-0000-4000-8000-000000000204'::uuid,
  '20000000-0000-4000-8000-000000000205'::uuid,
  'Milk Choice',
  true,
  1,
  1,
  1
);
insert into public.modifier_options (id, group_id, name, price_delta, is_available, sort_order)
values
  ('40000000-0000-4000-8000-000000000210'::uuid, '30000000-0000-4000-8000-000000000204'::uuid, 'Whole Milk', 0.00, true, 1),
  ('40000000-0000-4000-8000-000000000211'::uuid, '30000000-0000-4000-8000-000000000204'::uuid, 'Oat Milk', 0.80, true, 2),
  ('40000000-0000-4000-8000-000000000212'::uuid, '30000000-0000-4000-8000-000000000204'::uuid, 'Almond Milk', 0.80, true, 3);

commit;
