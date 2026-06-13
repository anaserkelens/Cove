"use server";

import { redirect } from "next/navigation";

import type { HouseholdEntityType } from "@/lib/validation/attachment";
import {
  deleteAttachmentForCurrentUser,
  uploadAttachmentForCurrentUser,
} from "@/server/attachments/service";

export async function uploadAttachmentAction(
  householdId: string,
  entityType: HouseholdEntityType,
  entityId: string,
  redirectPath: string,
  formData: FormData,
) {
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    redirect(`${redirectPath}?error=invalid-attachment`);
  }

  try {
    await uploadAttachmentForCurrentUser(
      householdId,
      entityType,
      entityId,
      file,
    );
  } catch {
    redirect(`${redirectPath}?error=upload-attachment-failed`);
  }

  redirect(`${redirectPath}?status=attachment-uploaded`);
}

export async function deleteAttachmentAction(
  householdId: string,
  attachmentId: string,
  redirectPath: string,
  _formData: FormData,
) {
  void _formData;

  try {
    await deleteAttachmentForCurrentUser(householdId, attachmentId);
  } catch {
    redirect(`${redirectPath}?error=delete-attachment-failed`);
  }

  redirect(`${redirectPath}?status=attachment-deleted`);
}
