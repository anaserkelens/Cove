import Link from "next/link";
import { notFound } from "next/navigation";

import { CalendarMonth } from "@/components/CalendarMonth";
import { FormMessage } from "@/components/FormMessage";
import { getFormMessage } from "@/lib/forms/messages";
import {
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

  const calendarEvents = events.map((event) => ({
    id: event.id,
    title: event.title,
    allDay: event.all_day,
    startDate: event.start_date,
    endDate: event.end_date,
    startsAt: event.starts_at,
    timezone: event.timezone,
    assigneeId: event.assigned_to ?? null,
    assigneeName: event.assignee?.display_name ?? null,
  }));

  const upcoming = events.slice(0, 6);

  return (
    <main className="app-main" aria-labelledby="page-title">
      <section className="stack">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Calendar</p>
            <h1 id="page-title">{household.name}</h1>
          </div>
          <Link href={`/app/${household.id}/calendar/new`} className="btn">
            New event
          </Link>
        </div>
        <FormMessage message={message} />

        <CalendarMonth
          householdId={household.id}
          timezone={household.timezone}
          events={calendarEvents}
        />
      </section>

      <section
        className="stack section-spaced"
        aria-labelledby="upcoming-title"
      >
        <h2 id="upcoming-title">Upcoming</h2>
        {upcoming.length > 0 ? (
          <ul className="plain-list">
            {upcoming.map((event) => (
              <li key={event.id}>
                <Link href={`/app/${household.id}/calendar/${event.id}`}>
                  {event.title}
                </Link>
                <span>
                  {formatCalendarEventTime(event)} ·{" "}
                  {event.assignee?.display_name ?? "Unassigned"} ·{" "}
                  {formatCalendarRecurrence(event.recurrence_rule)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No upcoming calendar events.</p>
        )}
      </section>
    </main>
  );
}
