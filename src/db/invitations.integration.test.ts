import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260613041446_create_household_invitations.sql",
  ),
  "utf8",
).toLowerCase();

const hardeningMigrationSql = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260613042618_harden_household_invitation_acceptance.sql",
  ),
  "utf8",
).toLowerCase();

describe("household invitations migration contract", () => {
  it("creates invitations with only hashed tokens and expiry state", () => {
    expect(migrationSql).toContain(
      "create table if not exists public.household_invitations",
    );
    expect(migrationSql).toContain("email extensions.citext not null");
    expect(migrationSql).toContain("role public.household_role not null");
    expect(migrationSql).toContain("token_hash text not null");
    expect(migrationSql).toContain("expires_at timestamptz not null");
    expect(migrationSql).toContain("accepted_at timestamptz");
    expect(migrationSql).toContain("revoked_at timestamptz");
    expect(migrationSql).toContain("token_hash ~ '^[a-f0-9]{64}$'");
    expect(migrationSql).toContain(
      "household_invitations_token_hash_unique_idx",
    );
    expect(migrationSql).not.toContain("token text not null");
  });

  it("creates invitations only through an owner-gated RPC", () => {
    expect(migrationSql).toContain(
      "create or replace function public.create_household_invitation",
    );
    expect(migrationSql).toContain("security definer");
    expect(migrationSql).toContain("acting_user_id uuid := auth.uid()");
    expect(migrationSql).toContain(
      "if not public.is_household_owner(target_household_id)",
    );
    expect(migrationSql).toContain("role,");
    expect(migrationSql).toContain("'member'");
    expect(migrationSql).toContain("invited_by");
    expect(migrationSql).toContain("acting_user_id");
  });

  it("accepts invitations transactionally with email, expiry, and reuse checks", () => {
    expect(migrationSql).toContain(
      "create or replace function public.accept_household_invitation",
    );
    expect(migrationSql).toContain("for update");
    expect(migrationSql).toContain(
      "lower(matching_invitation.email::text) <> acting_email",
    );
    expect(migrationSql).toContain(
      "matching_invitation.revoked_at is not null",
    );
    expect(migrationSql).toContain(
      "matching_invitation.accepted_at is not null",
    );
    expect(migrationSql).toContain("matching_invitation.expires_at <=");
    expect(migrationSql).toContain(
      "on conflict (household_id, user_id)\n  do update set",
    );
    expect(migrationSql).toContain("set accepted_at = timezone('utc', now())");
  });

  it("preserves an existing active membership role during acceptance", () => {
    expect(hardeningMigrationSql).toContain(
      "create or replace function public.accept_household_invitation",
    );
    expect(hardeningMigrationSql).toContain("role = case");
    expect(hardeningMigrationSql).toContain(
      "when public.household_memberships.status = 'active'",
    );
    expect(hardeningMigrationSql).toContain(
      "then public.household_memberships.role",
    );
    expect(hardeningMigrationSql).toContain("else excluded.role");
  });

  it("allows owners to revoke pending invitations", () => {
    expect(migrationSql).toContain(
      "create or replace function public.revoke_household_invitation",
    );
    expect(migrationSql).toContain(
      "if not public.is_household_owner(revoked_invitation.household_id)",
    );
    expect(migrationSql).toContain(
      "revoked_invitation.accepted_at is not null",
    );
    expect(migrationSql).toContain(
      "set revoked_at = coalesce(revoked_at, timezone('utc', now()))",
    );
  });

  it("enables RLS and avoids broad table mutation or token-hash reads", () => {
    expect(migrationSql).toContain(
      "alter table public.household_invitations enable row level security",
    );
    expect(migrationSql).toContain("for select");
    expect(migrationSql).toContain("public.is_household_owner(household_id)");
    expect(migrationSql).toContain(
      "revoke all on table public.household_invitations from authenticated",
    );
    expect(migrationSql).toContain("grant select (\n  id,");
    expect(migrationSql).not.toContain(
      "grant select on table public.household_invitations",
    );
    expect(migrationSql).toContain(
      "grant execute on function public.create_household_invitation",
    );
    expect(migrationSql).toContain(
      "grant execute on function public.accept_household_invitation",
    );
    expect(migrationSql).toContain(
      "grant execute on function public.revoke_household_invitation",
    );
  });
});
