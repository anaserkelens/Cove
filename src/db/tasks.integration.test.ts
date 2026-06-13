import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260613043754_create_tasks_comments_activity.sql",
  ),
  "utf8",
).toLowerCase();

describe("tasks migration contract", () => {
  it("creates tasks, comments, activity, statuses, and priorities", () => {
    expect(migrationSql).toContain("create type public.task_status as enum");
    expect(migrationSql).toContain("create type public.task_priority as enum");
    expect(migrationSql).toContain("create table if not exists public.tasks");
    expect(migrationSql).toContain(
      "create table if not exists public.task_comments",
    );
    expect(migrationSql).toContain(
      "create table if not exists public.activity_events",
    );
    expect(migrationSql).toContain("due_date date");
    expect(migrationSql).toContain("due_at timestamptz");
    expect(migrationSql).toContain("recurrence_rule text");
    expect(migrationSql).toContain("tasks_due_semantics_check");
  });

  it("adds indexes for dashboard and recurrence access patterns", () => {
    expect(migrationSql).toContain("tasks_household_status_due_idx");
    expect(migrationSql).toContain("tasks_household_assigned_status_idx");
    expect(migrationSql).toContain("tasks_household_next_occurrence_idx");
    expect(migrationSql).toContain("tasks_recurrence_source_due_unique_idx");
    expect(migrationSql).toContain("activity_events_household_created_idx");
  });

  it("restricts assignment and creation to active household members", () => {
    expect(migrationSql).toContain(
      "create or replace function public.is_active_household_member",
    );
    expect(migrationSql).toContain("not public.is_household_member");
    expect(migrationSql).toContain(
      "not public.is_active_household_member(target_household_id, task_assigned_to)",
    );
    expect(migrationSql).toContain(
      "not public.is_active_household_member(existing_task.household_id, task_assigned_to)",
    );
  });

  it("completes recurring tasks idempotently", () => {
    expect(migrationSql).toContain(
      "create or replace function public.complete_task",
    );
    expect(migrationSql).toContain(
      "if existing_task.status = 'completed' then",
    );
    expect(migrationSql).toContain("return existing_task");
    expect(migrationSql).toContain(
      "next_due_date := public.calculate_next_task_due_date",
    );
    expect(migrationSql).toContain(
      "on conflict (household_id, recurrence_source_id, due_date)",
    );
    expect(migrationSql).toContain("do nothing");
  });

  it("logs task activity through database functions", () => {
    expect(migrationSql).toContain(
      "create or replace function public.record_activity_event",
    );
    expect(migrationSql).toContain("'task.created'");
    expect(migrationSql).toContain("'task.updated'");
    expect(migrationSql).toContain("'task.completed'");
    expect(migrationSql).toContain("'task.archived'");
    expect(migrationSql).toContain("'task.commented'");
  });

  it("enables RLS and keeps writes behind RPCs", () => {
    expect(migrationSql).toContain(
      "alter table public.tasks enable row level security",
    );
    expect(migrationSql).toContain(
      "alter table public.task_comments enable row level security",
    );
    expect(migrationSql).toContain(
      "alter table public.activity_events enable row level security",
    );
    expect(migrationSql).toContain("grant select on table public.tasks");
    expect(migrationSql).toContain(
      "grant select on table public.task_comments",
    );
    expect(migrationSql).toContain(
      "grant select on table public.activity_events",
    );
    expect(migrationSql).toContain(
      "grant execute on function public.create_task",
    );
    expect(migrationSql).toContain(
      "grant execute on function public.complete_task",
    );
    expect(migrationSql).not.toContain("grant insert on table public.tasks");
    expect(migrationSql).not.toContain("grant update on table public.tasks");
  });
});
