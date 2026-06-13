do $$
begin
  create type public.shopping_item_status as enum (
    'needed',
    'in_cart',
    'purchased',
    'removed'
  );
exception
  when duplicate_object then null;
end;
$$;

create unique index if not exists shopping_lists_id_household_unique_idx
on public.shopping_lists(id, household_id);

create unique index if not exists shopping_lists_household_name_active_unique_idx
on public.shopping_lists(household_id, lower(name))
where archived_at is null;

create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  shopping_list_id uuid not null,
  name text not null,
  quantity numeric,
  unit text,
  category_id uuid,
  note text,
  status public.shopping_item_status not null default 'needed',
  assigned_to uuid references public.profiles(id) on delete set null,
  added_by uuid not null references public.profiles(id) on delete restrict,
  completed_by uuid references public.profiles(id) on delete restrict,
  completed_at timestamptz,
  recurring_hint boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint shopping_items_list_household_fk foreign key (
    shopping_list_id,
    household_id
  ) references public.shopping_lists(id, household_id) on delete cascade,
  constraint shopping_items_name_length_check check (
    char_length(trim(name)) between 1 and 160
  ),
  constraint shopping_items_quantity_check check (
    quantity is null or (quantity > 0 and quantity <= 999999)
  ),
  constraint shopping_items_unit_length_check check (
    unit is null or char_length(trim(unit)) between 1 and 40
  ),
  constraint shopping_items_note_length_check check (
    note is null or char_length(note) <= 1000
  ),
  constraint shopping_items_completion_state_check check (
    (
      status in ('purchased', 'removed')
      and completed_at is not null
      and completed_by is not null
    )
    or (
      status in ('needed', 'in_cart')
      and completed_at is null
      and completed_by is null
    )
  )
);

create index if not exists shopping_items_household_list_status_idx
on public.shopping_items(household_id, shopping_list_id, status);

create index if not exists shopping_items_household_status_idx
on public.shopping_items(household_id, status, created_at desc);

create index if not exists shopping_items_household_purchased_idx
on public.shopping_items(household_id, completed_at desc)
where status = 'purchased';

create index if not exists shopping_items_household_assigned_status_idx
on public.shopping_items(household_id, assigned_to, status);

drop trigger if exists set_shopping_items_updated_at on public.shopping_items;
create trigger set_shopping_items_updated_at
before update on public.shopping_items
for each row
execute function public.set_updated_at();

create or replace function public.create_shopping_list(
  target_household_id uuid,
  list_name text
)
returns public.shopping_lists
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
  normalized_name text := nullif(trim(list_name), '');
  created_list public.shopping_lists;
begin
  if acting_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not public.is_household_member(target_household_id) then
    raise exception 'Household access required' using errcode = '42501';
  end if;

  if normalized_name is null or char_length(normalized_name) > 120 then
    raise exception 'Invalid shopping list name' using errcode = '22023';
  end if;

  insert into public.shopping_lists (
    household_id,
    name,
    is_default,
    created_by
  )
  values (
    target_household_id,
    normalized_name,
    false,
    acting_user_id
  )
  returning *
  into created_list;

  perform public.record_activity_event(
    created_list.household_id,
    acting_user_id,
    'shopping_list',
    created_list.id,
    'shopping_list.created',
    'Created shopping list "' || created_list.name || '".',
    jsonb_build_object('shoppingListId', created_list.id)
  );

  return created_list;
end;
$$;

create or replace function public.update_shopping_list(
  target_list_id uuid,
  list_name text
)
returns public.shopping_lists
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
  existing_list public.shopping_lists;
  updated_list public.shopping_lists;
  normalized_name text := nullif(trim(list_name), '');
begin
  if acting_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select *
  into existing_list
  from public.shopping_lists
  where id = target_list_id
    and archived_at is null
  for update;

  if existing_list.id is null then
    raise exception 'Shopping list not found' using errcode = '22023';
  end if;

  if not public.is_household_member(existing_list.household_id) then
    raise exception 'Household access required' using errcode = '42501';
  end if;

  if normalized_name is null or char_length(normalized_name) > 120 then
    raise exception 'Invalid shopping list name' using errcode = '22023';
  end if;

  update public.shopping_lists
  set name = normalized_name
  where id = existing_list.id
  returning *
  into updated_list;

  perform public.record_activity_event(
    updated_list.household_id,
    acting_user_id,
    'shopping_list',
    updated_list.id,
    'shopping_list.updated',
    'Updated shopping list "' || updated_list.name || '".',
    jsonb_build_object('shoppingListId', updated_list.id)
  );

  return updated_list;
end;
$$;

create or replace function public.set_default_shopping_list(target_list_id uuid)
returns public.shopping_lists
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
  target_list public.shopping_lists;
begin
  if acting_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select *
  into target_list
  from public.shopping_lists
  where id = target_list_id
    and archived_at is null
  for update;

  if target_list.id is null then
    raise exception 'Shopping list not found' using errcode = '22023';
  end if;

  if not public.is_household_member(target_list.household_id) then
    raise exception 'Household access required' using errcode = '42501';
  end if;

  update public.shopping_lists
  set is_default = false
  where household_id = target_list.household_id
    and id <> target_list.id
    and archived_at is null;

  update public.shopping_lists
  set is_default = true
  where id = target_list.id
  returning *
  into target_list;

  perform public.record_activity_event(
    target_list.household_id,
    acting_user_id,
    'shopping_list',
    target_list.id,
    'shopping_list.default_set',
    'Set "' || target_list.name || '" as the default shopping list.',
    jsonb_build_object('shoppingListId', target_list.id)
  );

  return target_list;
end;
$$;

create or replace function public.archive_shopping_list(target_list_id uuid)
returns public.shopping_lists
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
  existing_list public.shopping_lists;
  archived_list public.shopping_lists;
begin
  if acting_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select *
  into existing_list
  from public.shopping_lists
  where id = target_list_id
    and archived_at is null
  for update;

  if existing_list.id is null then
    raise exception 'Shopping list not found' using errcode = '22023';
  end if;

  if not public.is_household_member(existing_list.household_id) then
    raise exception 'Household access required' using errcode = '42501';
  end if;

  if existing_list.is_default then
    raise exception 'Default shopping lists cannot be archived' using errcode = '22023';
  end if;

  update public.shopping_lists
  set archived_at = timezone('utc', now())
  where id = existing_list.id
  returning *
  into archived_list;

  perform public.record_activity_event(
    archived_list.household_id,
    acting_user_id,
    'shopping_list',
    archived_list.id,
    'shopping_list.archived',
    'Archived shopping list "' || archived_list.name || '".',
    jsonb_build_object('shoppingListId', archived_list.id)
  );

  return archived_list;
end;
$$;

create or replace function public.create_shopping_item(
  target_list_id uuid,
  item_name text,
  item_quantity numeric default null,
  item_unit text default null,
  item_note text default null,
  item_assigned_to uuid default null,
  item_recurring_hint boolean default false
)
returns public.shopping_items
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
  target_list public.shopping_lists;
  normalized_name text := nullif(trim(item_name), '');
  normalized_unit text := nullif(trim(item_unit), '');
  normalized_note text := nullif(trim(item_note), '');
  created_item public.shopping_items;
begin
  if acting_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select *
  into target_list
  from public.shopping_lists
  where id = target_list_id
    and archived_at is null;

  if target_list.id is null then
    raise exception 'Shopping list not found' using errcode = '22023';
  end if;

  if not public.is_household_member(target_list.household_id) then
    raise exception 'Household access required' using errcode = '42501';
  end if;

  if normalized_name is null or char_length(normalized_name) > 160 then
    raise exception 'Invalid shopping item name' using errcode = '22023';
  end if;

  if item_quantity is not null and (item_quantity <= 0 or item_quantity > 999999) then
    raise exception 'Invalid shopping item quantity' using errcode = '22023';
  end if;

  if normalized_unit is not null and char_length(normalized_unit) > 40 then
    raise exception 'Invalid shopping item unit' using errcode = '22023';
  end if;

  if normalized_note is not null and char_length(normalized_note) > 1000 then
    raise exception 'Invalid shopping item note' using errcode = '22023';
  end if;

  if item_assigned_to is not null
    and not public.is_active_household_member(target_list.household_id, item_assigned_to)
  then
    raise exception 'Assignee must be an active household member' using errcode = '42501';
  end if;

  insert into public.shopping_items (
    household_id,
    shopping_list_id,
    name,
    quantity,
    unit,
    note,
    assigned_to,
    added_by,
    recurring_hint
  )
  values (
    target_list.household_id,
    target_list.id,
    normalized_name,
    item_quantity,
    normalized_unit,
    normalized_note,
    item_assigned_to,
    acting_user_id,
    coalesce(item_recurring_hint, false)
  )
  returning *
  into created_item;

  perform public.record_activity_event(
    created_item.household_id,
    acting_user_id,
    'shopping_item',
    created_item.id,
    'shopping_item.created',
    'Added "' || created_item.name || '" to shopping.',
    jsonb_build_object('shoppingItemId', created_item.id, 'shoppingListId', created_item.shopping_list_id)
  );

  return created_item;
end;
$$;

create or replace function public.update_shopping_item(
  target_item_id uuid,
  item_name text,
  item_quantity numeric default null,
  item_unit text default null,
  item_note text default null,
  item_assigned_to uuid default null,
  item_recurring_hint boolean default false
)
returns public.shopping_items
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
  existing_item public.shopping_items;
  updated_item public.shopping_items;
  normalized_name text := nullif(trim(item_name), '');
  normalized_unit text := nullif(trim(item_unit), '');
  normalized_note text := nullif(trim(item_note), '');
begin
  if acting_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select *
  into existing_item
  from public.shopping_items
  where id = target_item_id
  for update;

  if existing_item.id is null then
    raise exception 'Shopping item not found' using errcode = '22023';
  end if;

  if not public.is_household_member(existing_item.household_id) then
    raise exception 'Household access required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.shopping_lists list
    where list.id = existing_item.shopping_list_id
      and list.household_id = existing_item.household_id
      and list.archived_at is null
  ) then
    raise exception 'Shopping list not found' using errcode = '22023';
  end if;

  if existing_item.status in ('purchased', 'removed') then
    raise exception 'Completed shopping items cannot be edited' using errcode = '22023';
  end if;

  if normalized_name is null or char_length(normalized_name) > 160 then
    raise exception 'Invalid shopping item name' using errcode = '22023';
  end if;

  if item_quantity is not null and (item_quantity <= 0 or item_quantity > 999999) then
    raise exception 'Invalid shopping item quantity' using errcode = '22023';
  end if;

  if normalized_unit is not null and char_length(normalized_unit) > 40 then
    raise exception 'Invalid shopping item unit' using errcode = '22023';
  end if;

  if normalized_note is not null and char_length(normalized_note) > 1000 then
    raise exception 'Invalid shopping item note' using errcode = '22023';
  end if;

  if item_assigned_to is not null
    and not public.is_active_household_member(existing_item.household_id, item_assigned_to)
  then
    raise exception 'Assignee must be an active household member' using errcode = '42501';
  end if;

  update public.shopping_items
  set
    name = normalized_name,
    quantity = item_quantity,
    unit = normalized_unit,
    note = normalized_note,
    assigned_to = item_assigned_to,
    recurring_hint = coalesce(item_recurring_hint, false)
  where id = existing_item.id
  returning *
  into updated_item;

  perform public.record_activity_event(
    updated_item.household_id,
    acting_user_id,
    'shopping_item',
    updated_item.id,
    'shopping_item.updated',
    'Updated shopping item "' || updated_item.name || '".',
    jsonb_build_object('shoppingItemId', updated_item.id, 'shoppingListId', updated_item.shopping_list_id)
  );

  return updated_item;
end;
$$;

create or replace function public.set_shopping_item_status(
  target_item_id uuid,
  item_status public.shopping_item_status
)
returns public.shopping_items
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
  existing_item public.shopping_items;
  updated_item public.shopping_items;
  activity_action text;
  activity_summary text;
begin
  if acting_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select *
  into existing_item
  from public.shopping_items
  where id = target_item_id
  for update;

  if existing_item.id is null then
    raise exception 'Shopping item not found' using errcode = '22023';
  end if;

  if not public.is_household_member(existing_item.household_id) then
    raise exception 'Household access required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.shopping_lists list
    where list.id = existing_item.shopping_list_id
      and list.household_id = existing_item.household_id
      and list.archived_at is null
  ) then
    raise exception 'Shopping list not found' using errcode = '22023';
  end if;

  if existing_item.status = item_status then
    return existing_item;
  end if;

  if existing_item.status in ('purchased', 'removed')
    and item_status in ('needed', 'in_cart')
  then
    raise exception 'Completed shopping items cannot be reopened' using errcode = '22023';
  end if;

  update public.shopping_items
  set
    status = item_status,
    completed_by = case
      when item_status in ('purchased', 'removed') then acting_user_id
      else null
    end,
    completed_at = case
      when item_status in ('purchased', 'removed') then timezone('utc', now())
      else null
    end
  where id = existing_item.id
  returning *
  into updated_item;

  activity_action := case
    when item_status = 'purchased' then 'shopping_item.purchased'
    when item_status = 'removed' then 'shopping_item.removed'
    else 'shopping_item.status_changed'
  end;
  activity_summary := case
    when item_status = 'purchased' then 'Purchased "' || updated_item.name || '".'
    when item_status = 'removed' then 'Removed "' || updated_item.name || '" from shopping.'
    when item_status = 'in_cart' then 'Marked "' || updated_item.name || '" as in cart.'
    else 'Marked "' || updated_item.name || '" as needed.'
  end;

  perform public.record_activity_event(
    updated_item.household_id,
    acting_user_id,
    'shopping_item',
    updated_item.id,
    activity_action,
    activity_summary,
    jsonb_build_object('shoppingItemId', updated_item.id, 'shoppingListId', updated_item.shopping_list_id)
  );

  return updated_item;
end;
$$;

create or replace function public.readd_shopping_item(target_item_id uuid)
returns public.shopping_items
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
  existing_item public.shopping_items;
  target_list public.shopping_lists;
  new_assignee uuid;
  created_item public.shopping_items;
begin
  if acting_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select *
  into existing_item
  from public.shopping_items
  where id = target_item_id;

  if existing_item.id is null or existing_item.status <> 'purchased' then
    raise exception 'Purchased shopping item not found' using errcode = '22023';
  end if;

  if not public.is_household_member(existing_item.household_id) then
    raise exception 'Household access required' using errcode = '42501';
  end if;

  select *
  into target_list
  from public.shopping_lists
  where id = existing_item.shopping_list_id
    and archived_at is null;

  if target_list.id is null then
    select *
    into target_list
    from public.shopping_lists
    where household_id = existing_item.household_id
      and is_default
      and archived_at is null
    limit 1;
  end if;

  if target_list.id is null then
    raise exception 'Shopping list not found' using errcode = '22023';
  end if;

  new_assignee := case
    when existing_item.assigned_to is not null
      and public.is_active_household_member(existing_item.household_id, existing_item.assigned_to)
    then existing_item.assigned_to
    else null
  end;

  insert into public.shopping_items (
    household_id,
    shopping_list_id,
    name,
    quantity,
    unit,
    note,
    assigned_to,
    added_by,
    recurring_hint
  )
  values (
    target_list.household_id,
    target_list.id,
    existing_item.name,
    existing_item.quantity,
    existing_item.unit,
    existing_item.note,
    new_assignee,
    acting_user_id,
    existing_item.recurring_hint
  )
  returning *
  into created_item;

  perform public.record_activity_event(
    created_item.household_id,
    acting_user_id,
    'shopping_item',
    created_item.id,
    'shopping_item.readded',
    'Added "' || created_item.name || '" back to shopping.',
    jsonb_build_object(
      'shoppingItemId',
      created_item.id,
      'sourceShoppingItemId',
      existing_item.id,
      'shoppingListId',
      created_item.shopping_list_id
    )
  );

  return created_item;
end;
$$;

alter table public.shopping_items enable row level security;

drop policy if exists "Shopping items are readable by active household members" on public.shopping_items;
create policy "Shopping items are readable by active household members"
on public.shopping_items
for select
to authenticated
using (public.is_household_member(household_id));

revoke all on table public.shopping_items from anon;
revoke all on table public.shopping_items from authenticated;
grant select on table public.shopping_items to authenticated;

revoke all on function public.create_shopping_list(uuid, text) from public;
revoke all on function public.update_shopping_list(uuid, text) from public;
revoke all on function public.set_default_shopping_list(uuid) from public;
revoke all on function public.archive_shopping_list(uuid) from public;
revoke all on function public.create_shopping_item(uuid, text, numeric, text, text, uuid, boolean) from public;
revoke all on function public.update_shopping_item(uuid, text, numeric, text, text, uuid, boolean) from public;
revoke all on function public.set_shopping_item_status(uuid, public.shopping_item_status) from public;
revoke all on function public.readd_shopping_item(uuid) from public;

grant execute on function public.create_shopping_list(uuid, text) to authenticated;
grant execute on function public.update_shopping_list(uuid, text) to authenticated;
grant execute on function public.set_default_shopping_list(uuid) to authenticated;
grant execute on function public.archive_shopping_list(uuid) to authenticated;
grant execute on function public.create_shopping_item(uuid, text, numeric, text, text, uuid, boolean) to authenticated;
grant execute on function public.update_shopping_item(uuid, text, numeric, text, text, uuid, boolean) to authenticated;
grant execute on function public.set_shopping_item_status(uuid, public.shopping_item_status) to authenticated;
grant execute on function public.readd_shopping_item(uuid) to authenticated;
