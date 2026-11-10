-- HuskyBite initial Supabase schema. Apply in the Supabase SQL Editor or via
-- `supabase db push` after configuring the project. API writes use a server-side
-- service role key kept only in Render secrets; never put it in VITE_* config.

begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  email text unique,
  role text not null default 'student'
    check (role in ('student', 'faculty', 'staff', 'admin')),
  huskybucks_balance numeric(10, 2) not null default 50.00
    check (huskybucks_balance >= 0),
  flex_passes integer not null default 10 check (flex_passes >= 0),
  dining_points integer not null default 120 check (dining_points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.locations (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique,
  name text not null,
  building text not null,
  hours_text text,
  is_open boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_items (
  id uuid primary key default extensions.gen_random_uuid(),
  location_id uuid not null references public.locations (id),
  name text not null,
  description text,
  category text not null,
  base_price numeric(10, 2) not null check (base_price >= 0),
  dietary_tags text[] not null default '{}',
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.modifier_groups (
  id uuid primary key default extensions.gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  name text not null,
  is_required boolean not null default false,
  min_select integer not null default 0 check (min_select >= 0),
  max_select integer not null default 1 check (max_select > 0),
  sort_order integer not null default 0,
  constraint modifier_group_selection_range check (min_select <= max_select),
  constraint modifier_group_required_selection check (not is_required or min_select > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.modifier_options (
  id uuid primary key default extensions.gen_random_uuid(),
  group_id uuid not null references public.modifier_groups (id) on delete cascade,
  name text not null,
  price_delta numeric(10, 2) not null default 0,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  location_id uuid not null references public.locations (id),
  status text not null default 'RECEIVED'
    check (status in ('RECEIVED', 'PREPPING', 'READY', 'COMPLETED', 'CANCELLED')),
  payment_method text not null
    check (payment_method in ('HUSKYBUCKS', 'FLEX_PASS', 'POINTS')),
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  pickup_code text not null,
  estimated_prep_minutes integer not null default 10 check (estimated_prep_minutes > 0),
  created_at timestamptz not null default now(),
  prepping_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  constraint orders_pickup_code_per_location unique (location_id, pickup_code)
);

create table if not exists public.order_items (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  menu_item_id uuid references public.menu_items (id) on delete set null,
  item_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  -- Snapshot array, e.g. [{"name":"Oat milk","price_delta":0.75}].
  selected_options jsonb not null default '[]'::jsonb
    check (jsonb_typeof(selected_options) = 'array'),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists menu_items_location_idx on public.menu_items (location_id);
create index if not exists menu_items_available_idx on public.menu_items (location_id, is_available);
create index if not exists modifier_groups_item_idx on public.modifier_groups (menu_item_id, sort_order);
create index if not exists modifier_options_group_idx on public.modifier_options (group_id, sort_order);
create index if not exists orders_user_created_idx on public.orders (user_id, created_at desc);
create index if not exists orders_queue_idx on public.orders (location_id, status, created_at);
create index if not exists order_items_order_idx on public.order_items (order_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists locations_set_updated_at on public.locations;
create trigger locations_set_updated_at before update on public.locations
for each row execute function public.set_updated_at();
drop trigger if exists menu_items_set_updated_at on public.menu_items;
create trigger menu_items_set_updated_at before update on public.menu_items
for each row execute function public.set_updated_at();
drop trigger if exists modifier_groups_set_updated_at on public.modifier_groups;
create trigger modifier_groups_set_updated_at before update on public.modifier_groups
for each row execute function public.set_updated_at();
drop trigger if exists modifier_options_set_updated_at on public.modifier_options;
create trigger modifier_options_set_updated_at before update on public.modifier_options
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.menu_items enable row level security;
alter table public.modifier_groups enable row level security;
alter table public.modifier_options enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Public catalog reads. All catalog writes are performed by the trusted API.
drop policy if exists locations_public_read on public.locations;
create policy locations_public_read on public.locations
for select to anon, authenticated using (true);
drop policy if exists menu_items_public_read on public.menu_items;
create policy menu_items_public_read on public.menu_items
for select to anon, authenticated using (true);
drop policy if exists modifier_groups_public_read on public.modifier_groups;
create policy modifier_groups_public_read on public.modifier_groups
for select to anon, authenticated using (true);
drop policy if exists modifier_options_public_read on public.modifier_options;
create policy modifier_options_public_read on public.modifier_options
for select to anon, authenticated using (true);

-- Authenticated users may read only their own profile and orders. The API
-- validates staff access and performs all writes using trusted server credentials.
drop policy if exists profiles_read_self on public.profiles;
create policy profiles_read_self on public.profiles
for select to authenticated using (id = (select auth.uid()));
drop policy if exists orders_read_owner on public.orders;
create policy orders_read_owner on public.orders
for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists order_items_read_owner on public.order_items;
create policy order_items_read_owner on public.order_items
for select to authenticated using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id and o.user_id = (select auth.uid())
  )
);

commit;
