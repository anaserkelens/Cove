export const ATTACHMENT_STORAGE_BUCKET = "household-attachments";
export const ATTACHMENT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const HOUSEHOLD_ATTACHMENT_QUOTA_BYTES = 100 * 1024 * 1024;

export const allowedAttachmentMimeTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "text/plain",
] as const;

export type AllowedAttachmentMimeType =
  (typeof allowedAttachmentMimeTypes)[number];
