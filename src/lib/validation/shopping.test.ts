import { describe, expect, it } from "vitest";

import {
  shoppingItemFormSchema,
  shoppingItemStatusFormSchema,
  shoppingListFormSchema,
} from "@/lib/validation/shopping";

describe("shoppingListFormSchema", () => {
  it("trims list names", () => {
    expect(shoppingListFormSchema.parse({ name: "  Weekly shop  " })).toEqual({
      name: "Weekly shop",
    });
  });

  it("rejects empty list names", () => {
    expect(shoppingListFormSchema.safeParse({ name: "   " }).success).toBe(
      false,
    );
  });
});

describe("shoppingItemFormSchema", () => {
  it("normalizes optional item values", () => {
    expect(
      shoppingItemFormSchema.parse({
        assignedTo: "",
        name: "  Milk  ",
        note: "  for breakfast  ",
        quantity: "2",
        recurringHint: true,
        unit: " cartons ",
      }),
    ).toEqual({
      assignedTo: null,
      name: "Milk",
      note: "for breakfast",
      quantity: 2,
      recurringHint: true,
      unit: "cartons",
    });
  });

  it("converts blank optional values to null", () => {
    expect(
      shoppingItemFormSchema.parse({
        assignedTo: "",
        name: "Bread",
        note: "",
        quantity: "",
        recurringHint: false,
        unit: "",
      }),
    ).toMatchObject({
      assignedTo: null,
      note: null,
      quantity: null,
      unit: null,
    });
  });

  it("rejects invalid quantities", () => {
    expect(
      shoppingItemFormSchema.safeParse({
        assignedTo: "",
        name: "Apples",
        note: "",
        quantity: "0",
        recurringHint: false,
        unit: "",
      }).success,
    ).toBe(false);
  });

  it("rejects invalid statuses", () => {
    expect(
      shoppingItemStatusFormSchema.safeParse({ status: "done" }).success,
    ).toBe(false);
  });
});
