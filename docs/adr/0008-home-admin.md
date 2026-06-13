# ADR 0008: Home Admin items

## Status

Accepted

## Context

Milestone 7 introduces Home Admin: bills, subscriptions, renewals,
expirations, return windows, contracts, and maintenance. The model must keep
payment due dates, recommended action dates, and expiration dates distinct. It
also needs integer money storage, status history, dashboard summaries, and
duplicate-safe recurring bills.

## Decision

Home Admin uses a unified `admin_items` table with an `admin_item_type` enum and
an `admin_item_status` enum. The table stores:

- `due_date` for when payment or completion is due;
- `action_date` for the last useful date to act;
- `expiry_date` for expirations and return windows;
- `amount_minor` as `bigint` paired with an ISO-style `currency_code`;
- recurrence fields compatible with the existing task recurrence JSON.

Important state transitions are written to `admin_item_events`, and the shared
activity feed receives compact Home Admin activity records.

Direct authenticated table access remains read-only through RLS. Writes happen
through checked security-definer RPCs:

- `create_admin_item`
- `update_admin_item`
- `set_admin_item_status`
- `archive_admin_item`

The RPCs derive the acting user from `auth.uid()`, verify household membership,
restrict owners to active members of the same household, validate money/date
semantics, and create admin history records.

Recurring admin items generate one next occurrence when a bill is paid, renewed,
or completed. A generated occurrence points at the original recurrence source,
and a unique recurrence-source/date index plus `on conflict do nothing` keeps
status retries from creating duplicate bills.

## Consequences

- Cove can show Home Admin items in dashboard Today, Needs attention, and Coming
  up sections without separate bill/subscription tables.
- Money values avoid floating-point storage and remain portable for future
  clients.
- The unified model is intentionally broad; maintenance-specific detail tables
  can be added later if the form becomes too crowded.
- Reminders, attachments, and external billing/payment integrations remain
  deferred to later milestones.
