do $$
begin
  create type public.household_entity_type as enum (
    'household',
    'task',
    'shopping_item',
    'calendar_event',
    'admin_item'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.reminder_channel as enum ('in_app');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.reminder_status as enum (
    'pending',
    'sent',
    'cancelled',
    'failed'
  );
exception
  when duplicate_object then null;
end;
$$;

create or replace function public.attachment_storage_bucket()
returns text
language sql
immutable
set search_path = public
as $$
  select 'household-attachments'::text;
$$;

create or replace function public.attachment_max_file_size_bytes()
returns bigint
language sql
immutable
set search_path = public
as $$
  select 5242880::bigint;
$$;

create or replace function public.household_attachment_quota_bytes()
returns bigint
language sql
immutable
set search_path = public
as $$
  select 104857600::bigint;
$$;

create or replace function public.is_allowed_attachment_mime_type(target_mime_type text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select lower(coalesce(target_mime_type, '')) = any(array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/csv',
    'text/plain'
  ]::text[]);
$$;

create or replace function public.attachment_path_household_id(storage_path text)
returns uuid
language plpgsql
immutable
set search_path = public
as $$
declare
  parts text[];
begin
  if storage_path is null
    or storage_path ~ '(^/|//|\.\.)'
  then
    return null;
  end if;

  parts := string_to_array(storage_path, '/');

  if array_length(parts, 1) <> 5 or parts[1] <> 'households' then
    return null;
  end if;

  return parts[2]::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

create or replace function public.attachment_path_entity_type(storage_path text)
returns public.household_entity_type
language plpgsql
immutable
set search_path = public
as $$
declare
  parts text[];
begin
  if storage_path is null
    or storage_path ~ '(^/|//|\.\.)'
  then
    return null;
  end if;

  parts := string_to_array(storage_path, '/');

  if array_length(parts, 1) <> 5 or parts[1] <> 'households' then
    return null;
  end if;

  return parts[3]::public.household_entity_type;
exception
  when invalid_text_representation then
    return null;
end;
$$;

create or replace function public.attachment_path_entity_id(storage_path text)
returns uuid
language plpgsql
immutable
set search_path = public
as $$
declare
  parts text[];
  file_id uuid;
begin
  if storage_path is null
    or storage_path ~ '(^/|//|\.\.)'
  then
    return null;
  end if;

  parts := string_to_array(storage_path, '/');

  if array_length(parts, 1) <> 5 or parts[1] <> 'households' then
    return null;
  end if;

  file_id := parts[5]::uuid;

  return parts[4]::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

create or replace function public.household_source_exists(
  target_household_id uuid,
  target_entity_type public.household_entity_type,
  target_entity_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if target_household_id is null or target_entity_id is null then
    return false;
  end if;

  if target_entity_type = 'household' then
    return exists (
      select 1
      from public.households household
      where household.id = target_household_id
        and household.id = target_entity_id
        and household.archived_at is null
    );
  end if;

  if target_entity_type = 'task' then
    return exists (
      select 1
      from public.tasks task
      where task.household_id = target_household_id
        and task.id = target_entity_id
        and task.archived_at is null
    );
  end if;

  if target_entity_type = 'shopping_item' then
    return exists (
      select 1
      from public.shopping_items item
      where item.household_id = target_household_id
        and item.id = target_entity_id
    );
  end if;

  if target_entity_type = 'calendar_event' then
    return exists (
      select 1
      from public.calendar_events event
      where event.household_id = target_household_id
        and event.id = target_entity_id
        and event.archived_at is null
    );
  end if;

  if target_entity_type = 'admin_item' then
    return exists (
      select 1
      from public.admin_items item
      where item.household_id = target_household_id
        and item.id = target_entity_id
        and item.archived_at is null
    );
  end if;

  return false;
end;
$$;

create or replace function public.build_reminder_dedupe_key(
  target_household_id uuid,
  target_entity_type public.household_entity_type,
  target_entity_id uuid,
  target_remind_at timestamptz,
  target_recipient_user_id uuid,
  target_channel public.reminder_channel
)
returns text
language sql
immutable
set search_path = public
as $$
  select concat_ws(
    ':',
    target_household_id::text,
    target_entity_type::text,
    target_entity_id::text,
    to_char(target_remind_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    coalesce(target_recipient_user_id::text, 'household'),
    target_channel::text
  );
$$;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  public.attachment_storage_bucket(),
  public.attachment_storage_bucket(),
  false,
  public.attachment_max_file_size_bytes(),
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/csv',
    'text/plain'
  ]::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  updated_at = timezone('utc', now());

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  entity_type public.household_entity_type not null,
  entity_id uuid not null,
  remind_at timestamptz not null,
  recipient_user_id uuid references public.profiles(id) on delete cascade,
  channel public.reminder_channel not null default 'in_app',
  status public.reminder_status not null default 'pending',
  sent_at timestamptz,
  dedupe_key text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint reminders_title_length_check check (
    char_length(trim(title)) between 1 and 160
  ),
  constraint reminders_dedupe_key_length_check check (
    char_length(trim(dedupe_key)) between 1 and 300
  ),
  constraint reminders_sent_state_check check (
    (
      status = 'sent'
      and sent_at is not null
    )
    or (
      status <> 'sent'
      and sent_at is null
    )
  )
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  entity_type public.household_entity_type not null,
  entity_id uuid not null,
  storage_bucket text not null default public.attachment_storage_bucket(),
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  constraint attachments_storage_bucket_check check (
    storage_bucket = public.attachment_storage_bucket()
  ),
  constraint attachments_storage_path_check check (
    char_length(storage_path) between 1 and 500
    and storage_path like 'households/%'
    and storage_path !~ '(^/|//|\.\.)'
  ),
  constraint attachments_filename_length_check check (
    char_length(trim(original_filename)) between 1 and 180
  ),
  constraint attachments_mime_type_check check (
    public.is_allowed_attachment_mime_type(mime_type)
  ),
  constraint attachments_size_check check (
    size_bytes > 0
    and size_bytes <= public.attachment_max_file_size_bytes()
  )
);

create unique index if not exists reminders_dedupe_key_unique_idx
on public.reminders(dedupe_key);

create index if not exists reminders_status_remind_at_idx
on public.reminders(status, remind_at)
where status = 'pending';

create index if not exists reminders_household_recipient_status_remind_idx
on public.reminders(household_id, recipient_user_id, status, remind_at);

create index if not exists reminders_household_entity_idx
on public.reminders(household_id, entity_type, entity_id);

create unique index if not exists attachments_storage_path_unique_idx
on public.attachments(storage_path);

create index if not exists attachments_household_entity_idx
on public.attachments(household_id, entity_type, entity_id)
where deleted_at is null;

create index if not exists attachments_household_uploaded_idx
on public.attachments(household_id, uploaded_by, created_at desc)
where deleted_at is null;

drop trigger if exists set_reminders_updated_at on public.reminders;
create trigger set_reminders_updated_at
before update on public.reminders
for each row
execute function public.set_updated_at();

drop trigger if exists set_attachments_updated_at on public.attachments;
create trigger set_attachments_updated_at
before update on public.attachments
for each row
execute function public.set_updated_at();

create or replace function public.create_reminder(
  target_household_id uuid,
  reminder_title text,
  reminder_entity_type public.household_entity_type,
  reminder_entity_id uuid,
  reminder_remind_at timestamptz,
  reminder_recipient_user_id uuid default null
)
returns public.reminders
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
  normalized_title text := nullif(trim(reminder_title), '');
  reminder_dedupe_key text;
  saved_reminder public.reminders;
begin
  if acting_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not public.is_household_member(target_household_id) then
    raise exception 'Household access required' using errcode = '42501';
  end if;

  if normalized_title is null or char_length(normalized_title) > 160 then
    raise exception 'Invalid reminder title' using errcode = '22023';
  end if;

  if not public.household_source_exists(
    target_household_id,
    reminder_entity_type,
    reminder_entity_id
  ) then
    raise exception 'Reminder source not found' using errcode = '22023';
  end if;

  if reminder_recipient_user_id is not null
    and not public.is_active_household_member(
      target_household_id,
      reminder_recipient_user_id
    )
  then
    raise exception 'Reminder recipient must be an active household member' using errcode = '42501';
  end if;

  reminder_dedupe_key := public.build_reminder_dedupe_key(
    target_household_id,
    reminder_entity_type,
    reminder_entity_id,
    reminder_remind_at,
    reminder_recipient_user_id,
    'in_app'
  );

  insert into public.reminders (
    household_id,
    title,
    entity_type,
    entity_id,
    remind_at,
    recipient_user_id,
    channel,
    status,
    sent_at,
    dedupe_key,
    created_by
  )
  values (
    target_household_id,
    normalized_title,
    reminder_entity_type,
    reminder_entity_id,
    reminder_remind_at,
    reminder_recipient_user_id,
    'in_app',
    'pending',
    null,
    reminder_dedupe_key,
    acting_user_id
  )
  on conflict (dedupe_key) do update
  set
    title = excluded.title,
    recipient_user_id = excluded.recipient_user_id,
    status = case
      when public.reminders.status = 'sent' then public.reminders.status
      else 'pending'
    end,
    sent_at = case
      when public.reminders.status = 'sent' then public.reminders.sent_at
      else null
    end,
    updated_at = timezone('utc', now())
  returning *
  into saved_reminder;

  perform public.record_activity_event(
    saved_reminder.household_id,
    acting_user_id,
    'reminder',
    saved_reminder.id,
    'reminder.created',
    'Created reminder "' || saved_reminder.title || '".',
    jsonb_build_object(
      'reminderId',
      saved_reminder.id,
      'entityType',
      saved_reminder.entity_type,
      'entityId',
      saved_reminder.entity_id
    )
  );

  return saved_reminder;
end;
$$;

create or replace function public.mark_reminder_sent(target_reminder_id uuid)
returns public.reminders
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
  existing_reminder public.reminders;
  updated_reminder public.reminders;
begin
  if acting_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select *
  into existing_reminder
  from public.reminders
  where id = target_reminder_id
  for update;

  if existing_reminder.id is null then
    raise exception 'Reminder not found' using errcode = '22023';
  end if;

  if not public.is_household_member(existing_reminder.household_id) then
    raise exception 'Household access required' using errcode = '42501';
  end if;

  if existing_reminder.recipient_user_id is not null
    and existing_reminder.recipient_user_id <> acting_user_id
    and existing_reminder.created_by <> acting_user_id
  then
    raise exception 'Reminder access required' using errcode = '42501';
  end if;

  if existing_reminder.status = 'sent' then
    return existing_reminder;
  end if;

  update public.reminders
  set
    status = 'sent',
    sent_at = timezone('utc', now())
  where id = existing_reminder.id
  returning *
  into updated_reminder;

  perform public.record_activity_event(
    updated_reminder.household_id,
    acting_user_id,
    'reminder',
    updated_reminder.id,
    'reminder.sent',
    'Handled reminder "' || updated_reminder.title || '".',
    jsonb_build_object('reminderId', updated_reminder.id)
  );

  return updated_reminder;
end;
$$;

create or replace function public.cancel_reminder(target_reminder_id uuid)
returns public.reminders
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
  existing_reminder public.reminders;
  updated_reminder public.reminders;
begin
  if acting_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select *
  into existing_reminder
  from public.reminders
  where id = target_reminder_id
  for update;

  if existing_reminder.id is null then
    raise exception 'Reminder not found' using errcode = '22023';
  end if;

  if not public.is_household_member(existing_reminder.household_id) then
    raise exception 'Household access required' using errcode = '42501';
  end if;

  if existing_reminder.recipient_user_id is not null
    and existing_reminder.recipient_user_id <> acting_user_id
    and existing_reminder.created_by <> acting_user_id
  then
    raise exception 'Reminder access required' using errcode = '42501';
  end if;

  if existing_reminder.status = 'cancelled' then
    return existing_reminder;
  end if;

  update public.reminders
  set
    status = 'cancelled',
    sent_at = null
  where id = existing_reminder.id
  returning *
  into updated_reminder;

  perform public.record_activity_event(
    updated_reminder.household_id,
    acting_user_id,
    'reminder',
    updated_reminder.id,
    'reminder.cancelled',
    'Cancelled reminder "' || updated_reminder.title || '".',
    jsonb_build_object('reminderId', updated_reminder.id)
  );

  return updated_reminder;
end;
$$;

create or replace function public.cancel_pending_reminders_for_source(
  target_household_id uuid,
  target_entity_type public.household_entity_type,
  target_entity_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_count integer := 0;
begin
  update public.reminders
  set
    status = 'cancelled',
    sent_at = null
  where household_id = target_household_id
    and entity_type = target_entity_type
    and entity_id = target_entity_id
    and status = 'pending';

  get diagnostics changed_count = row_count;

  return changed_count;
end;
$$;

create or replace function public.register_attachment(
  target_household_id uuid,
  attachment_entity_type public.household_entity_type,
  attachment_entity_id uuid,
  attachment_storage_bucket text,
  attachment_storage_path text,
  attachment_original_filename text,
  attachment_mime_type text,
  attachment_size_bytes bigint
)
returns public.attachments
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
  normalized_filename text := nullif(trim(attachment_original_filename), '');
  normalized_mime_type text := lower(trim(attachment_mime_type));
  expected_prefix text := 'households/' || target_household_id::text || '/' || attachment_entity_type::text || '/' || attachment_entity_id::text || '/';
  current_storage_bytes bigint;
  saved_attachment public.attachments;
begin
  if acting_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not public.is_household_member(target_household_id) then
    raise exception 'Household access required' using errcode = '42501';
  end if;

  if not public.household_source_exists(
    target_household_id,
    attachment_entity_type,
    attachment_entity_id
  ) then
    raise exception 'Attachment source not found' using errcode = '22023';
  end if;

  if attachment_storage_bucket <> public.attachment_storage_bucket() then
    raise exception 'Invalid attachment bucket' using errcode = '22023';
  end if;

  if attachment_storage_path is null
    or left(attachment_storage_path, char_length(expected_prefix)) <> expected_prefix
    or attachment_storage_path ~ '(^/|//|\.\.)'
  then
    raise exception 'Invalid attachment path' using errcode = '22023';
  end if;

  if public.attachment_path_household_id(attachment_storage_path) <> target_household_id then
    raise exception 'Attachment path does not match household' using errcode = '22023';
  end if;

  if normalized_filename is null or char_length(normalized_filename) > 180 then
    raise exception 'Invalid attachment filename' using errcode = '22023';
  end if;

  if not public.is_allowed_attachment_mime_type(normalized_mime_type) then
    raise exception 'Attachment type is not allowed' using errcode = '22023';
  end if;

  if attachment_size_bytes is null
    or attachment_size_bytes <= 0
    or attachment_size_bytes > public.attachment_max_file_size_bytes()
  then
    raise exception 'Attachment is too large' using errcode = '22023';
  end if;

  select coalesce(sum(size_bytes), 0)
  into current_storage_bytes
  from public.attachments
  where household_id = target_household_id
    and deleted_at is null;

  if current_storage_bytes + attachment_size_bytes > public.household_attachment_quota_bytes() then
    raise exception 'Attachment quota exceeded' using errcode = '22023';
  end if;

  insert into public.attachments (
    household_id,
    entity_type,
    entity_id,
    storage_bucket,
    storage_path,
    original_filename,
    mime_type,
    size_bytes,
    uploaded_by
  )
  values (
    target_household_id,
    attachment_entity_type,
    attachment_entity_id,
    attachment_storage_bucket,
    attachment_storage_path,
    normalized_filename,
    normalized_mime_type,
    attachment_size_bytes,
    acting_user_id
  )
  returning *
  into saved_attachment;

  perform public.record_activity_event(
    saved_attachment.household_id,
    acting_user_id,
    'attachment',
    saved_attachment.id,
    'attachment.uploaded',
    'Uploaded attachment "' || saved_attachment.original_filename || '".',
    jsonb_build_object(
      'attachmentId',
      saved_attachment.id,
      'entityType',
      saved_attachment.entity_type,
      'entityId',
      saved_attachment.entity_id,
      'sizeBytes',
      saved_attachment.size_bytes
    )
  );

  return saved_attachment;
end;
$$;

create or replace function public.delete_attachment(target_attachment_id uuid)
returns public.attachments
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
  existing_attachment public.attachments;
  deleted_attachment public.attachments;
begin
  if acting_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select *
  into existing_attachment
  from public.attachments
  where id = target_attachment_id
    and deleted_at is null
  for update;

  if existing_attachment.id is null then
    raise exception 'Attachment not found' using errcode = '22023';
  end if;

  if not public.is_household_member(existing_attachment.household_id) then
    raise exception 'Household access required' using errcode = '42501';
  end if;

  update public.attachments
  set deleted_at = timezone('utc', now())
  where id = existing_attachment.id
  returning *
  into deleted_attachment;

  perform public.record_activity_event(
    deleted_attachment.household_id,
    acting_user_id,
    'attachment',
    deleted_attachment.id,
    'attachment.deleted',
    'Deleted attachment "' || deleted_attachment.original_filename || '".',
    jsonb_build_object('attachmentId', deleted_attachment.id)
  );

  return deleted_attachment;
end;
$$;

create or replace function public.reconcile_household_reminders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.cancel_pending_reminders_for_source(old.id, 'household', old.id);
    return old;
  end if;

  if new.archived_at is not null
    and old.archived_at is distinct from new.archived_at
  then
    perform public.cancel_pending_reminders_for_source(new.id, 'household', new.id);
  end if;

  return new;
end;
$$;

create or replace function public.reconcile_task_reminders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.cancel_pending_reminders_for_source(old.household_id, 'task', old.id);
    return old;
  end if;

  if old.due_date is distinct from new.due_date
    or (
      new.archived_at is not null
      and old.archived_at is distinct from new.archived_at
    )
    or (
      new.status in ('completed', 'cancelled')
      and old.status is distinct from new.status
    )
  then
    perform public.cancel_pending_reminders_for_source(new.household_id, 'task', new.id);
  end if;

  return new;
end;
$$;

create or replace function public.reconcile_shopping_item_reminders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.cancel_pending_reminders_for_source(old.household_id, 'shopping_item', old.id);
    return old;
  end if;

  if new.status in ('purchased', 'removed')
    and old.status is distinct from new.status
  then
    perform public.cancel_pending_reminders_for_source(new.household_id, 'shopping_item', new.id);
  end if;

  return new;
end;
$$;

create or replace function public.reconcile_calendar_event_reminders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.cancel_pending_reminders_for_source(old.household_id, 'calendar_event', old.id);
    return old;
  end if;

  if old.starts_at is distinct from new.starts_at
    or old.ends_at is distinct from new.ends_at
    or old.start_date is distinct from new.start_date
    or old.end_date is distinct from new.end_date
    or (
      new.archived_at is not null
      and old.archived_at is distinct from new.archived_at
    )
  then
    perform public.cancel_pending_reminders_for_source(new.household_id, 'calendar_event', new.id);
  end if;

  return new;
end;
$$;

create or replace function public.reconcile_admin_item_reminders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.cancel_pending_reminders_for_source(old.household_id, 'admin_item', old.id);
    return old;
  end if;

  if old.due_date is distinct from new.due_date
    or old.action_date is distinct from new.action_date
    or old.expiry_date is distinct from new.expiry_date
    or (
      new.archived_at is not null
      and old.archived_at is distinct from new.archived_at
    )
    or (
      new.status in ('paid', 'renewed', 'completed', 'cancelled')
      and old.status is distinct from new.status
    )
  then
    perform public.cancel_pending_reminders_for_source(new.household_id, 'admin_item', new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists reconcile_household_reminders on public.households;
create trigger reconcile_household_reminders
after update of archived_at or delete on public.households
for each row
execute function public.reconcile_household_reminders();

drop trigger if exists reconcile_task_reminders on public.tasks;
create trigger reconcile_task_reminders
after update of status, due_date, archived_at or delete on public.tasks
for each row
execute function public.reconcile_task_reminders();

drop trigger if exists reconcile_shopping_item_reminders on public.shopping_items;
create trigger reconcile_shopping_item_reminders
after update of status or delete on public.shopping_items
for each row
execute function public.reconcile_shopping_item_reminders();

drop trigger if exists reconcile_calendar_event_reminders on public.calendar_events;
create trigger reconcile_calendar_event_reminders
after update of starts_at, ends_at, start_date, end_date, archived_at or delete on public.calendar_events
for each row
execute function public.reconcile_calendar_event_reminders();

drop trigger if exists reconcile_admin_item_reminders on public.admin_items;
create trigger reconcile_admin_item_reminders
after update of status, due_date, action_date, expiry_date, archived_at or delete on public.admin_items
for each row
execute function public.reconcile_admin_item_reminders();

alter table public.reminders enable row level security;
alter table public.attachments enable row level security;

drop policy if exists "Reminders are readable by active household members" on public.reminders;
create policy "Reminders are readable by active household members"
on public.reminders
for select
to authenticated
using (
  public.is_household_member(household_id)
  and (
    recipient_user_id is null
    or recipient_user_id = auth.uid()
    or created_by = auth.uid()
  )
);

drop policy if exists "Attachments are readable by active household members" on public.attachments;
create policy "Attachments are readable by active household members"
on public.attachments
for select
to authenticated
using (
  deleted_at is null
  and public.is_household_member(household_id)
);

drop policy if exists "Household attachment objects are readable by active household members" on storage.objects;
create policy "Household attachment objects are readable by active household members"
on storage.objects
for select
to authenticated
using (
  bucket_id = public.attachment_storage_bucket()
  and public.is_household_member(public.attachment_path_household_id(name))
);

drop policy if exists "Household attachment objects are uploadable by active household members" on storage.objects;
create policy "Household attachment objects are uploadable by active household members"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = public.attachment_storage_bucket()
  and name !~ '(^/|//|\.\.)'
  and public.is_household_member(public.attachment_path_household_id(name))
  and public.household_source_exists(
    public.attachment_path_household_id(name),
    public.attachment_path_entity_type(name),
    public.attachment_path_entity_id(name)
  )
);

drop policy if exists "Household attachment objects are deletable by active household members" on storage.objects;
create policy "Household attachment objects are deletable by active household members"
on storage.objects
for delete
to authenticated
using (
  bucket_id = public.attachment_storage_bucket()
  and public.is_household_member(public.attachment_path_household_id(name))
);

revoke all on table public.reminders from anon;
revoke all on table public.reminders from authenticated;
grant select on table public.reminders to authenticated;

revoke all on table public.attachments from anon;
revoke all on table public.attachments from authenticated;
grant select on table public.attachments to authenticated;

revoke all on function public.attachment_storage_bucket() from public;
revoke all on function public.attachment_max_file_size_bytes() from public;
revoke all on function public.household_attachment_quota_bytes() from public;
revoke all on function public.is_allowed_attachment_mime_type(text) from public;
revoke all on function public.attachment_path_household_id(text) from public;
revoke all on function public.attachment_path_entity_type(text) from public;
revoke all on function public.attachment_path_entity_id(text) from public;
revoke all on function public.household_source_exists(uuid, public.household_entity_type, uuid) from public;
revoke all on function public.build_reminder_dedupe_key(
  uuid,
  public.household_entity_type,
  uuid,
  timestamptz,
  uuid,
  public.reminder_channel
) from public;
revoke all on function public.create_reminder(
  uuid,
  text,
  public.household_entity_type,
  uuid,
  timestamptz,
  uuid
) from public;
revoke all on function public.mark_reminder_sent(uuid) from public;
revoke all on function public.cancel_reminder(uuid) from public;
revoke all on function public.cancel_pending_reminders_for_source(
  uuid,
  public.household_entity_type,
  uuid
) from public;
revoke all on function public.register_attachment(
  uuid,
  public.household_entity_type,
  uuid,
  text,
  text,
  text,
  text,
  bigint
) from public;
revoke all on function public.delete_attachment(uuid) from public;
revoke all on function public.reconcile_household_reminders() from public;
revoke all on function public.reconcile_task_reminders() from public;
revoke all on function public.reconcile_shopping_item_reminders() from public;
revoke all on function public.reconcile_calendar_event_reminders() from public;
revoke all on function public.reconcile_admin_item_reminders() from public;

grant execute on function public.attachment_storage_bucket() to authenticated;
grant execute on function public.attachment_max_file_size_bytes() to authenticated;
grant execute on function public.household_attachment_quota_bytes() to authenticated;
grant execute on function public.is_allowed_attachment_mime_type(text) to authenticated;
grant execute on function public.attachment_path_household_id(text) to authenticated;
grant execute on function public.attachment_path_entity_type(text) to authenticated;
grant execute on function public.attachment_path_entity_id(text) to authenticated;
grant execute on function public.household_source_exists(uuid, public.household_entity_type, uuid) to authenticated;
grant execute on function public.build_reminder_dedupe_key(
  uuid,
  public.household_entity_type,
  uuid,
  timestamptz,
  uuid,
  public.reminder_channel
) to authenticated;
grant execute on function public.create_reminder(
  uuid,
  text,
  public.household_entity_type,
  uuid,
  timestamptz,
  uuid
) to authenticated;
grant execute on function public.mark_reminder_sent(uuid) to authenticated;
grant execute on function public.cancel_reminder(uuid) to authenticated;
grant execute on function public.register_attachment(
  uuid,
  public.household_entity_type,
  uuid,
  text,
  text,
  text,
  text,
  bigint
) to authenticated;
grant execute on function public.delete_attachment(uuid) to authenticated;
