import { createHash, randomBytes } from "node:crypto";

const invitationTokenBytes = 32;

export function generateInvitationToken(): string {
  return randomBytes(invitationTokenBytes).toString("base64url");
}

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isInvitationTokenHash(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}
