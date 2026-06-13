import { describe, expect, it } from "vitest";

import {
  householdFormSchema,
  isActiveOwner,
  slugifyHouseholdName,
  toHouseholdSettingsUpdate,
} from "@/lib/validation/household";

describe("household validation", () => {
  it("validates and normalizes household settings", () => {
    const values = householdFormSchema.parse({
      currencyCode: "eur",
      name: " Cove Demo Home ",
      timezone: "Europe/Amsterdam",
    });

    expect(toHouseholdSettingsUpdate(values)).toEqual({
      currency_code: "EUR",
      name: "Cove Demo Home",
      timezone: "Europe/Amsterdam",
    });
  });

  it("rejects invalid household settings", () => {
    expect(() =>
      householdFormSchema.parse({
        currencyCode: "EURO",
        name: "",
        timezone: "Mars/Base",
      }),
    ).toThrow();
  });

  it("slugifies household names predictably", () => {
    expect(slugifyHouseholdName(" Cove Demo Home! ")).toBe("cove-demo-home");
    expect(slugifyHouseholdName("!!!")).toBe("household");
  });

  it("detects active owners", () => {
    expect(isActiveOwner({ role: "owner", status: "active" })).toBe(true);
    expect(isActiveOwner({ role: "member", status: "active" })).toBe(false);
    expect(isActiveOwner({ role: "owner", status: "revoked" })).toBe(false);
  });
});
