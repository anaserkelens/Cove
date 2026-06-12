import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260612210830_create_profiles.sql",
  ),
  "utf8",
).toLowerCase();

describe("profiles migration contract", () => {
  it("creates the required profiles table columns and constraints", () => {
    expect(migrationSql).toContain(
      "create table if not exists public.profiles",
    );
    expect(migrationSql).toContain("id uuid primary key references auth.users");
    expect(migrationSql).toContain("display_name text");
    expect(migrationSql).toContain("avatar_path text");
    expect(migrationSql).toContain("timezone text not null default 'utc'");
    expect(migrationSql).toContain("locale text not null default 'en'");
    expect(migrationSql).toContain(
      "week_starts_on smallint not null default 1",
    );
    expect(migrationSql).toContain("week_starts_on between 0 and 6");
  });

  it("enables updated_at automation and safe idempotent profile creation", () => {
    expect(migrationSql).toContain("create trigger set_profiles_updated_at");
    expect(migrationSql).toContain("create trigger on_auth_user_created");
    expect(migrationSql).toContain(
      "create or replace function public.ensure_profile()",
    );
    expect(migrationSql).toContain("values (auth.uid())");
    expect(migrationSql).toContain("on conflict (id) do nothing");
  });

  it("enables RLS and limits direct table access to owner reads and updates", () => {
    expect(migrationSql).toContain(
      "alter table public.profiles enable row level security",
    );
    expect(migrationSql).toContain("for select");
    expect(migrationSql).toContain("for update");
    expect(migrationSql).toContain("using ((select auth.uid()) = id)");
    expect(migrationSql).toContain("with check ((select auth.uid()) = id)");
    expect(migrationSql).toContain(
      "revoke all on table public.profiles from anon",
    );
    expect(migrationSql).toContain(
      "grant select, update on table public.profiles to authenticated",
    );
  });
});
