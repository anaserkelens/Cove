import { notFound } from "next/navigation";

import { InviteMemberForm } from "@/components/InviteMemberForm";
import { FormMessage } from "@/components/FormMessage";
import { getFormMessage } from "@/lib/forms/messages";
import { isActiveOwner } from "@/lib/validation/household";
import {
  getHouseholdForCurrentUser,
  getMembershipForCurrentUser,
  listHouseholdMembers,
} from "@/server/households/service";
import {
  createInvitationAction,
  revokeInvitationAction,
} from "@/server/invitations/actions";
import { listPendingInvitationsForHousehold } from "@/server/invitations/service";

type HouseholdMembersPageProps = {
  params: Promise<{
    householdId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
    status?: string | string[];
  }>;
};

export default async function HouseholdMembersPage({
  params,
  searchParams,
}: HouseholdMembersPageProps) {
  const { householdId } = await params;

  const [household, members, membership] = await Promise.all([
    getHouseholdForCurrentUser(householdId).catch(() => notFound()),
    listHouseholdMembers(householdId).catch(() => notFound()),
    getMembershipForCurrentUser(householdId).catch(() => notFound()),
  ]);
  const isOwner = isActiveOwner(membership);
  const pendingInvitations = isOwner
    ? await listPendingInvitationsForHousehold(household.id).catch(() =>
        notFound(),
      )
    : [];
  const message = getFormMessage(await searchParams);
  const createInvitation = createInvitationAction.bind(null, household.id);
  const revokeInvitation = revokeInvitationAction.bind(null, household.id);

  return (
    <main className="app-main" aria-labelledby="page-title">
      <section className="stack">
        <h1 id="page-title">{household.name} members</h1>
        <FormMessage message={message} />
        <table>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Role</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td>{member.profile?.display_name ?? "Household member"}</td>
                <td>{member.role}</td>
                <td>{member.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {isOwner ? (
        <section
          className="stack section-spaced"
          aria-labelledby="invite-title"
        >
          <h2 id="invite-title">Invite a member</h2>
          <InviteMemberForm action={createInvitation} />
        </section>
      ) : null}

      {isOwner ? (
        <section
          className="stack section-spaced"
          aria-labelledby="pending-invitations-title"
        >
          <h2 id="pending-invitations-title">Pending invitations</h2>
          {pendingInvitations.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th scope="col">Email</th>
                  <th scope="col">Expires</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingInvitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td>{invitation.email}</td>
                    <td>{formatInvitationDate(invitation.expires_at)}</td>
                    <td>
                      <form action={revokeInvitation}>
                        <input
                          type="hidden"
                          name="invitationId"
                          value={invitation.id}
                        />
                        <button type="submit">Revoke</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No pending invitations.</p>
          )}
        </section>
      ) : null}
    </main>
  );
}

function formatInvitationDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
