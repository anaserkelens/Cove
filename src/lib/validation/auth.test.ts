import { describe, expect, it } from "vitest";

import {
  passwordUpdateFormSchema,
  signupFormSchema,
} from "@/lib/validation/auth";

describe("auth validation", () => {
  it("normalizes signup email addresses", () => {
    expect(
      signupFormSchema.parse({
        email: "  USER@Example.COM ",
        password: "long-enough",
      }).email,
    ).toBe("user@example.com");
  });

  it("rejects weak passwords", () => {
    expect(() =>
      signupFormSchema.parse({
        email: "user@example.com",
        password: "short",
      }),
    ).toThrow();
  });

  it("requires matching password confirmation", () => {
    expect(() =>
      passwordUpdateFormSchema.parse({
        password: "long-enough",
        confirmPassword: "different",
      }),
    ).toThrow();
  });
});
