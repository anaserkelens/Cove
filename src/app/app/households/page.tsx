import Link from "next/link";

import { listHouseholdsForCurrentUser } from "@/server/households/service";

export default async function HouseholdsPage() {
  const households = await listHouseholdsForCurrentUser();

  return (
    <main className="app-main" aria-labelledby="page-title">
      <section className="stack">
        <div className="section-heading">
          <h1 id="page-title">Households</h1>
          <Link href="/app/households/new">Create household</Link>
        </div>

        {households.length === 0 ? (
          <p>No households yet.</p>
        ) : (
          <ul className="plain-list">
            {households.map((household) => (
              <li key={household.id}>
                <Link href={`/app/${household.id}/dashboard`}>
                  {household.name}
                </Link>
                <span>{household.timezone}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
