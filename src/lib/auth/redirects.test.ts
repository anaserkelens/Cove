import { describe, expect, it } from "vitest";

import { sanitizeRedirectPath, withSearchParam } from "./redirects";

describe("sanitizeRedirectPath", () => {
  it("accepts safe internal paths", () => {
    expect(sanitizeRedirectPath("/app/profile?tab=settings")).toBe(
      "/app/profile?tab=settings",
    );
  });

  it("rejects absolute and protocol-relative redirects", () => {
    expect(sanitizeRedirectPath("https://example.com/app")).toBe("/app");
    expect(sanitizeRedirectPath("//example.com/app")).toBe("/app");
  });

  it("rejects auth callback loops", () => {
    expect(sanitizeRedirectPath("/auth/callback?next=/app")).toBe("/app");
  });
});

describe("withSearchParam", () => {
  it("sets a search parameter without changing the path", () => {
    expect(withSearchParam("/login?next=/app", "error", "invalid-login")).toBe(
      "/login?next=%2Fapp&error=invalid-login",
    );
  });
});
