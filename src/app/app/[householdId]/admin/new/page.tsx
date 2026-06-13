import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminItemForm } from "@/components/AdminItemForm";
import { FormMessage } from "@/components/FormMessage";
import { getFormMessage } from "@/lib/forms/messages";
import { createAdminItemAction } from "@/server/admin/actions";
import { listAdminFormMembers } from "@/server/admin/service";
import { getHouseholdForCurrentUser } from "@/server/households/service";

type NewAdminItemPageProps = {
  params: Promise<{
    householdId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
    status?: string | string[];
  }>;
};

export default async function NewAdminItemPage({
  params,
  searchParams,
}: NewAdminItemPageProps) {
  const { householdId } = await params;
  const [household, members] = await Promise.all([
    getHouseholdForCurrentUser(householdId).catch(() => notFound()),
    listAdminFormMembers(householdId).catch(() => notFound()),
  ]);
  const message = getFormMessage(await searchParams);
  const createItem = createAdminItemAction.bind(null, household.id);

  return (
    <main className="app-main" aria-labelledby="page-title">
      <section className="stack">
        <p>
          <Link href={`/app/${household.id}/admin`}>Back to Home Admin</Link>
        </p>
        <h1 id="page-title">New Home Admin item</h1>
        <FormMessage message={message} />
        <AdminItemForm
          action={createItem}
          householdCurrencyCode={household.currency_code}
          householdTimezone={household.timezone}
          members={members}
          submitLabel="Create item"
        />
      </section>
    </main>
  );
}
