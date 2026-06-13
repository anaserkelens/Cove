"use client";

import Link from "next/link";

type GlobalErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalErrorPage({
  error,
  reset,
}: GlobalErrorPageProps) {
  void error;

  return (
    <html lang="en">
      <body>
        <main className="shell" aria-labelledby="page-title">
          <section className="stack">
            <p className="eyebrow">Something went wrong</p>
            <h1 id="page-title">Cove could not load</h1>
            <p>
              The page could not be rendered. Try again, or start from the home
              page.
            </p>
            <div className="inline-actions">
              <button type="button" onClick={reset}>
                Try again
              </button>
              <Link href="/">Go home</Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
