import { notFound } from "next/navigation";

import { FormMessage } from "@/components/FormMessage";
import { HouseholdForm } from "@/components/HouseholdForm";
import { getFormMessage } from "@/lib/forms/messages";
import { isActiveOwner } from "@/lib/validation/household";
import { updateHouseholdSettingsAction } from "@/server/households/actions";
import {
  getHouseholdForCurrentUser,
  getMembershipForCurrentUser,
} from "@/server/households/service";

type HouseholdSettingsPageProps = {
  params: Promise<{
    householdId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
    status?: string | string[];
  }>;
};

export default async function HouseholdSettingsPage({
  params,
  searchParams,
}: HouseholdSettingsPageProps) {
  const { householdId } = await params;

  const [household, membership] = await Promise.all([
    getHouseholdForCurrentUser(householdId).catch(() => notFound()),
    getMembershipForCurrentUser(householdId).catch(() => notFound()),
  ]);

  const message = getFormMessage(await searchParams);

  return (
    <main className="app-main" aria-labelledby="page-title">
      <section className="stack">
        <h1 id="page-title">{household.name} settings</h1>
        <FormMessage message={message} />
        {isActiveOwner(membership) ? (
          <HouseholdForm
            action={updateHouseholdSettingsAction.bind(null, household.id)}
            household={household}
            submitLabel="Save settings"
          />
        ) : (
          <p>Only household owners can edit these settings.</p>
        )}
      </section>
    </main>
  );
}
