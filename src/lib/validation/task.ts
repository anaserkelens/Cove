import { z } from "zod";

import { compareDateOnly, isDateOnly } from "@/lib/dates/date-only";
import type { TaskRecurrenceRule } from "@/lib/recurrence/tasks";
import { serializeTaskRecurrenceRule } from "@/lib/recurrence/tasks";
import type { Database } from "@/types/database";

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskComment = Database["public"]["Tables"]["task_comments"]["Row"];
export type ActivityEvent =
  Database["public"]["Tables"]["activity_events"]["Row"];

export const taskStatuses = [
  "open",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export const editableTaskStatuses = [
  "open",
  "in_progress",
  "cancelled",
] as const;

export const taskPriorities = ["low", "normal", "high"] as const;

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

export const rawTaskFormSchema = z.object({
  assignedTo: optionalUuidSchema,
  description: z
    .string()
    .trim()
    .max(2000)
    .transform((value) => (value.length > 0 ? value : null)),
  dueDate: optionalDateOnlySchema,
  priority: z.enum(taskPriorities).default("normal"),
  recurrenceDayOfMonth: numberStringSchema.default(1),
  recurrenceInterval: numberStringSchema.default(1),
  recurrenceMonth: numberStringSchema.default(1),
  recurrencePreset: z
    .enum(["none", "daily", "weekly", "every_n_weeks", "monthly", "yearly"])
    .default("none"),
  recurrenceWeekdays: z.array(numberStringSchema).default([]),
  status: z.enum(editableTaskStatuses).default("open"),
  title: z.string().trim().min(1).max(160),
});

export const taskFormSchema = rawTaskFormSchema.transform((values, context) => {
  const recurrenceRule = buildTaskRecurrenceRule(values, context);

  if (recurrenceRule && !values.dueDate) {
    context.addIssue({
      code: "custom",
      message: "Recurring tasks need a due date.",
      path: ["dueDate"],
    });
    return z.NEVER;
  }

  return {
    assignedTo: values.assignedTo,
    description: values.description,
    dueDate: values.dueDate,
    priority: values.priority,
    recurrenceRule,
    status: values.status,
    title: values.title,
  };
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export const taskCommentFormSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export type TaskCommentFormValues = z.infer<typeof taskCommentFormSchema>;

export function serializeTaskFormRecurrence(
  values: Pick<TaskFormValues, "recurrenceRule">,
): string | null {
  return serializeTaskRecurrenceRule(values.recurrenceRule);
}

export function isOpenTaskStatus(status: Task["status"]): boolean {
  return status === "open" || status === "in_progress";
}

export function isTaskDueToday(
  task: Pick<Task, "due_date" | "status">,
  today: string,
): boolean {
  return (
    task.due_date !== null &&
    isOpenTaskStatus(task.status) &&
    compareDateOnly(task.due_date, today) === 0
  );
}

export function isTaskOverdue(
  task: Pick<Task, "due_date" | "status">,
  today: string,
): boolean {
  return (
    task.due_date !== null &&
    isOpenTaskStatus(task.status) &&
    compareDateOnly(task.due_date, today) < 0
  );
}

function buildTaskRecurrenceRule(
  values: z.infer<typeof rawTaskFormSchema>,
  context: z.RefinementCtx,
): TaskRecurrenceRule | null {
  if (values.recurrencePreset === "none") {
    return null;
  }

  if (values.recurrencePreset === "daily") {
    if (!isInRange(values.recurrenceInterval, 1, 365)) {
      addRecurrenceIssue(context, "Use a daily interval between 1 and 365.");
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
      addRecurrenceIssue(context, "Choose at least one weekday.");
      return null;
    }

    return {
      preset: "weekly",
      weekdays,
    };
  }

  if (values.recurrencePreset === "every_n_weeks") {
    if (!isInRange(values.recurrenceInterval, 1, 52)) {
      addRecurrenceIssue(context, "Use an interval between 1 and 52 weeks.");
      return null;
    }

    return {
      interval: values.recurrenceInterval,
      preset: "every_n_weeks",
    };
  }

  if (values.recurrencePreset === "monthly") {
    if (!isInRange(values.recurrenceDayOfMonth, 1, 31)) {
      addRecurrenceIssue(context, "Use a day between 1 and 31.");
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
    addRecurrenceIssue(context, "Use a valid month and day.");
    return null;
  }

  return {
    dayOfMonth: values.recurrenceDayOfMonth,
    month: values.recurrenceMonth,
    preset: "yearly",
  };
}

function addRecurrenceIssue(context: z.RefinementCtx, message: string) {
  context.addIssue({
    code: "custom",
    message,
    path: ["recurrencePreset"],
  });
}

function isInRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}
