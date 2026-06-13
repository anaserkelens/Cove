import { z } from "zod";

import type { Database } from "@/types/database";

export type HouseholdInvitation =
  Database["public"]["Tables"]["household_invitations"]["Row"];

export const invitationExpiryDays = 7;

export const createInvitationFormSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((email) => email.toLowerCase()),
});

export type CreateInvitationFormValues = z.infer<
  typeof createInvitationFormSchema
>;

export const invitationTokenSchema = z
  .string()
  .trim()
  .min(32)
  .max(256)
  .regex(/^[A-Za-z0-9_-]+$/);

export const revokeInvitationFormSchema = z.object({
  invitationId: z.string().trim().uuid(),
});

export function getInvitationExpiryDate(now = new Date()): Date {
  const expiresAt = new Date(now);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + invitationExpiryDays);
  return expiresAt;
}

export function isPendingInvitation(
  invitation: Pick<
    HouseholdInvitation,
    "accepted_at" | "expires_at" | "revoked_at"
  >,
  now = new Date(),
): boolean {
  return (
    invitation.accepted_at === null &&
    invitation.revoked_at === null &&
    new Date(invitation.expires_at).getTime() > now.getTime()
  );
}
