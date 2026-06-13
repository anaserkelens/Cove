import Link from "next/link";

export default function Home() {
  return (
    <main className="shell" aria-labelledby="page-title">
      <section className="stack">
        <p className="eyebrow">Shared household calendar</p>
        <h1 id="page-title">A calmer home, together.</h1>
        <p>
          Cove keeps your household in sync — events, tasks, shopping, and the
          boring admin — so everyone knows what&apos;s happening without the
          group-chat chaos.
        </p>
        <div className="inline-actions">
          <Link href="/signup" className="btn">
            Get started
          </Link>
          <Link href="/login">Log in</Link>
        </div>
      </section>
    </main>
  );
}
