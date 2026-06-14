import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/Logo";
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

  const base = `/app/${household.id}`;
  const stats = [
    {
      label: "Tasks due today",
      count: taskSummary.dueToday.length,
      href: `${base}/tasks`,
      icon: icons.tasks,
    },
    {
      label: "Events today",
      count: calendarSummary.today.length,
      href: `${base}/calendar`,
      icon: icons.calendar,
    },
    {
      label: "To buy",
      count: shoppingSummary.neededItems.length,
      href: `${base}/shopping`,
      icon: icons.shopping,
    },
    {
      label: "Reminders today",
      count: reminderSummary.dueToday.length,
      href: `${base}/reminders`,
      icon: icons.reminders,
    },
    {
      label: "Needs attention",
      count: taskSummary.overdue.length,
      href: `${base}/tasks`,
      icon: icons.attention,
      warn: true,
    },
  ];

  return (
    <main className="app-main dash" aria-labelledby="page-title">
      <section className="dash-hero">
        <span className="dash-hero-mark">
          <Logo variant="mark" size={58} idPrefix="dash" />
        </span>
        <div className="dash-hero-text">
          <p className="eyebrow">{greeting()}</p>
          <h1 id="page-title">{household.name}</h1>
          <p>Today is {formatTaskDate(taskSummary.today)}.</p>
        </div>
        <div className="dash-hero-actions">
          <Link href={`${base}/calendar/new`} className="btn">
            {icons.plus}
            Add event
          </Link>
        </div>
      </section>

      <div className="stat-grid">
        {stats.map((stat) => (
          <Link href={stat.href} className="stat-card" key={stat.label}>
            <span className={`stat-ico${stat.warn ? " is-warn" : ""}`}>
              {stat.icon}
            </span>
            <span className="stat-meta">
              <span className="stat-num">{stat.count}</span>
              <span className="stat-label">{stat.label}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="dash-grid">
        <section
          className="panel col-span-2"
          aria-labelledby="today-title"
        >
          <div className="panel-head">
            <h2 id="today-title">
              <span className="panel-ico">{icons.sun}</span>Today
            </h2>
            <Link href={`${base}/calendar`}>View calendar</Link>
          </div>
          <div className="panel-group">
            <span className="panel-sub">Tasks</span>
            <TaskSummaryList
              emptyText="No tasks due today."
              householdId={household.id}
              tasks={taskSummary.dueToday}
            />
          </div>
          <div className="panel-group">
            <span className="panel-sub">Events</span>
            <CalendarSummaryList
              emptyText="No events today."
              events={calendarSummary.today}
              householdId={household.id}
            />
          </div>
          <div className="panel-group">
            <span className="panel-sub">Home Admin</span>
            <AdminSummaryList
              emptyText="No Home Admin items due today."
              householdId={household.id}
              items={adminSummary.dueToday}
            />
          </div>
          <div className="panel-group">
            <span className="panel-sub">Reminders</span>
            <ReminderSummaryList
              emptyText="No reminders due today."
              householdId={household.id}
              reminders={reminderSummary.dueToday}
              timeZone={household.timezone}
            />
          </div>
        </section>

        <section className="panel" aria-labelledby="attention-title">
          <div className="panel-head">
            <h2 id="attention-title">
              <span className="panel-ico">{icons.attention}</span>Needs attention
            </h2>
          </div>
          <div className="panel-group">
            <span className="panel-sub">Tasks</span>
            <TaskSummaryList
              emptyText="No overdue tasks."
              householdId={household.id}
              tasks={taskSummary.overdue}
            />
          </div>
          <div className="panel-group">
            <span className="panel-sub">Home Admin</span>
            <AdminSummaryList
              emptyText="No Home Admin items need attention."
              householdId={household.id}
              items={adminSummary.needsAttention}
            />
          </div>
          <div className="panel-group">
            <span className="panel-sub">Reminders</span>
            <ReminderSummaryList
              emptyText="No overdue reminders."
              householdId={household.id}
              reminders={reminderSummary.needsAttention}
              timeZone={household.timezone}
            />
          </div>
        </section>

        <section className="panel" aria-labelledby="coming-up-title">
          <div className="panel-head">
            <h2 id="coming-up-title">
              <span className="panel-ico">{icons.calendar}</span>Coming up
            </h2>
            <Link href={`${base}/tasks`}>View tasks</Link>
          </div>
          <div className="panel-group">
            <span className="panel-sub">Tasks</span>
            <TaskSummaryList
              emptyText="No tasks due in the next seven days."
              householdId={household.id}
              tasks={taskSummary.comingUp}
            />
          </div>
          <div className="panel-group">
            <span className="panel-sub">Events</span>
            <CalendarSummaryList
              emptyText="No events in the next seven days."
              events={calendarSummary.comingUp}
              householdId={household.id}
            />
          </div>
          <div className="panel-group">
            <span className="panel-sub">Home Admin</span>
            <AdminSummaryList
              emptyText="No Home Admin items coming up."
              householdId={household.id}
              items={adminSummary.comingUp}
            />
          </div>
          <div className="panel-group">
            <span className="panel-sub">Reminders</span>
            <ReminderSummaryList
              emptyText="No reminders coming up."
              householdId={household.id}
              reminders={reminderSummary.comingUp}
              timeZone={household.timezone}
            />
          </div>
        </section>

        <section className="panel" aria-labelledby="shopping-title">
          <div className="panel-head">
            <h2 id="shopping-title">
              <span className="panel-ico">{icons.shopping}</span>Shopping
            </h2>
            <Link href={`${base}/shopping`}>View shopping</Link>
          </div>
          <ShoppingSummaryList
            emptyText="No active shopping items."
            items={shoppingSummary.neededItems}
          />
        </section>

        <section className="panel" aria-labelledby="activity-title">
          <div className="panel-head">
            <h2 id="activity-title">
              <span className="panel-ico">{icons.activity}</span>Recent activity
            </h2>
          </div>
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
            <p>No recent activity yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const svg = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.85,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const icons: Record<string, ReactNode> = {
  tasks: (
    <svg {...svg}>
      <path d="M11 3 4 10l-2-2" />
      <path d="m21 6-9 9-2-2" />
      <path d="M11 18H4" />
      <path d="M21 13v6" />
    </svg>
  ),
  calendar: (
    <svg {...svg}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M8 2v4M16 2v4M3 10h18" />
    </svg>
  ),
  shopping: (
    <svg {...svg}>
      <path d="M6 2 3 6v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  ),
  reminders: (
    <svg {...svg}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  ),
  attention: (
    <svg {...svg}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  ),
  activity: (
    <svg {...svg}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  sun: (
    <svg {...svg}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
  plus: (
    <svg {...svg}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
};

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
