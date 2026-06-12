import { createClient } from "@/lib/supabase/server";
import type { Profile, ProfileFormValues } from "@/lib/validation/profile";
import { toProfileUpdate } from "@/lib/validation/profile";

export class ProfileServiceError extends Error {
  constructor(message = "Profile operation failed.") {
    super(message);
    this.name = "ProfileServiceError";
  }
}

export async function ensureProfileForCurrentUser(): Promise<Profile> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new ProfileServiceError("Authentication required.");
  }

  const { data, error } = await supabase.rpc("ensure_profile");

  if (error || !data) {
    throw new ProfileServiceError();
  }

  return data;
}

export async function getProfileForCurrentUser(): Promise<Profile> {
  return ensureProfileForCurrentUser();
}

export async function updateProfileForCurrentUser(
  values: ProfileFormValues,
): Promise<Profile> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new ProfileServiceError("Authentication required.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(toProfileUpdate(values))
    .eq("id", user.id)
    .select()
    .single();

  if (error || !data) {
    throw new ProfileServiceError();
  }

  return data;
}
