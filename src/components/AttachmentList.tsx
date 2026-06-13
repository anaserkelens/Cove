import Link from "next/link";

import {
  formatAttachmentDate,
  formatAttachmentSize,
} from "@/lib/attachments/display";
import { deleteAttachmentAction } from "@/server/attachments/actions";
import type { AttachmentListItem } from "@/server/attachments/service";

type AttachmentListProps = {
  attachments: AttachmentListItem[];
  emptyText: string;
  householdId: string;
  redirectPath: string;
};

export function AttachmentList({
  attachments,
  emptyText,
  householdId,
  redirectPath,
}: AttachmentListProps) {
  if (attachments.length === 0) {
    return <p>{emptyText}</p>;
  }

  return (
    <ul className="plain-list">
      {attachments.map((attachment) => {
        const deleteAttachment = deleteAttachmentAction.bind(
          null,
          householdId,
          attachment.id,
          redirectPath,
        );

        return (
          <li key={attachment.id}>
            <Link
              href={`/app/${householdId}/attachments/${attachment.id}/download`}
            >
              {attachment.original_filename}
            </Link>
            <span>
              {formatAttachmentSize(attachment.size_bytes)} -{" "}
              {attachment.uploader?.display_name ?? "Household member"} -{" "}
              {formatAttachmentDate(attachment.created_at)}
            </span>
            <form action={deleteAttachment}>
              <button type="submit">Delete</button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
