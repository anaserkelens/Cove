import Link from "next/link";

import { FormMessage } from "@/components/FormMessage";
import { getFormMessage } from "@/lib/forms/messages";
import { listHouseholdsForCurrentUser } from "@/server/households/service";
import { getProfileForCurrentUser } from "@/server/profiles/service";

type AppHomePageProps = {
  searchParams: Promise<{
    error?: string | string[];
    status?: string | string[];
  }>;
};

export default async function AppHomePage({ searchParams }: AppHomePageProps) {
  const [profile, households] = await Promise.all([
    getProfileForCurrentUser(),
    listHouseholdsForCurrentUser(),
  ]);
  const message = getFormMessage(await searchParams);

  return (
    <main className="app-main" aria-labelledby="page-title">
      <section className="stack">
        <p className="eyebrow">Signed in</p>
        <h1 id="page-title">Welcome, {profile.display_name}</h1>
        <FormMessage message={message} />
        {households.length === 0 ? (
          <Link href="/app/households/new">Create your first household</Link>
        ) : (
          <ul className="plain-list">
            {households.map((household) => (
              <li key={household.id}>
                <Link href={`/app/${household.id}/dashboard`}>
                  {household.name}
                </Link>
                <span>{household.currency_code}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
