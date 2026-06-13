import Link from "next/link";

import { FormMessage } from "@/components/FormMessage";
import { getFormMessage } from "@/lib/forms/messages";
import { acceptInvitationAction } from "@/server/invitations/actions";
import { requireAuthenticatedUser } from "@/server/auth/session";

type InvitePageProps = {
  params: Promise<{
    token: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
    status?: string | string[];
  }>;
};

export default async function InvitePage({
  params,
  searchParams,
}: InvitePageProps) {
  const { token } = await params;

  await requireAuthenticatedUser(`/invite/${encodeURIComponent(token)}`);

  const message = getFormMessage(await searchParams);
  const acceptInvitation = acceptInvitationAction.bind(null, token);

  return (
    <main className="shell" aria-labelledby="page-title">
      <section className="stack">
        <p className="eyebrow">Household invitation</p>
        <h1 id="page-title">Join household</h1>
        <FormMessage message={message} />
        <p>
          Accept this invitation while signed in with the email address it was
          sent to.
        </p>
        <form action={acceptInvitation}>
          <button type="submit">Accept invitation</button>
        </form>
        <p>
          Need a different account? <Link href="/login">Log in again</Link>
        </p>
      </section>
    </main>
  );
}
