import Link from "next/link";

import { FormMessage } from "@/components/FormMessage";
import { sanitizeRedirectPath } from "@/lib/auth/redirects";
import { getFormMessage } from "@/lib/forms/messages";
import { loginAction } from "@/server/auth/actions";
import { redirectAuthenticatedUser } from "@/server/auth/session";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    next?: string | string[];
    status?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  await redirectAuthenticatedUser();

  const params = await searchParams;
  const next = sanitizeRedirectPath(readParam(params.next), "/app");
  const message = getFormMessage(params);

  return (
    <main className="shell" aria-labelledby="page-title">
      <section className="stack">
        <h1 id="page-title">Log in</h1>
        <FormMessage message={message} />
        <form className="form-grid" action={loginAction}>
          <input type="hidden" name="redirectTo" value={next} />

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
            autoComplete="current-password"
            required
          />

          <button type="submit">Log in</button>
        </form>
        <p>
          <Link href="/password-reset">Reset your password</Link>
        </p>
        <p>
          New to Cove? <Link href="/signup">Create an account</Link>
        </p>
      </section>
    </main>
  );
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
