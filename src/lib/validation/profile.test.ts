import { describe, expect, it } from "vitest";

import {
  getTimeZoneOptions,
  isProfileComplete,
  profileFormSchema,
  toProfileUpdate,
} from "@/lib/validation/profile";

describe("profile validation", () => {
  it("accepts valid profile form values and maps them to database columns", () => {
    const values = profileFormSchema.parse({
      displayName: " Anas ",
      timezone: "Europe/Amsterdam",
      locale: "EN-us",
      weekStartsOn: "1",
    });

    expect(toProfileUpdate(values)).toEqual({
      display_name: "Anas",
      timezone: "Europe/Amsterdam",
      locale: "en-US",
      week_starts_on: 1,
    });
  });

  it("rejects invalid week start days and time zones", () => {
    expect(() =>
      profileFormSchema.parse({
        displayName: "Anas",
        timezone: "Mars/Base",
        locale: "en",
        weekStartsOn: 7,
      }),
    ).toThrow();
  });

  it("detects whether onboarding profile data is complete", () => {
    expect(
      isProfileComplete({
        avatar_path: null,
        created_at: "2026-01-01T00:00:00Z",
        display_name: "Anas",
        id: "00000000-0000-0000-0000-000000000000",
        locale: "en",
        timezone: "UTC",
        updated_at: "2026-01-01T00:00:00Z",
        week_starts_on: 1,
      }),
    ).toBe(true);
  });

  it("provides selectable time zone options", () => {
    const options = getTimeZoneOptions("Europe/Amsterdam");

    expect(options[0]).toBe("UTC");
    expect(options).toContain("Europe/Amsterdam");
  });
});
