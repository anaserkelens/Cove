import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260613061000_create_calendar_events.sql",
  ),
  "utf8",
).toLowerCase();

describe("calendar migration contract", () => {
  it("creates calendar events with timed and all-day constraints", () => {
    expect(migrationSql).toContain(
      "create table if not exists public.calendar_events",
    );
    expect(migrationSql).toContain("calendar_events_temporal_semantics_check");
    expect(migrationSql).toContain("calendar_events_end_order_check");
    expect(migrationSql).toContain("all_day boolean not null default false");
    expect(migrationSql).toContain("starts_at timestamptz");
    expect(migrationSql).toContain("start_date date");
  });

  it("adds indexes for dashboard and upcoming access patterns", () => {
    expect(migrationSql).toContain("calendar_events_household_starts_at_idx");
    expect(migrationSql).toContain("calendar_events_household_start_date_idx");
    expect(migrationSql).toContain("calendar_events_household_assigned_idx");
  });

  it("reuses the shared recurrence validation foundation", () => {
    expect(migrationSql).toContain(
      "public.is_valid_task_recurrence_rule(recurrence_rule)",
    );
    expect(migrationSql).toContain("calendar_events_recurrence_timezone_check");
  });

  it("keeps writes behind checked RPCs", () => {
    expect(migrationSql).toContain(
      "create or replace function public.create_calendar_event",
    );
    expect(migrationSql).toContain(
      "create or replace function public.update_calendar_event",
    );
    expect(migrationSql).toContain(
      "create or replace function public.archive_calendar_event",
    );
    expect(migrationSql).toContain("not public.is_household_member");
    expect(migrationSql).toContain(
      "not public.is_active_household_member(target_household_id, event_assigned_to)",
    );
    expect(migrationSql).toContain(
      "not public.is_active_household_member(existing_event.household_id, event_assigned_to)",
    );
    expect(migrationSql).toContain("'calendar_event.created'");
    expect(migrationSql).toContain("'calendar_event.updated'");
    expect(migrationSql).toContain("'calendar_event.archived'");
  });

  it("enables RLS and grants authenticated users read-only table access", () => {
    expect(migrationSql).toContain(
      "alter table public.calendar_events enable row level security",
    );
    expect(migrationSql).toContain(
      "calendar events are readable by active household members",
    );
    expect(migrationSql).toContain(
      "grant select on table public.calendar_events to authenticated",
    );
    expect(migrationSql).toContain(
      "grant execute on function public.create_calendar_event",
    );
    expect(migrationSql).not.toContain(
      "grant insert on table public.calendar_events",
    );
    expect(migrationSql).not.toContain(
      "grant update on table public.calendar_events",
    );
  });
});
