import { z } from "zod";

import {
  allowedAttachmentMimeTypes,
  ATTACHMENT_MAX_FILE_SIZE_BYTES,
} from "@/lib/attachments/config";
import type { Database } from "@/types/database";

export type Attachment = Database["public"]["Tables"]["attachments"]["Row"];
export type HouseholdEntityType =
  Database["public"]["Enums"]["household_entity_type"];

export const householdEntityTypes = [
  "household",
  "task",
  "shopping_item",
  "calendar_event",
  "admin_item",
] as const;

const normalizedFilenameSchema = z
  .string()
  .transform(normalizeAttachmentFilename)
  .refine((value) => value.length > 0 && value.length <= 180, {
    message: "Choose a file with a valid name.",
  });

export const attachmentFileMetadataSchema = z.object({
  mimeType: z
    .string()
    .trim()
    .toLowerCase()
    .refine(
      (value) =>
        allowedAttachmentMimeTypes.includes(
          value as (typeof allowedAttachmentMimeTypes)[number],
        ),
      {
        message: "Choose an allowed file type.",
      },
    ),
  originalFilename: normalizedFilenameSchema,
  sizeBytes: z.number().int().positive().max(ATTACHMENT_MAX_FILE_SIZE_BYTES, {
    message: "Choose a file up to 5 MiB.",
  }),
});

export type AttachmentFileMetadata = z.infer<
  typeof attachmentFileMetadataSchema
>;

export function buildAttachmentStoragePath(
  householdId: string,
  entityType: HouseholdEntityType,
  entityId: string,
  fileId: string,
): string {
  return `households/${householdId}/${entityType}/${entityId}/${fileId}`;
}

export function normalizeAttachmentFilename(value: string): string {
  return value
    .replaceAll("\\", "/")
    .split("/")
    .at(-1)!
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 180);
}

export function isSafeAttachmentStoragePath(value: string): boolean {
  return (
    value.startsWith("households/") &&
    !value.startsWith("/") &&
    !value.includes("//") &&
    !value.includes("..")
  );
}
