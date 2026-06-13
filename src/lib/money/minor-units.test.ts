import { describe, expect, it } from "vitest";

import {
  formatMinorMoney,
  parseMoneyMajorToMinor,
} from "@/lib/money/minor-units";

describe("money minor units", () => {
  it("parses decimal currency amounts without floating point math", () => {
    expect(parseMoneyMajorToMinor("12.34", "EUR")).toBe(1234);
    expect(parseMoneyMajorToMinor("12.3", "EUR")).toBe(1230);
  });

  it("parses zero-decimal currencies", () => {
    expect(parseMoneyMajorToMinor("1200", "JPY")).toBe(1200);
  });

  it("rejects invalid minor units", () => {
    expect(() => parseMoneyMajorToMinor("12.345", "EUR")).toThrow(
      "Invalid money amount.",
    );
  });

  it("formats minor units", () => {
    expect(formatMinorMoney(1234, "EUR")).toBe("€12.34");
  });
});
