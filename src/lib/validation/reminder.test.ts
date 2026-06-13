import { describe, expect, it } from "vitest";

import {
  isReminderInRange,
  isReminderNeedsAttention,
  reminderFormSchema,
} from "@/lib/validation/reminder";

const baseForm = {
  recipientUserId: "",
  remindAtLocal: "2026-06-13T09:30",
  timezone: "Europe/Amsterdam",
  title: "Cancel trial",
};

describe("reminderFormSchema", () => {
  it("converts household-local reminder times to UTC", () => {
    expect(reminderFormSchema.parse(baseForm)).toMatchObject({
      recipientUserId: null,
      remindAt: "2026-06-13T07:30:00.000Z",
      title: "Cancel trial",
    });
  });

  it("validates recipient IDs and reminder titles", () => {
    expect(
      reminderFormSchema.safeParse({
        ...baseForm,
        recipientUserId: "not-a-user",
      }).success,
    ).toBe(false);

    expect(
      reminderFormSchema.safeParse({
        ...baseForm,
        title: "",
      }).success,
    ).toBe(false);
  });
});

describe("reminder range helpers", () => {
  const reminder = {
    remind_at: "2026-06-13T07:30:00.000Z",
    status: "pending" as const,
  };

  it("detects overdue reminders", () => {
    expect(isReminderNeedsAttention(reminder, "2026-06-13T08:00:00.000Z")).toBe(
      true,
    );
  });

  it("detects reminders inside a dashboard range", () => {
    expect(
      isReminderInRange(
        reminder,
        "2026-06-13T00:00:00.000Z",
        "2026-06-14T00:00:00.000Z",
      ),
    ).toBe(true);
  });

  it("ignores handled reminders", () => {
    expect(
      isReminderNeedsAttention(
        { ...reminder, status: "sent" as const },
        "2026-06-13T08:00:00.000Z",
      ),
    ).toBe(false);
  });
});
