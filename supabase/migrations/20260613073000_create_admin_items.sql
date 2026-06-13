do $$
begin
  create type public.admin_item_type as enum (
    'bill',
    'subscription',
    'renewal',
    'expiration',
    'return_window',
    'maintenance',
    'contract',
    'appointment',
    'other'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.admin_item_status as enum (
    'upcoming',
    'needs_review',
    'waiting',
    'paid',
    'renewed',
    'completed',
    'cancelled',
    'overdue'
  );
exception
  when duplicate_object then null;
end;
$$;

create or replace function public.calculate_next_admin_occurrence_date(
  item_due_date date,
  item_action_date date,
  item_expiry_date date,
  rule text
)
returns date
language sql
immutable
set search_path = public
as $$
  select public.calculate_next_task_due_date(
    coalesce(item_due_date, item_action_date, item_expiry_date),
    rule
  );
$$;

create table if not exists public.admin_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  type public.admin_item_type not null,
  title text not null,
  description text,
  category_id uuid,
  status public.admin_item_status not null default 'upcoming',
  owner_id uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  provider_name text,
  reference_number text,
  amount_minor bigint,
  currency_code char(3),
  due_date date,
  action_date date,
  expiry_date date,
  paid_at timestamptz,
  auto_pay boolean not null default false,
  recurrence_rule text,
  recurrence_timezone text,
  recurrence_source_id uuid references public.admin_items(id) on delete set null,
  next_occurrence_date date,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint admin_items_title_length_check check (
    char_length(trim(title)) between 1 and 160
  ),
  constraint admin_items_description_length_check check (
    description is null or char_length(description) <= 2000
  ),
  constraint admin_items_provider_length_check check (
    provider_name is null or char_length(trim(provider_name)) between 1 and 160
  ),
  constraint admin_items_reference_length_check check (
    reference_number is null or char_length(trim(reference_number)) between 1 and 160
  ),
  constraint admin_items_notes_length_check check (
    notes is null or char_length(notes) <= 4000
  ),
  constraint admin_items_amount_check check (
    amount_minor is null or amount_minor >= 0
  ),
  constraint admin_items_currency_code_check check (
    currency_code is null or currency_code ~ '^[A-Z]{3}$'
  ),
  constraint admin_items_money_pair_check check (
    (
      amount_minor is null
      and currency_code is null
    )
    or (
      amount_minor is not null
      and currency_code is not null
    )
  ),
  constraint admin_items_paid_state_check check (
    (
      status = 'paid'
      and paid_at is not null
    )
    or (
      status <> 'paid'
      and paid_at is null
    )
  ),
  constraint admin_items_recurrence_rule_valid_check check (
    public.is_valid_task_recurrence_rule(recurrence_rule)
  ),
  constraint admin_items_recurrence_anchor_check check (
    recurrence_rule is null
    or coalesce(due_date, action_date, expiry_date) is not null
  ),
  constraint admin_items_recurrence_timezone_check check (
    (
      recurrence_rule is null
      and recurrence_timezone is null
    )
    or (
      recurrence_rule is not null
      and recurrence_timezone is not null
      and char_length(trim(recurrence_timezone)) between 1 and 100
    )
  )
);

create table if not exists public.admin_item_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  admin_item_id uuid not null references public.admin_items(id) on delete cascade,
  event_type text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  occurred_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint admin_item_events_type_length_check check (
    char_length(trim(event_type)) between 1 and 80
  ),
  constraint admin_item_events_metadata_object_check check (
    jsonb_typeof(metadata) = 'object'
  )
);

create index if not exists admin_items_household_status_due_idx
on public.admin_items(household_id, status, due_date)
where archived_at is null;

create index if not exists admin_items_household_action_idx
on public.admin_items(household_id, action_date)
where archived_at is null and action_date is not null;

create index if not exists admin_items_household_expiry_idx
on public.admin_items(household_id, expiry_date)
where archived_at is null and expiry_date is not null;

create index if not exists admin_items_household_next_occurrence_idx
on public.admin_items(household_id, next_occurrence_date)
where archived_at is null and next_occurrence_date is not null;

create index if not exists admin_items_household_owner_status_idx
on public.admin_items(household_id, owner_id, status)
where archived_at is null and owner_id is not null;

create unique index if not exists admin_items_recurrence_source_date_unique_idx
on public.admin_items(
  household_id,
  recurrence_source_id,
  coalesce(due_date, action_date, expiry_date)
)
where recurrence_source_id is not null and archived_at is null;

create index if not exists admin_item_events_item_occurred_idx
on public.admin_item_events(admin_item_id, occurred_at desc);

drop trigger if exists set_admin_items_updated_at on public.admin_items;
create trigger set_admin_items_updated_at
before update on public.admin_items
for each row
execute function public.set_updated_at();

drop trigger if exists set_admin_item_events_updated_at on public.admin_item_events;
create trigger set_admin_item_events_updated_at
before update on public.admin_item_events
for each row
execute function public.set_updated_at();

create or replace function public.record_admin_item_event(
  target_household_id uuid,
  target_admin_item_id uuid,
  target_event_type text,
  target_actor_id uuid,
  target_metadata jsonb default '{}'::jsonb
)
returns public.admin_item_events
language plpgsql
security definer
set search_path = public
as $$
declare
  created_event public.admin_item_events;
begin
  insert into public.admin_item_events (
    household_id,
    admin_item_id,
    event_type,
    actor_id,
    metadata
  )
  values (
    target_household_id,
    target_admin_item_id,
    nullif(trim(target_event_type), ''),
    target_actor_id,
    coalesce(target_metadata, '{}'::jsonb)
  )
  returning *
  into created_event;

  return created_event;
end;
$$;

create or replace function public.create_admin_item(
  target_household_id uuid,
  item_type public.admin_item_type,
  item_title text,
  item_description text default null,
  item_owner_id uuid default null,
  item_provider_name text default null,
  item_reference_number text default null,
  item_amount_minor bigint default null,
  item_currency_code text default null,
  item_due_date date default null,
  item_action_date date default null,
  item_expiry_date date default null,
  item_auto_pay boolean default false,
  item_recurrence_rule text default null,
  item_recurrence_timezone text default null,
  item_notes text default null
)
returns public.admin_items
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
  normalized_title text := nullif(trim(item_title), '');
  normalized_description text := nullif(trim(item_description), '');
  normalized_provider text := nullif(trim(item_provider_name), '');
  normalized_reference text := nullif(trim(item_reference_number), '');
  normalized_currency text := upper(nullif(trim(item_currency_code), ''));
  normalized_rule text := nullif(trim(item_recurrence_rule), '');
  normalized_recurrence_timezone text := nullif(trim(item_recurrence_timezone), '');
  normalized_notes text := nullif(trim(item_notes), '');
  created_item public.admin_items;
begin
  if acting_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not public.is_household_member(target_household_id) then
    raise exception 'Household access required' using errcode = '42501';
  end if;

  if normalized_title is null or char_length(normalized_title) > 160 then
    raise exception 'Invalid admin item title' using errcode = '22023';
  end if;

  if normalized_description is not null and char_length(normalized_description) > 2000 then
    raise exception 'Invalid admin item description' using errcode = '22023';
  end if;

  if normalized_provider is not null and char_length(normalized_provider) > 160 then
    raise exception 'Invalid provider name' using errcode = '22023';
  end if;

  if normalized_reference is not null and char_length(normalized_reference) > 160 then
    raise exception 'Invalid reference number' using errcode = '22023';
  end if;

  if normalized_notes is not null and char_length(normalized_notes) > 4000 then
    raise exception 'Invalid notes' using errcode = '22023';
  end if;

  if item_amount_minor is not null and item_amount_minor < 0 then
    raise exception 'Invalid amount' using errcode = '22023';
  end if;

  if (item_amount_minor is null and normalized_currency is not null)
    or (item_amount_minor is not null and normalized_currency is null)
  then
    raise exception 'Amount and currency must be provided together' using errcode = '22023';
  end if;

  if normalized_currency is not null and normalized_currency !~ '^[A-Z]{3}$' then
    raise exception 'Invalid currency code' using errcode = '22023';
  end if;

  if item_owner_id is not null
    and not public.is_active_household_member(target_household_id, item_owner_id)
  then
    raise exception 'Owner must be an active household member' using errcode = '42501';
  end if;

  if not public.is_valid_task_recurrence_rule(normalized_rule) then
    raise exception 'Invalid recurrence rule' using errcode = '22023';
  end if;

  if normalized_rule is not null then
    if coalesce(item_due_date, item_action_date, item_expiry_date) is null then
      raise exception 'Recurring admin items require a date' using errcode = '22023';
    end if;

    if normalized_recurrence_timezone is null or not public.is_valid_time_zone(normalized_recurrence_timezone) then
      raise exception 'Invalid recurrence time zone' using errcode = '22023';
    end if;
  else
    normalized_recurrence_timezone := null;
  end if;

  insert into public.admin_items (
    household_id,
    type,
    title,
    description,
    owner_id,
    created_by,
    provider_name,
    reference_number,
    amount_minor,
    currency_code,
    due_date,
    action_date,
    expiry_date,
    auto_pay,
    recurrence_rule,
    recurrence_timezone,
    next_occurrence_date,
    notes
  )
  values (
    target_household_id,
    item_type,
    normalized_title,
    normalized_description,
    item_owner_id,
    acting_user_id,
    normalized_provider,
    normalized_reference,
    item_amount_minor,
    normalized_currency,
    item_due_date,
    item_action_date,
    item_expiry_date,
    coalesce(item_auto_pay, false),
    normalized_rule,
    normalized_recurrence_timezone,
    public.calculate_next_admin_occurrence_date(
      item_due_date,
      item_action_date,
      item_expiry_date,
      normalized_rule
    ),
    normalized_notes
  )
  returning *
  into created_item;

  perform public.record_admin_item_event(
    created_item.household_id,
    created_item.id,
    'created',
    acting_user_id,
    jsonb_build_object('status', created_item.status)
  );

  perform public.record_activity_event(
    created_item.household_id,
    acting_user_id,
    'admin_item',
    created_item.id,
    'admin_item.created',
    'Created Home Admin item "' || created_item.title || '".',
    jsonb_build_object('adminItemId', created_item.id, 'type', created_item.type)
  );

  return created_item;
end;
$$;

create or replace function public.update_admin_item(
  target_item_id uuid,
  item_type public.admin_item_type,
  item_title text,
  item_description text default null,
  item_owner_id uuid default null,
  item_provider_name text default null,
  item_reference_number text default null,
  item_amount_minor bigint default null,
  item_currency_code text default null,
  item_due_date date default null,
  item_action_date date default null,
  item_expiry_date date default null,
  item_auto_pay boolean default false,
  item_recurrence_rule text default null,
  item_recurrence_timezone text default null,
  item_notes text default null
)
returns public.admin_items
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
  existing_item public.admin_items;
  updated_item public.admin_items;
  normalized_title text := nullif(trim(item_title), '');
  normalized_description text := nullif(trim(item_description), '');
  normalized_provider text := nullif(trim(item_provider_name), '');
  normalized_reference text := nullif(trim(item_reference_number), '');
  normalized_currency text := upper(nullif(trim(item_currency_code), ''));
  normalized_rule text := nullif(trim(item_recurrence_rule), '');
  normalized_recurrence_timezone text := nullif(trim(item_recurrence_timezone), '');
  normalized_notes text := nullif(trim(item_notes), '');
begin
  if acting_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select *
  into existing_item
  from public.admin_items
  where id = target_item_id
    and archived_at is null
  for update;

  if existing_item.id is null then
    raise exception 'Admin item not found' using errcode = '22023';
  end if;

  if not public.is_household_member(existing_item.household_id) then
    raise exception 'Household access required' using errcode = '42501';
  end if;

  if normalized_title is null or char_length(normalized_title) > 160 then
    raise exception 'Invalid admin item title' using errcode = '22023';
  end if;

  if normalized_description is not null and char_length(normalized_description) > 2000 then
    raise exception 'Invalid admin item description' using errcode = '22023';
  end if;

  if normalized_provider is not null and char_length(normalized_provider) > 160 then
    raise exception 'Invalid provider name' using errcode = '22023';
  end if;

  if normalized_reference is not null and char_length(normalized_reference) > 160 then
    raise exception 'Invalid reference number' using errcode = '22023';
  end if;

  if normalized_notes is not null and char_length(normalized_notes) > 4000 then
    raise exception 'Invalid notes' using errcode = '22023';
  end if;

  if item_amount_minor is not null and item_amount_minor < 0 then
    raise exception 'Invalid amount' using errcode = '22023';
  end if;

  if (item_amount_minor is null and normalized_currency is not null)
    or (item_amount_minor is not null and normalized_currency is null)
  then
    raise exception 'Amount and currency must be provided together' using errcode = '22023';
  end if;

  if normalized_currency is not null and normalized_currency !~ '^[A-Z]{3}$' then
    raise exception 'Invalid currency code' using errcode = '22023';
  end if;

  if item_owner_id is not null
    and not public.is_active_household_member(existing_item.household_id, item_owner_id)
  then
    raise exception 'Owner must be an active household member' using errcode = '42501';
  end if;

  if not public.is_valid_task_recurrence_rule(normalized_rule) then
    raise exception 'Invalid recurrence rule' using errcode = '22023';
  end if;

  if normalized_rule is not null then
    if coalesce(item_due_date, item_action_date, item_expiry_date) is null then
      raise exception 'Recurring admin items require a date' using errcode = '22023';
    end if;

    if normalized_recurrence_timezone is null or not public.is_valid_time_zone(normalized_recurrence_timezone) then
      raise exception 'Invalid recurrence time zone' using errcode = '22023';
    end if;
  else
    normalized_recurrence_timezone := null;
  end if;

  update public.admin_items
  set
    type = item_type,
    title = normalized_title,
    description = normalized_description,
    owner_id = item_owner_id,
    provider_name = normalized_provider,
    reference_number = normalized_reference,
    amount_minor = item_amount_minor,
    currency_code = normalized_currency,
    due_date = item_due_date,
    action_date = item_action_date,
    expiry_date = item_expiry_date,
    auto_pay = coalesce(item_auto_pay, false),
    recurrence_rule = normalized_rule,
    recurrence_timezone = normalized_recurrence_timezone,
    next_occurrence_date = public.calculate_next_admin_occurrence_date(
      item_due_date,
      item_action_date,
      item_expiry_date,
      normalized_rule
    ),
    notes = normalized_notes
  where id = existing_item.id
  returning *
  into updated_item;

  perform public.record_admin_item_event(
    updated_item.household_id,
    updated_item.id,
    'updated',
    acting_user_id,
    jsonb_build_object('status', updated_item.status)
  );

  perform public.record_activity_event(
    updated_item.household_id,
    acting_user_id,
    'admin_item',
    updated_item.id,
    'admin_item.updated',
    'Updated Home Admin item "' || updated_item.title || '".',
    jsonb_build_object('adminItemId', updated_item.id, 'type', updated_item.type)
  );

  return updated_item;
end;
$$;

create or replace function public.set_admin_item_status(
  target_item_id uuid,
  item_status public.admin_item_status
)
returns public.admin_items
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
  existing_item public.admin_items;
  updated_item public.admin_items;
  next_due_date date;
  next_action_date date;
  next_expiry_date date;
  recurrence_root_id uuid;
  next_owner_id uuid;
  event_type text;
  activity_summary text;
begin
  if acting_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select *
  into existing_item
  from public.admin_items
  where id = target_item_id
    and archived_at is null
  for update;

  if existing_item.id is null then
    raise exception 'Admin item not found' using errcode = '22023';
  end if;

  if not public.is_household_member(existing_item.household_id) then
    raise exception 'Household access required' using errcode = '42501';
  end if;

  if existing_item.status = item_status then
    return existing_item;
  end if;

  update public.admin_items
  set
    status = item_status,
    paid_at = case
      when item_status = 'paid' then timezone('utc', now())
      else null
    end
  where id = existing_item.id
  returning *
  into updated_item;

  event_type := case
    when item_status = 'paid' then 'paid'
    when item_status = 'renewed' then 'renewed'
    when item_status = 'completed' then 'completed'
    when item_status = 'cancelled' then 'cancelled'
    else 'status_changed'
  end;

  activity_summary := case
    when item_status = 'paid' then 'Marked "' || updated_item.title || '" as paid.'
    when item_status = 'renewed' then 'Marked "' || updated_item.title || '" as renewed.'
    when item_status = 'completed' then 'Marked "' || updated_item.title || '" as completed.'
    when item_status = 'cancelled' then 'Cancelled Home Admin item "' || updated_item.title || '".'
    when item_status = 'needs_review' then 'Marked "' || updated_item.title || '" as needing review.'
    when item_status = 'waiting' then 'Marked "' || updated_item.title || '" as waiting.'
    when item_status = 'overdue' then 'Marked "' || updated_item.title || '" as overdue.'
    else 'Marked "' || updated_item.title || '" as upcoming.'
  end;

  perform public.record_admin_item_event(
    updated_item.household_id,
    updated_item.id,
    event_type,
    acting_user_id,
    jsonb_build_object('from', existing_item.status, 'to', updated_item.status)
  );

  perform public.record_activity_event(
    updated_item.household_id,
    acting_user_id,
    'admin_item',
    updated_item.id,
    'admin_item.' || event_type,
    activity_summary,
    jsonb_build_object('adminItemId', updated_item.id, 'status', updated_item.status)
  );

  if item_status in ('paid', 'renewed', 'completed')
    and existing_item.recurrence_rule is not null
  then
    next_due_date := public.calculate_next_task_due_date(
      existing_item.due_date,
      existing_item.recurrence_rule
    );
    next_action_date := public.calculate_next_task_due_date(
      existing_item.action_date,
      existing_item.recurrence_rule
    );
    next_expiry_date := public.calculate_next_task_due_date(
      existing_item.expiry_date,
      existing_item.recurrence_rule
    );
    recurrence_root_id := coalesce(existing_item.recurrence_source_id, existing_item.id);
    next_owner_id := case
      when existing_item.owner_id is not null
        and public.is_active_household_member(existing_item.household_id, existing_item.owner_id)
      then existing_item.owner_id
      else null
    end;

    if coalesce(next_due_date, next_action_date, next_expiry_date) is not null then
      insert into public.admin_items (
        household_id,
        type,
        title,
        description,
        status,
        owner_id,
        created_by,
        provider_name,
        reference_number,
        amount_minor,
        currency_code,
        due_date,
        action_date,
        expiry_date,
        auto_pay,
        recurrence_rule,
        recurrence_timezone,
        recurrence_source_id,
        next_occurrence_date,
        notes
      )
      values (
        existing_item.household_id,
        existing_item.type,
        existing_item.title,
        existing_item.description,
        'upcoming',
        next_owner_id,
        existing_item.created_by,
        existing_item.provider_name,
        existing_item.reference_number,
        existing_item.amount_minor,
        existing_item.currency_code,
        next_due_date,
        next_action_date,
        next_expiry_date,
        existing_item.auto_pay,
        existing_item.recurrence_rule,
        existing_item.recurrence_timezone,
        recurrence_root_id,
        public.calculate_next_admin_occurrence_date(
          next_due_date,
          next_action_date,
          next_expiry_date,
          existing_item.recurrence_rule
        ),
        existing_item.notes
      )
      on conflict do nothing;
    end if;
  end if;

  return updated_item;
end;
$$;

create or replace function public.archive_admin_item(target_item_id uuid)
returns public.admin_items
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
  existing_item public.admin_items;
  archived_item public.admin_items;
begin
  if acting_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select *
  into existing_item
  from public.admin_items
  where id = target_item_id
    and archived_at is null
  for update;

  if existing_item.id is null then
    raise exception 'Admin item not found' using errcode = '22023';
  end if;

  if not public.is_household_member(existing_item.household_id) then
    raise exception 'Household access required' using errcode = '42501';
  end if;

  update public.admin_items
  set archived_at = timezone('utc', now())
  where id = existing_item.id
  returning *
  into archived_item;

  perform public.record_admin_item_event(
    archived_item.household_id,
    archived_item.id,
    'archived',
    acting_user_id,
    jsonb_build_object('status', archived_item.status)
  );

  perform public.record_activity_event(
    archived_item.household_id,
    acting_user_id,
    'admin_item',
    archived_item.id,
    'admin_item.archived',
    'Archived Home Admin item "' || archived_item.title || '".',
    jsonb_build_object('adminItemId', archived_item.id)
  );

  return archived_item;
end;
$$;

alter table public.admin_items enable row level security;
alter table public.admin_item_events enable row level security;

drop policy if exists "Admin items are readable by active household members" on public.admin_items;
create policy "Admin items are readable by active household members"
on public.admin_items
for select
to authenticated
using (public.is_household_member(household_id));

drop policy if exists "Admin item events are readable by active household members" on public.admin_item_events;
create policy "Admin item events are readable by active household members"
on public.admin_item_events
for select
to authenticated
using (public.is_household_member(household_id));

revoke all on table public.admin_items from anon;
revoke all on table public.admin_items from authenticated;
grant select on table public.admin_items to authenticated;

revoke all on table public.admin_item_events from anon;
revoke all on table public.admin_item_events from authenticated;
grant select on table public.admin_item_events to authenticated;

revoke all on function public.calculate_next_admin_occurrence_date(date, date, date, text) from public;
revoke all on function public.record_admin_item_event(uuid, uuid, text, uuid, jsonb) from public;
revoke all on function public.create_admin_item(
  uuid,
  public.admin_item_type,
  text,
  text,
  uuid,
  text,
  text,
  bigint,
  text,
  date,
  date,
  date,
  boolean,
  text,
  text,
  text
) from public;
revoke all on function public.update_admin_item(
  uuid,
  public.admin_item_type,
  text,
  text,
  uuid,
  text,
  text,
  bigint,
  text,
  date,
  date,
  date,
  boolean,
  text,
  text,
  text
) from public;
revoke all on function public.set_admin_item_status(uuid, public.admin_item_status) from public;
revoke all on function public.archive_admin_item(uuid) from public;

grant execute on function public.create_admin_item(
  uuid,
  public.admin_item_type,
  text,
  text,
  uuid,
  text,
  text,
  bigint,
  text,
  date,
  date,
  date,
  boolean,
  text,
  text,
  text
) to authenticated;
grant execute on function public.update_admin_item(
  uuid,
  public.admin_item_type,
  text,
  text,
  uuid,
  text,
  text,
  bigint,
  text,
  date,
  date,
  date,
  boolean,
  text,
  text,
  text
) to authenticated;
grant execute on function public.set_admin_item_status(uuid, public.admin_item_status) to authenticated;
grant execute on function public.archive_admin_item(uuid) to authenticated;
