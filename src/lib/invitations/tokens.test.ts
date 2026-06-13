import { describe, expect, it } from "vitest";

import {
  generateInvitationToken,
  hashInvitationToken,
  isInvitationTokenHash,
} from "@/lib/invitations/tokens";

describe("invitation tokens", () => {
  it("generates unguessable URL-safe tokens", () => {
    const token = generateInvitationToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(40);
  });

  it("hashes tokens deterministically without returning the raw token", () => {
    const token = "sample-token";
    const hash = hashInvitationToken(token);

    expect(hash).toHaveLength(64);
    expect(hash).not.toContain(token);
    expect(hashInvitationToken(token)).toBe(hash);
    expect(isInvitationTokenHash(hash)).toBe(true);
  });
});
