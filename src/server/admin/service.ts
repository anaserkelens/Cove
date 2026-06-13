import {
  addDaysToDateOnly,
  getDateOnlyInTimeZone,
} from "@/lib/dates/date-only";
import { createClient } from "@/lib/supabase/server";
import type {
  AdminItem,
  AdminItemEvent,
  AdminItemFormValues,
  AdminItemStatus,
} from "@/lib/validation/admin";
import {
  activeAdminItemStatuses,
  isAdminItemComingUp,
  isAdminItemDueToday,
  isAdminItemNeedsAttention,
  serializeAdminFormRecurrence,
} from "@/lib/validation/admin";
import {
  getHouseholdForCurrentUser,
  listHouseholdMembers,
} from "@/server/households/service";

type ProfileSummary = {
  display_name: string | null;
  id: string;
};

export type AdminItemListItem = AdminItem & {
  owner: ProfileSummary | null;
};

export type AdminItemEventWithActor = AdminItemEvent & {
  actor: ProfileSummary | null;
};

export type AdminDashboardSummary = {
  comingUp: AdminItemListItem[];
  dueToday: AdminItemListItem[];
  needsAttention: AdminItemListItem[];
  today: string;
};

export class AdminServiceError extends Error {
  constructor(message = "Home Admin operation failed.") {
    super(message);
    this.name = "AdminServiceError";
  }
}

const adminItemSelect =
  "action_date, amount_minor, archived_at, auto_pay, category_id, created_at, created_by, currency_code, description, due_date, expiry_date, household_id, id, next_occurrence_date, notes, owner_id, paid_at, provider_name, recurrence_rule, recurrence_source_id, recurrence_timezone, reference_number, status, title, type, updated_at";

const adminItemEventSelect =
  "actor_id, admin_item_id, created_at, event_type, household_id, id, metadata, occurred_at, updated_at";

export async function getAdminDashboardSummary(
  householdId: string,
): Promise<AdminDashboardSummary> {
  const household = await getHouseholdForCurrentUser(householdId);
  const today = getDateOnlyInTimeZone(new Date(), household.timezone);
  const comingUpEnd = addDaysToDateOnly(today, 30);
  const expiryAttentionEnd = addDaysToDateOnly(today, 30);
  const items = await listOpenAdminItems(householdId);
  const needsAttention = items
    .filter((item) =>
      isAdminItemNeedsAttention(item, today, expiryAttentionEnd),
    )
    .slice(0, 8);

  return {
    comingUp: items
      .filter(
        (item) =>
          isAdminItemComingUp(item, today, comingUpEnd) &&
          !isAdminItemNeedsAttention(item, today, expiryAttentionEnd),
      )
      .slice(0, 8),
    dueToday: items
      .filter((item) => isAdminItemDueToday(item, today))
      .slice(0, 8),
    needsAttention,
    today,
  };
}

export async function listAdminItemsForHousehold(
  householdId: string,
): Promise<AdminItemListItem[]> {
  return listOpenAdminItems(householdId);
}

export async function getAdminItemForCurrentUser(
  householdId: string,
  itemId: string,
): Promise<AdminItemListItem> {
  await getHouseholdForCurrentUser(householdId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_items")
    .select(adminItemSelect)
    .eq("household_id", householdId)
    .eq("id", itemId)
    .is("archived_at", null)
    .single();

  if (error || !data) {
    throw new AdminServiceError();
  }

  const [item] = await decorateAdminItemsWithOwners([data]);
  return item;
}

export async function listAdminItemEventsForCurrentUser(
  householdId: string,
  itemId: string,
): Promise<AdminItemEventWithActor[]> {
  await getAdminItemForCurrentUser(householdId, itemId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_item_events")
    .select(adminItemEventSelect)
    .eq("household_id", householdId)
    .eq("admin_item_id", itemId)
    .order("occurred_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new AdminServiceError();
  }

  return decorateAdminItemEventsWithActors(data ?? []);
}

export async function createAdminItemForCurrentUser(
  householdId: string,
  values: AdminItemFormValues,
): Promise<AdminItem> {
  const household = await getHouseholdForCurrentUser(householdId);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_admin_item", {
    item_action_date: values.actionDate,
    item_amount_minor: values.amountMinor,
    item_auto_pay: values.autoPay,
    item_currency_code: values.currencyCode,
    item_description: values.description,
    item_due_date: values.dueDate,
    item_expiry_date: values.expiryDate,
    item_notes: values.notes,
    item_owner_id: values.ownerId,
    item_provider_name: values.providerName,
    item_recurrence_rule: serializeAdminFormRecurrence(values),
    item_recurrence_timezone: values.recurrenceTimezone,
    item_reference_number: values.referenceNumber,
    item_title: values.title,
    item_type: values.type,
    target_household_id: household.id,
  });

  if (error || !data || data.household_id !== household.id) {
    throw new AdminServiceError();
  }

  return data;
}

export async function updateAdminItemForCurrentUser(
  householdId: string,
  itemId: string,
  values: AdminItemFormValues,
): Promise<AdminItem> {
  await getAdminItemForCurrentUser(householdId, itemId);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_admin_item", {
    item_action_date: values.actionDate,
    item_amount_minor: values.amountMinor,
    item_auto_pay: values.autoPay,
    item_currency_code: values.currencyCode,
    item_description: values.description,
    item_due_date: values.dueDate,
    item_expiry_date: values.expiryDate,
    item_notes: values.notes,
    item_owner_id: values.ownerId,
    item_provider_name: values.providerName,
    item_recurrence_rule: serializeAdminFormRecurrence(values),
    item_recurrence_timezone: values.recurrenceTimezone,
    item_reference_number: values.referenceNumber,
    item_title: values.title,
    item_type: values.type,
    target_item_id: itemId,
  });

  if (error || !data || data.household_id !== householdId) {
    throw new AdminServiceError();
  }

  return data;
}

export async function setAdminItemStatusForCurrentUser(
  householdId: string,
  itemId: string,
  status: AdminItemStatus,
): Promise<AdminItem> {
  await getAdminItemForCurrentUser(householdId, itemId);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_admin_item_status", {
    item_status: status,
    target_item_id: itemId,
  });

  if (error || !data || data.household_id !== householdId) {
    throw new AdminServiceError();
  }

  return data;
}

export async function archiveAdminItemForCurrentUser(
  householdId: string,
  itemId: string,
): Promise<AdminItem> {
  await getAdminItemForCurrentUser(householdId, itemId);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("archive_admin_item", {
    target_item_id: itemId,
  });

  if (error || !data || data.household_id !== householdId) {
    throw new AdminServiceError();
  }

  return data;
}

export async function listAdminFormMembers(householdId: string) {
  return listHouseholdMembers(householdId);
}

async function listOpenAdminItems(
  householdId: string,
): Promise<AdminItemListItem[]> {
  await getHouseholdForCurrentUser(householdId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_items")
    .select(adminItemSelect)
    .eq("household_id", householdId)
    .is("archived_at", null)
    .in("status", [...activeAdminItemStatuses])
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("action_date", { ascending: true, nullsFirst: false })
    .order("expiry_date", { ascending: true, nullsFirst: false })
    .limit(100);

  if (error) {
    throw new AdminServiceError();
  }

  return decorateAdminItemsWithOwners(sortAdminItems(data ?? []));
}

function sortAdminItems(items: AdminItem[]): AdminItem[] {
  return [...items].sort((left, right) =>
    getAdminItemSortDate(left).localeCompare(getAdminItemSortDate(right)),
  );
}

function getAdminItemSortDate(
  item: Pick<AdminItem, "action_date" | "due_date" | "expiry_date">,
): string {
  return item.due_date ?? item.action_date ?? item.expiry_date ?? "9999-12-31";
}

async function decorateAdminItemsWithOwners(
  items: AdminItem[],
): Promise<AdminItemListItem[]> {
  const profileIds = [
    ...new Set(items.flatMap((item) => (item.owner_id ? [item.owner_id] : []))),
  ];

  if (profileIds.length === 0) {
    return items.map((item) => ({ ...item, owner: null }));
  }

  const profiles = await getProfilesByIds(profileIds);

  return items.map((item) => ({
    ...item,
    owner: item.owner_id ? (profiles.get(item.owner_id) ?? null) : null,
  }));
}

async function decorateAdminItemEventsWithActors(
  events: AdminItemEvent[],
): Promise<AdminItemEventWithActor[]> {
  const profileIds = [
    ...new Set(
      events.flatMap((event) => (event.actor_id ? [event.actor_id] : [])),
    ),
  ];

  if (profileIds.length === 0) {
    return events.map((event) => ({ ...event, actor: null }));
  }

  const profiles = await getProfilesByIds(profileIds);

  return events.map((event) => ({
    ...event,
    actor: event.actor_id ? (profiles.get(event.actor_id) ?? null) : null,
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
    throw new AdminServiceError();
  }

  return new Map((data ?? []).map((profile) => [profile.id, profile] as const));
}
