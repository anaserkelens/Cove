# ADR 0001: Milestone 0 foundation stack

## Status

Accepted

## Context

Cove needs a deployable web foundation before authentication, household schema,
or product workflows are built.

## Decision

Use Next.js App Router with TypeScript, npm, ESLint, Prettier, Vitest,
Playwright, Supabase local CLI files, and Supabase SSR helper placeholders.

## Consequences

The repository can run linting, typechecking, unit tests, and production builds
before product features exist. Supabase schema migrations remain intentionally
empty until Milestone 1 or later.
