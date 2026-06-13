# ADR 0007: Household calendar events

## Status

Accepted

## Context

Milestone 6 introduces shared household calendar events. The calendar must
support all-day events, timed events, an upcoming view, recurrence foundation,
and dashboard integration without external Google or Outlook sync.

## Decision

Calendar events are stored in `calendar_events` with explicit fields for timed
events and all-day events:

- timed events use `starts_at` and optional `ends_at` as UTC `timestamptz`;
- all-day events use `start_date` and optional `end_date`;
- every event stores an IANA `timezone`;
- recurring events reuse the structured recurrence JSON already used by tasks.

The database enforces the temporal mode with check constraints. All-day events
cannot use timestamp fields, timed events cannot use date fields, and event ends
cannot precede starts.

Authenticated clients have direct read access through RLS, but writes happen
through security-definer RPCs:

- `create_calendar_event`
- `update_calendar_event`
- `archive_calendar_event`

The RPCs derive the acting user from `auth.uid()`, verify household membership,
restrict assignees to active household members, validate time zones, and write
activity records.

## Consequences

- Cove has a secure shared household calendar without external sync.
- Recurrence is stored and validated, but future occurrence expansion is
  intentionally deferred until the reminder/admin scheduling model is clearer.
- Timed event input is converted from household-local browser values into UTC
  before storage, keeping future mobile clients aligned with the same model.
