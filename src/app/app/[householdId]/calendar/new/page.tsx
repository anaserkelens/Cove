import Link from "next/link";
import { notFound } from "next/navigation";

import { CalendarEventForm } from "@/components/CalendarEventForm";
import { FormMessage } from "@/components/FormMessage";
import { getFormMessage } from "@/lib/forms/messages";
import { createCalendarEventAction } from "@/server/calendar/actions";
import { listCalendarFormMembers } from "@/server/calendar/service";
import { getHouseholdForCurrentUser } from "@/server/households/service";

type NewCalendarEventPageProps = {
  params: Promise<{
    householdId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
    status?: string | string[];
  }>;
};

export default async function NewCalendarEventPage({
  params,
  searchParams,
}: NewCalendarEventPageProps) {
  const { householdId } = await params;
  const [household, members] = await Promise.all([
    getHouseholdForCurrentUser(householdId).catch(() => notFound()),
    listCalendarFormMembers(householdId).catch(() => notFound()),
  ]);
  const message = getFormMessage(await searchParams);
  const createEvent = createCalendarEventAction.bind(null, household.id);

  return (
    <main className="app-main" aria-labelledby="page-title">
      <section className="stack">
        <p>
          <Link href={`/app/${household.id}/calendar`}>Back to calendar</Link>
        </p>
        <h1 id="page-title">New calendar event</h1>
        <FormMessage message={message} />
        <CalendarEventForm
          action={createEvent}
          householdTimezone={household.timezone}
          members={members}
          submitLabel="Create event"
        />
      </section>
    </main>
  );
}
