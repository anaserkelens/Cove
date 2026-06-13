import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationSql = [
  "20260613040335_create_households_and_memberships.sql",
  "20260613043754_create_tasks_comments_activity.sql",
  "20260613045452_create_shopping_items_and_lists.sql",
  "20260613061000_create_calendar_events.sql",
  "20260613073000_create_admin_items.sql",
  "20260613083000_create_reminders_attachments.sql",
]
  .map((name) =>
    readFileSync(join(process.cwd(), "supabase", "migrations", name), "utf8"),
  )
  .join("\n")
  .toLowerCase();

const serviceSql = [
  "src/server/tasks/service.ts",
  "src/server/shopping/service.ts",
  "src/server/calendar/service.ts",
  "src/server/admin/service.ts",
  "src/server/reminders/service.ts",
  "src/server/attachments/service.ts",
]
  .map((path) => readFileSync(join(process.cwd(), path), "utf8"))
  .join("\n")
  .toLowerCase();

describe("performance audit contract", () => {
  it("keeps indexes for dashboard and household list access patterns", () => {
    for (const indexName of [
      "household_memberships_user_status_idx",
      "household_memberships_household_status_idx",
      "tasks_household_status_due_idx",
      "tasks_household_assigned_status_idx",
      "tasks_household_next_occurrence_idx",
      "shopping_items_household_list_status_idx",
      "shopping_items_household_purchased_idx",
      "calendar_events_household_starts_at_idx",
      "calendar_events_household_start_date_idx",
      "admin_items_household_status_due_idx",
      "admin_items_household_action_idx",
      "admin_items_household_expiry_idx",
      "reminders_status_remind_at_idx",
      "reminders_household_recipient_status_remind_idx",
      "attachments_household_entity_idx",
      "activity_events_household_created_idx",
    ]) {
      expect(migrationSql).toContain(indexName);
    }
  });

  it("caps dashboard and list queries instead of loading whole household history", () => {
    expect(serviceSql).toContain(".limit(5)");
    expect(serviceSql).toContain(".limit(8)");
    expect(serviceSql).toContain(".limit(20)");
    expect(serviceSql).toContain(".limit(30)");
    expect(serviceSql).toContain(".limit(50)");
    expect(serviceSql).toContain(".limit(100)");
  });

  it("orders recent activity and time-based views by indexed timestamps", () => {
    expect(serviceSql).toContain('.order("created_at"');
    expect(serviceSql).toContain('.order("remind_at"');
    expect(serviceSql).toContain('.order("starts_at"');
    expect(serviceSql).toContain('.order("due_date"');
  });
});
