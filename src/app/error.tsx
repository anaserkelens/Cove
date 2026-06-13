"use client";

import Link from "next/link";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  void error;

  return (
    <main className="shell" aria-labelledby="page-title">
      <section className="stack">
        <p className="eyebrow">Something went wrong</p>
        <h1 id="page-title">Cove hit a problem</h1>
        <p>
          The request could not be completed. Try again, or return to the app
          home page.
        </p>
        <div className="inline-actions">
          <button type="button" onClick={reset}>
            Try again
          </button>
          <Link href="/app">Go to app</Link>
        </div>
      </section>
    </main>
  );
}
