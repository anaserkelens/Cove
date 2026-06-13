import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260613083000_create_reminders_attachments.sql",
  ),
  "utf8",
).toLowerCase();

describe("reminders and attachments migration contract", () => {
  it("creates in-app reminders with dedupe and dashboard indexes", () => {
    expect(migrationSql).toContain("create type public.reminder_channel");
    expect(migrationSql).toContain("create type public.reminder_status");
    expect(migrationSql).toContain(
      "create table if not exists public.reminders",
    );
    expect(migrationSql).toContain("dedupe_key text not null");
    expect(migrationSql).toContain("reminders_dedupe_key_unique_idx");
    expect(migrationSql).toContain("reminders_status_remind_at_idx");
    expect(migrationSql).toContain(
      "reminders_household_recipient_status_remind_idx",
    );
  });

  it("keeps reminder writes behind checked RPCs", () => {
    expect(migrationSql).toContain(
      "create or replace function public.create_reminder",
    );
    expect(migrationSql).toContain(
      "create or replace function public.mark_reminder_sent",
    );
    expect(migrationSql).toContain(
      "create or replace function public.cancel_reminder",
    );
    expect(migrationSql).toContain("not public.is_household_member");
    expect(migrationSql).toContain("not public.household_source_exists");
    expect(migrationSql).toContain("not public.is_active_household_member");
    expect(migrationSql).toContain("on conflict (dedupe_key) do update");
  });

  it("creates a private storage bucket and storage object policies", () => {
    expect(migrationSql).toContain("insert into storage.buckets");
    expect(migrationSql).toContain("household-attachments");
    expect(migrationSql).toContain("public = false");
    expect(migrationSql).toContain("allowed_mime_types");
    expect(migrationSql).toContain(
      "household attachment objects are readable by active household members",
    );
    expect(migrationSql).toContain(
      "household attachment objects are uploadable by active household members",
    );
    expect(migrationSql).toContain(
      "household attachment objects are deletable by active household members",
    );
    expect(migrationSql).toContain("attachment_path_household_id");
    expect(migrationSql).toContain("attachment_path_entity_type");
    expect(migrationSql).toContain("attachment_path_entity_id");
    expect(migrationSql).toContain("public.household_source_exists(");
  });

  it("creates attachment metadata with quota and file restrictions", () => {
    expect(migrationSql).toContain(
      "create table if not exists public.attachments",
    );
    expect(migrationSql).toContain("storage_bucket text not null");
    expect(migrationSql).toContain("storage_path text not null");
    expect(migrationSql).toContain("size_bytes bigint not null");
    expect(migrationSql).toContain("attachments_mime_type_check");
    expect(migrationSql).toContain("attachments_size_check");
    expect(migrationSql).toContain("public.household_attachment_quota_bytes");
    expect(migrationSql).toContain(
      "create or replace function public.register_attachment",
    );
    expect(migrationSql).toContain(
      "create or replace function public.delete_attachment",
    );
  });

  it("reconciles pending reminders when source items change", () => {
    expect(migrationSql).toContain(
      "create or replace function public.cancel_pending_reminders_for_source",
    );
    expect(migrationSql).toContain("reconcile_task_reminders");
    expect(migrationSql).toContain("reconcile_shopping_item_reminders");
    expect(migrationSql).toContain("reconcile_calendar_event_reminders");
    expect(migrationSql).toContain("reconcile_admin_item_reminders");
    expect(migrationSql).toContain(
      "after update of status, due_date, archived_at or delete on public.tasks",
    );
    expect(migrationSql).toContain(
      "after update of status, due_date, action_date, expiry_date, archived_at or delete on public.admin_items",
    );
  });

  it("enables RLS and grants authenticated users read-only table access", () => {
    expect(migrationSql).toContain(
      "alter table public.reminders enable row level security",
    );
    expect(migrationSql).toContain(
      "alter table public.attachments enable row level security",
    );
    expect(migrationSql).toContain(
      "grant select on table public.reminders to authenticated",
    );
    expect(migrationSql).toContain(
      "grant select on table public.attachments to authenticated",
    );
    expect(migrationSql).toContain(
      "grant execute on function public.create_reminder",
    );
    expect(migrationSql).toContain(
      "grant execute on function public.register_attachment",
    );
    expect(migrationSql).not.toContain(
      "grant insert on table public.attachments",
    );
    expect(migrationSql).not.toContain(
      "grant insert on table public.reminders",
    );
  });
});
