# RLS Audit

Status: Milestone 9 complete.

## Scope

This audit covers the exposed application tables and Storage objects created
through Milestone 8:

- `profiles`
- `households`
- `household_memberships`
- `shopping_lists`
- `household_invitations`
- `tasks`
- `task_comments`
- `activity_events`
- `shopping_items`
- `calendar_events`
- `admin_items`
- `admin_item_events`
- `reminders`
- `attachments`
- `storage.objects` rows in the `household-attachments` bucket

## Result

Every exposed public table has Row Level Security enabled. Anonymous table
access is revoked. Normal authenticated users receive direct table reads only,
except for narrowly scoped profile and household-settings updates protected by
owner/self RLS policies.

State-changing domain operations are handled by checked RPCs that derive the
actor from `auth.uid()` and re-check household membership or ownership.

## Release-Blocker Cases

- Unrelated household reads: household-owned table select policies use active
  household membership.
- Unrelated task creation: `create_task` checks active membership for the target
  household.
- Unrelated bill updates: Home Admin RPCs load the existing item, then check
  membership for that item household.
- Regular member invitation creation: `create_household_invitation` requires
  household owner access.
- Revoked member access: membership helper functions only accept
  `status = 'active'`.
- Task assignment outside household: task RPCs require assignees to be active
  members of the same household.
- Attachment cross-household access: Storage object policies derive the
  household from the path and require active membership.
- Attachment orphan paths: upload policy and metadata registration require the
  source entity to belong to the household in the path.

## Tests

The static migration audit lives in:

```text
src/db/rls-audit.integration.test.ts
```

Run it with:

```bash
npm run test:integration
```

Full live database isolation tests should be added when CI has disposable
Supabase test projects or a reliable local Docker runtime.
