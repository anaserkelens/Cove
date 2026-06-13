import { createClient } from "@/lib/supabase/server";
import type {
  ShoppingItem,
  ShoppingItemFormValues,
  ShoppingItemStatus,
  ShoppingList,
  ShoppingListFormValues,
} from "@/lib/validation/shopping";
import {
  getHouseholdForCurrentUser,
  listHouseholdMembers,
} from "@/server/households/service";

type ProfileSummary = {
  display_name: string | null;
  id: string;
};

export type ShoppingItemListItem = ShoppingItem & {
  assignee: ProfileSummary | null;
};

export type ShoppingDashboardSummary = {
  neededItems: ShoppingItemListItem[];
  recentPurchased: ShoppingItemListItem[];
};

export class ShoppingServiceError extends Error {
  constructor(message = "Shopping operation failed.") {
    super(message);
    this.name = "ShoppingServiceError";
  }
}

const shoppingListSelect =
  "archived_at, created_at, created_by, household_id, id, is_default, name, updated_at";

const shoppingItemSelect =
  "added_by, assigned_to, category_id, completed_at, completed_by, created_at, household_id, id, name, note, quantity, recurring_hint, shopping_list_id, status, unit, updated_at";

export async function listShoppingListsForHousehold(
  householdId: string,
): Promise<ShoppingList[]> {
  await getHouseholdForCurrentUser(householdId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shopping_lists")
    .select(shoppingListSelect)
    .eq("household_id", householdId)
    .is("archived_at", null)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    throw new ShoppingServiceError();
  }

  return data ?? [];
}

export async function getShoppingListForCurrentUser(
  householdId: string,
  shoppingListId: string,
): Promise<ShoppingList> {
  await getHouseholdForCurrentUser(householdId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shopping_lists")
    .select(shoppingListSelect)
    .eq("household_id", householdId)
    .eq("id", shoppingListId)
    .is("archived_at", null)
    .single();

  if (error || !data) {
    throw new ShoppingServiceError();
  }

  return data;
}

export async function listShoppingItemsForList(
  householdId: string,
  shoppingListId: string,
): Promise<ShoppingItemListItem[]> {
  await getShoppingListForCurrentUser(householdId, shoppingListId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shopping_items")
    .select(shoppingItemSelect)
    .eq("household_id", householdId)
    .eq("shopping_list_id", shoppingListId)
    .in("status", ["needed", "in_cart"])
    .order("created_at", { ascending: false });

  if (error) {
    throw new ShoppingServiceError();
  }

  return decorateShoppingItemsWithAssignees(data ?? []);
}

export async function listRecentlyPurchasedItems(
  householdId: string,
): Promise<ShoppingItemListItem[]> {
  await getHouseholdForCurrentUser(householdId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shopping_items")
    .select(shoppingItemSelect)
    .eq("household_id", householdId)
    .eq("status", "purchased")
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(10);

  if (error) {
    throw new ShoppingServiceError();
  }

  return decorateShoppingItemsWithAssignees(data ?? []);
}

export async function createShoppingListForCurrentUser(
  householdId: string,
  values: ShoppingListFormValues,
): Promise<ShoppingList> {
  const household = await getHouseholdForCurrentUser(householdId);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_shopping_list", {
    list_name: values.name,
    target_household_id: household.id,
  });

  if (error || !data || data.household_id !== household.id) {
    throw new ShoppingServiceError();
  }

  return data;
}

export async function updateShoppingListForCurrentUser(
  householdId: string,
  shoppingListId: string,
  values: ShoppingListFormValues,
): Promise<ShoppingList> {
  await getShoppingListForCurrentUser(householdId, shoppingListId);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_shopping_list", {
    list_name: values.name,
    target_list_id: shoppingListId,
  });

  if (error || !data || data.household_id !== householdId) {
    throw new ShoppingServiceError();
  }

  return data;
}

export async function setDefaultShoppingListForCurrentUser(
  householdId: string,
  shoppingListId: string,
): Promise<ShoppingList> {
  await getShoppingListForCurrentUser(householdId, shoppingListId);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_default_shopping_list", {
    target_list_id: shoppingListId,
  });

  if (error || !data || data.household_id !== householdId) {
    throw new ShoppingServiceError();
  }

  return data;
}

export async function archiveShoppingListForCurrentUser(
  householdId: string,
  shoppingListId: string,
): Promise<ShoppingList> {
  await getShoppingListForCurrentUser(householdId, shoppingListId);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("archive_shopping_list", {
    target_list_id: shoppingListId,
  });

  if (error || !data || data.household_id !== householdId) {
    throw new ShoppingServiceError();
  }

  return data;
}

export async function createShoppingItemForCurrentUser(
  householdId: string,
  shoppingListId: string,
  values: ShoppingItemFormValues,
): Promise<ShoppingItem> {
  await getShoppingListForCurrentUser(householdId, shoppingListId);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_shopping_item", {
    item_assigned_to: values.assignedTo,
    item_name: values.name,
    item_note: values.note,
    item_quantity: values.quantity,
    item_recurring_hint: values.recurringHint,
    item_unit: values.unit,
    target_list_id: shoppingListId,
  });

  if (error || !data || data.household_id !== householdId) {
    throw new ShoppingServiceError();
  }

  return data;
}

export async function updateShoppingItemForCurrentUser(
  householdId: string,
  shoppingListId: string,
  shoppingItemId: string,
  values: ShoppingItemFormValues,
): Promise<ShoppingItem> {
  await getShoppingItemForCurrentUser(
    householdId,
    shoppingItemId,
    shoppingListId,
  );

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_shopping_item", {
    item_assigned_to: values.assignedTo,
    item_name: values.name,
    item_note: values.note,
    item_quantity: values.quantity,
    item_recurring_hint: values.recurringHint,
    item_unit: values.unit,
    target_item_id: shoppingItemId,
  });

  if (
    error ||
    !data ||
    data.household_id !== householdId ||
    data.shopping_list_id !== shoppingListId
  ) {
    throw new ShoppingServiceError();
  }

  return data;
}

export async function setShoppingItemStatusForCurrentUser(
  householdId: string,
  shoppingListId: string,
  shoppingItemId: string,
  status: ShoppingItemStatus,
): Promise<ShoppingItem> {
  await getShoppingItemForCurrentUser(
    householdId,
    shoppingItemId,
    shoppingListId,
  );

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_shopping_item_status", {
    item_status: status,
    target_item_id: shoppingItemId,
  });

  if (
    error ||
    !data ||
    data.household_id !== householdId ||
    data.shopping_list_id !== shoppingListId
  ) {
    throw new ShoppingServiceError();
  }

  return data;
}

export async function readdShoppingItemForCurrentUser(
  householdId: string,
  shoppingItemId: string,
): Promise<ShoppingItem> {
  await getShoppingItemForCurrentUser(householdId, shoppingItemId);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("readd_shopping_item", {
    target_item_id: shoppingItemId,
  });

  if (error || !data || data.household_id !== householdId) {
    throw new ShoppingServiceError();
  }

  return data;
}

export async function getShoppingDashboardSummary(
  householdId: string,
): Promise<ShoppingDashboardSummary> {
  await getHouseholdForCurrentUser(householdId);

  const supabase = await createClient();
  const [neededResult, purchasedResult] = await Promise.all([
    supabase
      .from("shopping_items")
      .select(shoppingItemSelect)
      .eq("household_id", householdId)
      .in("status", ["needed", "in_cart"])
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("shopping_items")
      .select(shoppingItemSelect)
      .eq("household_id", householdId)
      .eq("status", "purchased")
      .order("completed_at", { ascending: false, nullsFirst: false })
      .limit(5),
  ]);

  if (neededResult.error || purchasedResult.error) {
    throw new ShoppingServiceError();
  }

  return {
    neededItems: await decorateShoppingItemsWithAssignees(
      neededResult.data ?? [],
    ),
    recentPurchased: await decorateShoppingItemsWithAssignees(
      purchasedResult.data ?? [],
    ),
  };
}

export async function listShoppingFormMembers(householdId: string) {
  return listHouseholdMembers(householdId);
}

async function getShoppingItemForCurrentUser(
  householdId: string,
  shoppingItemId: string,
  shoppingListId?: string,
): Promise<ShoppingItem> {
  await getHouseholdForCurrentUser(householdId);

  const supabase = await createClient();
  let query = supabase
    .from("shopping_items")
    .select(shoppingItemSelect)
    .eq("household_id", householdId)
    .eq("id", shoppingItemId);

  if (shoppingListId) {
    query = query.eq("shopping_list_id", shoppingListId);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    throw new ShoppingServiceError();
  }

  return data;
}

async function decorateShoppingItemsWithAssignees(
  items: ShoppingItem[],
): Promise<ShoppingItemListItem[]> {
  const profileIds = [
    ...new Set(
      items.flatMap((item) => (item.assigned_to ? [item.assigned_to] : [])),
    ),
  ];

  if (profileIds.length === 0) {
    return items.map((item) => ({ ...item, assignee: null }));
  }

  const profiles = await getProfilesByIds(profileIds);

  return items.map((item) => ({
    ...item,
    assignee: item.assigned_to
      ? (profiles.get(item.assigned_to) ?? null)
      : null,
  }));
}

async function getProfilesByIds(
  profileIds: string[],
): Promise<Map<string, ProfileSummary>> {
  if (profileIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, id")
    .in("id", profileIds);

  if (error) {
    throw new ShoppingServiceError();
  }

  return new Map((data ?? []).map((profile) => [profile.id, profile] as const));
}
