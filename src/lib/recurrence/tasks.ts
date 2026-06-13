import {
  addDaysToDateOnly,
  daysInMonth,
  formatDateOnly,
  parseDateOnly,
} from "@/lib/dates/date-only";

export type TaskRecurrenceRule =
  | {
      interval?: number;
      preset: "daily";
    }
  | {
      preset: "weekly";
      weekdays: number[];
    }
  | {
      interval: number;
      preset: "every_n_weeks";
    }
  | {
      dayOfMonth: number;
      preset: "monthly";
    }
  | {
      dayOfMonth: number;
      month: number;
      preset: "yearly";
    };

export function serializeTaskRecurrenceRule(
  rule: TaskRecurrenceRule | null,
): string | null {
  return rule ? JSON.stringify(rule) : null;
}

export function parseTaskRecurrenceRule(
  value: string | null,
): TaskRecurrenceRule | null {
  if (!value) {
    return null;
  }

  const parsed = JSON.parse(value) as TaskRecurrenceRule;
  assertTaskRecurrenceRule(parsed);
  return parsed;
}

export function calculateNextTaskDueDate(
  currentDueDate: string,
  rule: TaskRecurrenceRule,
): string {
  const [year, month, day] = parseDateOnly(currentDueDate);

  if (rule.preset === "daily") {
    return addDaysToDateOnly(currentDueDate, rule.interval ?? 1);
  }

  if (rule.preset === "weekly") {
    const weekdays = [...new Set(rule.weekdays)].sort(
      (left, right) => left - right,
    );
    const currentDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

    for (let offset = 1; offset <= 14; offset += 1) {
      const nextDay = (currentDay + offset) % 7;

      if (weekdays.includes(nextDay)) {
        return addDaysToDateOnly(currentDueDate, offset);
      }
    }

    return addDaysToDateOnly(currentDueDate, 7);
  }

  if (rule.preset === "every_n_weeks") {
    return addDaysToDateOnly(currentDueDate, rule.interval * 7);
  }

  if (rule.preset === "monthly") {
    const candidate = clampedDate(year, month, rule.dayOfMonth);

    if (candidate > currentDueDate) {
      return candidate;
    }

    return addMonthsClamped(year, month, rule.dayOfMonth, 1);
  }

  const candidate = clampedDate(year, rule.month, rule.dayOfMonth);

  if (candidate > currentDueDate) {
    return candidate;
  }

  return clampedDate(year + 1, rule.month, rule.dayOfMonth);
}

export function assertTaskRecurrenceRule(
  rule: TaskRecurrenceRule,
): asserts rule is TaskRecurrenceRule {
  if (rule.preset === "daily") {
    assertIntegerRange(rule.interval ?? 1, 1, 365);
    return;
  }

  if (rule.preset === "weekly") {
    if (rule.weekdays.length === 0) {
      throw new Error("Weekly recurrence needs at least one weekday.");
    }

    rule.weekdays.forEach((weekday) => assertIntegerRange(weekday, 0, 6));
    return;
  }

  if (rule.preset === "every_n_weeks") {
    assertIntegerRange(rule.interval, 1, 52);
    return;
  }

  if (rule.preset === "monthly") {
    assertIntegerRange(rule.dayOfMonth, 1, 31);
    return;
  }

  assertIntegerRange(rule.month, 1, 12);
  assertIntegerRange(rule.dayOfMonth, 1, 31);
}

function addMonthsClamped(
  year: number,
  month: number,
  day: number,
  monthsToAdd: number,
): string {
  const zeroBasedMonth = month - 1 + monthsToAdd;
  const nextYear = year + Math.floor(zeroBasedMonth / 12);
  const nextMonth = (zeroBasedMonth % 12) + 1;
  return clampedDate(nextYear, nextMonth, day);
}

function clampedDate(year: number, month: number, day: number): string {
  return formatDateOnly(year, month, Math.min(day, daysInMonth(year, month)));
}

function assertIntegerRange(value: number, min: number, max: number) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error("Invalid recurrence value.");
  }
}
