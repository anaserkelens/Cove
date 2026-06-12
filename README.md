# Cove

Cove is a browser-first shared household management application. This repository
currently contains Milestone 0 only: local infrastructure and a minimal Next.js
foundation.

## Requirements

- Node.js 24 or newer
- npm
- Docker Desktop or another Docker-compatible runtime for local Supabase

## Setup

```bash
npm install
cp .env.example .env.local
npm run db:start
npm run dev
```

Open http://localhost:3000 for the app and http://localhost:3000/health for the
safe health route.

`npm run db:start` prints local Supabase credentials. Copy the local project URL
and publishable or anon key into `.env.local`.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run format
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run db:start
npm run db:stop
npm run db:reset
npm run db:new create_profiles
npm run db:types
```

## Supabase

Local Supabase configuration lives in `supabase/config.toml`. Migrations belong
in `supabase/migrations`. `supabase/seed.sql` is intentionally empty for
Milestone 0; development seed data starts after the schema exists.

Do not commit `.env.local`, service-role keys, raw invitation tokens, or other
secrets.

## Current Scope

Included:

- Next.js App Router project in `src/`
- TypeScript strict mode
- ESLint and Prettier
- Vitest unit test setup
- Playwright configuration
- Zod environment validation
- Supabase SSR client placeholders
- GitHub Actions CI for install, format, lint, typecheck, tests, and build
- Minimal `/` page and `/health` route

Not included yet:

- Authentication
- Profiles
- Household schema
- Product UI
- RLS policies

Those start in later milestones.
