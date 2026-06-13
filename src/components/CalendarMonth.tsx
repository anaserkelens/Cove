"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";

export type CalendarMonthEvent = {
  id: string;
  title: string;
  allDay: boolean;
  startDate: string | null;
  endDate: string | null;
  startsAt: string | null;
  timezone: string;
  assigneeId: string | null;
  assigneeName: string | null;
};

type CalendarMonthProps = {
  householdId: string;
  timezone: string;
  events: CalendarMonthEvent[];
  weekStartsOn?: 0 | 1;
};

type DayEvent = {
  id: string;
  title: string;
  allDay: boolean;
  timeLabel: string | null;
  hue: number;
  unassigned: boolean;
  assigneeName: string | null;
  sortVal: number;
};

const HUES = [165, 18, 255, 205, 330, 40, 122, 285];
const MAX_CHIPS = 3;

export function CalendarMonth({
  householdId,
  timezone,
  events,
  weekStartsOn = 0,
}: CalendarMonthProps) {
  const todayKey = useMemo(
    () => zonedDateKey(new Date(), timezone),
    [timezone],
  );

  const [view, setView] = useState(() => {
    const [y, m] = todayKey.split("-").map(Number);
    return { year: y, month: m - 1 };
  });
  const [selectedKey, setSelectedKey] = useState(todayKey);

  const eventsByDay = useMemo(() => buildEventMap(events), [events]);

  const cells = useMemo(
    () => buildMonthGrid(view.year, view.month, weekStartsOn),
    [view, weekStartsOn],
  );

  const weekdayLabels = useMemo(
    () => buildWeekdayLabels(weekStartsOn),
    [weekStartsOn],
  );

  const selectedEvents = sortDay(eventsByDay.get(selectedKey) ?? []);
  const monthLabel = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(new Date(view.year, view.month, 1));

  function goToMonth(delta: number) {
    setView((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  function goToToday() {
    const [y, m] = todayKey.split("-").map(Number);
    setView({ year: y, month: m - 1 });
    setSelectedKey(todayKey);
  }

  function selectCell(date: Date) {
    setSelectedKey(toKey(date));
    if (date.getMonth() !== view.month) {
      setView({ year: date.getFullYear(), month: date.getMonth() });
    }
  }

  return (
    <div className="cal has-panel">
      <div className="cal-card">
        <div className="cal-toolbar">
          <h2 className="cal-month">{monthLabel}</h2>
          <div className="cal-nav">
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={goToToday}
            >
              Today
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => goToMonth(-1)}
              aria-label="Previous month"
            >
              <Chevron dir="left" />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => goToMonth(1)}
              aria-label="Next month"
            >
              <Chevron dir="right" />
            </button>
          </div>
        </div>

        <div className="cal-grid" aria-label={monthLabel}>
          {weekdayLabels.map((label) => (
            <div key={label} className="cal-weekday" aria-hidden="true">
              {label}
            </div>
          ))}

          {cells.map((date) => {
            const key = toKey(date);
            const dayEvents = sortDay(eventsByDay.get(key) ?? []);
            const isOutside = date.getMonth() !== view.month;
            const isToday = key === todayKey;
            const isSelected = key === selectedKey;
            const visible = dayEvents.slice(0, MAX_CHIPS);
            const overflow = dayEvents.length - visible.length;

            return (
              <button
                type="button"
                key={key}
                aria-pressed={isSelected}
                aria-label={`${formatLongDate(date)}${
                  dayEvents.length
                    ? `, ${dayEvents.length} event${dayEvents.length > 1 ? "s" : ""}`
                    : ", no events"
                }`}
                className={[
                  "cal-day",
                  isOutside ? "is-outside" : "",
                  isToday ? "is-today" : "",
                  isSelected ? "is-selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => selectCell(date)}
              >
                <span className="cal-daynum">{date.getDate()}</span>
                <span className="cal-events">
                  {visible.map((event) => (
                    <Link
                      key={event.id}
                      href={`/app/${householdId}/calendar/${event.id}`}
                      className={`cal-chip${event.unassigned ? " is-unassigned" : ""}`}
                      style={{ "--h": event.hue } as CSSProperties}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`${event.title}${
                        event.timeLabel
                          ? ` at ${event.timeLabel}`
                          : " (all day)"
                      }${event.assigneeName ? `, ${event.assigneeName}` : ""}`}
                    >
                      {event.timeLabel ? (
                        <span className="cal-chip-time">{event.timeLabel}</span>
                      ) : null}
                      <span className="cal-chip-title">{event.title}</span>
                    </Link>
                  ))}
                  {overflow > 0 ? (
                    <span className="cal-more">+{overflow} more</span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <aside className="cal-panel" aria-label="Selected day">
        <div className="cal-panel-head">
          <span className="cal-panel-date">{formatPanelDate(selectedKey)}</span>
          <span className="cal-panel-count">
            {selectedEvents.length
              ? `${selectedEvents.length} event${selectedEvents.length > 1 ? "s" : ""}`
              : "Free"}
          </span>
        </div>

        {selectedEvents.length ? (
          <div className="cal-agenda">
            {selectedEvents.map((event) => (
              <Link
                key={event.id}
                href={`/app/${householdId}/calendar/${event.id}`}
                className={`cal-agenda-item${event.unassigned ? " is-unassigned" : ""}`}
                style={{ "--h": event.hue } as CSSProperties}
              >
                <span className="cal-agenda-title">{event.title}</span>
                <span className="cal-agenda-meta">
                  <span>{event.timeLabel ?? "All day"}</span>
                  <span className="who">
                    {event.assigneeName ?? "Unassigned"}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="cal-empty">Nothing planned for this day.</p>
        )}

        <Link
          href={`/app/${householdId}/calendar/new`}
          className="btn btn-secondary btn-sm"
        >
          <PlusIcon />
          Add event
        </Link>
      </aside>
    </div>
  );
}

/* ----------------------------- helpers ----------------------------- */

function buildEventMap(events: CalendarMonthEvent[]): Map<string, DayEvent[]> {
  const map = new Map<string, DayEvent[]>();

  for (const event of events) {
    const hue = hueFor(event.assigneeId);
    const unassigned = !event.assigneeId;

    if (event.allDay) {
      if (!event.startDate) continue;
      const endDate = event.endDate ?? event.startDate;
      for (const key of eachDateKey(event.startDate, endDate)) {
        push(map, key, {
          id: event.id,
          title: event.title,
          allDay: true,
          timeLabel: null,
          hue,
          unassigned,
          assigneeName: event.assigneeName,
          sortVal: -1,
        });
      }
    } else if (event.startsAt) {
      const key = zonedDateKey(new Date(event.startsAt), event.timezone);
      push(map, key, {
        id: event.id,
        title: event.title,
        allDay: false,
        timeLabel: zonedTimeLabel(event.startsAt, event.timezone),
        hue,
        unassigned,
        assigneeName: event.assigneeName,
        sortVal: new Date(event.startsAt).getTime(),
      });
    }
  }

  return map;
}

function push(map: Map<string, DayEvent[]>, key: string, value: DayEvent) {
  const existing = map.get(key);
  if (existing) {
    existing.push(value);
  } else {
    map.set(key, [value]);
  }
}

function sortDay(items: DayEvent[]): DayEvent[] {
  return [...items].sort((a, b) => a.sortVal - b.sortVal);
}

function buildMonthGrid(
  year: number,
  month: number,
  weekStartsOn: number,
): Date[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() - weekStartsOn + 7) % 7;
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(year, month, 1 - offset + i));
  }
  return cells;
}

function buildWeekdayLabels(weekStartsOn: number): string[] {
  const base = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return base.slice(weekStartsOn).concat(base.slice(0, weekStartsOn));
}

function toKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function zonedDateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function zonedTimeLabel(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function eachDateKey(startStr: string, endStr: string): string[] {
  const keys: string[] = [];
  const [sy, sm, sd] = startStr.split("-").map(Number);
  const [ey, em, ed] = endStr.split("-").map(Number);
  let cur = Date.UTC(sy, sm - 1, sd);
  const end = Date.UTC(ey, em - 1, ed);
  let guard = 0;
  while (cur <= end && guard < 366) {
    const d = new Date(cur);
    keys.push(
      `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    );
    cur += 86_400_000;
    guard += 1;
  }
  return keys;
}

function hueFor(id: string | null): number {
  if (!id) return 210;
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return HUES[hash % HUES.length];
}

function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatPanelDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(y, m - 1, d));
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={dir === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
