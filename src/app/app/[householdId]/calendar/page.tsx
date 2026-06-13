import Link from "next/link";
import { notFound } from "next/navigation";

import { FormMessage } from "@/components/FormMessage";
import { getFormMessage } from "@/lib/forms/messages";
import {
  formatCalendarEventKind,
  formatCalendarEventTime,
  formatCalendarRecurrence,
} from "@/lib/calendar/display";
import { getHouseholdForCurrentUser } from "@/server/households/service";
import { listUpcomingCalendarEventsForHousehold } from "@/server/calendar/service";

type CalendarPageProps = {
  params: Promise<{
    householdId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
    status?: string | string[];
  }>;
};

export default async function CalendarPage({
  params,
  searchParams,
}: CalendarPageProps) {
  const { householdId } = await params;
  const [household, events] = await Promise.all([
    getHouseholdForCurrentUser(householdId).catch(() => notFound()),
    listUpcomingCalendarEventsForHousehold(householdId).catch(() => notFound()),
  ]);
  const message = getFormMessage(await searchParams);

  return (
    <main className="app-main" aria-labelledby="page-title">
      <section className="stack">
        <div className="section-heading">
          <h1 id="page-title">{household.name} calendar</h1>
          <Link href={`/app/${household.id}/calendar/new`}>New event</Link>
        </div>
        <FormMessage message={message} />

        {events.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th scope="col">Event</th>
                <th scope="col">When</th>
                <th scope="col">Assigned to</th>
                <th scope="col">Repeat</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>
                    <Link href={`/app/${household.id}/calendar/${event.id}`}>
                      {event.title}
                    </Link>
                    <p>{formatCalendarEventKind(event)}</p>
                  </td>
                  <td>{formatCalendarEventTime(event)}</td>
                  <td>{event.assignee?.display_name ?? "Unassigned"}</td>
                  <td>{formatCalendarRecurrence(event.recurrence_rule)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No upcoming calendar events.</p>
        )}
      </section>
    </main>
  );
}
