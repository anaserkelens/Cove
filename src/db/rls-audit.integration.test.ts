import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationNames = [
  "20260612210830_create_profiles.sql",
  "20260613040335_create_households_and_memberships.sql",
  "20260613041446_create_household_invitations.sql",
  "20260613042618_harden_household_invitation_acceptance.sql",
  "20260613043754_create_tasks_comments_activity.sql",
  "20260613045452_create_shopping_items_and_lists.sql",
  "20260613061000_create_calendar_events.sql",
  "20260613073000_create_admin_items.sql",
  "20260613083000_create_reminders_attachments.sql",
];

const migrationSql = migrationNames
  .map((name) =>
    readFileSync(join(process.cwd(), "supabase", "migrations", name), "utf8"),
  )
  .join("\n")
  .toLowerCase();

const exposedTables = [
  "profiles",
  "households",
  "household_memberships",
  "shopping_lists",
  "household_invitations",
  "tasks",
  "task_comments",
  "activity_events",
  "shopping_items",
  "calendar_events",
  "admin_items",
  "admin_item_events",
  "reminders",
  "attachments",
] as const;

describe("complete RLS audit contract", () => {
  it("enables RLS and revokes anonymous access on every exposed table", () => {
    for (const table of exposedTables) {
      expect(migrationSql).toContain(
        `alter table public.${table} enable row level security`,
      );
      expect(migrationSql).toContain(
        `revoke all on table public.${table} from anon`,
      );
      expect(migrationSql).toContain(
        `revoke all on table public.${table} from authenticated`,
      );
    }
  });

  it("does not grant broad direct table writes to normal authenticated users", () => {
    expect(migrationSql).not.toContain("grant insert on table public.");
    expect(migrationSql).not.toContain("grant delete on table public.");
    expect(migrationSql).not.toContain("grant all on table public.");
    expect(migrationSql).not.toContain(
      "grant update on table public.admin_items",
    );
    expect(migrationSql).not.toContain("grant update on table public.tasks");
    expect(migrationSql).not.toContain(
      "grant update on table public.attachments",
    );
  });

  it("keeps active membership as the household access boundary", () => {
    expect(migrationSql).toContain(
      "create or replace function public.is_household_member",
    );
    expect(migrationSql).toContain("membership.status = 'active'");
    expect(migrationSql).toContain("using (public.is_household_member(id))");
    expect(migrationSql).toContain(
      "using (public.is_household_member(household_id))",
    );
  });

  it("blocks unrelated household task creation and assignment", () => {
    expect(migrationSql).toContain(
      "create or replace function public.create_task",
    );
    expect(migrationSql).toContain(
      "not public.is_household_member(target_household_id)",
    );
    expect(migrationSql).toContain(
      "not public.is_active_household_member(target_household_id, task_assigned_to)",
    );
    expect(migrationSql).toContain(
      "not public.is_active_household_member(existing_task.household_id, task_assigned_to)",
    );
  });

  it("blocks unrelated household bill updates through Home Admin RPCs", () => {
    expect(migrationSql).toContain(
      "create or replace function public.update_admin_item",
    );
    expect(migrationSql).toContain(
      "create or replace function public.set_admin_item_status",
    );
    expect(migrationSql).toContain(
      "not public.is_household_member(existing_item.household_id)",
    );
    expect(migrationSql).toContain(
      "not public.is_active_household_member(existing_item.household_id, item_owner_id)",
    );
  });

  it("keeps invitations owner-only and hides token hashes from direct reads", () => {
    expect(migrationSql).toContain(
      "create or replace function public.create_household_invitation",
    );
    expect(migrationSql).toContain(
      "not public.is_household_owner(target_household_id)",
    );
    expect(migrationSql).toContain(
      'create policy "invitations are readable by active household owners"',
    );
    expect(migrationSql).toContain("grant select (\n  id,");
    expect(migrationSql).not.toContain("grant select (\n  token_hash");
  });

  it("protects private attachment paths with membership and source checks", () => {
    expect(migrationSql).toContain(
      "household attachment objects are readable by active household members",
    );
    expect(migrationSql).toContain(
      "household attachment objects are uploadable by active household members",
    );
    expect(migrationSql).toContain(
      "public.is_household_member(public.attachment_path_household_id(name))",
    );
    expect(migrationSql).toContain("public.household_source_exists(");
    expect(migrationSql).toContain("public.attachment_path_entity_type(name)");
    expect(migrationSql).toContain("public.attachment_path_entity_id(name)");
  });
});
