"use server";

import { redirect } from "next/navigation";

import { getFormString } from "@/lib/forms/form-data";
import { reminderFormSchema } from "@/lib/validation/reminder";
import type { HouseholdEntityType } from "@/lib/validation/attachment";
import {
  cancelReminderForCurrentUser,
  createReminderForCurrentUser,
  markReminderSentForCurrentUser,
} from "@/server/reminders/service";

export async function createReminderAction(
  householdId: string,
  entityType: HouseholdEntityType,
  entityId: string,
  redirectPath: string,
  formData: FormData,
) {
  const parsed = reminderFormSchema.safeParse(readReminderForm(formData));

  if (!parsed.success) {
    redirect(`${redirectPath}?error=invalid-reminder`);
  }

  try {
    await createReminderForCurrentUser(
      householdId,
      entityType,
      entityId,
      parsed.data,
    );
  } catch {
    redirect(`${redirectPath}?error=create-reminder-failed`);
  }

  redirect(`${redirectPath}?status=reminder-created`);
}

export async function markReminderSentAction(
  householdId: string,
  reminderId: string,
  redirectPath: string,
  _formData: FormData,
) {
  void _formData;

  try {
    await markReminderSentForCurrentUser(householdId, reminderId);
  } catch {
    redirect(`${redirectPath}?error=update-reminder-failed`);
  }

  redirect(`${redirectPath}?status=reminder-handled`);
}

export async function cancelReminderAction(
  householdId: string,
  reminderId: string,
  redirectPath: string,
  _formData: FormData,
) {
  void _formData;

  try {
    await cancelReminderForCurrentUser(householdId, reminderId);
  } catch {
    redirect(`${redirectPath}?error=update-reminder-failed`);
  }

  redirect(`${redirectPath}?status=reminder-cancelled`);
}

function readReminderForm(formData: FormData) {
  return {
    recipientUserId: getFormString(formData, "recipientUserId"),
    remindAtLocal: getFormString(formData, "remindAtLocal"),
    timezone: getFormString(formData, "timezone", "UTC"),
    title: getFormString(formData, "title"),
  };
}
