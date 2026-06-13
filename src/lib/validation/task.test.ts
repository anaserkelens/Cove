import { describe, expect, it } from "vitest";

import {
  isTaskDueToday,
  isTaskOverdue,
  serializeTaskFormRecurrence,
  taskCommentFormSchema,
  taskFormSchema,
} from "@/lib/validation/task";

describe("task validation", () => {
  it("normalizes a basic task form", () => {
    expect(
      taskFormSchema.parse({
        assignedTo: "",
        description: "  ",
        dueDate: "2026-06-13",
        priority: "normal",
        recurrenceDayOfMonth: "1",
        recurrenceInterval: "1",
        recurrenceMonth: "1",
        recurrencePreset: "none",
        recurrenceWeekdays: [],
        status: "open",
        title: "  Take bins out ",
      }),
    ).toEqual({
      assignedTo: null,
      description: null,
      dueDate: "2026-06-13",
      priority: "normal",
      recurrenceRule: null,
      status: "open",
      title: "Take bins out",
    });
  });

  it("builds weekly recurrence rules", () => {
    const parsed = taskFormSchema.parse({
      assignedTo: "",
      description: "",
      dueDate: "2026-06-13",
      priority: "high",
      recurrenceDayOfMonth: "1",
      recurrenceInterval: "1",
      recurrenceMonth: "1",
      recurrencePreset: "weekly",
      recurrenceWeekdays: ["3", "1", "1"],
      status: "open",
      title: "Water plants",
    });

    expect(parsed.recurrenceRule).toEqual({
      preset: "weekly",
      weekdays: [1, 3],
    });
    expect(serializeTaskFormRecurrence(parsed)).toBe(
      '{"preset":"weekly","weekdays":[1,3]}',
    );
  });

  it("rejects recurrence without a due date", () => {
    expect(
      taskFormSchema.safeParse({
        assignedTo: "",
        description: "",
        dueDate: "",
        priority: "normal",
        recurrenceDayOfMonth: "1",
        recurrenceInterval: "1",
        recurrenceMonth: "1",
        recurrencePreset: "daily",
        recurrenceWeekdays: [],
        status: "open",
        title: "No date",
      }).success,
    ).toBe(false);
  });

  it("validates task comments", () => {
    expect(taskCommentFormSchema.parse({ body: " Done " })).toEqual({
      body: "Done",
    });
    expect(taskCommentFormSchema.safeParse({ body: "" }).success).toBe(false);
  });
});

describe("task date status", () => {
  it("detects due-today tasks", () => {
    expect(
      isTaskDueToday(
        {
          due_date: "2026-06-13",
          status: "open",
        },
        "2026-06-13",
      ),
    ).toBe(true);
  });

  it("detects overdue tasks", () => {
    expect(
      isTaskOverdue(
        {
          due_date: "2026-06-12",
          status: "in_progress",
        },
        "2026-06-13",
      ),
    ).toBe(true);
  });

  it("ignores completed tasks for due-today and overdue checks", () => {
    expect(
      isTaskDueToday(
        {
          due_date: "2026-06-13",
          status: "completed",
        },
        "2026-06-13",
      ),
    ).toBe(false);
    expect(
      isTaskOverdue(
        {
          due_date: "2026-06-12",
          status: "completed",
        },
        "2026-06-13",
      ),
    ).toBe(false);
  });
});
