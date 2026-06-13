# ADR 0009: Reminders and attachments

## Status

Accepted

## Context

Milestone 8 adds in-app reminders and basic private file attachments. The work
must keep household authorization at the database and storage layers, avoid a
background job system, deduplicate reminders, enforce conservative attachment
limits, and avoid exposing household files through a public bucket.

## Decision

Reminders are stored in `reminders` with a shared `household_entity_type` enum
for sources. The first channel is `in_app`; email and push remain future work.
Reminder writes happen through RPCs:

- `create_reminder`
- `mark_reminder_sent`
- `cancel_reminder`

`create_reminder` derives the acting user from `auth.uid()`, verifies household
membership, validates the source entity, restricts direct recipients to active
household members, and builds a deterministic `dedupe_key`. A unique dedupe
index plus upsert behavior makes retrying reminder creation safe.

Pending reminders are reconciled through database triggers when source items are
archived, deleted, completed, paid, or rescheduled in ways that would make the
reminder stale.

Attachments use a private Supabase Storage bucket named
`household-attachments`. Application uploads are performed with the normal
authenticated Supabase session, not a service-role key. The storage path uses
the convention:

```text
households/{household_id}/{entity_type}/{entity_id}/{file_id}
```

Metadata is stored in `attachments` only after a successful upload via the
`register_attachment` RPC. The RPC validates household membership, source
ownership, storage path shape, MIME type, per-file size, and household quota.
Downloads use short-lived signed URLs generated only after the metadata row is
read through RLS.

## Consequences

- Cove has in-app reminders without depending on a persistent worker or Vercel
  Cron yet.
- Household documents stay in a private bucket and are accessible only through
  normal authenticated access plus signed download URLs.
- Orphaned files are cleaned up after failed metadata registration where
  practical.
- Attachment limits are intentionally conservative for the free foundation:
  5 MiB per file and 100 MiB per household.
- Email reminders, push notifications, OCR, document extraction, and attachment
  previews remain deferred.
