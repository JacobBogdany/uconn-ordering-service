-- HuskyBite Milestone 2: atomic checkout (Vin / Slice 2).
--
-- Adds idempotency + collision-safe pickup codes and the `place_order` function
-- the API calls (service role only). The API prices the order with
-- `app/services/checkout_rules.py`; this function re-verifies availability,
-- selection rules and prices under row locks, then debits the balance and
-- inserts the order and line snapshots in ONE transaction. Any failure raises
-- and rolls everything back, so nothing is charged or inserted.

begin;

alter table public.orders
  add column if not exists idempotency_key text;

alter table public.order_items
  add column if not exists line_no integer not null default 0;

-- One order per (student, idempotency key): a repeated submit cannot double charge.
create unique index if not exists orders_user_idempotency_key_idx
  on public.orders (user_id, idempotency_key)
  where idempotency_key is not null;

-- Monotonic per-location counter. Pickup codes therefore never repeat at a
-- location, so the (location_id, pickup_code) unique constraint cannot collide.
create table if not exists public.pickup_counters (
  location_id uuid primary key references public.locations (id) on delete cascade,
  last_value integer not null default 0
);
alter table public.pickup_counters enable row level security; -- no policies: server only

-- Full receipt for one order (no balance). Shared by place_order and replays.
create or replace function public.order_snapshot(p_order_id uuid)
returns jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'order_id', o.id,
    'pickup_code', o.pickup_code,
    'status', o.status,
    'location_id', o.location_id,
    'location_name', l.name,
    'payment_method', o.payment_method,
    'total_amount', o.total_amount,
    'estimated_prep_minutes', o.estimated_prep_minutes,
    'created_at', o.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'menu_item_id', i.menu_item_id,
        'item_name', i.item_name,
        'quantity', i.quantity,
        'unit_price', i.unit_price,
        'line_total', i.quantity * i.unit_price,
        'selected_options', i.selected_options,
        'notes', i.notes
      ) order by i.line_no, i.id)
      from public.order_items i where i.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  join public.locations l on l.id = o.location_id
  where o.id = p_order_id;
$$;

-- Raises a contract error. SQLSTATE HB001; message = code, detail = text, hint = field.
create or replace function public.checkout_fail(p_code text, p_message text, p_field text)
returns void
language plpgsql
as $$
begin
  raise exception using errcode = 'HB001', message = p_code, detail = coalesce(p_message, ''), hint = coalesce(p_field, '');
end;
$$;

-- p_lines: [{menu_item_id, quantity, selected_option_ids[], notes, unit_price}]
-- unit_price is the API's expected price; it is verified, never trusted.
-- Errors use SQLSTATE 'HB001' with message = contract code
-- (VALIDATION_ERROR | NOT_FOUND | ITEM_UNAVAILABLE | INSUFFICIENT_BALANCE)
-- or STALE_CATALOG (menu changed since the API priced the order; caller retries).
create or replace function public.place_order(
  p_user_id uuid,
  p_location_id uuid,
  p_idempotency_key text,
  p_lines jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles%rowtype;
  v_location public.locations%rowtype;
  v_existing_id uuid;
  v_line jsonb;
  v_idx integer := 0;
  v_item public.menu_items%rowtype;
  v_qty integer;
  v_ids uuid[];
  v_found integer;
  v_bad_name text;
  v_unit numeric(10, 2);
  v_total numeric(10, 2) := 0;
  v_group public.modifier_groups%rowtype;
  v_count integer;
  v_snapshot jsonb;
  v_order_id uuid;
  v_seq integer;
  v_prefix text;
  v_code text;
  v_balance numeric(10, 2);
  v_priced jsonb := '[]'::jsonb;
begin
  if p_idempotency_key is null or length(p_idempotency_key) < 8 then
    perform public.checkout_fail('VALIDATION_ERROR', 'An idempotency key is required.', 'Idempotency-Key');
  end if;
  if jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines) = 0 then
    perform public.checkout_fail('VALIDATION_ERROR', 'An order needs at least one item.', 'items');
  end if;

  -- Serialises this student's checkouts (also makes the idempotency check race-free).
  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then
    perform public.checkout_fail('NOT_FOUND', 'No profile exists for this identity. Run the seed.', null);
  end if;

  select id into v_existing_id
  from public.orders
  where user_id = p_user_id and idempotency_key = p_idempotency_key;
  if found then
    return public.order_snapshot(v_existing_id) || jsonb_build_object(
      'replayed', true,
      'balance', jsonb_build_object(
        'payment_method', 'HUSKYBUCKS',
        'amount_charged', (select total_amount from public.orders where id = v_existing_id),
        'huskybucks_balance', v_profile.huskybucks_balance
      )
    );
  end if;

  select * into v_location from public.locations where id = p_location_id for share;
  if not found then
    perform public.checkout_fail('NOT_FOUND', 'Pickup location not found.', 'location_id');
  end if;
  if not v_location.is_open then
    perform public.checkout_fail('ITEM_UNAVAILABLE', v_location.name || ' is not accepting orders right now.', 'location_id');
  end if;

  v_order_id := gen_random_uuid();

  for v_line in select value from jsonb_array_elements(p_lines) loop
    v_qty := (v_line->>'quantity')::integer;
    if v_qty is null or v_qty < 1 then
      perform public.checkout_fail('VALIDATION_ERROR', 'Quantity must be at least 1.', 'items[' || v_idx || '].quantity');
    end if;

    select * into v_item from public.menu_items
    where id = (v_line->>'menu_item_id')::uuid for share;
    if not found then
      perform public.checkout_fail('NOT_FOUND', 'Menu item not found.', 'items[' || v_idx || '].menu_item_id');
    end if;
    if v_item.location_id <> p_location_id then
      perform public.checkout_fail('VALIDATION_ERROR', v_item.name || ' is not sold at ' || v_location.name || '.', 'items[' || v_idx || '].menu_item_id');
    end if;
    if not v_item.is_available then
      perform public.checkout_fail('ITEM_UNAVAILABLE', v_item.name || ' is currently unavailable.', 'items[' || v_idx || ']');
    end if;

    select coalesce(array_agg(x::uuid), '{}') into v_ids
    from jsonb_array_elements_text(coalesce(v_line->'selected_option_ids', '[]'::jsonb)) x;

    -- Lock the chosen options so availability/price cannot change under us.
    perform 1 from public.modifier_options where id = any (v_ids) for share;

    select count(*) into v_found
    from public.modifier_options o
    join public.modifier_groups g on g.id = o.group_id
    where o.id = any (v_ids) and g.menu_item_id = v_item.id;
    if v_found <> coalesce(array_length(v_ids, 1), 0) then
      perform public.checkout_fail('STALE_CATALOG', 'Options changed.', 'items[' || v_idx || '].selected_option_ids');
    end if;

    select o.name into v_bad_name
    from public.modifier_options o
    where o.id = any (v_ids) and not o.is_available
    limit 1;
    if found then
      perform public.checkout_fail('ITEM_UNAVAILABLE', v_bad_name || ' is currently unavailable.', 'items[' || v_idx || '].selected_option_ids');
    end if;

    -- Selection rules per group (effective min = max(min_select, required ? 1 : 0)).
    for v_group in select * from public.modifier_groups where menu_item_id = v_item.id loop
      select count(*) into v_count
      from public.modifier_options o
      where o.id = any (v_ids) and o.group_id = v_group.id;
      if v_count < greatest(v_group.min_select, case when v_group.is_required then 1 else 0 end)
         or v_count > v_group.max_select then
        perform public.checkout_fail('STALE_CATALOG', 'Selection rules changed.', 'items[' || v_idx || '].selected_option_ids');
      end if;
    end loop;

    select v_item.base_price + coalesce(sum(o.price_delta), 0) into v_unit
    from public.modifier_options o where o.id = any (v_ids);
    if v_unit < 0 or v_unit is distinct from round((v_line->>'unit_price')::numeric, 2) then
      perform public.checkout_fail('STALE_CATALOG', 'Prices changed.', 'items[' || v_idx || ']');
    end if;

    select coalesce(jsonb_agg(jsonb_build_object(
             'option_id', o.id, 'group_name', g.name, 'name', o.name, 'price_delta', o.price_delta
           ) order by g.sort_order, g.name, o.sort_order, o.name), '[]'::jsonb)
      into v_snapshot
    from public.modifier_options o
    join public.modifier_groups g on g.id = o.group_id
    where o.id = any (v_ids);

    v_priced := v_priced || jsonb_build_object(
      'line_no', v_idx, 'menu_item_id', v_item.id, 'item_name', v_item.name,
      'quantity', v_qty, 'unit_price', v_unit, 'selected_options', v_snapshot,
      'notes', nullif(left(btrim(v_line->>'notes'), 200), '')
    );
    v_total := v_total + v_qty * v_unit;
    v_idx := v_idx + 1;
  end loop;

  -- Conditional debit: cannot overdraw even if the lock above were bypassed.
  update public.profiles
     set huskybucks_balance = huskybucks_balance - v_total
   where id = p_user_id and huskybucks_balance >= v_total
  returning huskybucks_balance into v_balance;
  if not found then
    perform public.checkout_fail(
      'INSUFFICIENT_BALANCE',
      'Order total $' || v_total || ' exceeds HuskyBucks balance $' || v_profile.huskybucks_balance || '.',
      null
    );
  end if;

  insert into public.pickup_counters as c (location_id, last_value)
  values (p_location_id, 1)
  on conflict (location_id) do update set last_value = c.last_value + 1
  returning last_value into v_seq;
  v_prefix := case v_location.slug
    when 'beanery' then 'B' when 'bookworms' then 'BW' when 'putnam' then 'P'
    else upper(left(regexp_replace(v_location.slug, '[^a-zA-Z0-9]', '', 'g'), 2))
  end;
  v_code := '#' || v_prefix || '-' || (100 + v_seq);

  insert into public.orders (id, user_id, location_id, status, payment_method,
                             total_amount, pickup_code, idempotency_key)
  values (v_order_id, p_user_id, p_location_id, 'RECEIVED', 'HUSKYBUCKS',
          v_total, v_code, p_idempotency_key);

  insert into public.order_items (order_id, menu_item_id, item_name, quantity,
                                  unit_price, selected_options, notes, line_no)
  select v_order_id, r.menu_item_id, r.item_name, r.quantity, r.unit_price,
         r.selected_options, r.notes, r.line_no
  from jsonb_to_recordset(v_priced) as r(
    line_no integer, menu_item_id uuid, item_name text, quantity integer,
    unit_price numeric, selected_options jsonb, notes text
  );

  return public.order_snapshot(v_order_id) || jsonb_build_object(
    'replayed', false,
    'balance', jsonb_build_object(
      'payment_method', 'HUSKYBUCKS',
      'amount_charged', v_total,
      'huskybucks_balance', v_balance
    )
  );
end;
$$;

revoke all on function public.place_order(uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.order_snapshot(uuid) from public, anon, authenticated;
grant execute on function public.place_order(uuid, uuid, text, jsonb) to service_role;
grant execute on function public.order_snapshot(uuid) to service_role;

commit;
