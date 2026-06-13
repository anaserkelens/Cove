import Link from "next/link";
import { notFound } from "next/navigation";

import { FormMessage } from "@/components/FormMessage";
import { ShoppingListForm } from "@/components/ShoppingListForm";
import { getFormMessage } from "@/lib/forms/messages";
import {
  formatShoppingQuantity,
  formatShoppingStatus,
} from "@/lib/shopping/display";
import { getHouseholdForCurrentUser } from "@/server/households/service";
import {
  createShoppingListAction,
  readdShoppingItemAction,
} from "@/server/shopping/actions";
import {
  getShoppingDashboardSummary,
  listRecentlyPurchasedItems,
  listShoppingListsForHousehold,
} from "@/server/shopping/service";

type ShoppingPageProps = {
  params: Promise<{
    householdId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
    status?: string | string[];
  }>;
};

export default async function ShoppingPage({
  params,
  searchParams,
}: ShoppingPageProps) {
  const { householdId } = await params;
  const [household, lists, summary, recentlyPurchased] = await Promise.all([
    getHouseholdForCurrentUser(householdId).catch(() => notFound()),
    listShoppingListsForHousehold(householdId).catch(() => notFound()),
    getShoppingDashboardSummary(householdId).catch(() => notFound()),
    listRecentlyPurchasedItems(householdId).catch(() => notFound()),
  ]);
  const message = getFormMessage(await searchParams);
  const createList = createShoppingListAction.bind(null, household.id);

  return (
    <main className="app-main" aria-labelledby="page-title">
      <section className="stack">
        <h1 id="page-title">{household.name} shopping</h1>
        <FormMessage message={message} />
      </section>

      <section className="stack section-spaced" aria-labelledby="lists-title">
        <h2 id="lists-title">Lists</h2>
        {lists.length > 0 ? (
          <ul className="plain-list">
            {lists.map((list) => (
              <li key={list.id}>
                <Link href={`/app/${household.id}/shopping/${list.id}`}>
                  {list.name}
                </Link>
                <span>{list.is_default ? "Default" : "Additional"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No shopping lists yet.</p>
        )}

        <ShoppingListForm action={createList} submitLabel="Create list" />
      </section>

      <section className="stack section-spaced" aria-labelledby="summary-title">
        <div className="section-heading">
          <h2 id="summary-title">Shopping summary</h2>
          {lists[0] ? (
            <Link href={`/app/${household.id}/shopping/${lists[0].id}`}>
              Open list
            </Link>
          ) : null}
        </div>
        {summary.neededItems.length > 0 ? (
          <ul className="plain-list">
            {summary.neededItems.map((item) => (
              <li key={item.id}>
                <span>
                  {item.name}
                  {formatShoppingQuantity(item.quantity, item.unit)
                    ? ` - ${formatShoppingQuantity(item.quantity, item.unit)}`
                    : ""}
                </span>
                <span>
                  {formatShoppingStatus(item.status)} -{" "}
                  {item.assignee?.display_name ?? "Unassigned"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No active shopping items.</p>
        )}
      </section>

      <section className="stack section-spaced" aria-labelledby="history-title">
        <h2 id="history-title">Recently purchased</h2>
        {recentlyPurchased.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Quantity</th>
                <th scope="col">Purchased</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {recentlyPurchased.map((item) => {
                const readdItem = readdShoppingItemAction.bind(
                  null,
                  household.id,
                  item.id,
                );

                return (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{formatShoppingQuantity(item.quantity, item.unit)}</td>
                    <td>{formatDateTime(item.completed_at)}</td>
                    <td>
                      <form action={readdItem}>
                        <button type="submit">Add again</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p>No purchased items yet.</p>
        )}
      </section>
    </main>
  );
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
