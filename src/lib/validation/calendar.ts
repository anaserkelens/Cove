import { z } from "zod";

import { compareDateOnly, isDateOnly } from "@/lib/dates/date-only";
import {
  isDateTimeLocal,
  zonedDateTimeToUtcIso,
} from "@/lib/dates/zoned-date-time";
import type { TaskRecurrenceRule } from "@/lib/recurrence/tasks";
import { serializeTaskRecurrenceRule } from "@/lib/recurrence/tasks";
import { isValidTimeZone } from "@/lib/validation/profile";
import type { Database } from "@/types/database";

export type CalendarEvent =
  Database["public"]["Tables"]["calendar_events"]["Row"];

export const calendarEventKinds = ["timed", "all_day"] as const;

const optionalDateOnlySchema = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .refine((value) => value === null || isDateOnly(value), {
    message: "Enter a valid date.",
  });

const optionalDateTimeLocalSchema = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .refine((value) => value === null || isDateTimeLocal(value), {
    message: "Enter a valid date and time.",
  });

const optionalUuidSchema = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .refine(
    (value) => value === null || z.string().uuid().safeParse(value).success,
    {
      message: "Choose a valid household member.",
    },
  );

const numberStringSchema = z.string().trim().regex(/^\d+$/).transform(Number);

export const rawCalendarEventFormSchema = z.object({
  assignedTo: optionalUuidSchema,
  description: z
    .string()
    .trim()
    .max(2000)
    .transform((value) => (value.length > 0 ? value : null)),
  endDate: optionalDateOnlySchema,
  endsAtLocal: optionalDateTimeLocalSchema,
  eventKind: z.enum(calendarEventKinds).default("timed"),
  location: z
    .string()
    .trim()
    .max(240)
    .transform((value) => (value.length > 0 ? value : null)),
  recurrenceDayOfMonth: numberStringSchema.default(1),
  recurrenceInterval: numberStringSchema.default(1),
  recurrenceMonth: numberStringSchema.default(1),
  recurrencePreset: z
    .enum(["none", "daily", "weekly", "every_n_weeks", "monthly", "yearly"])
    .default("none"),
  recurrenceWeekdays: z.array(numberStringSchema).default([]),
  startDate: optionalDateOnlySchema,
  startsAtLocal: optionalDateTimeLocalSchema,
  timezone: z.string().trim().refine(isValidTimeZone, {
    message: "Choose a valid IANA time zone.",
  }),
  title: z.string().trim().min(1).max(160),
});

export const calendarEventFormSchema = rawCalendarEventFormSchema.transform(
  (values, context) => {
    const recurrenceRule = buildCalendarRecurrenceRule(values, context);

    if (values.eventKind === "all_day") {
      if (!values.startDate) {
        addIssue(context, "All-day events need a start date.", ["startDate"]);
        return z.NEVER;
      }

      if (
        values.endDate &&
        compareDateOnly(values.endDate, values.startDate) < 0
      ) {
        addIssue(context, "End date cannot be before start date.", ["endDate"]);
        return z.NEVER;
      }

      return {
        allDay: true,
        assignedTo: values.assignedTo,
        description: values.description,
        endDate: values.endDate,
        endsAt: null,
        location: values.location,
        recurrenceRule,
        recurrenceTimezone: recurrenceRule ? values.timezone : null,
        startDate: values.startDate,
        startsAt: null,
        timezone: values.timezone,
        title: values.title,
      };
    }

    if (!values.startsAtLocal) {
      addIssue(context, "Timed events need a start time.", ["startsAtLocal"]);
      return z.NEVER;
    }

    let startsAt: string;
    let endsAt: string | null = null;

    try {
      startsAt = zonedDateTimeToUtcIso(values.startsAtLocal, values.timezone);
      endsAt = values.endsAtLocal
        ? zonedDateTimeToUtcIso(values.endsAtLocal, values.timezone)
        : null;
    } catch {
      addIssue(context, "Enter a valid date and time.", ["startsAtLocal"]);
      return z.NEVER;
    }

    if (endsAt && endsAt < startsAt) {
      addIssue(context, "End time cannot be before start time.", [
        "endsAtLocal",
      ]);
      return z.NEVER;
    }

    return {
      allDay: false,
      assignedTo: values.assignedTo,
      description: values.description,
      endDate: null,
      endsAt,
      location: values.location,
      recurrenceRule,
      recurrenceTimezone: recurrenceRule ? values.timezone : null,
      startDate: null,
      startsAt,
      timezone: values.timezone,
      title: values.title,
    };
  },
);

export type CalendarEventFormValues = z.infer<typeof calendarEventFormSchema>;

export function serializeCalendarFormRecurrence(
  values: Pick<CalendarEventFormValues, "recurrenceRule">,
): string | null {
  return serializeTaskRecurrenceRule(values.recurrenceRule);
}

function buildCalendarRecurrenceRule(
  values: z.infer<typeof rawCalendarEventFormSchema>,
  context: z.RefinementCtx,
): TaskRecurrenceRule | null {
  if (values.recurrencePreset === "none") {
    return null;
  }

  if (values.recurrencePreset === "daily") {
    if (!isInRange(values.recurrenceInterval, 1, 365)) {
      addIssue(context, "Use a daily interval between 1 and 365.", [
        "recurrenceInterval",
      ]);
      return null;
    }

    return {
      interval: values.recurrenceInterval,
      preset: "daily",
    };
  }

  if (values.recurrencePreset === "weekly") {
    const weekdays = [...new Set(values.recurrenceWeekdays)].sort(
      (left, right) => left - right,
    );

    if (
      weekdays.length === 0 ||
      weekdays.some((weekday) => !isInRange(weekday, 0, 6))
    ) {
      addIssue(context, "Choose at least one weekday.", ["recurrenceWeekdays"]);
      return null;
    }

    return {
      preset: "weekly",
      weekdays,
    };
  }

  if (values.recurrencePreset === "every_n_weeks") {
    if (!isInRange(values.recurrenceInterval, 1, 52)) {
      addIssue(context, "Use an interval between 1 and 52 weeks.", [
        "recurrenceInterval",
      ]);
      return null;
    }

    return {
      interval: values.recurrenceInterval,
      preset: "every_n_weeks",
    };
  }

  if (values.recurrencePreset === "monthly") {
    if (!isInRange(values.recurrenceDayOfMonth, 1, 31)) {
      addIssue(context, "Use a day between 1 and 31.", [
        "recurrenceDayOfMonth",
      ]);
      return null;
    }

    return {
      dayOfMonth: values.recurrenceDayOfMonth,
      preset: "monthly",
    };
  }

  if (
    !isInRange(values.recurrenceMonth, 1, 12) ||
    !isInRange(values.recurrenceDayOfMonth, 1, 31)
  ) {
    addIssue(context, "Use a valid month and day.", ["recurrenceMonth"]);
    return null;
  }

  return {
    dayOfMonth: values.recurrenceDayOfMonth,
    month: values.recurrenceMonth,
    preset: "yearly",
  };
}

function addIssue(
  context: z.RefinementCtx,
  message: string,
  path: (string | number)[],
) {
  context.addIssue({
    code: "custom",
    message,
    path,
  });
}

function isInRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}
