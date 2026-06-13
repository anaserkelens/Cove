import {
  addDaysToDateOnly,
  compareDateOnly,
  getDateOnlyInTimeZone,
} from "@/lib/dates/date-only";
import { zonedDateTimeToUtcIso } from "@/lib/dates/zoned-date-time";
import { createClient } from "@/lib/supabase/server";
import type {
  CalendarEvent,
  CalendarEventFormValues,
} from "@/lib/validation/calendar";
import { serializeCalendarFormRecurrence } from "@/lib/validation/calendar";
import {
  getHouseholdForCurrentUser,
  listHouseholdMembers,
} from "@/server/households/service";

type ProfileSummary = {
  display_name: string | null;
  id: string;
};

export type CalendarEventListItem = CalendarEvent & {
  assignee: ProfileSummary | null;
};

export type CalendarDashboardSummary = {
  comingUp: CalendarEventListItem[];
  today: CalendarEventListItem[];
};

export class CalendarServiceError extends Error {
  constructor(message = "Calendar operation failed.") {
    super(message);
    this.name = "CalendarServiceError";
  }
}

const calendarEventSelect =
  "all_day, archived_at, assigned_to, category_id, created_at, created_by, description, end_date, ends_at, household_id, id, location, recurrence_rule, recurrence_timezone, start_date, starts_at, timezone, title, updated_at";

export async function listUpcomingCalendarEventsForHousehold(
  householdId: string,
): Promise<CalendarEventListItem[]> {
  const household = await getHouseholdForCurrentUser(householdId);
  const today = getDateOnlyInTimeZone(new Date(), household.timezone);
  const rangeEnd = addDaysToDateOnly(today, 30);
  const rangeEndIso = zonedDateTimeToUtcIso(
    `${rangeEnd}T23:59`,
    household.timezone,
  );
  const nowIso = new Date().toISOString();
  const supabase = await createClient();

  const [timedResult, allDayResult] = await Promise.all([
    supabase
      .from("calendar_events")
      .select(calendarEventSelect)
      .eq("household_id", householdId)
      .eq("all_day", false)
      .is("archived_at", null)
      .gte("starts_at", nowIso)
      .lte("starts_at", rangeEndIso)
      .order("starts_at", { ascending: true })
      .limit(50),
    supabase
      .from("calendar_events")
      .select(calendarEventSelect)
      .eq("household_id", householdId)
      .eq("all_day", true)
      .is("archived_at", null)
      .lte("start_date", rangeEnd)
      .order("start_date", { ascending: true })
      .limit(50),
  ]);

  if (timedResult.error || allDayResult.error) {
    throw new CalendarServiceError();
  }

  const allDayEvents = (allDayResult.data ?? []).filter((event) =>
    isAllDayEventInRange(event, today, rangeEnd),
  );

  return decorateCalendarEventsWithAssignees(
    sortCalendarEvents([...(timedResult.data ?? []), ...allDayEvents]),
  );
}

export async function getCalendarEventForCurrentUser(
  householdId: string,
  eventId: string,
): Promise<CalendarEventListItem> {
  await getHouseholdForCurrentUser(householdId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calendar_events")
    .select(calendarEventSelect)
    .eq("household_id", householdId)
    .eq("id", eventId)
    .is("archived_at", null)
    .single();

  if (error || !data) {
    throw new CalendarServiceError();
  }

  const [event] = await decorateCalendarEventsWithAssignees([data]);
  return event;
}

export async function createCalendarEventForCurrentUser(
  householdId: string,
  values: CalendarEventFormValues,
): Promise<CalendarEvent> {
  const household = await getHouseholdForCurrentUser(householdId);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_calendar_event", {
    event_all_day: values.allDay,
    event_assigned_to: values.assignedTo,
    event_description: values.description,
    event_end_date: values.endDate,
    event_ends_at: values.endsAt,
    event_location: values.location,
    event_recurrence_rule: serializeCalendarFormRecurrence(values),
    event_recurrence_timezone: values.recurrenceTimezone,
    event_start_date: values.startDate,
    event_starts_at: values.startsAt,
    event_timezone: values.timezone,
    event_title: values.title,
    target_household_id: household.id,
  });

  if (error || !data || data.household_id !== household.id) {
    throw new CalendarServiceError();
  }

  return data;
}

export async function updateCalendarEventForCurrentUser(
  householdId: string,
  eventId: string,
  values: CalendarEventFormValues,
): Promise<CalendarEvent> {
  await getCalendarEventForCurrentUser(householdId, eventId);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_calendar_event", {
    event_all_day: values.allDay,
    event_assigned_to: values.assignedTo,
    event_description: values.description,
    event_end_date: values.endDate,
    event_ends_at: values.endsAt,
    event_location: values.location,
    event_recurrence_rule: serializeCalendarFormRecurrence(values),
    event_recurrence_timezone: values.recurrenceTimezone,
    event_start_date: values.startDate,
    event_starts_at: values.startsAt,
    event_timezone: values.timezone,
    event_title: values.title,
    target_event_id: eventId,
  });

  if (error || !data || data.household_id !== householdId) {
    throw new CalendarServiceError();
  }

  return data;
}

export async function archiveCalendarEventForCurrentUser(
  householdId: string,
  eventId: string,
): Promise<CalendarEvent> {
  await getCalendarEventForCurrentUser(householdId, eventId);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("archive_calendar_event", {
    target_event_id: eventId,
  });

  if (error || !data || data.household_id !== householdId) {
    throw new CalendarServiceError();
  }

  return data;
}

export async function getCalendarDashboardSummary(
  householdId: string,
): Promise<CalendarDashboardSummary> {
  const household = await getHouseholdForCurrentUser(householdId);
  const today = getDateOnlyInTimeZone(new Date(), household.timezone);
  const tomorrow = addDaysToDateOnly(today, 1);
  const comingUpEnd = addDaysToDateOnly(today, 7);
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

  const [
    todayTimedResult,
    todayAllDayResult,
    comingUpTimedResult,
    comingUpAllDayResult,
  ] = await Promise.all([
    supabase
      .from("calendar_events")
      .select(calendarEventSelect)
      .eq("household_id", householdId)
      .eq("all_day", false)
      .is("archived_at", null)
      .gte("starts_at", dayStartIso)
      .lt("starts_at", dayEndIso)
      .order("starts_at", { ascending: true })
      .limit(5),
    supabase
      .from("calendar_events")
      .select(calendarEventSelect)
      .eq("household_id", householdId)
      .eq("all_day", true)
      .is("archived_at", null)
      .lte("start_date", today)
      .order("start_date", { ascending: true })
      .limit(10),
    supabase
      .from("calendar_events")
      .select(calendarEventSelect)
      .eq("household_id", householdId)
      .eq("all_day", false)
      .is("archived_at", null)
      .gte("starts_at", dayEndIso)
      .lte("starts_at", comingUpEndIso)
      .order("starts_at", { ascending: true })
      .limit(5),
    supabase
      .from("calendar_events")
      .select(calendarEventSelect)
      .eq("household_id", householdId)
      .eq("all_day", true)
      .is("archived_at", null)
      .gt("start_date", today)
      .lte("start_date", comingUpEnd)
      .order("start_date", { ascending: true })
      .limit(5),
  ]);

  if (
    todayTimedResult.error ||
    todayAllDayResult.error ||
    comingUpTimedResult.error ||
    comingUpAllDayResult.error
  ) {
    throw new CalendarServiceError();
  }

  const todayAllDayEvents = (todayAllDayResult.data ?? []).filter((event) =>
    isAllDayEventOnDate(event, today),
  );

  return {
    comingUp: await decorateCalendarEventsWithAssignees(
      sortCalendarEvents([
        ...(comingUpTimedResult.data ?? []),
        ...(comingUpAllDayResult.data ?? []),
      ]),
    ),
    today: await decorateCalendarEventsWithAssignees(
      sortCalendarEvents([
        ...(todayTimedResult.data ?? []),
        ...todayAllDayEvents,
      ]),
    ),
  };
}

export async function listCalendarFormMembers(householdId: string) {
  return listHouseholdMembers(householdId);
}

function isAllDayEventOnDate(
  event: Pick<CalendarEvent, "end_date" | "start_date">,
  date: string,
): boolean {
  if (!event.start_date) {
    return false;
  }

  const endDate = event.end_date ?? event.start_date;

  return (
    compareDateOnly(event.start_date, date) <= 0 &&
    compareDateOnly(endDate, date) >= 0
  );
}

function isAllDayEventInRange(
  event: Pick<CalendarEvent, "end_date" | "start_date">,
  startDate: string,
  endDate: string,
): boolean {
  if (!event.start_date) {
    return false;
  }

  const eventEndDate = event.end_date ?? event.start_date;

  return (
    compareDateOnly(eventEndDate, startDate) >= 0 &&
    compareDateOnly(event.start_date, endDate) <= 0
  );
}

function sortCalendarEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((left, right) =>
    getCalendarEventSortValue(left).localeCompare(
      getCalendarEventSortValue(right),
    ),
  );
}

function getCalendarEventSortValue(event: CalendarEvent): string {
  return event.all_day
    ? `${event.start_date ?? "9999-12-31"}T00:00:00.000Z`
    : (event.starts_at ?? "9999-12-31T00:00:00.000Z");
}

async function decorateCalendarEventsWithAssignees(
  events: CalendarEvent[],
): Promise<CalendarEventListItem[]> {
  const profileIds = [
    ...new Set(
      events.flatMap((event) => (event.assigned_to ? [event.assigned_to] : [])),
    ),
  ];

  if (profileIds.length === 0) {
    return events.map((event) => ({ ...event, assignee: null }));
  }

  const profiles = await getProfilesByIds(profileIds);

  return events.map((event) => ({
    ...event,
    assignee: event.assigned_to
      ? (profiles.get(event.assigned_to) ?? null)
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
    throw new CalendarServiceError();
  }

  return new Map((data ?? []).map((profile) => [profile.id, profile] as const));
}
