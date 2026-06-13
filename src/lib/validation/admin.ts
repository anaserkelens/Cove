import { z } from "zod";

import { compareDateOnly, isDateOnly } from "@/lib/dates/date-only";
import { parseMoneyMajorToMinor } from "@/lib/money/minor-units";
import type { TaskRecurrenceRule } from "@/lib/recurrence/tasks";
import { serializeTaskRecurrenceRule } from "@/lib/recurrence/tasks";
import { isValidTimeZone } from "@/lib/validation/profile";
import type { Database } from "@/types/database";

export type AdminItem = Database["public"]["Tables"]["admin_items"]["Row"];
export type AdminItemEvent =
  Database["public"]["Tables"]["admin_item_events"]["Row"];
export type AdminItemStatus = Database["public"]["Enums"]["admin_item_status"];

export const adminItemTypes = [
  "bill",
  "subscription",
  "renewal",
  "expiration",
  "return_window",
  "maintenance",
  "contract",
  "appointment",
  "other",
] as const;

export const adminItemStatuses = [
  "upcoming",
  "needs_review",
  "waiting",
  "paid",
  "renewed",
  "completed",
  "cancelled",
  "overdue",
] as const;

export const activeAdminItemStatuses = [
  "upcoming",
  "needs_review",
  "waiting",
  "overdue",
] as const;

const optionalDateOnlySchema = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .refine((value) => value === null || isDateOnly(value), {
    message: "Enter a valid date.",
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

export const rawAdminItemFormSchema = z.object({
  actionDate: optionalDateOnlySchema,
  amount: z.string().trim(),
  autoPay: z.boolean().default(false),
  currencyCode: z.string().trim().default("EUR"),
  description: z
    .string()
    .trim()
    .max(2000)
    .transform((value) => (value.length > 0 ? value : null)),
  dueDate: optionalDateOnlySchema,
  expiryDate: optionalDateOnlySchema,
  notes: z
    .string()
    .trim()
    .max(4000)
    .transform((value) => (value.length > 0 ? value : null)),
  ownerId: optionalUuidSchema,
  providerName: z
    .string()
    .trim()
    .max(160)
    .transform((value) => (value.length > 0 ? value : null)),
  recurrenceDayOfMonth: numberStringSchema.default(1),
  recurrenceInterval: numberStringSchema.default(1),
  recurrenceMonth: numberStringSchema.default(1),
  recurrencePreset: z
    .enum(["none", "daily", "weekly", "every_n_weeks", "monthly", "yearly"])
    .default("none"),
  recurrenceTimezone: z.string().trim().refine(isValidTimeZone, {
    message: "Choose a valid IANA time zone.",
  }),
  recurrenceWeekdays: z.array(numberStringSchema).default([]),
  referenceNumber: z
    .string()
    .trim()
    .max(160)
    .transform((value) => (value.length > 0 ? value : null)),
  title: z.string().trim().min(1).max(160),
  type: z.enum(adminItemTypes),
});

export const adminItemFormSchema = rawAdminItemFormSchema.transform(
  (values, context) => {
    const recurrenceRule = buildAdminRecurrenceRule(values, context);
    const amountMinor = parseAmount(values, context);
    const currencyCode =
      amountMinor === null ? null : values.currencyCode.trim().toUpperCase();

    if (
      recurrenceRule &&
      !values.dueDate &&
      !values.actionDate &&
      !values.expiryDate
    ) {
      addIssue(context, "Recurring admin items need at least one date.", [
        "recurrencePreset",
      ]);
      return z.NEVER;
    }

    return {
      actionDate: values.actionDate,
      amountMinor,
      autoPay: values.autoPay,
      currencyCode,
      description: values.description,
      dueDate: values.dueDate,
      expiryDate: values.expiryDate,
      notes: values.notes,
      ownerId: values.ownerId,
      providerName: values.providerName,
      recurrenceRule,
      recurrenceTimezone: recurrenceRule ? values.recurrenceTimezone : null,
      referenceNumber: values.referenceNumber,
      title: values.title,
      type: values.type,
    };
  },
);

export type AdminItemFormValues = z.infer<typeof adminItemFormSchema>;

export const adminItemStatusFormSchema = z.object({
  status: z.enum(adminItemStatuses),
});

export function serializeAdminFormRecurrence(
  values: Pick<AdminItemFormValues, "recurrenceRule">,
): string | null {
  return serializeTaskRecurrenceRule(values.recurrenceRule);
}

export function isActiveAdminItemStatus(status: AdminItemStatus): boolean {
  return activeAdminItemStatuses.includes(
    status as (typeof activeAdminItemStatuses)[number],
  );
}

export function isAdminItemDueToday(
  item: Pick<AdminItem, "due_date" | "status">,
  today: string,
): boolean {
  return (
    item.due_date !== null &&
    isActiveAdminItemStatus(item.status) &&
    compareDateOnly(item.due_date, today) === 0
  );
}

export function isAdminItemNeedsAttention(
  item: Pick<
    AdminItem,
    "action_date" | "due_date" | "expiry_date" | "status" | "type"
  >,
  today: string,
  expiryAttentionEnd?: string,
): boolean {
  if (!isActiveAdminItemStatus(item.status)) {
    return false;
  }

  if (item.status === "needs_review" || item.status === "overdue") {
    return true;
  }

  if (item.due_date && compareDateOnly(item.due_date, today) < 0) {
    return true;
  }

  if (item.action_date && compareDateOnly(item.action_date, today) < 0) {
    return true;
  }

  if (item.expiry_date && compareDateOnly(item.expiry_date, today) < 0) {
    return true;
  }

  return Boolean(
    item.type === "expiration" &&
    expiryAttentionEnd &&
    item.expiry_date &&
    compareDateOnly(item.expiry_date, today) >= 0 &&
    compareDateOnly(item.expiry_date, expiryAttentionEnd) <= 0,
  );
}

export function isAdminItemComingUp(
  item: Pick<AdminItem, "action_date" | "due_date" | "expiry_date" | "status">,
  today: string,
  rangeEnd: string,
): boolean {
  if (!isActiveAdminItemStatus(item.status)) {
    return false;
  }

  return [item.due_date, item.action_date, item.expiry_date].some(
    (date) =>
      date !== null &&
      compareDateOnly(date, today) > 0 &&
      compareDateOnly(date, rangeEnd) <= 0,
  );
}

function parseAmount(
  values: z.infer<typeof rawAdminItemFormSchema>,
  context: z.RefinementCtx,
): number | null {
  try {
    return parseMoneyMajorToMinor(values.amount, values.currencyCode);
  } catch {
    addIssue(context, "Enter a valid amount and currency.", ["amount"]);
    return null;
  }
}

function buildAdminRecurrenceRule(
  values: z.infer<typeof rawAdminItemFormSchema>,
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
