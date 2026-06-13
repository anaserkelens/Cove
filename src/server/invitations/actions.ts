"use server";

import { redirect } from "next/navigation";

import { getFormString } from "@/lib/forms/form-data";
import {
  createInvitationFormSchema,
  revokeInvitationFormSchema,
} from "@/lib/validation/invitation";
import {
  acceptInvitationForCurrentUser,
  createInvitationForCurrentUser,
  revokeInvitationForCurrentUser,
} from "@/server/invitations/service";
import { getRequestOrigin } from "@/server/auth/request";

export type CreateInvitationActionState = {
  error?: string;
  invitationLink?: string;
  ok: boolean;
};

export async function createInvitationAction(
  householdId: string,
  _state: CreateInvitationActionState,
  formData: FormData,
): Promise<CreateInvitationActionState> {
  const parsed = createInvitationFormSchema.safeParse({
    email: getFormString(formData, "email"),
  });

  if (!parsed.success) {
    return {
      error: "Enter a valid email address.",
      ok: false,
    };
  }

  try {
    const invitation = await createInvitationForCurrentUser(
      householdId,
      parsed.data,
      await getRequestOrigin(),
    );

    return {
      invitationLink: invitation.invitationLink,
      ok: true,
    };
  } catch {
    return {
      error: "We could not create that invitation. Owners only.",
      ok: false,
    };
  }
}

export async function revokeInvitationAction(
  householdId: string,
  formData: FormData,
) {
  const parsed = revokeInvitationFormSchema.safeParse({
    invitationId: getFormString(formData, "invitationId"),
  });

  if (!parsed.success) {
    redirect(`/app/${householdId}/members?error=invalid-invitation`);
  }

  try {
    await revokeInvitationForCurrentUser(householdId, parsed.data.invitationId);
  } catch {
    redirect(`/app/${householdId}/members?error=revoke-invitation-failed`);
  }

  redirect(`/app/${householdId}/members?status=invitation-revoked`);
}

export async function acceptInvitationAction(
  token: string,
  _formData: FormData,
) {
  void _formData;

  let householdId: string;

  try {
    const household = await acceptInvitationForCurrentUser(token);
    householdId = household.id;
  } catch {
    redirect(`/invite/${encodeURIComponent(token)}?error=invalid-invitation`);
  }

  redirect(`/app/${householdId}/dashboard?status=invitation-accepted`);
}
