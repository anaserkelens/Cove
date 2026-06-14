import Link from "next/link";
import { notFound } from "next/navigation";

import { FormMessage } from "@/components/FormMessage";
import {
  formatAdminItemAmount,
  formatAdminItemPrimaryDate,
  formatAdminItemStatus,
  formatAdminItemType,
} from "@/lib/admin/display";
import { getFormMessage } from "@/lib/forms/messages";
import {
  getAdminDashboardSummary,
  listAdminItemsForHousehold,
  type AdminItemListItem,
} from "@/server/admin/service";
import { getHouseholdForCurrentUser } from "@/server/households/service";

type AdminPageProps = {
  params: Promise<{
    householdId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
    status?: string | string[];
  }>;
};

export default async function AdminPage({
  params,
  searchParams,
}: AdminPageProps) {
  const { householdId } = await params;
  const [household, summary, openItems] = await Promise.all([
    getHouseholdForCurrentUser(householdId).catch(() => notFound()),
    getAdminDashboardSummary(householdId).catch(() => notFound()),
    listAdminItemsForHousehold(householdId).catch(() => notFound()),
  ]);
  const message = getFormMessage(await searchParams);

  return (
    <main className="app-main" aria-labelledby="page-title">
      <div className="page-head">
        <div className="page-head-text">
          <p className="eyebrow">Home admin</p>
          <h1 id="page-title">Home Admin</h1>
          <p>Bills, renewals, and paperwork for {household.name}.</p>
        </div>
        <Link href={`/app/${household.id}/admin/new`} className="btn">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          New item
        </Link>
      </div>

      <FormMessage message={message} />

      <section
        className="stack section-spaced"
        aria-labelledby="attention-title"
      >
        <h2 id="attention-title">Needs attention</h2>
        <AdminItemList
          emptyText="No Home Admin items need attention."
          householdId={household.id}
          items={summary.needsAttention}
        />
      </section>

      <section className="stack section-spaced" aria-labelledby="today-title">
        <h2 id="today-title">Due today</h2>
        <AdminItemList
          emptyText="No Home Admin items due today."
          householdId={household.id}
          items={summary.dueToday}
        />
      </section>

      <section
        className="stack section-spaced"
        aria-labelledby="coming-up-title"
      >
        <h2 id="coming-up-title">Coming up</h2>
        <AdminItemList
          emptyText="No Home Admin items coming up."
          householdId={household.id}
          items={summary.comingUp}
        />
      </section>

      <section className="stack section-spaced" aria-labelledby="open-title">
        <h2 id="open-title">Open items</h2>
        <AdminItemList
          emptyText="No open Home Admin items."
          householdId={household.id}
          items={openItems}
        />
      </section>
    </main>
  );
}

type AdminItemListProps = {
  emptyText: string;
  householdId: string;
  items: AdminItemListItem[];
};

function AdminItemList({ emptyText, householdId, items }: AdminItemListProps) {
  if (items.length === 0) {
    return <p>{emptyText}</p>;
  }

  return (
    <ul className="plain-list">
      {items.map((item) => (
        <li key={item.id}>
          <Link href={`/app/${householdId}/admin/${item.id}`}>
            {item.title}
          </Link>
          <span>
            {formatAdminItemType(item.type)} -{" "}
            {formatAdminItemPrimaryDate(item)} -{" "}
            {formatAdminItemStatus(item.status)} -{" "}
            {item.owner?.display_name ?? "Unassigned"} -{" "}
            {formatAdminItemAmount(item)}
          </span>
        </li>
      ))}
    </ul>
  );
}
