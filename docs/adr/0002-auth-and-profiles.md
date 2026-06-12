# ADR 0002: Authentication and profiles

## Status

Accepted

## Context

Milestone 1 needs Supabase email/password auth, SSR-safe sessions, protected app
routes, and a profile row for every authenticated user.

## Decision

Use `@supabase/ssr` clients with Next.js `proxy.ts` for session refresh. Use
server actions for trusted mutations. Store profiles in `public.profiles` with
RLS enabled. Profile creation is automatic through an `auth.users` trigger and
retry-safe through `public.ensure_profile()`, which derives the row id from
`auth.uid()`.

No Supabase service-role key is used by the application.

## Consequences

Auth and profile mutations work through normal authenticated Supabase access and
remain protected by RLS. The `ensure_profile()` function is a narrowly scoped
database-side helper that can only create or return the caller's own profile.
Households and shared profile visibility remain deferred to Milestone 2.
