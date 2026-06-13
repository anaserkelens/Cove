"use server";

import { redirect } from "next/navigation";

import { getFormString } from "@/lib/forms/form-data";
import { householdFormSchema } from "@/lib/validation/household";
import {
  createHouseholdForCurrentUser,
  updateHouseholdSettingsForCurrentUser,
} from "@/server/households/service";

export async function createHouseholdAction(formData: FormData) {
  const parsed = householdFormSchema.safeParse({
    currencyCode: getFormString(formData, "currencyCode", "EUR"),
    name: getFormString(formData, "name"),
    timezone: getFormString(formData, "timezone"),
  });

  if (!parsed.success) {
    redirect("/app/households/new?error=invalid-household");
  }

  let householdId: string;

  try {
    const household = await createHouseholdForCurrentUser(parsed.data);
    householdId = household.id;
  } catch {
    redirect("/app/households/new?error=create-household-failed");
  }

  redirect(`/app/${householdId}/dashboard`);
}

export async function updateHouseholdSettingsAction(
  householdId: string,
  formData: FormData,
) {
  const parsed = householdFormSchema.safeParse({
    currencyCode: getFormString(formData, "currencyCode", "EUR"),
    name: getFormString(formData, "name"),
    timezone: getFormString(formData, "timezone"),
  });

  if (!parsed.success) {
    redirect(`/app/${householdId}/settings?error=invalid-household`);
  }

  try {
    await updateHouseholdSettingsForCurrentUser(householdId, parsed.data);
  } catch {
    redirect(`/app/${householdId}/settings?error=update-household-failed`);
  }

  redirect(`/app/${householdId}/settings?status=household-updated`);
}
