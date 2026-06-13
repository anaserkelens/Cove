# Backup And Migrations

## Migration Rules

- Store every schema change in `supabase/migrations`.
- Do not make undocumented manual production schema edits.
- Use forward migrations for corrections.
- Keep development seed data separate from production migrations.
- Regenerate or maintain `src/types/database.ts` whenever schema changes.

## Local Commands

```bash
npm run db:start
npm run db:reset
npm run db:new migration_name
npm run db:types
```

`db:start` requires Docker Desktop or another Docker-compatible runtime.

## Hosted Commands

```bash
npx supabase link --project-ref your-project-ref
npx supabase db push --linked --password "$SUPABASE_DB_PASSWORD"
npx supabase migration list --linked --password "$SUPABASE_DB_PASSWORD"
```

Keep `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` in the local shell or a
CI secret store.

## Backup Practice

Before any destructive or high-risk migration:

- Export a database backup from the Supabase project.
- Confirm the backup includes auth, public schema, and storage metadata.
- Record the migration being applied and the backup timestamp.
- Test the migration on a disposable or local database first.

For file attachments, remember that Storage objects and `attachments` metadata
must be backed up together.

## Restore Practice

A restore should be rehearsed before launch:

1. Create a temporary Supabase project or local database.
2. Restore the database backup.
3. Restore or verify Storage object availability.
4. Run the app against the restored project.
5. Verify login, household isolation, attachments, and dashboard loading.

## Retention

For the free foundation, backup retention is operational rather than productized.
User-facing export and account deletion are documented as future privacy work in
`docs/privacy.md`.
