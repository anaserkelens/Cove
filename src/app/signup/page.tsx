import Link from "next/link";

import { FormMessage } from "@/components/FormMessage";
import { getFormMessage } from "@/lib/forms/messages";
import { signupAction } from "@/server/auth/actions";
import { redirectAuthenticatedUser } from "@/server/auth/session";

type SignupPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    status?: string | string[];
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  await redirectAuthenticatedUser();

  const message = getFormMessage(await searchParams);

  return (
    <main className="shell" aria-labelledby="page-title">
      <section className="stack">
        <h1 id="page-title">Create an account</h1>
        <FormMessage message={message} />
        <form className="form-grid" action={signupAction}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />

          <button type="submit">Sign up</button>
        </form>
        <p>
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </section>
    </main>
  );
}
