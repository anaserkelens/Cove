# Basic Privacy Notes

## Data Cove Stores

Cove stores:

- account profile fields such as display name, locale, timezone, and week start;
- household names, settings, memberships, and invitations;
- tasks, comments, shopping items, calendar events, Home Admin items, reminders,
  and activity summaries;
- attachment metadata and private files uploaded to Supabase Storage.

## Boundaries

The household is the tenant boundary. Database Row Level Security and Storage
policies restrict household data to active household members.

Revoked members should lose access immediately because authorization helpers use
active membership status.

## Sensitive Data Rules

The app must not log:

- passwords;
- access tokens or refresh tokens;
- raw invitation tokens;
- private document URLs;
- full document contents;
- unnecessary email addresses.

Private attachments are stored in a private bucket and downloaded through
short-lived signed URLs.

## Not Implemented Yet

These privacy features remain future work:

- self-serve account deletion;
- self-serve household deletion;
- data export;
- detailed retention controls;
- audit-log retention controls;
- privacy policy text for public launch.

Until those are implemented, production operators should handle deletion/export
requests manually and carefully through documented operational steps.

## Third Parties

Current infrastructure:

- Vercel for application hosting.
- Supabase for authentication, PostgreSQL, and private object storage.

No banking integrations, email scanning, OCR, AI extraction, SMS, or push
notification provider is part of the MVP foundation.
