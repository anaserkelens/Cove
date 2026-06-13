import { describe, expect, it } from "vitest";

import {
  createInvitationFormSchema,
  getInvitationExpiryDate,
  invitationTokenSchema,
  isPendingInvitation,
  revokeInvitationFormSchema,
} from "@/lib/validation/invitation";

describe("invitation validation", () => {
  it("normalizes invitee email addresses", () => {
    expect(
      createInvitationFormSchema.parse({
        email: "  PERSON@Example.COM ",
      }),
    ).toEqual({
      email: "person@example.com",
    });
  });

  it("sets invitation expiry seven days out", () => {
    expect(
      getInvitationExpiryDate(new Date("2026-06-13T00:00:00Z")).toISOString(),
    ).toBe("2026-06-20T00:00:00.000Z");
  });

  it("detects pending invitations", () => {
    expect(
      isPendingInvitation(
        {
          accepted_at: null,
          expires_at: "2026-06-20T00:00:00Z",
          revoked_at: null,
        },
        new Date("2026-06-13T00:00:00Z"),
      ),
    ).toBe(true);
  });

  it("accepts only URL-safe invitation tokens", () => {
    expect(
      invitationTokenSchema.safeParse(
        "QxJg8pnSx-hZIJYm0XjGvkg0o5JgHElS1ZyPXEg10KI",
      ).success,
    ).toBe(true);
    expect(invitationTokenSchema.safeParse("short").success).toBe(false);
    expect(invitationTokenSchema.safeParse("not/urlsafe").success).toBe(false);
  });

  it("validates invitation revocation form input", () => {
    expect(
      revokeInvitationFormSchema.safeParse({
        invitationId: "8c456019-d1c7-40a9-9b2f-7062017f4cb2",
      }).success,
    ).toBe(true);
    expect(
      revokeInvitationFormSchema.safeParse({ invitationId: "not-a-uuid" })
        .success,
    ).toBe(false);
  });
});
