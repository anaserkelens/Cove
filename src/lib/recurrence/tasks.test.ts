import { describe, expect, it } from "vitest";

import { getDateOnlyInTimeZone } from "@/lib/dates/date-only";
import {
  calculateNextTaskDueDate,
  parseTaskRecurrenceRule,
  serializeTaskRecurrenceRule,
} from "@/lib/recurrence/tasks";

describe("task recurrence", () => {
  it("calculates daily occurrences", () => {
    expect(
      calculateNextTaskDueDate("2026-06-13", {
        preset: "daily",
      }),
    ).toBe("2026-06-14");
  });

  it("calculates weekly occurrences on selected weekdays", () => {
    expect(
      calculateNextTaskDueDate("2026-06-13", {
        preset: "weekly",
        weekdays: [1, 3],
      }),
    ).toBe("2026-06-15");
  });

  it("calculates every N weeks occurrences", () => {
    expect(
      calculateNextTaskDueDate("2026-06-13", {
        interval: 2,
        preset: "every_n_weeks",
      }),
    ).toBe("2026-06-27");
  });

  it("clamps monthly occurrences to the last day of the month", () => {
    expect(
      calculateNextTaskDueDate("2026-01-31", {
        dayOfMonth: 31,
        preset: "monthly",
      }),
    ).toBe("2026-02-28");
  });

  it("clamps yearly occurrences to valid calendar dates", () => {
    expect(
      calculateNextTaskDueDate("2027-02-28", {
        dayOfMonth: 29,
        month: 2,
        preset: "yearly",
      }),
    ).toBe("2028-02-29");
  });

  it("serializes and parses recurrence JSON", () => {
    const serialized = serializeTaskRecurrenceRule({
      dayOfMonth: 10,
      preset: "monthly",
    });

    expect(parseTaskRecurrenceRule(serialized)).toEqual({
      dayOfMonth: 10,
      preset: "monthly",
    });
  });
});

describe("date-only helpers", () => {
  it("formats the local date in a household time zone", () => {
    expect(
      getDateOnlyInTimeZone(
        new Date("2026-06-12T22:30:00.000Z"),
        "Europe/Amsterdam",
      ),
    ).toBe("2026-06-13");
  });
});
