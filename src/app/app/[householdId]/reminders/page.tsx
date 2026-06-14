import { notFound } from "next/navigation";

import { FormMessage } from "@/components/FormMessage";
import { ReminderForm } from "@/components/ReminderForm";
import { ReminderList } from "@/components/ReminderList";
import { getFormMessage } from "@/lib/forms/messages";
import { getHouseholdForCurrentUser } from "@/server/households/service";
import { createReminderAction } from "@/server/reminders/actions";
import {
  listPendingRemindersForHousehold,
  listReminderFormMembers,
} from "@/server/reminders/service";

type RemindersPageProps = {
  params: Promise<{
    householdId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
    status?: string | string[];
  }>;
};

export default async function RemindersPage({
  params,
  searchParams,
}: RemindersPageProps) {
  const { householdId } = await params;
  const [household, reminders, members] = await Promise.all([
    getHouseholdForCurrentUser(householdId).catch(() => notFound()),
    listPendingRemindersForHousehold(householdId).catch(() => notFound()),
    listReminderFormMembers(householdId).catch(() => notFound()),
  ]);
  const message = getFormMessage(await searchParams);
  const redirectPath = `/app/${household.id}/reminders`;
  const createReminder = createReminderAction.bind(
    null,
    household.id,
    "household",
    household.id,
    redirectPath,
  );

  return (
    <main className="app-main" aria-labelledby="page-title">
      <div className="page-head">
        <div className="page-head-text">
          <p className="eyebrow">Reminders</p>
          <h1 id="page-title">Reminders</h1>
          <p>Gentle nudges for {household.name}.</p>
        </div>
      </div>

      <FormMessage message={message} />

      <section className="stack section-spaced" aria-labelledby="new-title">
        <h2 id="new-title">New reminder</h2>
        <ReminderForm
          action={createReminder}
          householdTimezone={household.timezone}
          members={members}
        />
      </section>

      <section className="stack section-spaced" aria-labelledby="open-title">
        <h2 id="open-title">Pending reminders</h2>
        <ReminderList
          emptyText="No pending reminders."
          householdId={household.id}
          redirectPath={redirectPath}
          reminders={reminders}
          timeZone={household.timezone}
        />
      </section>
    </main>
  );
}
