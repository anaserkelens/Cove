import Link from "next/link";
import { notFound } from "next/navigation";

import { AttachmentList } from "@/components/AttachmentList";
import { AttachmentUploadForm } from "@/components/AttachmentUploadForm";
import { AdminItemForm } from "@/components/AdminItemForm";
import { FormMessage } from "@/components/FormMessage";
import { ReminderForm } from "@/components/ReminderForm";
import { ReminderList } from "@/components/ReminderList";
import {
  formatAdminItemAmount,
  formatAdminItemPrimaryDate,
  formatAdminItemStatus,
  formatAdminItemType,
} from "@/lib/admin/display";
import { getFormMessage } from "@/lib/forms/messages";
import type { AdminItemStatus } from "@/lib/validation/admin";
import { uploadAttachmentAction } from "@/server/attachments/actions";
import { listAttachmentsForEntity } from "@/server/attachments/service";
import {
  archiveAdminItemAction,
  setAdminItemStatusAction,
  updateAdminItemAction,
} from "@/server/admin/actions";
import {
  getAdminItemForCurrentUser,
  listAdminFormMembers,
  listAdminItemEventsForCurrentUser,
} from "@/server/admin/service";
import { getHouseholdForCurrentUser } from "@/server/households/service";
import { createReminderAction } from "@/server/reminders/actions";
import { listPendingRemindersForEntity } from "@/server/reminders/service";

type AdminItemPageProps = {
  params: Promise<{
    householdId: string;
    itemId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
    status?: string | string[];
  }>;
};

const statusButtons: Array<{ label: string; status: AdminItemStatus }> = [
  { label: "Upcoming", status: "upcoming" },
  { label: "Needs review", status: "needs_review" },
  { label: "Waiting", status: "waiting" },
  { label: "Paid", status: "paid" },
  { label: "Renewed", status: "renewed" },
  { label: "Completed", status: "completed" },
  { label: "Overdue", status: "overdue" },
  { label: "Cancelled", status: "cancelled" },
];

export default async function AdminItemPage({
  params,
  searchParams,
}: AdminItemPageProps) {
  const { householdId, itemId } = await params;
  const [household, item, members, events, reminders, attachments] =
    await Promise.all([
      getHouseholdForCurrentUser(householdId).catch(() => notFound()),
      getAdminItemForCurrentUser(householdId, itemId).catch(() => notFound()),
      listAdminFormMembers(householdId).catch(() => notFound()),
      listAdminItemEventsForCurrentUser(householdId, itemId).catch(() =>
        notFound(),
      ),
      listPendingRemindersForEntity(householdId, "admin_item", itemId).catch(
        () => notFound(),
      ),
      listAttachmentsForEntity(householdId, "admin_item", itemId).catch(() =>
        notFound(),
      ),
    ]);
  const message = getFormMessage(await searchParams);
  const redirectPath = `/app/${household.id}/admin/${item.id}`;
  const updateItem = updateAdminItemAction.bind(null, household.id, item.id);
  const archiveItem = archiveAdminItemAction.bind(null, household.id, item.id);
  const createReminder = createReminderAction.bind(
    null,
    household.id,
    "admin_item",
    item.id,
    redirectPath,
  );
  const uploadAttachment = uploadAttachmentAction.bind(
    null,
    household.id,
    "admin_item",
    item.id,
    redirectPath,
  );

  return (
    <main className="app-main" aria-labelledby="page-title">
      <section className="stack">
        <p>
          <Link href={`/app/${household.id}/admin`}>Back to Home Admin</Link>
        </p>
        <p className="eyebrow">
          {formatAdminItemType(item.type)} -{" "}
          {formatAdminItemStatus(item.status)}
        </p>
        <h1 id="page-title">{item.title}</h1>
        <FormMessage message={message} />
        <p>{formatAdminItemPrimaryDate(item)}</p>
        <p>Owner: {item.owner?.display_name ?? "Unassigned"}</p>
        <p>Amount: {formatAdminItemAmount(item)}</p>
        {item.provider_name ? <p>Provider: {item.provider_name}</p> : null}
        {item.reference_number ? (
          <p>Reference: {item.reference_number}</p>
        ) : null}
        {item.paid_at ? <p>Paid: {formatDateTime(item.paid_at)}</p> : null}

        <div className="inline-actions">
          {statusButtons.map((button) =>
            button.status === item.status ? null : (
              <StatusButton
                householdId={household.id}
                itemId={item.id}
                key={button.status}
                label={button.label}
                status={button.status}
              />
            ),
          )}
          <form action={archiveItem}>
            <button type="submit">Archive</button>
          </form>
        </div>
      </section>

      <section
        className="stack section-spaced"
        aria-labelledby="reminders-title"
      >
        <h2 id="reminders-title">Reminders</h2>
        <ReminderForm
          action={createReminder}
          householdTimezone={household.timezone}
          idPrefix="admin-reminder"
          members={members}
        />
        <ReminderList
          emptyText="No pending reminders for this item."
          householdId={household.id}
          redirectPath={redirectPath}
          reminders={reminders}
          timeZone={household.timezone}
        />
      </section>

      <section
        className="stack section-spaced"
        aria-labelledby="attachments-title"
      >
        <h2 id="attachments-title">Attachments</h2>
        <AttachmentUploadForm
          action={uploadAttachment}
          idPrefix="admin-attachment"
        />
        <AttachmentList
          attachments={attachments}
          emptyText="No attachments for this item."
          householdId={household.id}
          redirectPath={redirectPath}
        />
      </section>

      <section className="stack section-spaced" aria-labelledby="edit-title">
        <h2 id="edit-title">Edit item</h2>
        <AdminItemForm
          action={updateItem}
          householdCurrencyCode={household.currency_code}
          householdTimezone={household.timezone}
          item={item}
          members={members}
          submitLabel="Save item"
        />
      </section>

      <section className="stack section-spaced" aria-labelledby="history-title">
        <h2 id="history-title">History</h2>
        {events.length > 0 ? (
          <ul className="plain-list">
            {events.map((event) => (
              <li key={event.id}>
                <span>{event.event_type.replaceAll("_", " ")}</span>
                <span>
                  {event.actor?.display_name ?? "Household member"} -{" "}
                  {formatDateTime(event.occurred_at)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No history yet.</p>
        )}
      </section>
    </main>
  );
}

type StatusButtonProps = {
  householdId: string;
  itemId: string;
  label: string;
  status: AdminItemStatus;
};

function StatusButton({
  householdId,
  itemId,
  label,
  status,
}: StatusButtonProps) {
  const updateStatus = setAdminItemStatusAction.bind(null, householdId, itemId);

  return (
    <form action={updateStatus}>
      <input type="hidden" name="status" value={status} />
      <button type="submit">{label}</button>
    </form>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
