import Link from "next/link";

import { FormMessage } from "@/components/FormMessage";
import { getFormMessage } from "@/lib/forms/messages";
import { requestPasswordResetAction } from "@/server/auth/actions";

type PasswordResetPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    status?: string | string[];
  }>;
};

export default async function PasswordResetPage({
  searchParams,
}: PasswordResetPageProps) {
  const message = getFormMessage(await searchParams);

  return (
    <main className="shell" aria-labelledby="page-title">
      <section className="stack">
        <h1 id="page-title">Reset password</h1>
        <FormMessage message={message} />
        <form className="form-grid" action={requestPasswordResetAction}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />

          <button type="submit">Send reset link</button>
        </form>
        <p>
          <Link href="/login">Back to login</Link>
        </p>
      </section>
    </main>
  );
}
