import {
  addDaysToDateOnly,
  getDateOnlyInTimeZone,
} from "@/lib/dates/date-only";
import { zonedDateTimeToUtcIso } from "@/lib/dates/zoned-date-time";
import { createClient } from "@/lib/supabase/server";
import type { Reminder, ReminderFormValues } from "@/lib/validation/reminder";
import type { HouseholdEntityType } from "@/lib/validation/attachment";
import {
  getHouseholdForCurrentUser,
  listHouseholdMembers,
} from "@/server/households/service";

type ProfileSummary = {
  display_name: string | null;
  id: string;
};

export type ReminderListItem = Reminder & {
  creator: ProfileSummary | null;
  recipient: ProfileSummary | null;
};

export type ReminderDashboardSummary = {
  comingUp: ReminderListItem[];
  dueToday: ReminderListItem[];
  needsAttention: ReminderListItem[];
};

export class ReminderServiceError extends Error {
  constructor(message = "Reminder operation failed.") {
    super(message);
    this.name = "ReminderServiceError";
  }
}

const reminderSelect =
  "channel, created_at, created_by, dedupe_key, entity_id, entity_type, household_id, id, recipient_user_id, remind_at, sent_at, status, title, updated_at";

export async function getReminderDashboardSummary(
  householdId: string,
): Promise<ReminderDashboardSummary> {
  const household = await getHouseholdForCurrentUser(householdId);
  const today = getDateOnlyInTimeZone(new Date(), household.timezone);
  const tomorrow = addDaysToDateOnly(today, 1);
  const comingUpEnd = addDaysToDateOnly(today, 7);
  const nowIso = new Date().toISOString();
  const dayStartIso = zonedDateTimeToUtcIso(
    `${today}T00:00`,
    household.timezone,
  );
  const dayEndIso = zonedDateTimeToUtcIso(
    `${tomorrow}T00:00`,
    household.timezone,
  );
  const comingUpEndIso = zonedDateTimeToUtcIso(
    `${comingUpEnd}T23:59`,
    household.timezone,
  );
  const supabase = await createClient();

  const [attentionResult, todayResult, comingUpResult] = await Promise.all([
    supabase
      .from("reminders")
      .select(reminderSelect)
      .eq("household_id", householdId)
      .eq("status", "pending")
      .lt("remind_at", nowIso)
      .order("remind_at", { ascending: true })
      .limit(8),
    supabase
      .from("reminders")
      .select(reminderSelect)
      .eq("household_id", householdId)
      .eq("status", "pending")
      .gte("remind_at", dayStartIso)
      .lt("remind_at", dayEndIso)
      .order("remind_at", { ascending: true })
      .limit(8),
    supabase
      .from("reminders")
      .select(reminderSelect)
      .eq("household_id", householdId)
      .eq("status", "pending")
      .gte("remind_at", dayEndIso)
      .lte("remind_at", comingUpEndIso)
      .order("remind_at", { ascending: true })
      .limit(8),
  ]);

  if (attentionResult.error || todayResult.error || comingUpResult.error) {
    throw new ReminderServiceError();
  }

  return {
    comingUp: await decorateReminders(comingUpResult.data ?? []),
    dueToday: await decorateReminders(todayResult.data ?? []),
    needsAttention: await decorateReminders(attentionResult.data ?? []),
  };
}

export async function listPendingRemindersForHousehold(
  householdId: string,
): Promise<ReminderListItem[]> {
  await getHouseholdForCurrentUser(householdId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reminders")
    .select(reminderSelect)
    .eq("household_id", householdId)
    .eq("status", "pending")
    .order("remind_at", { ascending: true })
    .limit(100);

  if (error) {
    throw new ReminderServiceError();
  }

  return decorateReminders(data ?? []);
}

export async function listPendingRemindersForEntity(
  householdId: string,
  entityType: HouseholdEntityType,
  entityId: string,
): Promise<ReminderListItem[]> {
  await getHouseholdForCurrentUser(householdId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reminders")
    .select(reminderSelect)
    .eq("household_id", householdId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("status", "pending")
    .order("remind_at", { ascending: true })
    .limit(30);

  if (error) {
    throw new ReminderServiceError();
  }

  return decorateReminders(data ?? []);
}

export async function createReminderForCurrentUser(
  householdId: string,
  entityType: HouseholdEntityType,
  entityId: string,
  values: ReminderFormValues,
): Promise<Reminder> {
  const household = await getHouseholdForCurrentUser(householdId);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_reminder", {
    reminder_entity_id: entityId,
    reminder_entity_type: entityType,
    reminder_recipient_user_id: values.recipientUserId,
    reminder_remind_at: values.remindAt,
    reminder_title: values.title,
    target_household_id: household.id,
  });

  if (error || !data || data.household_id !== household.id) {
    throw new ReminderServiceError();
  }

  return data;
}

export async function markReminderSentForCurrentUser(
  householdId: string,
  reminderId: string,
): Promise<Reminder> {
  await getHouseholdForCurrentUser(householdId);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mark_reminder_sent", {
    target_reminder_id: reminderId,
  });

  if (error || !data || data.household_id !== householdId) {
    throw new ReminderServiceError();
  }

  return data;
}

export async function cancelReminderForCurrentUser(
  householdId: string,
  reminderId: string,
): Promise<Reminder> {
  await getHouseholdForCurrentUser(householdId);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_reminder", {
    target_reminder_id: reminderId,
  });

  if (error || !data || data.household_id !== householdId) {
    throw new ReminderServiceError();
  }

  return data;
}

export async function listReminderFormMembers(householdId: string) {
  return listHouseholdMembers(householdId);
}

async function decorateReminders(
  reminders: Reminder[],
): Promise<ReminderListItem[]> {
  const profileIds = [
    ...new Set(
      reminders.flatMap((reminder) => [
        reminder.created_by,
        ...(reminder.recipient_user_id ? [reminder.recipient_user_id] : []),
      ]),
    ),
  ];

  if (profileIds.length === 0) {
    return reminders.map((reminder) => ({
      ...reminder,
      creator: null,
      recipient: null,
    }));
  }

  const profiles = await getProfilesByIds(profileIds);

  return reminders.map((reminder) => ({
    ...reminder,
    creator: profiles.get(reminder.created_by) ?? null,
    recipient: reminder.recipient_user_id
      ? (profiles.get(reminder.recipient_user_id) ?? null)
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
    throw new ReminderServiceError();
  }

  return new Map((data ?? []).map((profile) => [profile.id, profile] as const));
}
