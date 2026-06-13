create or replace function public.is_valid_time_zone(target_timezone text)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from pg_catalog.pg_timezone_names
    where name = nullif(trim(target_timezone), '')
  );
$$;

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  description text,
  location text,
  category_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  start_date date,
  end_date date,
  all_day boolean not null default false,
  timezone text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  assigned_to uuid references public.profiles(id) on delete set null,
  recurrence_rule text,
  recurrence_timezone text,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint calendar_events_title_length_check check (
    char_length(trim(title)) between 1 and 160
  ),
  constraint calendar_events_description_length_check check (
    description is null or char_length(description) <= 2000
  ),
  constraint calendar_events_location_length_check check (
    location is null or char_length(trim(location)) between 1 and 240
  ),
  constraint calendar_events_timezone_length_check check (
    char_length(trim(timezone)) between 1 and 100
  ),
  constraint calendar_events_temporal_semantics_check check (
    (
      all_day
      and start_date is not null
      and starts_at is null
      and ends_at is null
    )
    or (
      not all_day
      and starts_at is not null
      and start_date is null
      and end_date is null
    )
  ),
  constraint calendar_events_end_order_check check (
    (
      all_day
      and (end_date is null or end_date >= start_date)
    )
    or (
      not all_day
      and (ends_at is null or ends_at >= starts_at)
    )
  ),
  constraint calendar_events_recurrence_rule_valid_check check (
    public.is_valid_task_recurrence_rule(recurrence_rule)
  ),
  constraint calendar_events_recurrence_timezone_check check (
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

create index if not exists calendar_events_household_starts_at_idx
on public.calendar_events(household_id, starts_at)
where archived_at is null and all_day = false;

create index if not exists calendar_events_household_start_date_idx
on public.calendar_events(household_id, start_date)
where archived_at is null and all_day = true;

create index if not exists calendar_events_household_assigned_idx
on public.calendar_events(household_id, assigned_to)
where archived_at is null and assigned_to is not null;

drop trigger if exists set_calendar_events_updated_at on public.calendar_events;
create trigger set_calendar_events_updated_at
before update on public.calendar_events
for each row
execute function public.set_updated_at();

create or replace function public.create_calendar_event(
  target_household_id uuid,
  event_title text,
  event_description text default null,
  event_location text default null,
  event_all_day boolean default false,
  event_starts_at timestamptz default null,
  event_ends_at timestamptz default null,
  event_start_date date default null,
  event_end_date date default null,
  event_timezone text default null,
  event_assigned_to uuid default null,
  event_recurrence_rule text default null,
  event_recurrence_timezone text default null
)
returns public.calendar_events
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
  normalized_title text := nullif(trim(event_title), '');
  normalized_description text := nullif(trim(event_description), '');
  normalized_location text := nullif(trim(event_location), '');
  normalized_timezone text := nullif(trim(event_timezone), '');
  normalized_rule text := nullif(trim(event_recurrence_rule), '');
  normalized_recurrence_timezone text := nullif(trim(event_recurrence_timezone), '');
  created_event public.calendar_events;
begin
  if acting_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not public.is_household_member(target_household_id) then
    raise exception 'Household access required' using errcode = '42501';
  end if;

  if normalized_title is null or char_length(normalized_title) > 160 then
    raise exception 'Invalid calendar event title' using errcode = '22023';
  end if;

  if normalized_description is not null and char_length(normalized_description) > 2000 then
    raise exception 'Invalid calendar event description' using errcode = '22023';
  end if;

  if normalized_location is not null and char_length(normalized_location) > 240 then
    raise exception 'Invalid calendar event location' using errcode = '22023';
  end if;

  if normalized_timezone is null or not public.is_valid_time_zone(normalized_timezone) then
    raise exception 'Invalid calendar event time zone' using errcode = '22023';
  end if;

  if not public.is_valid_task_recurrence_rule(normalized_rule) then
    raise exception 'Invalid recurrence rule' using errcode = '22023';
  end if;

  if normalized_rule is not null then
    normalized_recurrence_timezone := coalesce(normalized_recurrence_timezone, normalized_timezone);

    if not public.is_valid_time_zone(normalized_recurrence_timezone) then
      raise exception 'Invalid recurrence time zone' using errcode = '22023';
    end if;
  else
    normalized_recurrence_timezone := null;
  end if;

  if coalesce(event_all_day, false) then
    if event_start_date is null then
      raise exception 'All-day events require a start date' using errcode = '22023';
    end if;

    if event_end_date is not null and event_end_date < event_start_date then
      raise exception 'Calendar event end cannot precede start' using errcode = '22023';
    end if;
  else
    if event_starts_at is null then
      raise exception 'Timed events require a start time' using errcode = '22023';
    end if;

    if event_ends_at is not null and event_ends_at < event_starts_at then
      raise exception 'Calendar event end cannot precede start' using errcode = '22023';
    end if;
  end if;

  if event_assigned_to is not null
    and not public.is_active_household_member(target_household_id, event_assigned_to)
  then
    raise exception 'Assignee must be an active household member' using errcode = '42501';
  end if;

  insert into public.calendar_events (
    household_id,
    title,
    description,
    location,
    starts_at,
    ends_at,
    start_date,
    end_date,
    all_day,
    timezone,
    created_by,
    assigned_to,
    recurrence_rule,
    recurrence_timezone
  )
  values (
    target_household_id,
    normalized_title,
    normalized_description,
    normalized_location,
    case when coalesce(event_all_day, false) then null else event_starts_at end,
    case when coalesce(event_all_day, false) then null else event_ends_at end,
    case when coalesce(event_all_day, false) then event_start_date else null end,
    case when coalesce(event_all_day, false) then event_end_date else null end,
    coalesce(event_all_day, false),
    normalized_timezone,
    acting_user_id,
    event_assigned_to,
    normalized_rule,
    normalized_recurrence_timezone
  )
  returning *
  into created_event;

  perform public.record_activity_event(
    created_event.household_id,
    acting_user_id,
    'calendar_event',
    created_event.id,
    'calendar_event.created',
    'Created calendar event "' || created_event.title || '".',
    jsonb_build_object('calendarEventId', created_event.id)
  );

  return created_event;
end;
$$;

create or replace function public.update_calendar_event(
  target_event_id uuid,
  event_title text,
  event_description text default null,
  event_location text default null,
  event_all_day boolean default false,
  event_starts_at timestamptz default null,
  event_ends_at timestamptz default null,
  event_start_date date default null,
  event_end_date date default null,
  event_timezone text default null,
  event_assigned_to uuid default null,
  event_recurrence_rule text default null,
  event_recurrence_timezone text default null
)
returns public.calendar_events
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
  existing_event public.calendar_events;
  updated_event public.calendar_events;
  normalized_title text := nullif(trim(event_title), '');
  normalized_description text := nullif(trim(event_description), '');
  normalized_location text := nullif(trim(event_location), '');
  normalized_timezone text := nullif(trim(event_timezone), '');
  normalized_rule text := nullif(trim(event_recurrence_rule), '');
  normalized_recurrence_timezone text := nullif(trim(event_recurrence_timezone), '');
begin
  if acting_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select *
  into existing_event
  from public.calendar_events
  where id = target_event_id
    and archived_at is null
  for update;

  if existing_event.id is null then
    raise exception 'Calendar event not found' using errcode = '22023';
  end if;

  if not public.is_household_member(existing_event.household_id) then
    raise exception 'Household access required' using errcode = '42501';
  end if;

  if normalized_title is null or char_length(normalized_title) > 160 then
    raise exception 'Invalid calendar event title' using errcode = '22023';
  end if;

  if normalized_description is not null and char_length(normalized_description) > 2000 then
    raise exception 'Invalid calendar event description' using errcode = '22023';
  end if;

  if normalized_location is not null and char_length(normalized_location) > 240 then
    raise exception 'Invalid calendar event location' using errcode = '22023';
  end if;

  if normalized_timezone is null or not public.is_valid_time_zone(normalized_timezone) then
    raise exception 'Invalid calendar event time zone' using errcode = '22023';
  end if;

  if not public.is_valid_task_recurrence_rule(normalized_rule) then
    raise exception 'Invalid recurrence rule' using errcode = '22023';
  end if;

  if normalized_rule is not null then
    normalized_recurrence_timezone := coalesce(normalized_recurrence_timezone, normalized_timezone);

    if not public.is_valid_time_zone(normalized_recurrence_timezone) then
      raise exception 'Invalid recurrence time zone' using errcode = '22023';
    end if;
  else
    normalized_recurrence_timezone := null;
  end if;

  if coalesce(event_all_day, false) then
    if event_start_date is null then
      raise exception 'All-day events require a start date' using errcode = '22023';
    end if;

    if event_end_date is not null and event_end_date < event_start_date then
      raise exception 'Calendar event end cannot precede start' using errcode = '22023';
    end if;
  else
    if event_starts_at is null then
      raise exception 'Timed events require a start time' using errcode = '22023';
    end if;

    if event_ends_at is not null and event_ends_at < event_starts_at then
      raise exception 'Calendar event end cannot precede start' using errcode = '22023';
    end if;
  end if;

  if event_assigned_to is not null
    and not public.is_active_household_member(existing_event.household_id, event_assigned_to)
  then
    raise exception 'Assignee must be an active household member' using errcode = '42501';
  end if;

  update public.calendar_events
  set
    title = normalized_title,
    description = normalized_description,
    location = normalized_location,
    starts_at = case when coalesce(event_all_day, false) then null else event_starts_at end,
    ends_at = case when coalesce(event_all_day, false) then null else event_ends_at end,
    start_date = case when coalesce(event_all_day, false) then event_start_date else null end,
    end_date = case when coalesce(event_all_day, false) then event_end_date else null end,
    all_day = coalesce(event_all_day, false),
    timezone = normalized_timezone,
    assigned_to = event_assigned_to,
    recurrence_rule = normalized_rule,
    recurrence_timezone = normalized_recurrence_timezone
  where id = existing_event.id
  returning *
  into updated_event;

  perform public.record_activity_event(
    updated_event.household_id,
    acting_user_id,
    'calendar_event',
    updated_event.id,
    'calendar_event.updated',
    'Updated calendar event "' || updated_event.title || '".',
    jsonb_build_object('calendarEventId', updated_event.id)
  );

  return updated_event;
end;
$$;

create or replace function public.archive_calendar_event(target_event_id uuid)
returns public.calendar_events
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
  existing_event public.calendar_events;
  archived_event public.calendar_events;
begin
  if acting_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select *
  into existing_event
  from public.calendar_events
  where id = target_event_id
    and archived_at is null
  for update;

  if existing_event.id is null then
    raise exception 'Calendar event not found' using errcode = '22023';
  end if;

  if not public.is_household_member(existing_event.household_id) then
    raise exception 'Household access required' using errcode = '42501';
  end if;

  update public.calendar_events
  set archived_at = timezone('utc', now())
  where id = existing_event.id
  returning *
  into archived_event;

  perform public.record_activity_event(
    archived_event.household_id,
    acting_user_id,
    'calendar_event',
    archived_event.id,
    'calendar_event.archived',
    'Archived calendar event "' || archived_event.title || '".',
    jsonb_build_object('calendarEventId', archived_event.id)
  );

  return archived_event;
end;
$$;

alter table public.calendar_events enable row level security;

drop policy if exists "Calendar events are readable by active household members" on public.calendar_events;
create policy "Calendar events are readable by active household members"
on public.calendar_events
for select
to authenticated
using (public.is_household_member(household_id));

revoke all on table public.calendar_events from anon;
revoke all on table public.calendar_events from authenticated;
grant select on table public.calendar_events to authenticated;

revoke all on function public.is_valid_time_zone(text) from public;
revoke all on function public.create_calendar_event(
  uuid,
  text,
  text,
  text,
  boolean,
  timestamptz,
  timestamptz,
  date,
  date,
  text,
  uuid,
  text,
  text
) from public;
revoke all on function public.update_calendar_event(
  uuid,
  text,
  text,
  text,
  boolean,
  timestamptz,
  timestamptz,
  date,
  date,
  text,
  uuid,
  text,
  text
) from public;
revoke all on function public.archive_calendar_event(uuid) from public;

grant execute on function public.create_calendar_event(
  uuid,
  text,
  text,
  text,
  boolean,
  timestamptz,
  timestamptz,
  date,
  date,
  text,
  uuid,
  text,
  text
) to authenticated;
grant execute on function public.update_calendar_event(
  uuid,
  text,
  text,
  text,
  boolean,
  timestamptz,
  timestamptz,
  date,
  date,
  text,
  uuid,
  text,
  text
) to authenticated;
grant execute on function public.archive_calendar_event(uuid) to authenticated;
