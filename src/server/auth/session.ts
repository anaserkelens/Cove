import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isProfileComplete } from "@/lib/validation/profile";
import { ensureProfileForCurrentUser } from "@/server/profiles/service";

export async function getAuthenticatedUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function requireAuthenticatedUser(next = "/app"): Promise<User> {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(next)}&error=missing-session`);
  }

  return user;
}

export async function redirectAuthenticatedUser(): Promise<void> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return;
  }

  const profile = await ensureProfileForCurrentUser();
  redirect(isProfileComplete(profile) ? "/app" : "/onboarding");
}
