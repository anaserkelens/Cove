import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260613040335_create_households_and_memberships.sql",
  ),
  "utf8",
).toLowerCase();

describe("households migration contract", () => {
  it("creates household, membership, and default shopping list tables", () => {
    expect(migrationSql).toContain(
      "create table if not exists public.households",
    );
    expect(migrationSql).toContain(
      "create table if not exists public.household_memberships",
    );
    expect(migrationSql).toContain(
      "create table if not exists public.shopping_lists",
    );
    expect(migrationSql).toContain(
      "constraint household_memberships_household_user_unique unique",
    );
    expect(migrationSql).toContain("shopping_lists_one_default_active_idx");
  });

  it("creates safe helper functions for household RLS", () => {
    expect(migrationSql).toContain(
      "create or replace function public.is_household_member",
    );
    expect(migrationSql).toContain(
      "create or replace function public.is_household_owner",
    );
    expect(migrationSql).toContain(
      "create or replace function public.shares_active_household_with",
    );
    expect(migrationSql).toContain("security definer");
    expect(migrationSql).toContain("membership.status = 'active'");
  });

  it("creates households transactionally with owner membership and default list", () => {
    expect(migrationSql).toContain(
      "create or replace function public.create_household",
    );
    expect(migrationSql).toContain("acting_user_id uuid := auth.uid()");
    expect(migrationSql).toContain("insert into public.households");
    expect(migrationSql).toContain("insert into public.household_memberships");
    expect(migrationSql).toContain("'owner'");
    expect(migrationSql).toContain("insert into public.shopping_lists");
    expect(migrationSql).toContain("'shopping'");
  });

  it("enables RLS and keeps owner-only settings updates", () => {
    expect(migrationSql).toContain(
      "alter table public.households enable row level security",
    );
    expect(migrationSql).toContain(
      "alter table public.household_memberships enable row level security",
    );
    expect(migrationSql).toContain(
      "alter table public.shopping_lists enable row level security",
    );
    expect(migrationSql).toContain("public.is_household_member(id)");
    expect(migrationSql).toContain("public.is_household_owner(id)");
    expect(migrationSql).toContain(
      "grant update (name, timezone, currency_code) on table public.households",
    );
    expect(migrationSql).toContain(
      "grant select on table public.household_memberships to authenticated",
    );
  });
});
