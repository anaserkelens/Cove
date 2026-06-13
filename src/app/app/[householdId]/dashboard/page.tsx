import { notFound } from "next/navigation";
import Link from "next/link";

import {
  formatAdminItemAmount,
  formatAdminItemPrimaryDate,
  formatAdminItemStatus,
  formatAdminItemType,
} from "@/lib/admin/display";
import {
  formatCalendarEventTime,
  formatCalendarRecurrence,
} from "@/lib/calendar/display";
import {
  formatShoppingQuantity,
  formatShoppingStatus,
} from "@/lib/shopping/display";
import { formatReminderTime } from "@/lib/reminders/display";
import { formatTaskDate } from "@/lib/tasks/display";
import {
  getAdminDashboardSummary,
  type AdminItemListItem,
} from "@/server/admin/service";
import { getCalendarDashboardSummary } from "@/server/calendar/service";
import { getHouseholdForCurrentUser } from "@/server/households/service";
import { getShoppingDashboardSummary } from "@/server/shopping/service";
import {
  getTaskDashboardSummary,
  listRecentActivityForHousehold,
} from "@/server/tasks/service";
import {
  getReminderDashboardSummary,
  type ReminderListItem,
} from "@/server/reminders/service";

type HouseholdDashboardPageProps = {
  params: Promise<{
    householdId: string;
  }>;
};

export default async function HouseholdDashboardPage({
  params,
}: HouseholdDashboardPageProps) {
  const { householdId } = await params;
  const [
    household,
    taskSummary,
    calendarSummary,
    shoppingSummary,
    adminSummary,
    reminderSummary,
    recentActivity,
  ] = await Promise.all([
    getHouseholdForCurrentUser(householdId).catch(() => notFound()),
    getTaskDashboardSummary(householdId).catch(() => notFound()),
    getCalendarDashboardSummary(householdId).catch(() => notFound()),
    getShoppingDashboardSummary(householdId).catch(() => notFound()),
    getAdminDashboardSummary(householdId).catch(() => notFound()),
    getReminderDashboardSummary(householdId).catch(() => notFound()),
    listRecentActivityForHousehold(householdId).catch(() => notFound()),
  ]);

  return (
    <main className="app-main" aria-labelledby="page-title">
      <section className="stack">
        <p className="eyebrow">Household</p>
        <h1 id="page-title">{household.name}</h1>
        <p>Today is {formatTaskDate(taskSummary.today)}.</p>
      </section>

      <section className="stack section-spaced" aria-labelledby="today-title">
        <div className="section-heading">
          <h2 id="today-title">Today</h2>
          <Link href={`/app/${household.id}/tasks`}>View tasks</Link>
        </div>
        <h3>Tasks</h3>
        <TaskSummaryList
          emptyText="No tasks due today."
          householdId={household.id}
          tasks={taskSummary.dueToday}
        />
        <h3>Events</h3>
        <CalendarSummaryList
          emptyText="No events today."
          events={calendarSummary.today}
          householdId={household.id}
        />
        <h3>Home Admin</h3>
        <AdminSummaryList
          emptyText="No Home Admin items due today."
          householdId={household.id}
          items={adminSummary.dueToday}
        />
        <h3>Reminders</h3>
        <ReminderSummaryList
          emptyText="No reminders due today."
          householdId={household.id}
          reminders={reminderSummary.dueToday}
          timeZone={household.timezone}
        />
      </section>

      <section
        className="stack section-spaced"
        aria-labelledby="attention-title"
      >
        <h2 id="attention-title">Needs attention</h2>
        <TaskSummaryList
          emptyText="No overdue tasks."
          householdId={household.id}
          tasks={taskSummary.overdue}
        />
        <h3>Home Admin</h3>
        <AdminSummaryList
          emptyText="No Home Admin items need attention."
          householdId={household.id}
          items={adminSummary.needsAttention}
        />
        <h3>Reminders</h3>
        <ReminderSummaryList
          emptyText="No overdue reminders."
          householdId={household.id}
          reminders={reminderSummary.needsAttention}
          timeZone={household.timezone}
        />
      </section>

      <section
        className="stack section-spaced"
        aria-labelledby="coming-up-title"
      >
        <div className="section-heading">
          <h2 id="coming-up-title">Coming up</h2>
          <Link href={`/app/${household.id}/calendar`}>View calendar</Link>
        </div>
        <h3>Tasks</h3>
        <TaskSummaryList
          emptyText="No tasks due in the next seven days."
          householdId={household.id}
          tasks={taskSummary.comingUp}
        />
        <h3>Events</h3>
        <CalendarSummaryList
          emptyText="No events in the next seven days."
          events={calendarSummary.comingUp}
          householdId={household.id}
        />
        <h3>Home Admin</h3>
        <AdminSummaryList
          emptyText="No Home Admin items coming up."
          householdId={household.id}
          items={adminSummary.comingUp}
        />
        <h3>Reminders</h3>
        <ReminderSummaryList
          emptyText="No reminders coming up."
          householdId={household.id}
          reminders={reminderSummary.comingUp}
          timeZone={household.timezone}
        />
      </section>

      <section
        className="stack section-spaced"
        aria-labelledby="shopping-title"
      >
        <div className="section-heading">
          <h2 id="shopping-title">Shopping</h2>
          <Link href={`/app/${household.id}/shopping`}>View shopping</Link>
        </div>
        <ShoppingSummaryList
          emptyText="No active shopping items."
          items={shoppingSummary.neededItems}
        />
      </section>

      <section
        className="stack section-spaced"
        aria-labelledby="activity-title"
      >
        <h2 id="activity-title">Recent activity</h2>
        {recentActivity.length > 0 ? (
          <ul className="plain-list">
            {recentActivity.map((event) => (
              <li key={event.id}>
                <span>{event.summary}</span>
                <span>{formatActivityDate(event.created_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No recent activity.</p>
        )}
      </section>
    </main>
  );
}

type TaskSummaryListProps = {
  emptyText: string;
  householdId: string;
  tasks: Array<{
    assignee: { display_name: string | null; id: string } | null;
    due_date: string | null;
    id: string;
    title: string;
  }>;
};

function TaskSummaryList({
  emptyText,
  householdId,
  tasks,
}: TaskSummaryListProps) {
  if (tasks.length === 0) {
    return <p>{emptyText}</p>;
  }

  return (
    <ul className="plain-list">
      {tasks.map((task) => (
        <li key={task.id}>
          <Link href={`/app/${householdId}/tasks/${task.id}`}>
            {task.title}
          </Link>
          <span>
            {formatTaskDate(task.due_date)} -{" "}
            {task.assignee?.display_name ?? "Unassigned"}
          </span>
        </li>
      ))}
    </ul>
  );
}

type CalendarSummaryListProps = {
  emptyText: string;
  events: Array<{
    all_day: boolean;
    assignee: { display_name: string | null; id: string } | null;
    end_date: string | null;
    ends_at: string | null;
    id: string;
    recurrence_rule: string | null;
    start_date: string | null;
    starts_at: string | null;
    timezone: string;
    title: string;
  }>;
  householdId: string;
};

function CalendarSummaryList({
  emptyText,
  events,
  householdId,
}: CalendarSummaryListProps) {
  if (events.length === 0) {
    return <p>{emptyText}</p>;
  }

  return (
    <ul className="plain-list">
      {events.map((event) => (
        <li key={event.id}>
          <Link href={`/app/${householdId}/calendar/${event.id}`}>
            {event.title}
          </Link>
          <span>
            {formatCalendarEventTime(event)} -{" "}
            {event.assignee?.display_name ?? "Unassigned"} -{" "}
            {formatCalendarRecurrence(event.recurrence_rule)}
          </span>
        </li>
      ))}
    </ul>
  );
}

type ShoppingSummaryListProps = {
  emptyText: string;
  items: Array<{
    assignee: { display_name: string | null; id: string } | null;
    id: string;
    name: string;
    quantity: number | null;
    status: "needed" | "in_cart" | "purchased" | "removed";
    unit: string | null;
  }>;
};

function ShoppingSummaryList({ emptyText, items }: ShoppingSummaryListProps) {
  if (items.length === 0) {
    return <p>{emptyText}</p>;
  }

  return (
    <ul className="plain-list">
      {items.map((item) => {
        const quantity = formatShoppingQuantity(item.quantity, item.unit);

        return (
          <li key={item.id}>
            <span>
              {item.name}
              {quantity ? ` - ${quantity}` : ""}
            </span>
            <span>
              {formatShoppingStatus(item.status)} -{" "}
              {item.assignee?.display_name ?? "Unassigned"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

type AdminSummaryListProps = {
  emptyText: string;
  householdId: string;
  items: AdminItemListItem[];
};

function AdminSummaryList({
  emptyText,
  householdId,
  items,
}: AdminSummaryListProps) {
  if (items.length === 0) {
    return <p>{emptyText}</p>;
  }

  return (
    <ul className="plain-list">
      {items.map((item) => (
        <li key={item.id}>
          <Link href={`/app/${householdId}/admin/${item.id}`}>
            {item.title}
          </Link>
          <span>
            {formatAdminItemType(item.type)} -{" "}
            {formatAdminItemPrimaryDate(item)} -{" "}
            {formatAdminItemStatus(item.status)} -{" "}
            {item.owner?.display_name ?? "Unassigned"} -{" "}
            {formatAdminItemAmount(item)}
          </span>
        </li>
      ))}
    </ul>
  );
}

type ReminderSummaryListProps = {
  emptyText: string;
  householdId: string;
  reminders: ReminderListItem[];
  timeZone: string;
};

function ReminderSummaryList({
  emptyText,
  householdId,
  reminders,
  timeZone,
}: ReminderSummaryListProps) {
  if (reminders.length === 0) {
    return <p>{emptyText}</p>;
  }

  return (
    <ul className="plain-list">
      {reminders.map((reminder) => (
        <li key={reminder.id}>
          <Link href={`/app/${householdId}/reminders`}>{reminder.title}</Link>
          <span>
            {formatReminderTime(reminder.remind_at, timeZone)} -{" "}
            {reminder.recipient?.display_name ?? "Household"}
          </span>
        </li>
      ))}
    </ul>
  );
}

function formatActivityDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
