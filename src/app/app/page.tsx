import { FormMessage } from "@/components/FormMessage";
import { getFormMessage } from "@/lib/forms/messages";
import { getProfileForCurrentUser } from "@/server/profiles/service";

type AppHomePageProps = {
  searchParams: Promise<{
    error?: string | string[];
    status?: string | string[];
  }>;
};

export default async function AppHomePage({ searchParams }: AppHomePageProps) {
  const profile = await getProfileForCurrentUser();
  const message = getFormMessage(await searchParams);

  return (
    <main className="app-main" aria-labelledby="page-title">
      <section className="stack">
        <p className="eyebrow">Signed in</p>
        <h1 id="page-title">Welcome, {profile.display_name}</h1>
        <FormMessage message={message} />
        <p>
          Cove authentication and profile setup are ready. Household setup
          starts in the next milestone.
        </p>
      </section>
    </main>
  );
}
