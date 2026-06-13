import { describe, expect, it } from "vitest";

import {
  adminItemFormSchema,
  isAdminItemComingUp,
  isAdminItemDueToday,
  isAdminItemNeedsAttention,
} from "@/lib/validation/admin";

const baseForm = {
  actionDate: "",
  amount: "12.34",
  autoPay: false,
  currencyCode: "EUR",
  description: "",
  dueDate: "2026-07-01",
  expiryDate: "",
  notes: "",
  ownerId: "",
  providerName: "Power Co",
  recurrenceDayOfMonth: "1",
  recurrenceInterval: "1",
  recurrenceMonth: "1",
  recurrencePreset: "none",
  recurrenceTimezone: "Europe/Amsterdam",
  recurrenceWeekdays: [],
  referenceNumber: "",
  title: "Electricity",
  type: "bill",
};

describe("adminItemFormSchema", () => {
  it("stores money in integer minor units", () => {
    expect(adminItemFormSchema.parse(baseForm)).toMatchObject({
      amountMinor: 1234,
      currencyCode: "EUR",
    });
  });

  it("keeps due date and action date distinct", () => {
    expect(
      adminItemFormSchema.parse({
        ...baseForm,
        actionDate: "2026-06-15",
        dueDate: "2026-07-01",
      }),
    ).toMatchObject({
      actionDate: "2026-06-15",
      dueDate: "2026-07-01",
    });
  });

  it("rejects recurrence without a date anchor", () => {
    expect(
      adminItemFormSchema.safeParse({
        ...baseForm,
        dueDate: "",
        recurrencePreset: "monthly",
      }).success,
    ).toBe(false);
  });
});

describe("admin item date helpers", () => {
  const item = {
    action_date: null,
    due_date: "2026-06-13",
    expiry_date: null,
    status: "upcoming" as const,
    type: "bill" as const,
  };

  it("detects items due today", () => {
    expect(isAdminItemDueToday(item, "2026-06-13")).toBe(true);
  });

  it("detects overdue due dates and passed action dates", () => {
    expect(isAdminItemNeedsAttention(item, "2026-06-14")).toBe(true);
    expect(
      isAdminItemNeedsAttention(
        { ...item, action_date: "2026-06-12", due_date: "2026-06-20" },
        "2026-06-13",
      ),
    ).toBe(true);
  });

  it("detects upcoming expirations needing attention", () => {
    expect(
      isAdminItemNeedsAttention(
        {
          ...item,
          due_date: null,
          expiry_date: "2026-06-20",
          type: "expiration",
        },
        "2026-06-13",
        "2026-07-13",
      ),
    ).toBe(true);
  });

  it("detects coming up items", () => {
    expect(isAdminItemComingUp(item, "2026-06-01", "2026-06-30")).toBe(true);
  });
});
