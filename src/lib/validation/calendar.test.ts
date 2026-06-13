import { describe, expect, it } from "vitest";

import { calendarEventFormSchema } from "@/lib/validation/calendar";

const baseForm = {
  assignedTo: "",
  description: "",
  endDate: "",
  endsAtLocal: "",
  eventKind: "timed",
  location: "",
  recurrenceDayOfMonth: "1",
  recurrenceInterval: "1",
  recurrenceMonth: "1",
  recurrencePreset: "none",
  recurrenceWeekdays: [],
  startDate: "",
  startsAtLocal: "2026-06-13T09:30",
  timezone: "Europe/Amsterdam",
  title: "Dentist",
};

describe("calendarEventFormSchema", () => {
  it("normalizes timed events into UTC instants", () => {
    expect(calendarEventFormSchema.parse(baseForm)).toMatchObject({
      allDay: false,
      endsAt: null,
      startsAt: "2026-06-13T07:30:00.000Z",
      timezone: "Europe/Amsterdam",
      title: "Dentist",
    });
  });

  it("normalizes all-day events with date fields only", () => {
    expect(
      calendarEventFormSchema.parse({
        ...baseForm,
        endDate: "2026-06-15",
        eventKind: "all_day",
        startDate: "2026-06-13",
        startsAtLocal: "",
        title: "Family visit",
      }),
    ).toMatchObject({
      allDay: true,
      endDate: "2026-06-15",
      endsAt: null,
      startDate: "2026-06-13",
      startsAt: null,
    });
  });

  it("rejects all-day events where the end date precedes the start date", () => {
    expect(
      calendarEventFormSchema.safeParse({
        ...baseForm,
        endDate: "2026-06-12",
        eventKind: "all_day",
        startDate: "2026-06-13",
        startsAtLocal: "",
      }).success,
    ).toBe(false);
  });

  it("rejects timed events where the end time precedes the start time", () => {
    expect(
      calendarEventFormSchema.safeParse({
        ...baseForm,
        endsAtLocal: "2026-06-13T08:30",
      }).success,
    ).toBe(false);
  });

  it("uses the shared recurrence JSON foundation", () => {
    expect(
      calendarEventFormSchema.parse({
        ...baseForm,
        recurrencePreset: "weekly",
        recurrenceWeekdays: ["1", "3"],
      }),
    ).toMatchObject({
      recurrenceRule: {
        preset: "weekly",
        weekdays: [1, 3],
      },
      recurrenceTimezone: "Europe/Amsterdam",
    });
  });
});
