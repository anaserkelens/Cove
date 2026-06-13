import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260613045452_create_shopping_items_and_lists.sql",
  ),
  "utf8",
).toLowerCase();

describe("shopping migration contract", () => {
  it("creates shopping item status, items, constraints, and indexes", () => {
    expect(migrationSql).toContain(
      "create type public.shopping_item_status as enum",
    );
    expect(migrationSql).toContain(
      "create table if not exists public.shopping_items",
    );
    expect(migrationSql).toContain("shopping_items_list_household_fk");
    expect(migrationSql).toContain("shopping_items_quantity_check");
    expect(migrationSql).toContain("shopping_items_completion_state_check");
    expect(migrationSql).toContain("shopping_lists_household_name_active");
    expect(migrationSql).toContain("shopping_items_household_list_status_idx");
    expect(migrationSql).toContain("shopping_items_household_purchased_idx");
  });

  it("keeps item timestamps current", () => {
    expect(migrationSql).toContain(
      "create trigger set_shopping_items_updated_at",
    );
    expect(migrationSql).toContain("execute function public.set_updated_at()");
  });

  it("keeps list and item writes behind checked RPCs", () => {
    expect(migrationSql).toContain(
      "create or replace function public.create_shopping_list",
    );
    expect(migrationSql).toContain(
      "create or replace function public.create_shopping_item",
    );
    expect(migrationSql).toContain(
      "create or replace function public.update_shopping_item",
    );
    expect(migrationSql).toContain(
      "create or replace function public.set_shopping_item_status",
    );
    expect(migrationSql).toContain(
      "create or replace function public.readd_shopping_item",
    );
    expect(migrationSql).toContain("not public.is_household_member");
    expect(migrationSql).toContain(
      "not public.is_active_household_member(target_list.household_id, item_assigned_to)",
    );
    expect(migrationSql).toContain(
      "not public.is_active_household_member(existing_item.household_id, item_assigned_to)",
    );
    expect(migrationSql).toContain("and list.archived_at is null");
  });

  it("preserves purchased history and re-adds from history", () => {
    expect(migrationSql).toContain("when item_status = 'purchased'");
    expect(migrationSql).toContain(
      "completed shopping items cannot be reopened",
    );
    expect(migrationSql).toContain(
      "if existing_item.id is null or existing_item.status <> 'purchased' then",
    );
    expect(migrationSql).toContain("'shopping_item.readded'");
    expect(migrationSql).toContain("'sourceshoppingitemid'");
  });

  it("enables RLS and grants authenticated users read-only table access", () => {
    expect(migrationSql).toContain(
      "alter table public.shopping_items enable row level security",
    );
    expect(migrationSql).toContain(
      "shopping items are readable by active household members",
    );
    expect(migrationSql).toContain(
      "grant select on table public.shopping_items to authenticated",
    );
    expect(migrationSql).toContain(
      "grant execute on function public.create_shopping_item",
    );
    expect(migrationSql).toContain(
      "grant execute on function public.set_shopping_item_status",
    );
    expect(migrationSql).not.toContain(
      "grant insert on table public.shopping_items",
    );
    expect(migrationSql).not.toContain(
      "grant update on table public.shopping_items",
    );
  });
});
