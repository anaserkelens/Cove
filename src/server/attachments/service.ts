import { randomUUID } from "node:crypto";

import {
  ATTACHMENT_STORAGE_BUCKET,
  HOUSEHOLD_ATTACHMENT_QUOTA_BYTES,
} from "@/lib/attachments/config";
import { createClient } from "@/lib/supabase/server";
import {
  attachmentFileMetadataSchema,
  buildAttachmentStoragePath,
  type Attachment,
  type HouseholdEntityType,
} from "@/lib/validation/attachment";
import { getHouseholdForCurrentUser } from "@/server/households/service";

type ProfileSummary = {
  display_name: string | null;
  id: string;
};

export type AttachmentListItem = Attachment & {
  uploader: ProfileSummary | null;
};

export type AttachmentUsage = {
  quotaBytes: number;
  usedBytes: number;
};

export class AttachmentServiceError extends Error {
  constructor(message = "Attachment operation failed.") {
    super(message);
    this.name = "AttachmentServiceError";
  }
}

const attachmentSelect =
  "created_at, deleted_at, entity_id, entity_type, household_id, id, mime_type, original_filename, size_bytes, storage_bucket, storage_path, updated_at, uploaded_by";

export async function listAttachmentsForHousehold(
  householdId: string,
): Promise<AttachmentListItem[]> {
  await getHouseholdForCurrentUser(householdId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attachments")
    .select(attachmentSelect)
    .eq("household_id", householdId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new AttachmentServiceError();
  }

  return decorateAttachments(data ?? []);
}

export async function listAttachmentsForEntity(
  householdId: string,
  entityType: HouseholdEntityType,
  entityId: string,
): Promise<AttachmentListItem[]> {
  await getHouseholdForCurrentUser(householdId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attachments")
    .select(attachmentSelect)
    .eq("household_id", householdId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    throw new AttachmentServiceError();
  }

  return decorateAttachments(data ?? []);
}

export async function getAttachmentUsageForHousehold(
  householdId: string,
): Promise<AttachmentUsage> {
  await getHouseholdForCurrentUser(householdId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attachments")
    .select("size_bytes")
    .eq("household_id", householdId);

  if (error) {
    throw new AttachmentServiceError();
  }

  return {
    quotaBytes: HOUSEHOLD_ATTACHMENT_QUOTA_BYTES,
    usedBytes: (data ?? []).reduce(
      (total, attachment) => total + attachment.size_bytes,
      0,
    ),
  };
}

export async function uploadAttachmentForCurrentUser(
  householdId: string,
  entityType: HouseholdEntityType,
  entityId: string,
  file: File,
): Promise<Attachment> {
  const household = await getHouseholdForCurrentUser(householdId);
  const parsed = attachmentFileMetadataSchema.safeParse({
    mimeType: file.type,
    originalFilename: file.name,
    sizeBytes: file.size,
  });

  if (!parsed.success) {
    throw new AttachmentServiceError("Invalid attachment.");
  }

  const supabase = await createClient();
  const storagePath = buildAttachmentStoragePath(
    household.id,
    entityType,
    entityId,
    randomUUID(),
  );
  const { error: uploadError } = await supabase.storage
    .from(ATTACHMENT_STORAGE_BUCKET)
    .upload(storagePath, file, {
      contentType: parsed.data.mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw new AttachmentServiceError();
  }

  const { data, error } = await supabase.rpc("register_attachment", {
    attachment_entity_id: entityId,
    attachment_entity_type: entityType,
    attachment_mime_type: parsed.data.mimeType,
    attachment_original_filename: parsed.data.originalFilename,
    attachment_size_bytes: parsed.data.sizeBytes,
    attachment_storage_bucket: ATTACHMENT_STORAGE_BUCKET,
    attachment_storage_path: storagePath,
    target_household_id: household.id,
  });

  if (error || !data || data.household_id !== household.id) {
    await supabase.storage
      .from(ATTACHMENT_STORAGE_BUCKET)
      .remove([storagePath]);
    throw new AttachmentServiceError();
  }

  return data;
}

export async function deleteAttachmentForCurrentUser(
  householdId: string,
  attachmentId: string,
): Promise<Attachment> {
  await getHouseholdForCurrentUser(householdId);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_attachment", {
    target_attachment_id: attachmentId,
  });

  if (error || !data || data.household_id !== householdId) {
    throw new AttachmentServiceError();
  }

  await supabase.storage
    .from(ATTACHMENT_STORAGE_BUCKET)
    .remove([data.storage_path]);

  return data;
}

export async function createAttachmentDownloadUrl(
  householdId: string,
  attachmentId: string,
): Promise<string> {
  const attachment = await getAttachmentForCurrentUser(
    householdId,
    attachmentId,
  );

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(ATTACHMENT_STORAGE_BUCKET)
    .createSignedUrl(attachment.storage_path, 300, {
      download: attachment.original_filename,
    });

  if (error || !data) {
    throw new AttachmentServiceError();
  }

  return data.signedUrl;
}

async function getAttachmentForCurrentUser(
  householdId: string,
  attachmentId: string,
): Promise<Attachment> {
  await getHouseholdForCurrentUser(householdId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attachments")
    .select(attachmentSelect)
    .eq("household_id", householdId)
    .eq("id", attachmentId)
    .single();

  if (error || !data) {
    throw new AttachmentServiceError();
  }

  return data;
}

async function decorateAttachments(
  attachments: Attachment[],
): Promise<AttachmentListItem[]> {
  const profileIds = [
    ...new Set(attachments.map((attachment) => attachment.uploaded_by)),
  ];

  if (profileIds.length === 0) {
    return attachments.map((attachment) => ({ ...attachment, uploader: null }));
  }

  const profiles = await getProfilesByIds(profileIds);

  return attachments.map((attachment) => ({
    ...attachment,
    uploader: profiles.get(attachment.uploaded_by) ?? null,
  }));
}

async function getProfilesByIds(
  profileIds: string[],
): Promise<Map<string, ProfileSummary>> {
  if (profileIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, id")
    .in("id", profileIds);

  if (error) {
    throw new AttachmentServiceError();
  }

  return new Map((data ?? []).map((profile) => [profile.id, profile] as const));
}
