# MVP Launch Checklist

## Code Health

- [ ] `npm install` succeeds on a clean machine.
- [ ] `npm run format` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `npm run test:integration` passes.
- [ ] `npm run test:e2e` passes.
- [ ] `npm run build` passes.
- [ ] `npm audit --audit-level=critical` has no unresolved critical issues.

## Supabase

- [ ] Hosted migrations match local migrations.
- [ ] Email auth provider is enabled.
- [ ] Site URL and redirect URLs are configured for local, preview, and
      production.
- [ ] Password minimum is at least 8 characters.
- [ ] `household-attachments` bucket exists and is private.
- [ ] Storage policies are present on `storage.objects`.
- [ ] No service-role key is used by browser or application runtime code.

## Smoke Tests

- [ ] Signup and login work.
- [ ] Password reset request and update flow work.
- [ ] Create a household.
- [ ] Invite and accept a member.
- [ ] Confirm a regular member cannot invite another member.
- [ ] Create, complete, and archive a task.
- [ ] Create a recurring task and confirm completion does not duplicate
      unpredictably.
- [ ] Create shopping items and mark them purchased.
- [ ] Create all-day and timed calendar events.
- [ ] Create a Home Admin bill and mark it paid.
- [ ] Create a reminder and mark it handled.
- [ ] Upload, download, and delete an allowed attachment.
- [ ] Confirm unauthenticated `/app` access redirects to login.
- [ ] Confirm an unrelated user cannot access another household URL.

## Operational Readiness

- [ ] Vercel production environment variables are configured.
- [ ] Supabase database backup/restore path is rehearsed.
- [ ] Production `/health` responds without leaking configuration.
- [ ] Basic privacy notes are reviewed.
- [ ] Known future privacy work is tracked.
- [ ] Manual accessibility smoke test is complete.
- [ ] Manual mobile browser smoke test is complete.

## Known Deferred Work

- Product visual design.
- Email invitation delivery.
- External calendar sync.
- Email/push reminders.
- Attachment previews, OCR, and document extraction.
- Self-serve account deletion and data export.
- Paid plans and billing.
