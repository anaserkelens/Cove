import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="shell" aria-labelledby="page-title">
      <section className="stack">
        <p className="eyebrow">Not found</p>
        <h1 id="page-title">That page is not available</h1>
        <p>The page may have moved, or you may not have access to it.</p>
        <Link href="/app">Go to app</Link>
      </section>
    </main>
  );
}
