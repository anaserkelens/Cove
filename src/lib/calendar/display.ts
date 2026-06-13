import type { CalendarEvent } from "@/lib/validation/calendar";

type CalendarEventTimeParts = Pick<
  CalendarEvent,
  "all_day" | "end_date" | "ends_at" | "start_date" | "starts_at" | "timezone"
>;

export function formatCalendarEventTime(event: CalendarEventTimeParts): string {
  if (event.all_day) {
    return formatAllDayRange(event.start_date, event.end_date);
  }

  if (!event.starts_at) {
    return "No start time";
  }

  const start = formatDateTime(event.starts_at, event.timezone);
  const end = event.ends_at
    ? formatDateTime(event.ends_at, event.timezone)
    : "";

  return end ? `${start} - ${end}` : start;
}

export function formatCalendarEventKind(event: Pick<CalendarEvent, "all_day">) {
  return event.all_day ? "All-day" : "Timed";
}

export function formatCalendarRecurrence(value: string | null): string {
  if (!value) {
    return "Does not repeat";
  }

  try {
    const parsed = JSON.parse(value) as { preset?: string };
    return parsed.preset ? parsed.preset.replaceAll("_", " ") : "Repeats";
  } catch {
    return "Repeats";
  }
}

function formatAllDayRange(
  startDate: string | null,
  endDate: string | null,
): string {
  if (!startDate) {
    return "No date";
  }

  const start = formatDateOnly(startDate);
  const end = endDate ? formatDateOnly(endDate) : "";

  return end && end !== start ? `${start} - ${end}` : start;
}

function formatDateOnly(value: string): string {
  const [year, month, day] = value.split("-").map(Number);

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatDateTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}
