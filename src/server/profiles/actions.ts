"use server";

import { redirect } from "next/navigation";

import { getFormString } from "@/lib/forms/form-data";
import { profileFormSchema } from "@/lib/validation/profile";
import { updateProfileForCurrentUser } from "@/server/profiles/service";

export async function updateProfileAction(formData: FormData) {
  const parsed = profileFormSchema.safeParse({
    displayName: getFormString(formData, "displayName"),
    timezone: getFormString(formData, "timezone"),
    locale: getFormString(formData, "locale"),
    weekStartsOn: getFormString(formData, "weekStartsOn"),
  });

  if (!parsed.success) {
    redirect("/app/profile?error=invalid-profile");
  }

  try {
    await updateProfileForCurrentUser(parsed.data);
  } catch {
    redirect("/app/profile?error=update-profile-failed");
  }

  redirect("/app/profile?status=profile-updated");
}

export async function completeOnboardingAction(formData: FormData) {
  const parsed = profileFormSchema.safeParse({
    displayName: getFormString(formData, "displayName"),
    timezone: getFormString(formData, "timezone"),
    locale: getFormString(formData, "locale"),
    weekStartsOn: getFormString(formData, "weekStartsOn"),
  });

  if (!parsed.success) {
    redirect("/onboarding?error=invalid-profile");
  }

  try {
    await updateProfileForCurrentUser(parsed.data);
  } catch {
    redirect("/onboarding?error=update-profile-failed");
  }

  redirect("/app");
}
