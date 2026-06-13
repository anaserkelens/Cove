"use server";

import { redirect } from "next/navigation";

import { getFormString } from "@/lib/forms/form-data";
import {
  shoppingItemFormSchema,
  shoppingItemStatusFormSchema,
  shoppingListFormSchema,
} from "@/lib/validation/shopping";
import {
  archiveShoppingListForCurrentUser,
  createShoppingItemForCurrentUser,
  createShoppingListForCurrentUser,
  readdShoppingItemForCurrentUser,
  setDefaultShoppingListForCurrentUser,
  setShoppingItemStatusForCurrentUser,
  updateShoppingItemForCurrentUser,
  updateShoppingListForCurrentUser,
} from "@/server/shopping/service";

export async function createShoppingListAction(
  householdId: string,
  formData: FormData,
) {
  const parsed = shoppingListFormSchema.safeParse({
    name: getFormString(formData, "name"),
  });

  if (!parsed.success) {
    redirect(`/app/${householdId}/shopping?error=invalid-shopping-list`);
  }

  let listId: string;

  try {
    const list = await createShoppingListForCurrentUser(
      householdId,
      parsed.data,
    );
    listId = list.id;
  } catch {
    redirect(`/app/${householdId}/shopping?error=create-shopping-list-failed`);
  }

  redirect(
    `/app/${householdId}/shopping/${listId}?status=shopping-list-created`,
  );
}

export async function updateShoppingListAction(
  householdId: string,
  shoppingListId: string,
  formData: FormData,
) {
  const parsed = shoppingListFormSchema.safeParse({
    name: getFormString(formData, "name"),
  });

  if (!parsed.success) {
    redirect(
      `/app/${householdId}/shopping/${shoppingListId}?error=invalid-shopping-list`,
    );
  }

  try {
    await updateShoppingListForCurrentUser(
      householdId,
      shoppingListId,
      parsed.data,
    );
  } catch {
    redirect(
      `/app/${householdId}/shopping/${shoppingListId}?error=update-shopping-list-failed`,
    );
  }

  redirect(
    `/app/${householdId}/shopping/${shoppingListId}?status=shopping-list-updated`,
  );
}

export async function setDefaultShoppingListAction(
  householdId: string,
  shoppingListId: string,
  _formData: FormData,
) {
  void _formData;

  try {
    await setDefaultShoppingListForCurrentUser(householdId, shoppingListId);
  } catch {
    redirect(
      `/app/${householdId}/shopping/${shoppingListId}?error=set-default-shopping-list-failed`,
    );
  }

  redirect(
    `/app/${householdId}/shopping/${shoppingListId}?status=shopping-list-default-set`,
  );
}

export async function archiveShoppingListAction(
  householdId: string,
  shoppingListId: string,
  _formData: FormData,
) {
  void _formData;

  try {
    await archiveShoppingListForCurrentUser(householdId, shoppingListId);
  } catch {
    redirect(
      `/app/${householdId}/shopping/${shoppingListId}?error=archive-shopping-list-failed`,
    );
  }

  redirect(`/app/${householdId}/shopping?status=shopping-list-archived`);
}

export async function createShoppingItemAction(
  householdId: string,
  shoppingListId: string,
  formData: FormData,
) {
  const parsed = shoppingItemFormSchema.safeParse(
    readShoppingItemForm(formData),
  );

  if (!parsed.success) {
    redirect(
      `/app/${householdId}/shopping/${shoppingListId}?error=invalid-shopping-item`,
    );
  }

  try {
    await createShoppingItemForCurrentUser(
      householdId,
      shoppingListId,
      parsed.data,
    );
  } catch {
    redirect(
      `/app/${householdId}/shopping/${shoppingListId}?error=create-shopping-item-failed`,
    );
  }

  redirect(
    `/app/${householdId}/shopping/${shoppingListId}?status=shopping-item-created`,
  );
}

export async function updateShoppingItemAction(
  householdId: string,
  shoppingListId: string,
  shoppingItemId: string,
  formData: FormData,
) {
  const parsed = shoppingItemFormSchema.safeParse(
    readShoppingItemForm(formData),
  );

  if (!parsed.success) {
    redirect(
      `/app/${householdId}/shopping/${shoppingListId}?error=invalid-shopping-item`,
    );
  }

  try {
    await updateShoppingItemForCurrentUser(
      householdId,
      shoppingListId,
      shoppingItemId,
      parsed.data,
    );
  } catch {
    redirect(
      `/app/${householdId}/shopping/${shoppingListId}?error=update-shopping-item-failed`,
    );
  }

  redirect(
    `/app/${householdId}/shopping/${shoppingListId}?status=shopping-item-updated`,
  );
}

export async function setShoppingItemStatusAction(
  householdId: string,
  shoppingListId: string,
  shoppingItemId: string,
  formData: FormData,
) {
  const parsed = shoppingItemStatusFormSchema.safeParse({
    status: getFormString(formData, "status"),
  });

  if (!parsed.success) {
    redirect(
      `/app/${householdId}/shopping/${shoppingListId}?error=invalid-shopping-item-status`,
    );
  }

  try {
    await setShoppingItemStatusForCurrentUser(
      householdId,
      shoppingListId,
      shoppingItemId,
      parsed.data.status,
    );
  } catch {
    redirect(
      `/app/${householdId}/shopping/${shoppingListId}?error=update-shopping-item-status-failed`,
    );
  }

  const statusCode =
    parsed.data.status === "purchased"
      ? "shopping-item-purchased"
      : parsed.data.status === "removed"
        ? "shopping-item-removed"
        : parsed.data.status === "in_cart"
          ? "shopping-item-in-cart"
          : "shopping-item-needed";

  redirect(
    `/app/${householdId}/shopping/${shoppingListId}?status=${statusCode}`,
  );
}

export async function readdShoppingItemAction(
  householdId: string,
  shoppingItemId: string,
  _formData: FormData,
) {
  void _formData;

  try {
    await readdShoppingItemForCurrentUser(householdId, shoppingItemId);
  } catch {
    redirect(`/app/${householdId}/shopping?error=readd-shopping-item-failed`);
  }

  redirect(`/app/${householdId}/shopping?status=shopping-item-readded`);
}

function readShoppingItemForm(formData: FormData) {
  return {
    assignedTo: getFormString(formData, "assignedTo"),
    name: getFormString(formData, "name"),
    note: getFormString(formData, "note"),
    quantity: getFormString(formData, "quantity"),
    recurringHint: formData.get("recurringHint") === "on",
    unit: getFormString(formData, "unit"),
  };
}
