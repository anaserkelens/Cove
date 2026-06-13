create extension if not exists pgcrypto with schema extensions;

do $$
begin
  create type public.household_role as enum ('owner', 'member');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.membership_status as enum ('active', 'invited', 'revoked');
exception
  when duplicate_object then null;
end;
$$;

create or replace function public.slugify_household_name(raw_name text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(
      regexp_replace(
        regexp_replace(
          lower(trim(raw_name)),
          '[^a-z0-9]+',
          '-',
          'g'
        ),
        '(^-|-$)',
        '',
        'g'
      ),
      ''
    ),
    'household'
  );
$$;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  timezone text not null,
  currency_code char(3) not null default 'EUR',
  created_by uuid not null references public.profiles(id) on delete restrict,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint households_name_length_check check (
    char_length(trim(name)) between 1 and 120
  ),
  constraint households_slug_format_check check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  constraint households_timezone_length_check check (
    char_length(trim(timezone)) between 1 and 100
  ),
  constraint households_currency_code_format_check check (
    currency_code ~ '^[A-Z]{3}$'
  )
);

create table if not exists public.household_memberships (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.household_role not null,
  status public.membership_status not null default 'active',
  joined_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint household_memberships_household_user_unique unique (
    household_id,
    user_id
  )
);

create table if not exists public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint shopping_lists_name_length_check check (
    char_length(trim(name)) between 1 and 120
  )
);

create index if not exists household_memberships_user_status_idx
on public.household_memberships(user_id, status);

create index if not exists household_memberships_household_status_idx
on public.household_memberships(household_id, status);

create index if not exists households_created_by_idx
on public.households(created_by);

create index if not exists shopping_lists_household_idx
on public.shopping_lists(household_id);

create unique index if not exists shopping_lists_one_default_active_idx
on public.shopping_lists(household_id)
where is_default and archived_at is null;

drop trigger if exists set_households_updated_at on public.households;
create trigger set_households_updated_at
before update on public.households
for each row
execute function public.set_updated_at();

drop trigger if exists set_household_memberships_updated_at on public.household_memberships;
create trigger set_household_memberships_updated_at
before update on public.household_memberships
for each row
execute function public.set_updated_at();

drop trigger if exists set_shopping_lists_updated_at on public.shopping_lists;
create trigger set_shopping_lists_updated_at
before update on public.shopping_lists
for each row
execute function public.set_updated_at();

create or replace function public.is_household_member(target_household_id uuid)
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
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  );
$$;

create or replace function public.is_household_owner(target_household_id uuid)
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
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = 'owner'
  );
$$;

create or replace function public.shares_active_household_with(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_user_id = auth.uid()
    or exists (
      select 1
      from public.household_memberships current_membership
      join public.household_memberships target_membership
        on target_membership.household_id = current_membership.household_id
      where current_membership.user_id = auth.uid()
        and current_membership.status = 'active'
        and target_membership.user_id = target_user_id
        and target_membership.status = 'active'
    );
$$;

create or replace function public.create_household(
  household_name text,
  household_timezone text,
  household_currency_code text default 'EUR'
)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_user_id uuid := auth.uid();
  normalized_name text := nullif(trim(household_name), '');
  normalized_timezone text := nullif(trim(household_timezone), '');
  normalized_currency text := upper(coalesce(nullif(trim(household_currency_code), ''), 'EUR'));
  created_household public.households;
begin
  if acting_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if normalized_name is null or char_length(normalized_name) > 120 then
    raise exception 'Invalid household name' using errcode = '22023';
  end if;

  if normalized_timezone is null or char_length(normalized_timezone) > 100 then
    raise exception 'Invalid household timezone' using errcode = '22023';
  end if;

  if normalized_currency !~ '^[A-Z]{3}$' then
    raise exception 'Invalid household currency code' using errcode = '22023';
  end if;

  insert into public.profiles (id)
  values (acting_user_id)
  on conflict (id) do nothing;

  insert into public.households (
    name,
    slug,
    timezone,
    currency_code,
    created_by
  )
  values (
    normalized_name,
    public.slugify_household_name(normalized_name),
    normalized_timezone,
    normalized_currency,
    acting_user_id
  )
  returning *
  into created_household;

  insert into public.household_memberships (
    household_id,
    user_id,
    role,
    status,
    joined_at
  )
  values (
    created_household.id,
    acting_user_id,
    'owner',
    'active',
    timezone('utc', now())
  );

  insert into public.shopping_lists (
    household_id,
    name,
    is_default,
    created_by
  )
  values (
    created_household.id,
    'Shopping',
    true,
    acting_user_id
  );

  return created_household;
end;
$$;

alter table public.households enable row level security;
alter table public.household_memberships enable row level security;
alter table public.shopping_lists enable row level security;

drop policy if exists "Households are readable by active members" on public.households;
drop policy if exists "Households are updatable by active owners" on public.households;

create policy "Households are readable by active members"
on public.households
for select
to authenticated
using (public.is_household_member(id));

create policy "Households are updatable by active owners"
on public.households
for update
to authenticated
using (public.is_household_owner(id))
with check (public.is_household_owner(id));

drop policy if exists "Memberships are readable by active household members" on public.household_memberships;

create policy "Memberships are readable by active household members"
on public.household_memberships
for select
to authenticated
using (public.is_household_member(household_id));

drop policy if exists "Shopping lists are readable by active household members" on public.shopping_lists;

create policy "Shopping lists are readable by active household members"
on public.shopping_lists
for select
to authenticated
using (public.is_household_member(household_id));

drop policy if exists "Profiles are readable by shared household members" on public.profiles;

create policy "Profiles are readable by shared household members"
on public.profiles
for select
to authenticated
using (public.shares_active_household_with(id));

revoke all on table public.households from anon;
revoke all on table public.households from authenticated;
grant select on table public.households to authenticated;
grant update (name, timezone, currency_code) on table public.households to authenticated;

revoke all on table public.household_memberships from anon;
revoke all on table public.household_memberships from authenticated;
grant select on table public.household_memberships to authenticated;

revoke all on table public.shopping_lists from anon;
revoke all on table public.shopping_lists from authenticated;
grant select on table public.shopping_lists to authenticated;

revoke all on function public.slugify_household_name(text) from public;
revoke all on function public.is_household_member(uuid) from public;
revoke all on function public.is_household_owner(uuid) from public;
revoke all on function public.shares_active_household_with(uuid) from public;
revoke all on function public.create_household(text, text, text) from public;

grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.is_household_owner(uuid) to authenticated;
grant execute on function public.shares_active_household_with(uuid) to authenticated;
grant execute on function public.create_household(text, text, text) to authenticated;
