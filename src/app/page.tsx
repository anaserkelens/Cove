export default function Home() {
  return (
    <main className="shell" aria-labelledby="page-title">
      <section className="stack">
        <p className="eyebrow">Milestone 1</p>
        <h1 id="page-title">Cove</h1>
        <p>
          Cove remembers the boring stuff, so your household does not have to.
        </p>
        <div className="inline-actions">
          <a href="/login">Log in</a>
          <a href="/signup">Sign up</a>
          <a href="/health">Health check</a>
        </div>
      </section>
    </main>
  );
}
