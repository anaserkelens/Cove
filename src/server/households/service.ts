import { createClient } from "@/lib/supabase/server";
import type {
  Household,
  HouseholdFormValues,
  HouseholdMember,
  HouseholdMembership,
} from "@/lib/validation/household";
import {
  isActiveOwner,
  toHouseholdSettingsUpdate,
} from "@/lib/validation/household";

export class HouseholdServiceError extends Error {
  constructor(message = "Household operation failed.") {
    super(message);
    this.name = "HouseholdServiceError";
  }
}

export async function createHouseholdForCurrentUser(
  values: HouseholdFormValues,
): Promise<Household> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new HouseholdServiceError("Authentication required.");
  }

  const { data, error } = await supabase.rpc("create_household", {
    household_currency_code: values.currencyCode,
    household_name: values.name,
    household_timezone: values.timezone,
  });

  if (error || !data) {
    throw new HouseholdServiceError();
  }

  return data;
}

export async function listHouseholdsForCurrentUser(): Promise<Household[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("households")
    .select(
      "archived_at, created_at, created_by, currency_code, id, name, slug, timezone, updated_at",
    )
    .is("archived_at", null)
    .order("name", { ascending: true });

  if (error) {
    throw new HouseholdServiceError();
  }

  return data;
}

export async function getHouseholdForCurrentUser(
  householdId: string,
): Promise<Household> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("households")
    .select(
      "archived_at, created_at, created_by, currency_code, id, name, slug, timezone, updated_at",
    )
    .eq("id", householdId)
    .single();

  if (error || !data) {
    throw new HouseholdServiceError();
  }

  return data;
}

export async function getMembershipForCurrentUser(
  householdId: string,
): Promise<HouseholdMembership> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new HouseholdServiceError("Authentication required.");
  }

  const { data, error } = await supabase
    .from("household_memberships")
    .select(
      "created_at, household_id, id, joined_at, role, status, updated_at, user_id",
    )
    .eq("household_id", householdId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (error || !data) {
    throw new HouseholdServiceError();
  }

  return data;
}

export async function requireHouseholdOwner(
  householdId: string,
): Promise<HouseholdMembership> {
  const membership = await getMembershipForCurrentUser(householdId);

  if (!isActiveOwner(membership)) {
    throw new HouseholdServiceError("Owner access required.");
  }

  return membership;
}

export async function listHouseholdMembers(
  householdId: string,
): Promise<HouseholdMember[]> {
  const supabase = await createClient();

  const { data: memberships, error: membershipError } = await supabase
    .from("household_memberships")
    .select(
      "created_at, household_id, id, joined_at, role, status, updated_at, user_id",
    )
    .eq("household_id", householdId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (membershipError) {
    throw new HouseholdServiceError();
  }

  const userIds = memberships.map((membership) => membership.user_id);

  if (userIds.length === 0) {
    return [];
  }

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("display_name, id, locale, timezone")
    .in("id", userIds);

  if (profileError) {
    throw new HouseholdServiceError();
  }

  const profileById = new Map(
    profiles.map((profile) => [profile.id, profile] as const),
  );

  return memberships.map((membership) => ({
    ...membership,
    profile: profileById.get(membership.user_id) ?? null,
  }));
}

export async function updateHouseholdSettingsForCurrentUser(
  householdId: string,
  values: HouseholdFormValues,
): Promise<Household> {
  await requireHouseholdOwner(householdId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("households")
    .update(toHouseholdSettingsUpdate(values))
    .eq("id", householdId)
    .select(
      "archived_at, created_at, created_by, currency_code, id, name, slug, timezone, updated_at",
    )
    .single();

  if (error || !data) {
    throw new HouseholdServiceError();
  }

  return data;
}
