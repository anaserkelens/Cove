# Cove

Cove is a browser-first shared household management application. This repository
currently contains Milestone 1: authentication, profile onboarding, and the
profiles database foundation.

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

## Environment Variables

Required:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

No Supabase secret or service-role key is required for Milestone 1.

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
- GitHub Actions CI for install, format, lint, typecheck, tests, and build
- Minimal `/` page and `/health` route

Not included yet:

- Household schema
- Product UI
- Invitations
- Tasks, shopping, calendar, and Home Admin

Those start in later milestones.
