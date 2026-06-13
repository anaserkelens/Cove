import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260613073000_create_admin_items.sql",
  ),
  "utf8",
).toLowerCase();

describe("home admin migration contract", () => {
  it("creates unified admin items with distinct date and money fields", () => {
    expect(migrationSql).toContain(
      "create type public.admin_item_type as enum",
    );
    expect(migrationSql).toContain(
      "create type public.admin_item_status as enum",
    );
    expect(migrationSql).toContain(
      "create table if not exists public.admin_items",
    );
    expect(migrationSql).toContain("amount_minor bigint");
    expect(migrationSql).toContain("currency_code char(3)");
    expect(migrationSql).toContain("due_date date");
    expect(migrationSql).toContain("action_date date");
    expect(migrationSql).toContain("expiry_date date");
    expect(migrationSql).toContain("admin_items_money_pair_check");
    expect(migrationSql).toContain("admin_items_paid_state_check");
  });

  it("creates admin history and updated-at triggers", () => {
    expect(migrationSql).toContain(
      "create table if not exists public.admin_item_events",
    );
    expect(migrationSql).toContain("create trigger set_admin_items_updated_at");
    expect(migrationSql).toContain(
      "create trigger set_admin_item_events_updated_at",
    );
    expect(migrationSql).toContain(
      "create or replace function public.record_admin_item_event",
    );
  });

  it("adds indexes for dashboard attention, upcoming, and recurrence queries", () => {
    expect(migrationSql).toContain("admin_items_household_status_due_idx");
    expect(migrationSql).toContain("admin_items_household_action_idx");
    expect(migrationSql).toContain("admin_items_household_expiry_idx");
    expect(migrationSql).toContain("admin_items_household_next_occurrence_idx");
    expect(migrationSql).toContain(
      "admin_items_recurrence_source_date_unique_idx",
    );
  });

  it("keeps writes behind checked RPCs and active household membership", () => {
    expect(migrationSql).toContain(
      "create or replace function public.create_admin_item",
    );
    expect(migrationSql).toContain(
      "create or replace function public.update_admin_item",
    );
    expect(migrationSql).toContain(
      "create or replace function public.set_admin_item_status",
    );
    expect(migrationSql).toContain(
      "create or replace function public.archive_admin_item",
    );
    expect(migrationSql).toContain("not public.is_household_member");
    expect(migrationSql).toContain(
      "not public.is_active_household_member(target_household_id, item_owner_id)",
    );
    expect(migrationSql).toContain(
      "not public.is_active_household_member(existing_item.household_id, item_owner_id)",
    );
  });

  it("generates recurring bills idempotently after terminal status changes", () => {
    expect(migrationSql).toContain(
      "if item_status in ('paid', 'renewed', 'completed')",
    );
    expect(migrationSql).toContain("recurrence_root_id := coalesce");
    expect(migrationSql).toContain("public.calculate_next_task_due_date");
    expect(migrationSql).toContain(
      "coalesce(next_due_date, next_action_date, next_expiry_date)",
    );
    expect(migrationSql).toContain("on conflict do nothing");
  });

  it("logs Home Admin activity and keeps table grants read-only", () => {
    expect(migrationSql).toContain("'admin_item.created'");
    expect(migrationSql).toContain("'admin_item.updated'");
    expect(migrationSql).toContain("'admin_item.' || event_type");
    expect(migrationSql).toContain("'admin_item.archived'");
    expect(migrationSql).toContain(
      "alter table public.admin_items enable row level security",
    );
    expect(migrationSql).toContain(
      "alter table public.admin_item_events enable row level security",
    );
    expect(migrationSql).toContain(
      "grant select on table public.admin_items to authenticated",
    );
    expect(migrationSql).toContain(
      "grant select on table public.admin_item_events to authenticated",
    );
    expect(migrationSql).toContain(
      "grant execute on function public.create_admin_item",
    );
    expect(migrationSql).toContain(
      "grant execute on function public.set_admin_item_status",
    );
    expect(migrationSql).not.toContain(
      "grant insert on table public.admin_items",
    );
    expect(migrationSql).not.toContain(
      "grant update on table public.admin_items",
    );
  });
});
