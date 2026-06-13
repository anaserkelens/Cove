"use server";

import { redirect } from "next/navigation";

import { getFormString } from "@/lib/forms/form-data";
import {
  adminItemFormSchema,
  adminItemStatusFormSchema,
} from "@/lib/validation/admin";
import {
  archiveAdminItemForCurrentUser,
  createAdminItemForCurrentUser,
  setAdminItemStatusForCurrentUser,
  updateAdminItemForCurrentUser,
} from "@/server/admin/service";

export async function createAdminItemAction(
  householdId: string,
  formData: FormData,
) {
  const parsed = adminItemFormSchema.safeParse(readAdminItemForm(formData));

  if (!parsed.success) {
    redirect(`/app/${householdId}/admin/new?error=invalid-admin-item`);
  }

  let itemId: string;

  try {
    const item = await createAdminItemForCurrentUser(householdId, parsed.data);
    itemId = item.id;
  } catch {
    redirect(`/app/${householdId}/admin/new?error=create-admin-item-failed`);
  }

  redirect(`/app/${householdId}/admin/${itemId}?status=admin-item-created`);
}

export async function updateAdminItemAction(
  householdId: string,
  itemId: string,
  formData: FormData,
) {
  const parsed = adminItemFormSchema.safeParse(readAdminItemForm(formData));

  if (!parsed.success) {
    redirect(`/app/${householdId}/admin/${itemId}?error=invalid-admin-item`);
  }

  try {
    await updateAdminItemForCurrentUser(householdId, itemId, parsed.data);
  } catch {
    redirect(
      `/app/${householdId}/admin/${itemId}?error=update-admin-item-failed`,
    );
  }

  redirect(`/app/${householdId}/admin/${itemId}?status=admin-item-updated`);
}

export async function setAdminItemStatusAction(
  householdId: string,
  itemId: string,
  formData: FormData,
) {
  const parsed = adminItemStatusFormSchema.safeParse({
    status: getFormString(formData, "status"),
  });

  if (!parsed.success) {
    redirect(`/app/${householdId}/admin/${itemId}?error=invalid-admin-status`);
  }

  try {
    await setAdminItemStatusForCurrentUser(
      householdId,
      itemId,
      parsed.data.status,
    );
  } catch {
    redirect(
      `/app/${householdId}/admin/${itemId}?error=update-admin-status-failed`,
    );
  }

  redirect(`/app/${householdId}/admin/${itemId}?status=admin-status-updated`);
}

export async function archiveAdminItemAction(
  householdId: string,
  itemId: string,
  _formData: FormData,
) {
  void _formData;

  try {
    await archiveAdminItemForCurrentUser(householdId, itemId);
  } catch {
    redirect(
      `/app/${householdId}/admin/${itemId}?error=archive-admin-item-failed`,
    );
  }

  redirect(`/app/${householdId}/admin?status=admin-item-archived`);
}

function readAdminItemForm(formData: FormData) {
  return {
    actionDate: getFormString(formData, "actionDate"),
    amount: getFormString(formData, "amount"),
    autoPay: formData.get("autoPay") === "on",
    currencyCode: getFormString(formData, "currencyCode", "EUR"),
    description: getFormString(formData, "description"),
    dueDate: getFormString(formData, "dueDate"),
    expiryDate: getFormString(formData, "expiryDate"),
    notes: getFormString(formData, "notes"),
    ownerId: getFormString(formData, "ownerId"),
    providerName: getFormString(formData, "providerName"),
    recurrenceDayOfMonth: getFormString(formData, "recurrenceDayOfMonth", "1"),
    recurrenceInterval: getFormString(formData, "recurrenceInterval", "1"),
    recurrenceMonth: getFormString(formData, "recurrenceMonth", "1"),
    recurrencePreset: getFormString(formData, "recurrencePreset", "none"),
    recurrenceTimezone: getFormString(formData, "recurrenceTimezone", "UTC"),
    recurrenceWeekdays: formData
      .getAll("recurrenceWeekdays")
      .filter((value): value is string => typeof value === "string"),
    referenceNumber: getFormString(formData, "referenceNumber"),
    title: getFormString(formData, "title"),
    type: getFormString(formData, "type", "other"),
  };
}
