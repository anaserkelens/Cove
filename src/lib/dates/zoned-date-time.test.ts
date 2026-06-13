import { describe, expect, it } from "vitest";

import {
  isDateTimeLocal,
  utcIsoToDateTimeLocal,
  zonedDateTimeToUtcIso,
} from "@/lib/dates/zoned-date-time";

describe("zoned date-time helpers", () => {
  it("converts Amsterdam local time to UTC", () => {
    expect(zonedDateTimeToUtcIso("2026-06-13T09:30", "Europe/Amsterdam")).toBe(
      "2026-06-13T07:30:00.000Z",
    );
  });

  it("formats UTC instants for datetime-local inputs", () => {
    expect(
      utcIsoToDateTimeLocal("2026-06-13T07:30:00.000Z", "Europe/Amsterdam"),
    ).toBe("2026-06-13T09:30");
  });

  it("validates datetime-local strings", () => {
    expect(isDateTimeLocal("2026-06-13T09:30")).toBe(true);
    expect(isDateTimeLocal("2026-13-13T09:30")).toBe(false);
    expect(isDateTimeLocal("2026-06-13")).toBe(false);
  });
});
