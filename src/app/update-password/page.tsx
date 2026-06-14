import Link from "next/link";

import { FormMessage } from "@/components/FormMessage";
import { Logo } from "@/components/Logo";
import { getFormMessage } from "@/lib/forms/messages";
import { updatePasswordAction } from "@/server/auth/actions";
import { requireAuthenticatedUser } from "@/server/auth/session";

type UpdatePasswordPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    status?: string | string[];
  }>;
};

export default async function UpdatePasswordPage({
  searchParams,
}: UpdatePasswordPageProps) {
  await requireAuthenticatedUser("/update-password");
  const message = getFormMessage(await searchParams);

  return (
    <main className="shell" aria-labelledby="page-title">
      <section className="stack">
        <Link href="/" className="brand-link auth-brand" aria-label="Cove home">
          <Logo size={36} />
        </Link>
        <h1 id="page-title">Update password</h1>
        <FormMessage message={message} />
        <form className="form-grid" action={updatePasswordAction}>
          <label htmlFor="password">New password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />

          <label htmlFor="confirmPassword">Confirm password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />

          <button type="submit">Update password</button>
        </form>
      </section>
    </main>
  );
}
