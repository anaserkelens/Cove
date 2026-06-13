"use server";

import { redirect } from "next/navigation";

import { getFormString } from "@/lib/forms/form-data";
import { calendarEventFormSchema } from "@/lib/validation/calendar";
import {
  archiveCalendarEventForCurrentUser,
  createCalendarEventForCurrentUser,
  updateCalendarEventForCurrentUser,
} from "@/server/calendar/service";

export async function createCalendarEventAction(
  householdId: string,
  formData: FormData,
) {
  const parsed = calendarEventFormSchema.safeParse(
    readCalendarEventForm(formData),
  );

  if (!parsed.success) {
    redirect(`/app/${householdId}/calendar/new?error=invalid-calendar-event`);
  }

  let eventId: string;

  try {
    const event = await createCalendarEventForCurrentUser(
      householdId,
      parsed.data,
    );
    eventId = event.id;
  } catch {
    redirect(
      `/app/${householdId}/calendar/new?error=create-calendar-event-failed`,
    );
  }

  redirect(`/app/${householdId}/calendar/${eventId}?status=calendar-created`);
}

export async function updateCalendarEventAction(
  householdId: string,
  eventId: string,
  formData: FormData,
) {
  const parsed = calendarEventFormSchema.safeParse(
    readCalendarEventForm(formData),
  );

  if (!parsed.success) {
    redirect(
      `/app/${householdId}/calendar/${eventId}?error=invalid-calendar-event`,
    );
  }

  try {
    await updateCalendarEventForCurrentUser(householdId, eventId, parsed.data);
  } catch {
    redirect(
      `/app/${householdId}/calendar/${eventId}?error=update-calendar-event-failed`,
    );
  }

  redirect(`/app/${householdId}/calendar/${eventId}?status=calendar-updated`);
}

export async function archiveCalendarEventAction(
  householdId: string,
  eventId: string,
  _formData: FormData,
) {
  void _formData;

  try {
    await archiveCalendarEventForCurrentUser(householdId, eventId);
  } catch {
    redirect(
      `/app/${householdId}/calendar/${eventId}?error=archive-calendar-event-failed`,
    );
  }

  redirect(`/app/${householdId}/calendar?status=calendar-archived`);
}

function readCalendarEventForm(formData: FormData) {
  return {
    assignedTo: getFormString(formData, "assignedTo"),
    description: getFormString(formData, "description"),
    endDate: getFormString(formData, "endDate"),
    endsAtLocal: getFormString(formData, "endsAtLocal"),
    eventKind: getFormString(formData, "eventKind", "timed"),
    location: getFormString(formData, "location"),
    recurrenceDayOfMonth: getFormString(formData, "recurrenceDayOfMonth", "1"),
    recurrenceInterval: getFormString(formData, "recurrenceInterval", "1"),
    recurrenceMonth: getFormString(formData, "recurrenceMonth", "1"),
    recurrencePreset: getFormString(formData, "recurrencePreset", "none"),
    recurrenceWeekdays: formData
      .getAll("recurrenceWeekdays")
      .filter((value): value is string => typeof value === "string"),
    startDate: getFormString(formData, "startDate"),
    startsAtLocal: getFormString(formData, "startsAtLocal"),
    timezone: getFormString(formData, "timezone", "UTC"),
    title: getFormString(formData, "title"),
  };
}
