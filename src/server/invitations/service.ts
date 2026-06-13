import { createClient } from "@/lib/supabase/server";
import {
  generateInvitationToken,
  hashInvitationToken,
} from "@/lib/invitations/tokens";
import type {
  CreateInvitationFormValues,
  HouseholdInvitation,
} from "@/lib/validation/invitation";
import {
  getInvitationExpiryDate,
  invitationTokenSchema,
} from "@/lib/validation/invitation";
import type { Household } from "@/lib/validation/household";
import { requireHouseholdOwner } from "@/server/households/service";

export type SafeHouseholdInvitation = Omit<HouseholdInvitation, "token_hash">;

export type CreatedInvitation = {
  invitation: SafeHouseholdInvitation;
  invitationLink: string;
};

export class InvitationServiceError extends Error {
  constructor(message = "Invitation operation failed.") {
    super(message);
    this.name = "InvitationServiceError";
  }
}

const safeInvitationSelect =
  "accepted_at, created_at, email, expires_at, household_id, id, invited_by, revoked_at, role, updated_at";

export async function createInvitationForCurrentUser(
  householdId: string,
  values: CreateInvitationFormValues,
  origin: string,
): Promise<CreatedInvitation> {
  await requireHouseholdOwner(householdId);

  const supabase = await createClient();
  const token = generateInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = getInvitationExpiryDate().toISOString();

  const { data, error } = await supabase.rpc("create_household_invitation", {
    invitation_email: values.email,
    invitation_expires_at: expiresAt,
    invitation_token_hash: tokenHash,
    target_household_id: householdId,
  });

  if (error || !data) {
    throw new InvitationServiceError();
  }

  return {
    invitation: toSafeInvitation(data),
    invitationLink: buildInvitationLink(origin, token),
  };
}

export async function listPendingInvitationsForHousehold(
  householdId: string,
): Promise<SafeHouseholdInvitation[]> {
  await requireHouseholdOwner(householdId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("household_invitations")
    .select(safeInvitationSelect)
    .eq("household_id", householdId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    throw new InvitationServiceError();
  }

  return data as SafeHouseholdInvitation[];
}

export async function revokeInvitationForCurrentUser(
  householdId: string,
  invitationId: string,
): Promise<SafeHouseholdInvitation> {
  await requireHouseholdOwner(householdId);
  await ensureInvitationBelongsToHousehold(householdId, invitationId);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("revoke_household_invitation", {
    target_invitation_id: invitationId,
  });

  if (error || !data) {
    throw new InvitationServiceError();
  }

  return toSafeInvitation(data);
}

export async function acceptInvitationForCurrentUser(
  rawToken: string,
): Promise<Household> {
  const parsedToken = invitationTokenSchema.safeParse(rawToken);

  if (!parsedToken.success) {
    throw new InvitationServiceError();
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_household_invitation", {
    invitation_token_hash: hashInvitationToken(parsedToken.data),
  });

  if (error || !data) {
    throw new InvitationServiceError();
  }

  return data;
}

function buildInvitationLink(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}/invite/${encodeURIComponent(token)}`;
}

function toSafeInvitation(
  invitation: HouseholdInvitation,
): SafeHouseholdInvitation {
  return {
    accepted_at: invitation.accepted_at,
    created_at: invitation.created_at,
    email: invitation.email,
    expires_at: invitation.expires_at,
    household_id: invitation.household_id,
    id: invitation.id,
    invited_by: invitation.invited_by,
    revoked_at: invitation.revoked_at,
    role: invitation.role,
    updated_at: invitation.updated_at,
  };
}

async function ensureInvitationBelongsToHousehold(
  householdId: string,
  invitationId: string,
): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("household_invitations")
    .select("id")
    .eq("household_id", householdId)
    .eq("id", invitationId)
    .single();

  if (error || !data) {
    throw new InvitationServiceError();
  }
}
