import Link from "next/link";
import { notFound } from "next/navigation";

import { FormMessage } from "@/components/FormMessage";
import { ShoppingItemForm } from "@/components/ShoppingItemForm";
import { ShoppingListForm } from "@/components/ShoppingListForm";
import { getFormMessage } from "@/lib/forms/messages";
import {
  formatShoppingQuantity,
  formatShoppingStatus,
} from "@/lib/shopping/display";
import type { ShoppingItemStatus } from "@/lib/validation/shopping";
import { getHouseholdForCurrentUser } from "@/server/households/service";
import {
  archiveShoppingListAction,
  createShoppingItemAction,
  setDefaultShoppingListAction,
  setShoppingItemStatusAction,
  updateShoppingItemAction,
  updateShoppingListAction,
} from "@/server/shopping/actions";
import {
  getShoppingListForCurrentUser,
  listShoppingFormMembers,
  listShoppingItemsForList,
} from "@/server/shopping/service";

type ShoppingListPageProps = {
  params: Promise<{
    householdId: string;
    shoppingListId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
    status?: string | string[];
  }>;
};

export default async function ShoppingListPage({
  params,
  searchParams,
}: ShoppingListPageProps) {
  const { householdId, shoppingListId } = await params;
  const [household, list, items, members] = await Promise.all([
    getHouseholdForCurrentUser(householdId).catch(() => notFound()),
    getShoppingListForCurrentUser(householdId, shoppingListId).catch(() =>
      notFound(),
    ),
    listShoppingItemsForList(householdId, shoppingListId).catch(() =>
      notFound(),
    ),
    listShoppingFormMembers(householdId).catch(() => notFound()),
  ]);
  const message = getFormMessage(await searchParams);
  const updateList = updateShoppingListAction.bind(null, household.id, list.id);
  const setDefaultList = setDefaultShoppingListAction.bind(
    null,
    household.id,
    list.id,
  );
  const archiveList = archiveShoppingListAction.bind(
    null,
    household.id,
    list.id,
  );
  const createItem = createShoppingItemAction.bind(null, household.id, list.id);

  return (
    <main className="app-main" aria-labelledby="page-title">
      <section className="stack">
        <p>
          <Link href={`/app/${household.id}/shopping`}>Back to shopping</Link>
        </p>
        <p className="eyebrow">{list.is_default ? "Default" : "Shopping"}</p>
        <h1 id="page-title">{list.name}</h1>
        <FormMessage message={message} />

        <div className="inline-actions">
          {!list.is_default ? (
            <form action={setDefaultList}>
              <button type="submit">Make default</button>
            </form>
          ) : null}
          {!list.is_default ? (
            <form action={archiveList}>
              <button type="submit">Archive list</button>
            </form>
          ) : null}
        </div>
      </section>

      <section className="stack section-spaced" aria-labelledby="add-title">
        <h2 id="add-title">Add item</h2>
        <ShoppingItemForm
          action={createItem}
          members={members}
          submitLabel="Add item"
        />
      </section>

      <section className="stack section-spaced" aria-labelledby="items-title">
        <h2 id="items-title">Active items</h2>
        {items.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Quantity</th>
                <th scope="col">Assigned to</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const updateItem = updateShoppingItemAction.bind(
                  null,
                  household.id,
                  list.id,
                  item.id,
                );

                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      {item.note ? <p>{item.note}</p> : null}
                      <details>
                        <summary>Edit</summary>
                        <ShoppingItemForm
                          action={updateItem}
                          idPrefix={`shopping-item-${item.id}`}
                          item={item}
                          members={members}
                          submitLabel="Save item"
                        />
                      </details>
                    </td>
                    <td>{formatShoppingQuantity(item.quantity, item.unit)}</td>
                    <td>{item.assignee?.display_name ?? "Unassigned"}</td>
                    <td>{formatShoppingStatus(item.status)}</td>
                    <td>
                      <ItemStatusActions
                        householdId={household.id}
                        itemId={item.id}
                        listId={list.id}
                        status={item.status}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p>No active shopping items.</p>
        )}
      </section>

      <section
        className="stack section-spaced"
        aria-labelledby="settings-title"
      >
        <h2 id="settings-title">List settings</h2>
        <ShoppingListForm
          action={updateList}
          idPrefix="edit-shopping-list"
          list={list}
          submitLabel="Save list"
        />
      </section>
    </main>
  );
}

type ItemStatusActionsProps = {
  householdId: string;
  itemId: string;
  listId: string;
  status: ShoppingItemStatus;
};

function ItemStatusActions({
  householdId,
  itemId,
  listId,
  status,
}: ItemStatusActionsProps) {
  return (
    <div className="inline-actions">
      {status === "needed" ? (
        <StatusForm
          householdId={householdId}
          itemId={itemId}
          label="In cart"
          listId={listId}
          status="in_cart"
        />
      ) : (
        <StatusForm
          householdId={householdId}
          itemId={itemId}
          label="Needed"
          listId={listId}
          status="needed"
        />
      )}
      <StatusForm
        householdId={householdId}
        itemId={itemId}
        label="Purchased"
        listId={listId}
        status="purchased"
      />
      <StatusForm
        householdId={householdId}
        itemId={itemId}
        label="Remove"
        listId={listId}
        status="removed"
      />
    </div>
  );
}

type StatusFormProps = {
  householdId: string;
  itemId: string;
  label: string;
  listId: string;
  status: ShoppingItemStatus;
};

function StatusForm({
  householdId,
  itemId,
  label,
  listId,
  status,
}: StatusFormProps) {
  const updateStatus = setShoppingItemStatusAction.bind(
    null,
    householdId,
    listId,
    itemId,
  );

  return (
    <form action={updateStatus}>
      <input type="hidden" name="status" value={status} />
      <button type="submit">{label}</button>
    </form>
  );
}
