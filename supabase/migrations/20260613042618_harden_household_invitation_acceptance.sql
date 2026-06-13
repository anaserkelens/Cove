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
    role = case
      when public.household_memberships.status = 'active'
        then public.household_memberships.role
      else excluded.role
    end,
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
