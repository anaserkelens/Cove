do $$
begin
  create type public.task_status as enum (
    'open',
    'in_progress',
    'completed',
    'cancelled'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.task_priority as enum (
    'low',
    'normal',
    'high'
  );
exception
  when duplicate_object then null;
end;
$$;

create or replace function public.is_active_household_member(
  target_household_id uuid,
  target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_memberships membership
    where membership.household_id = target_household_id
      and membership.user_id = target_user_id
      and membership.status = 'active'
  );
$$;

create or replace function public.is_valid_task_recurrence_rule(rule text)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  parsed jsonb;
  preset text;
  interval_value integer;
  day_value integer;
  month_value integer;
  weekday_value integer;
begin
  if rule is null or nullif(trim(rule), '') is null then
    return true;
  end if;

  parsed := rule::jsonb;

  if jsonb_typeof(parsed) <> 'object' then
    return false;
  end if;

  preset := parsed ->> 'preset';

  if preset = 'daily' then
    interval_value := coalesce((parsed ->> 'interval')::integer, 1);
    return interval_value between 1 and 365;
  end if;

  if preset = 'weekly' then
    if jsonb_typeof(parsed -> 'weekdays') <> 'array'
      or jsonb_array_length(parsed -> 'weekdays') = 0
    then
      return false;
    end if;

    for weekday_value in
      select value::text::integer
      from jsonb_array_elements(parsed -> 'weekdays') as weekdays(value)
    loop
      if weekday_value < 0 or weekday_value > 6 then
        return false;
      end if;
    end loop;

    return true;
  end if;

  if preset = 'every_n_weeks' then
    interval_value := (parsed ->> 'interval')::integer;
    return interval_value between 1 and 52;
  end if;

  if preset = 'monthly' then
    day_value := (parsed ->> 'dayOfMonth')::integer;
    return day_value between 1 and 31;
  end if;

  if preset = 'yearly' then
    month_value := (parsed ->> 'month')::integer;
    day_value := (parsed ->> 'dayOfMonth')::integer;
    return month_value between 1 and 12 and day_value between 1 and 31;
  end if;

  return false;
exception
  when others then
    return false;
end;
$$;

create or replace function public.clamped_date(
  target_year integer,
  target_month integer,
  target_day integer
)
returns date
language plpgsql
immutable
as $$
declare
  month_start date := make_date(target_year, target_month, 1);
  last_day integer;
begin
  last_day := extract(
    day from (date_trunc('month', month_start) + interval '1 month - 1 day')
  )::integer;

  return make_date(target_year, target_month, least(target_day, last_day));
end;
$$;

create or replace function public.calculate_next_task_due_date(
  current_due_date date,
  rule text
)
returns date
language plpgsql
immutable
set search_path = public
as $$
declare
  parsed jsonb;
  preset text;
  interval_value integer;
  day_value integer;
  month_value integer;
  current_year integer;
  current_month integer;
  candidate date;
  next_month_start date;
  offset_days integer;
  weekday_values integer[];
begin
  if current_due_date is null
    or rule is null
    or nullif(trim(rule), '') is null
    or not public.is_valid_task_recurrence_rule(rule)
  then
    return null;
  end if;

  parsed := rule::jsonb;
  preset := parsed ->> 'preset';

  if preset = 'daily' then
    interval_value := coalesce((parsed ->> 'interval')::integer, 1);
    return current_due_date + interval_value;
  end if;

  if preset = 'weekly' then
    select array_agg(distinct value::text::integer order by value::text::integer)
    into weekday_values
    from jsonb_array_elements(parsed -> 'weekdays') as weekdays(value);

    for offset_days in 1..14 loop
      candidate := current_due_date + offset_days;

      if extract(dow from candidate)::integer = any(weekday_values) then
        return candidate;
      end if;
    end loop;

    return current_due_date + 7;
  end if;

  if preset = 'every_n_weeks' then
    interval_value := (parsed ->> 'interval')::integer;
    return current_due_date + (interval_value * 7);
  end if;

  if preset = 'monthly' then
    day_value := (parsed ->> 'dayOfMonth')::integer;
    current_year := extract(year from current_due_date)::integer;
    current_month := extract(month from current_due_date)::integer;
    candidate := public.clamped_date(current_year, current_month, day_value);

    if candidate <= current_due_date then
      next_month_start := (date_trunc('month', current_due_date) + interval '1 month')::date;
      candidate := public.clamped_date(
        extract(year from next_month_start)::integer,
        extract(month from next_month_start)::integer,
        day_value
      );
    end if;

    return candidate;
  end if;

  if preset = 'yearly' then
    month_value := (parsed ->> 'month')::integer;
    day_value := (parsed ->> 'dayOfMonth')::integer;
    current_year := extract(year from current_due_date)::integer;
    candidate := public.clamped_date(current_year, month_value, day_value);

    if candidate <= current_due_date then
      candidate := public.clamped_date(current_year + 1, month_value, day_value);
    end if;

    return candidate;
  end if;

  return null;
end;
$$;

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint activity_events_entity_type_length_check check (
    char_length(trim(entity_type)) between 1 and 60
  ),
  constraint activity_events_action_length_check check (
    char_length(trim(action)) between 1 and 80
  ),
  constraint activity_events_summary_length_check check (
    char_length(trim(summary)) between 1 and 280
  ),
  constraint activity_events_metadata_object_check check (
    jsonb_typeof(metadata) = 'object'
  )
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  description text,
  category_id uuid,
  status public.task_status not null default 'open',
  priority public.task_priority not null default 'normal',
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  due_date date,
  due_at timestamptz,
  completed_at timestamptz,
  completed_by uuid references public.profiles(id) on delete restrict,
  recurrence_rule text,
  recurrence_timezone text,
  recurrence_source_id uuid references public.tasks(id) on delete set null,
  next_occurrence_date date,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tasks_title_length_check check (
    char_length(trim(title)) between 1 and 160
  ),
  constraint tasks_description_length_check check (
    description is null or char_length(description) <= 2000
  ),
  constraint tasks_due_semantics_check check (
    due_date is null or due_at is null
  ),
  constraint tasks_completion_state_check check (
    (
      status = 'completed'
      and completed_at is not null
      and completed_by is not null
    )
    or (
      status <> 'completed'
      and completed_at is null
      and completed_by is null
    )
  ),
  constraint tasks_recurrence_requires_due_date_check check (
    recurrence_rule is null or due_date is not null
  ),
  constraint tasks_recurrence_rule_valid_check check (
    public.is_valid_task_recurrence_rule(recurrence_rule)
  ),
  constraint tasks_recurrence_timezone_length_check check (
    recurrence_timezone is null
    or char_length(trim(recurrence_timezone)) between 1 and 100
  )
);

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  constraint task_comments_body_length_check check (
    char_length(trim(body)) between 1 and 2000
  )
);

create index if not exists tasks_household_status_due_idx
on public.tasks(household_id, status, due_date)
where archived_at is null;

create index if not exists tasks_household_assigned_status_idx
on public.tasks(household_id, assigned_to, status)
where archived_at is null;

create index if not exists tasks_household_next_occurrence_idx
on public.tasks(household_id, next_occurrence_date)
where archived_at is null and next_occurrence_date is not null;

create unique index if not exists tasks_recurrence_source_due_unique_idx
on public.tasks(household_id, recurrence_source_id, due_date)
where recurrence_source_id is not null and archived_at is null;

create index if not exists task_comments_task_created_idx
on public.task_comments(task_id, created_at);

create index if not exists activity_events_household_created_idx
on public.activity_events(household_id, created_at desc);

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

drop trigger if exists set_task_comments_updated_at on public.task_comments;
create trigger set_task_comments_updated_at
before update on public.task_comments
for each row
execute function public.set_updated_at();

create or replace function public.record_activity_event(
  target_household_id uuid,
  target_actor_id uuid,
  target_entity_type text,
  target_entity_id uuid,
  target_action text,
  target_summary text,
  target_metadata jsonb default '{}'::jsonb
)
returns public.activity_events
language plpgsql
security definer
set search_path = public
as $$
declare
  created_event public.activity_events;
begin
  insert into public.activity_events (
    household_id,
    actor_id,
    entity_type,
    entity_id,
    action,
    summary,
    metadata
  )
  values (
    target_household_id,
    target_actor_id,
    nullif(trim(target_entity_type), ''),
    target_entity_id,
    nullif(trim(target_action), ''),
    left(nullif(trim(target_summary), ''), 280),
    coalesce(target_metadata, '{}'::jsonb)
  )
  returning *
  into created_event;

  return created_event;
end;
$$;

create or replace function public.create_task(
  target_household_id uuid,
  task_title text,
  task_description text default null,
  task_priority public.task_priority default 'normal',
  task_assigned_to uuid default null,
  task_due_date date default null,
  task_recurrence_rule text default null,
  task_recurrence_timezone text default null
)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
  normalized_title text := nullif(trim(task_title), '');
  normalized_description text := nullif(trim(task_description), '');
  normalized_rule text := nullif(trim(task_recurrence_rule), '');
  normalized_timezone text := nullif(trim(task_recurrence_timezone), '');
  created_task public.tasks;
begin
  if acting_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not public.is_household_member(target_household_id) then
    raise exception 'Household access required' using errcode = '42501';
  end if;

  if normalized_title is null or char_length(normalized_title) > 160 then
    raise exception 'Invalid task title' using errcode = '22023';
  end if;

  if normalized_description is not null and char_length(normalized_description) > 2000 then
    raise exception 'Invalid task description' using errcode = '22023';
  end if;

  if normalized_rule is not null and task_due_date is null then
    raise exception 'Recurring tasks require a due date' using errcode = '22023';
  end if;

  if not public.is_valid_task_recurrence_rule(normalized_rule) then
    raise exception 'Invalid recurrence rule' using errcode = '22023';
  end if;

  if task_assigned_to is not null
    and not public.is_active_household_member(target_household_id, task_assigned_to)
  then
    raise exception 'Assignee must be an active household member' using errcode = '42501';
  end if;

  insert into public.tasks (
    household_id,
    title,
    description,
    priority,
    assigned_to,
    created_by,
    due_date,
    recurrence_rule,
    recurrence_timezone,
    next_occurrence_date
  )
  values (
    target_household_id,
    normalized_title,
    normalized_description,
    task_priority,
    task_assigned_to,
    acting_user_id,
    task_due_date,
    normalized_rule,
    case when normalized_rule is null then null else normalized_timezone end,
    public.calculate_next_task_due_date(task_due_date, normalized_rule)
  )
  returning *
  into created_task;

  perform public.record_activity_event(
    created_task.household_id,
    acting_user_id,
    'task',
    created_task.id,
    'task.created',
    'Created task "' || created_task.title || '".',
    jsonb_build_object('taskId', created_task.id)
  );

  return created_task;
end;
$$;

create or replace function public.update_task(
  target_task_id uuid,
  task_title text,
  task_description text default null,
  task_status public.task_status default 'open',
  task_priority public.task_priority default 'normal',
  task_assigned_to uuid default null,
  task_due_date date default null,
  task_recurrence_rule text default null,
  task_recurrence_timezone text default null
)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
  existing_task public.tasks;
  updated_task public.tasks;
  normalized_title text := nullif(trim(task_title), '');
  normalized_description text := nullif(trim(task_description), '');
  normalized_rule text := nullif(trim(task_recurrence_rule), '');
  normalized_timezone text := nullif(trim(task_recurrence_timezone), '');
begin
  if acting_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select *
  into existing_task
  from public.tasks
  where id = target_task_id
    and archived_at is null
  for update;

  if existing_task.id is null then
    raise exception 'Task not found' using errcode = '22023';
  end if;

  if not public.is_household_member(existing_task.household_id) then
    raise exception 'Household access required' using errcode = '42501';
  end if;

  if existing_task.status = 'completed' then
    raise exception 'Completed tasks cannot be edited' using errcode = '22023';
  end if;

  if task_status = 'completed' then
    raise exception 'Use complete_task to complete tasks' using errcode = '22023';
  end if;

  if normalized_title is null or char_length(normalized_title) > 160 then
    raise exception 'Invalid task title' using errcode = '22023';
  end if;

  if normalized_description is not null and char_length(normalized_description) > 2000 then
    raise exception 'Invalid task description' using errcode = '22023';
  end if;

  if normalized_rule is not null and task_due_date is null then
    raise exception 'Recurring tasks require a due date' using errcode = '22023';
  end if;

  if not public.is_valid_task_recurrence_rule(normalized_rule) then
    raise exception 'Invalid recurrence rule' using errcode = '22023';
  end if;

  if task_assigned_to is not null
    and not public.is_active_household_member(existing_task.household_id, task_assigned_to)
  then
    raise exception 'Assignee must be an active household member' using errcode = '42501';
  end if;

  update public.tasks
  set
    title = normalized_title,
    description = normalized_description,
    status = task_status,
    priority = task_priority,
    assigned_to = task_assigned_to,
    due_date = task_due_date,
    recurrence_rule = normalized_rule,
    recurrence_timezone = case when normalized_rule is null then null else normalized_timezone end,
    next_occurrence_date = public.calculate_next_task_due_date(task_due_date, normalized_rule)
  where id = existing_task.id
  returning *
  into updated_task;

  perform public.record_activity_event(
    updated_task.household_id,
    acting_user_id,
    'task',
    updated_task.id,
    'task.updated',
    'Updated task "' || updated_task.title || '".',
    jsonb_build_object('taskId', updated_task.id)
  );

  return updated_task;
end;
$$;

create or replace function public.complete_task(target_task_id uuid)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
  existing_task public.tasks;
  completed_task public.tasks;
  next_due_date date;
  next_assigned_to uuid;
  recurrence_root_id uuid;
begin
  if acting_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select *
  into existing_task
  from public.tasks
  where id = target_task_id
    and archived_at is null
  for update;

  if existing_task.id is null then
    raise exception 'Task not found' using errcode = '22023';
  end if;

  if not public.is_household_member(existing_task.household_id) then
    raise exception 'Household access required' using errcode = '42501';
  end if;

  if existing_task.status = 'completed' then
    return existing_task;
  end if;

  if existing_task.status = 'cancelled' then
    raise exception 'Cancelled tasks cannot be completed' using errcode = '22023';
  end if;

  update public.tasks
  set
    status = 'completed',
    completed_at = timezone('utc', now()),
    completed_by = acting_user_id
  where id = existing_task.id
  returning *
  into completed_task;

  if existing_task.recurrence_rule is not null and existing_task.due_date is not null then
    next_due_date := public.calculate_next_task_due_date(
      existing_task.due_date,
      existing_task.recurrence_rule
    );
    recurrence_root_id := coalesce(existing_task.recurrence_source_id, existing_task.id);
    next_assigned_to := case
      when existing_task.assigned_to is not null
        and public.is_active_household_member(existing_task.household_id, existing_task.assigned_to)
      then existing_task.assigned_to
      else null
    end;

    if next_due_date is not null then
      insert into public.tasks (
        household_id,
        title,
        description,
        priority,
        assigned_to,
        created_by,
        due_date,
        recurrence_rule,
        recurrence_timezone,
        recurrence_source_id,
        next_occurrence_date
      )
      values (
        existing_task.household_id,
        existing_task.title,
        existing_task.description,
        existing_task.priority,
        next_assigned_to,
        existing_task.created_by,
        next_due_date,
        existing_task.recurrence_rule,
        existing_task.recurrence_timezone,
        recurrence_root_id,
        public.calculate_next_task_due_date(next_due_date, existing_task.recurrence_rule)
      )
      on conflict (household_id, recurrence_source_id, due_date)
      where recurrence_source_id is not null and archived_at is null
      do nothing;
    end if;
  end if;

  perform public.record_activity_event(
    completed_task.household_id,
    acting_user_id,
    'task',
    completed_task.id,
    'task.completed',
    'Completed task "' || completed_task.title || '".',
    jsonb_build_object('taskId', completed_task.id)
  );

  return completed_task;
end;
$$;

create or replace function public.archive_task(target_task_id uuid)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
  existing_task public.tasks;
  archived_task public.tasks;
begin
  if acting_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select *
  into existing_task
  from public.tasks
  where id = target_task_id
    and archived_at is null
  for update;

  if existing_task.id is null then
    raise exception 'Task not found' using errcode = '22023';
  end if;

  if not public.is_household_member(existing_task.household_id) then
    raise exception 'Household access required' using errcode = '42501';
  end if;

  update public.tasks
  set archived_at = timezone('utc', now())
  where id = existing_task.id
  returning *
  into archived_task;

  perform public.record_activity_event(
    archived_task.household_id,
    acting_user_id,
    'task',
    archived_task.id,
    'task.archived',
    'Archived task "' || archived_task.title || '".',
    jsonb_build_object('taskId', archived_task.id)
  );

  return archived_task;
end;
$$;

create or replace function public.create_task_comment(
  target_task_id uuid,
  comment_body text
)
returns public.task_comments
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
  target_task public.tasks;
  normalized_body text := nullif(trim(comment_body), '');
  created_comment public.task_comments;
begin
  if acting_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select *
  into target_task
  from public.tasks
  where id = target_task_id
    and archived_at is null;

  if target_task.id is null then
    raise exception 'Task not found' using errcode = '22023';
  end if;

  if not public.is_household_member(target_task.household_id) then
    raise exception 'Household access required' using errcode = '42501';
  end if;

  if normalized_body is null or char_length(normalized_body) > 2000 then
    raise exception 'Invalid comment body' using errcode = '22023';
  end if;

  insert into public.task_comments (
    household_id,
    task_id,
    author_id,
    body
  )
  values (
    target_task.household_id,
    target_task.id,
    acting_user_id,
    normalized_body
  )
  returning *
  into created_comment;

  perform public.record_activity_event(
    target_task.household_id,
    acting_user_id,
    'task',
    target_task.id,
    'task.commented',
    'Commented on task "' || target_task.title || '".',
    jsonb_build_object('taskId', target_task.id, 'commentId', created_comment.id)
  );

  return created_comment;
end;
$$;

alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.activity_events enable row level security;

drop policy if exists "Tasks are readable by active household members" on public.tasks;
create policy "Tasks are readable by active household members"
on public.tasks
for select
to authenticated
using (public.is_household_member(household_id));

drop policy if exists "Task comments are readable by active household members" on public.task_comments;
create policy "Task comments are readable by active household members"
on public.task_comments
for select
to authenticated
using (public.is_household_member(household_id));

drop policy if exists "Activity is readable by active household members" on public.activity_events;
create policy "Activity is readable by active household members"
on public.activity_events
for select
to authenticated
using (public.is_household_member(household_id));

revoke all on table public.tasks from anon;
revoke all on table public.tasks from authenticated;
grant select on table public.tasks to authenticated;

revoke all on table public.task_comments from anon;
revoke all on table public.task_comments from authenticated;
grant select on table public.task_comments to authenticated;

revoke all on table public.activity_events from anon;
revoke all on table public.activity_events from authenticated;
grant select on table public.activity_events to authenticated;

revoke all on function public.is_active_household_member(uuid, uuid) from public;
revoke all on function public.is_valid_task_recurrence_rule(text) from public;
revoke all on function public.clamped_date(integer, integer, integer) from public;
revoke all on function public.calculate_next_task_due_date(date, text) from public;
revoke all on function public.record_activity_event(uuid, uuid, text, uuid, text, text, jsonb) from public;
revoke all on function public.create_task(uuid, text, text, public.task_priority, uuid, date, text, text) from public;
revoke all on function public.update_task(uuid, text, text, public.task_status, public.task_priority, uuid, date, text, text) from public;
revoke all on function public.complete_task(uuid) from public;
revoke all on function public.archive_task(uuid) from public;
revoke all on function public.create_task_comment(uuid, text) from public;

grant execute on function public.create_task(uuid, text, text, public.task_priority, uuid, date, text, text) to authenticated;
grant execute on function public.update_task(uuid, text, text, public.task_status, public.task_priority, uuid, date, text, text) to authenticated;
grant execute on function public.complete_task(uuid) to authenticated;
grant execute on function public.archive_task(uuid) to authenticated;
grant execute on function public.create_task_comment(uuid, text) to authenticated;
