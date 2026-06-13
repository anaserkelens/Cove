# ADR 0006: Shopping lists and items

## Status

Accepted

## Context

Milestone 5 introduces household shopping lists, item CRUD, purchase status,
recently purchased history, item assignment, and a dashboard shopping summary.
The existing household model already creates one default `Shopping` list per
household, and all tenant boundaries must remain protected by RLS.

## Decision

Shopping lists remain the household-scoped list table introduced with
households. Milestone 5 adds `shopping_items` and a `shopping_item_status` enum
with `needed`, `in_cart`, `purchased`, and `removed`.

Authenticated clients have direct read access through RLS, but list and item
writes happen through security-definer RPCs:

- `create_shopping_list`
- `update_shopping_list`
- `set_default_shopping_list`
- `archive_shopping_list`
- `create_shopping_item`
- `update_shopping_item`
- `set_shopping_item_status`
- `readd_shopping_item`

The RPCs derive the acting user from `auth.uid()`, check household membership,
and only allow assignment to active members of the same household. The app
pre-checks route-scoped household and list access before calling item/list RPCs.

Purchased and removed items are treated as history. They cannot be edited or
reopened through the status RPC. Re-adding a purchased item creates a new active
item, preserving the completed record.

## Consequences

- Shopping can support multiple active lists while keeping exactly one active
  default list per household.
- Recently purchased history is queryable without a separate audit table.
- Future clients can reuse the same RPCs and RLS policies.
- Categories remain deferred. `category_id` exists on shopping items but is not
  connected to a category table yet.
