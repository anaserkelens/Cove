# ADR 0005: Tasks and recurring chores

## Status

Accepted

## Context

Milestone 4 introduces household tasks, recurring chores, task comments, task
dashboard summaries, and activity events. The work must keep household
authorization at the database layer and make recurring completion idempotent.

The brief allows either a careful RRULE-compatible representation or a simpler
validated recurrence model.

## Decision

Tasks use the requested `tasks` table shape, including `due_date`, nullable
`due_at`, recurrence fields, completion fields, and `archived_at`.

The first recurrence model is structured JSON stored in `recurrence_rule`:

- `{"preset":"daily","interval":1}`
- `{"preset":"weekly","weekdays":[1,3]}`
- `{"preset":"every_n_weeks","interval":2}`
- `{"preset":"monthly","dayOfMonth":15}`
- `{"preset":"yearly","month":6,"dayOfMonth":13}`

The app has TypeScript recurrence helpers for form validation and unit tests.
The database has equivalent validation and `calculate_next_task_due_date` logic
so `complete_task` can generate the next occurrence transactionally.

Task, comment, and activity writes happen through security-definer RPCs:

- `create_task`
- `update_task`
- `complete_task`
- `archive_task`
- `create_task_comment`

Direct authenticated table access is read-only through RLS. The RPCs check that
the acting user is an active member of the household and that task assignees are
active members of the same household.

Recurring completion is idempotent by returning immediately when the task is
already completed and by enforcing a unique `(household_id,
recurrence_source_id, due_date)` index for generated occurrences.

## Consequences

- Cove supports useful recurrence presets without committing to full RRULE
  complexity yet.
- Future mobile clients can call the same RPCs instead of reimplementing
  authorization.
- Completed tasks are immutable through the general update path. Completion is a
  deliberate action.
- Categories remain deferred. `category_id` exists on tasks but is not linked to
  a categories table until the category model is introduced.
