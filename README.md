# Cove

Cove is a browser-first shared household management application. This repository
currently contains the Milestone 9 MVP foundation: authentication, profile
onboarding, household
creation, memberships, household switching, owner-created household invitations,
tasks, recurring chores, task comments, activity events, shopping lists,
shopping items, recently purchased history, household calendar events, Home
Admin items, in-app reminders, private file attachments, and the database
tenant boundary, plus MVP hardening documentation and tests.

## Requirements

- Node.js 24 or newer
- npm
- Docker Desktop or another Docker-compatible runtime for local Supabase

## Setup

```bash
npm install
cp .env.example .env.local
npm run db:start
npm run db:reset
npm run dev
```

Open http://localhost:3000 for the app and http://localhost:3000/health for the
safe health route.

`npm run db:start` prints local Supabase credentials. Copy the local project URL
and publishable or anon key into `.env.local`.

For a hosted Supabase project, copy the hosted Project URL and publishable key
from the Supabase dashboard. Do not add a service-role key to the browser or app
environment.

Milestone 8 creates a private Supabase Storage bucket named
`household-attachments` through the database migration. Attachment uploads use
the normal authenticated Supabase session and Row Level Security policies.

## Environment Variables

Required:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

No Supabase secret or service-role key is required for the current milestones.

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
npm run test:integration
npm run test:e2e
npm run db:start
npm run db:stop
npm run db:reset
npm run db:new create_profiles
npm run db:types
```

## Documentation

- [RLS audit](docs/security/rls-audit.md)
- [Production deployment](docs/deployment.md)
- [Backup and migrations](docs/backup-and-migrations.md)
- [Basic privacy notes](docs/privacy.md)
- [Accessibility pass](docs/accessibility-pass.md)
- [Performance pass](docs/performance-pass.md)
- [MVP launch checklist](docs/launch-checklist.md)

## Supabase

Local Supabase configuration lives in `supabase/config.toml`. Migrations belong
in `supabase/migrations`. `supabase/seed.sql` is intentionally empty until
development seed data is useful.

Create migrations with:

```bash
npm run db:new migration_name
```

Apply local migrations with:

```bash
npm run db:reset
```

Apply migrations to a hosted project through the Supabase CLI after linking the
project:

```bash
npx supabase link --project-ref your-project-ref
npx supabase db push
```

Generate local database types after the database is running:

```bash
npm run db:types
```

Do not commit `.env.local`, service-role keys, raw invitation tokens, or other
secrets.

### Auth Configuration

Configure these settings in the Supabase dashboard:

- Authentication > Providers: enable Email provider.
- Authentication > URL Configuration: set Site URL for each environment, for
  example `http://localhost:3000` locally and the Vercel production URL in
  production.
- Authentication > URL Configuration: add redirect URLs for each environment,
  including `http://localhost:3000/auth/callback`,
  `http://127.0.0.1:3000/auth/callback`, preview URLs if needed, and the
  production `/auth/callback` URL.
- Authentication > Passwords: use a minimum password length of at least 8
  characters to match app validation.
- Authentication > Email Templates: keep confirmation and password reset links
  based on Supabase's confirmation URL so PKCE redirects return to
  `/auth/callback`.

## Current Scope

Included:

- Next.js App Router project in `src/`
- TypeScript strict mode
- ESLint and Prettier
- Vitest unit test setup
- Playwright configuration
- Zod environment validation
- Supabase SSR auth clients and session refresh proxy
- Email/password signup, login, logout, password reset, and password update
- Protected `/app` routes and onboarding guard
- Profile editing for display name, timezone, locale, and week start day
- `profiles` table migration with RLS
- Household creation through a database RPC
- Household owner membership
- Household switcher, member list, and basic settings
- Default `Shopping` list per new household
- Household and membership RLS helpers
- Owner-generated household invitations with copyable links
- Invitation acceptance, expiry, revocation, and token hashing
- Task creation, editing, completion, archival, and assignment
- Recurring task presets for daily, weekly, every N weeks, monthly, and yearly
- Task comments
- Task activity events and dashboard task summaries
- Default and additional shopping lists
- Shopping item creation, editing, purchase status, removal, and assignment
- Recently purchased shopping history with add-again flow
- Dashboard shopping summary
- Timed and all-day household calendar events
- Calendar event assignment and recurrence metadata
- Upcoming calendar view and dashboard calendar summaries
- Home Admin items for bills, subscriptions, renewals, expirations, return
  windows, maintenance, contracts, appointments, and other household admin
- Home Admin action dates, due dates, expiry dates, minor-unit money storage,
  status transitions, admin history, recurrence, and dashboard summaries
- In-app reminders with deduplication, recipient scoping, source reconciliation,
  and dashboard summaries
- Private household attachments with a private Supabase Storage bucket, signed
  downloads, file type and size restrictions, metadata rows, and a household
  quota
- MVP hardening docs for RLS, deployment, backups, privacy, accessibility,
  performance, and launch readiness
- Safe application error boundaries and baseline security response headers
- GitHub Actions CI for install, format, lint, typecheck, tests, and build
- Minimal `/` page and `/health` route

Not included yet:

- Product UI
- Invitation email delivery
- External calendar sync
- Email or push reminder delivery
- OCR, document extraction, or attachment previews

Those start in later milestones.
