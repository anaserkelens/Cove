# ADR 0004: Household invitations

## Status

Accepted

## Context

Milestone 3 adds household invitations without email delivery. Owners need to
create a copyable invite link, recipients need to accept it while authenticated,
and the database must enforce household boundaries even if the UI is bypassed.

Invitation tokens are bearer secrets. Storing raw tokens would allow anyone with
database read access to accept invitations.

## Decision

Invitations live in `public.household_invitations`. The table stores only a
SHA-256 hash of the raw token. The raw token is generated server-side and
returned only once in the copyable invitation URL.

Invitation creation, revocation, and acceptance happen through security-definer
PostgreSQL functions:

- `create_household_invitation` verifies the acting user is an active household
  owner and stores a member invitation with an expiration timestamp.
- `revoke_household_invitation` verifies owner access and marks a pending
  invitation revoked.
- `accept_household_invitation` locks the matching invitation row, verifies the
  signed-in user's normalized email, rejects expired/revoked/accepted
  invitations, creates or reactivates the membership, and marks the invitation
  accepted in one transaction.

RLS is enabled. Authenticated users can select only safe invitation metadata for
households where they are owners. The `token_hash` column is not granted through
direct table reads.

## Consequences

- Regular members cannot create or revoke invitations.
- Invitation acceptance is safe to retry for the same authenticated accepted
  user, but it cannot create a second membership or be accepted by another
  account.
- Email delivery is deferred. Owners manually copy the generated invitation
  link.
- Activity events are still deferred until the activity feed milestone creates
  the shared event table.
