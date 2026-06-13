import Link from "next/link";
import { notFound } from "next/navigation";

import { CalendarEventForm } from "@/components/CalendarEventForm";
import { FormMessage } from "@/components/FormMessage";
import {
  formatCalendarEventKind,
  formatCalendarEventTime,
  formatCalendarRecurrence,
} from "@/lib/calendar/display";
import { getFormMessage } from "@/lib/forms/messages";
import {
  archiveCalendarEventAction,
  updateCalendarEventAction,
} from "@/server/calendar/actions";
import {
  getCalendarEventForCurrentUser,
  listCalendarFormMembers,
} from "@/server/calendar/service";
import { getHouseholdForCurrentUser } from "@/server/households/service";

type CalendarEventPageProps = {
  params: Promise<{
    eventId: string;
    householdId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
    status?: string | string[];
  }>;
};

export default async function CalendarEventPage({
  params,
  searchParams,
}: CalendarEventPageProps) {
  const { householdId, eventId } = await params;
  const [household, event, members] = await Promise.all([
    getHouseholdForCurrentUser(householdId).catch(() => notFound()),
    getCalendarEventForCurrentUser(householdId, eventId).catch(() =>
      notFound(),
    ),
    listCalendarFormMembers(householdId).catch(() => notFound()),
  ]);
  const message = getFormMessage(await searchParams);
  const updateEvent = updateCalendarEventAction.bind(
    null,
    household.id,
    event.id,
  );
  const archiveEvent = archiveCalendarEventAction.bind(
    null,
    household.id,
    event.id,
  );

  return (
    <main className="app-main" aria-labelledby="page-title">
      <section className="stack">
        <p>
          <Link href={`/app/${household.id}/calendar`}>Back to calendar</Link>
        </p>
        <p className="eyebrow">{formatCalendarEventKind(event)}</p>
        <h1 id="page-title">{event.title}</h1>
        <FormMessage message={message} />
        <p>{formatCalendarEventTime(event)}</p>
        <p>Assigned to: {event.assignee?.display_name ?? "Unassigned"}</p>
        <p>Repeat: {formatCalendarRecurrence(event.recurrence_rule)}</p>
        {event.location ? <p>Location: {event.location}</p> : null}

        <form action={archiveEvent}>
          <button type="submit" className="btn-danger">
            Archive event
          </button>
        </form>
      </section>

      <section className="stack section-spaced" aria-labelledby="edit-title">
        <h2 id="edit-title">Edit event</h2>
        <CalendarEventForm
          action={updateEvent}
          event={event}
          householdTimezone={household.timezone}
          members={members}
          submitLabel="Save event"
        />
      </section>
    </main>
  );
}
