# Production Deployment

## Required Services

- Vercel project connected to the Git repository.
- Hosted Supabase project.
- Supabase migrations applied from this repository.

## Environment Variables

Set these in Vercel for production and preview environments:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Do not set a Supabase service-role key in the app environment.

CLI-only variables for migration pushes:

```bash
SUPABASE_ACCESS_TOKEN=
SUPABASE_DB_PASSWORD=
```

These belong in the local shell or CI secret store, not in browser-exposed app
configuration.

## Supabase Dashboard

Confirm:

- Email auth provider is enabled.
- Site URL matches the deployed production URL.
- Redirect URLs include local, preview, and production `/auth/callback` URLs.
- Password minimum is at least 8 characters.
- Confirmation and reset templates keep Supabase confirmation URLs.
- Storage bucket `household-attachments` exists and is private.

## Deploy Order

1. Run local checks:

   ```bash
   npm run format
   npm run lint
   npm run typecheck
   npm run test
   npm run test:integration
   npm run test:e2e
   npm run build
   ```

2. Push migrations:

   ```bash
   npx supabase db push --linked --password "$SUPABASE_DB_PASSWORD"
   ```

3. Verify migration history:

   ```bash
   npx supabase migration list --linked --password "$SUPABASE_DB_PASSWORD"
   ```

4. Deploy through Vercel.

5. Smoke test production:

   - `/health` returns `{"status":"ok"}` and does not expose secrets.
   - Signup/login works.
   - Create a household.
   - Create and complete a task.
   - Add and mark a bill paid.
   - Upload and download a small allowed attachment.
   - Unauthenticated `/app` access redirects to login.

## Rollback

Prefer forward fixes for database changes. If a deployment must be rolled back:

- Roll back the Vercel deployment first.
- Do not manually edit production schema in the dashboard.
- Add a new migration for any database correction.
- Preserve migration history in Git.
