# Performance Pass

Status: Milestone 9 pass complete for the backend foundation.

## What Was Checked

- Dashboard queries cap result sets for each section.
- Activity feed queries are limited and ordered by indexed timestamps.
- Household-owned module tables have indexes for common dashboard and list
  access patterns.
- Server Components are used for read-heavy pages.
- Client JavaScript is limited to framework-required code and error boundaries.
- Authenticated household data is not cached in unsafe public caches.
- Production build succeeds with all current routes.

## Index Coverage

Important access patterns have indexes:

- memberships by user and household status;
- tasks by household/status/due date, assignee/status, and recurrence source;
- shopping items by list/status and purchase history;
- calendar events by starts/start date and assignee;
- Home Admin items by status/due date, action date, expiry date, owner, and
  recurrence source;
- reminders by status/reminder time and household/recipient/status/time;
- attachments by household/entity and uploader.

## Known Limits

- Dashboard queries are still assembled in application services rather than
  consolidated into database views or aggregate RPCs.
- No load testing has been run.
- No production Web Vitals collection is wired yet.

## Next Performance Work

- Add production Web Vitals reporting.
- Add pagination UI for long lists before large household usage.
- Revisit dashboard RPC aggregation after real data shape is known.
- Add database query plan checks for the busiest dashboard queries.
