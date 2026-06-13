create extension if not exists citext with schema extensions;

create table if not exists public.household_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  email extensions.citext not null,
  role public.household_role not null default 'member',
  token_hash text not null,
  invited_by uuid not null references public.profiles(id) on delete restrict,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint household_invitations_token_hash_format_check check (
    token_hash ~ '^[a-f0-9]{64}$'
  ),
  constraint household_invitations_email_length_check check (
    char_length(trim(email::text)) between 3 and 254
  ),
  constraint household_invitations_expires_after_created_check check (
    expires_at > created_at
  )
);

create unique index if not exists household_invitations_token_hash_unique_idx
on public.household_invitations(token_hash);

create index if not exists household_invitations_household_created_idx
on public.household_invitations(household_id, created_at desc);

create index if not exists household_invitations_household_email_idx
on public.household_invitations(household_id, email);

drop trigger if exists set_household_invitations_updated_at on public.household_invitations;
create trigger set_household_invitations_updated_at
before update on public.household_invitations
for each row
execute function public.set_updated_at();

create or replace function public.create_household_invitation(
  target_household_id uuid,
  invitation_email text,
  invitation_token_hash text,
  invitation_expires_at timestamptz
)
returns public.household_invitations
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  acting_user_id uuid := auth.uid();
  normalized_email text := lower(nullif(trim(invitation_email), ''));
  created_invitation public.household_invitations;
begin
  if acting_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not public.is_household_owner(target_household_id) then
    raise exception 'Owner access required' using errcode = '42501';
  end if;

  if normalized_email is null
    or char_length(normalized_email) > 254
    or normalized_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  then
    raise exception 'Invalid invitation email' using errcode = '22023';
  end if;

  if invitation_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid invitation token hash' using errcode = '22023';
  end if;

  if invitation_expires_at <= timezone('utc', now()) then
    raise exception 'Invitation expiration must be in the future' using errcode = '22023';
  end if;

  insert into public.household_invitations (
    household_id,
    email,
    role,
    token_hash,
    invited_by,
    expires_at
  )
  values (
    target_household_id,
    normalized_email,
    'member',
    invitation_token_hash,
    acting_user_id,
    invitation_expires_at
  )
  returning *
  into created_invitation;

  return created_invitation;
end;
$$;

create or replace function public.accept_household_invitation(
  invitation_token_hash text
)
returns public.households
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  acting_user_id uuid := auth.uid();
  acting_email text := lower(nullif(auth.jwt() ->> 'email', ''));
  matching_invitation public.household_invitations;
  accepted_household public.households;
begin
  if acting_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if acting_email is null then
    raise exception 'Authenticated email required' using errcode = '28000';
  end if;

  if invitation_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid invitation' using errcode = '22023';
  end if;

  select *
  into matching_invitation
  from public.household_invitations
  where token_hash = invitation_token_hash
  limit 1
  for update;

  if matching_invitation.id is null then
    raise exception 'Invalid invitation' using errcode = '22023';
  end if;

  if lower(matching_invitation.email::text) <> acting_email then
    raise exception 'Invalid invitation' using errcode = '42501';
  end if;

  if matching_invitation.revoked_at is not null then
    raise exception 'Invalid invitation' using errcode = '22023';
  end if;

  if matching_invitation.accepted_at is not null then
    if exists (
      select 1
      from public.household_memberships membership
      where membership.household_id = matching_invitation.household_id
        and membership.user_id = acting_user_id
        and membership.status = 'active'
    ) then
      select *
      into accepted_household
      from public.households
      where id = matching_invitation.household_id;

      return accepted_household;
    end if;

    raise exception 'Invalid invitation' using errcode = '22023';
  end if;

  if matching_invitation.expires_at <= timezone('utc', now()) then
    raise exception 'Invalid invitation' using errcode = '22023';
  end if;

  insert into public.profiles (id)
  values (acting_user_id)
  on conflict (id) do nothing;

  insert into public.household_memberships (
    household_id,
    user_id,
    role,
    status,
    joined_at
  )
  values (
    matching_invitation.household_id,
    acting_user_id,
    matching_invitation.role,
    'active',
    timezone('utc', now())
  )
  on conflict (household_id, user_id)
  do update set
    role = excluded.role,
    status = 'active',
    joined_at = coalesce(public.household_memberships.joined_at, timezone('utc', now())),
    updated_at = timezone('utc', now());

  update public.household_invitations
  set accepted_at = timezone('utc', now())
  where id = matching_invitation.id;

  select *
  into accepted_household
  from public.households
  where id = matching_invitation.household_id;

  return accepted_household;
end;
$$;

create or replace function public.revoke_household_invitation(
  target_invitation_id uuid
)
returns public.household_invitations
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  revoked_invitation public.household_invitations;
begin
  select *
  into revoked_invitation
  from public.household_invitations
  where id = target_invitation_id
  for update;

  if revoked_invitation.id is null then
    raise exception 'Invitation not found' using errcode = '22023';
  end if;

  if not public.is_household_owner(revoked_invitation.household_id) then
    raise exception 'Owner access required' using errcode = '42501';
  end if;

  if revoked_invitation.accepted_at is not null then
    raise exception 'Accepted invitations cannot be revoked' using errcode = '22023';
  end if;

  update public.household_invitations
  set revoked_at = coalesce(revoked_at, timezone('utc', now()))
  where id = revoked_invitation.id
  returning *
  into revoked_invitation;

  return revoked_invitation;
end;
$$;

alter table public.household_invitations enable row level security;

drop policy if exists "Invitations are readable by active household owners" on public.household_invitations;

create policy "Invitations are readable by active household owners"
on public.household_invitations
for select
to authenticated
using (public.is_household_owner(household_id));

revoke all on table public.household_invitations from anon;
revoke all on table public.household_invitations from authenticated;
grant select (
  id,
  household_id,
  email,
  role,
  invited_by,
  expires_at,
  accepted_at,
  revoked_at,
  created_at,
  updated_at
) on table public.household_invitations to authenticated;

revoke all on function public.create_household_invitation(uuid, text, text, timestamptz) from public;
revoke all on function public.accept_household_invitation(text) from public;
revoke all on function public.revoke_household_invitation(uuid) from public;

grant execute on function public.create_household_invitation(uuid, text, text, timestamptz) to authenticated;
grant execute on function public.accept_household_invitation(text) to authenticated;
grant execute on function public.revoke_household_invitation(uuid) to authenticated;
