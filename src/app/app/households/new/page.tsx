import { FormMessage } from "@/components/FormMessage";
import { HouseholdForm } from "@/components/HouseholdForm";
import { getFormMessage } from "@/lib/forms/messages";
import { createHouseholdAction } from "@/server/households/actions";
import { getProfileForCurrentUser } from "@/server/profiles/service";

type NewHouseholdPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    status?: string | string[];
  }>;
};

export default async function NewHouseholdPage({
  searchParams,
}: NewHouseholdPageProps) {
  const profile = await getProfileForCurrentUser();
  const message = getFormMessage(await searchParams);

  return (
    <main className="app-main" aria-labelledby="page-title">
      <section className="stack">
        <h1 id="page-title">Create household</h1>
        <FormMessage message={message} />
        <HouseholdForm
          action={createHouseholdAction}
          household={{
            currency_code: "EUR",
            name: "",
            timezone: profile.timezone,
          }}
          submitLabel="Create household"
        />
      </section>
    </main>
  );
}
