# ADR 0003: Households and memberships

## Status

Accepted

## Context

Milestone 2 introduces the tenant boundary for Cove. A user can belong to
multiple households, and household-owned data must be isolated at the database
layer.

## Decision

Create `households`, `household_memberships`, and `shopping_lists` in a
Supabase migration. Use `household_role` and `membership_status` enums. Use
security-definer helper functions for RLS membership checks to avoid recursive
policy lookups.

Household creation runs through `public.create_household()`, which derives the
acting user from `auth.uid()` and transactionally creates the household, owner
membership, and default `Shopping` list. The application does not use a
service-role key.

## Consequences

The app can safely list and switch between households for active members. Owners
can update basic household settings. Invitations and member management remain
deferred to Milestone 3.
