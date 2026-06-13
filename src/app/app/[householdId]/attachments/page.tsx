import { notFound } from "next/navigation";

import { AttachmentList } from "@/components/AttachmentList";
import { AttachmentUploadForm } from "@/components/AttachmentUploadForm";
import { FormMessage } from "@/components/FormMessage";
import { formatAttachmentSize } from "@/lib/attachments/display";
import { getFormMessage } from "@/lib/forms/messages";
import { uploadAttachmentAction } from "@/server/attachments/actions";
import {
  getAttachmentUsageForHousehold,
  listAttachmentsForHousehold,
} from "@/server/attachments/service";
import { getHouseholdForCurrentUser } from "@/server/households/service";

type AttachmentsPageProps = {
  params: Promise<{
    householdId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
    status?: string | string[];
  }>;
};

export default async function AttachmentsPage({
  params,
  searchParams,
}: AttachmentsPageProps) {
  const { householdId } = await params;
  const [household, attachments, usage] = await Promise.all([
    getHouseholdForCurrentUser(householdId).catch(() => notFound()),
    listAttachmentsForHousehold(householdId).catch(() => notFound()),
    getAttachmentUsageForHousehold(householdId).catch(() => notFound()),
  ]);
  const message = getFormMessage(await searchParams);
  const redirectPath = `/app/${household.id}/attachments`;
  const uploadAttachment = uploadAttachmentAction.bind(
    null,
    household.id,
    "household",
    household.id,
    redirectPath,
  );

  return (
    <main className="app-main" aria-labelledby="page-title">
      <section className="stack">
        <h1 id="page-title">{household.name} attachments</h1>
        <p>
          {formatAttachmentSize(usage.usedBytes)} of{" "}
          {formatAttachmentSize(usage.quotaBytes)} used.
        </p>
        <FormMessage message={message} />
      </section>

      <section className="stack section-spaced" aria-labelledby="upload-title">
        <h2 id="upload-title">Upload attachment</h2>
        <AttachmentUploadForm action={uploadAttachment} />
      </section>

      <section className="stack section-spaced" aria-labelledby="files-title">
        <h2 id="files-title">Files</h2>
        <AttachmentList
          attachments={attachments}
          emptyText="No attachments yet."
          householdId={household.id}
          redirectPath={redirectPath}
        />
      </section>
    </main>
  );
}
