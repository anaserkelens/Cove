import { describe, expect, it } from "vitest";

import { ATTACHMENT_MAX_FILE_SIZE_BYTES } from "@/lib/attachments/config";
import {
  attachmentFileMetadataSchema,
  buildAttachmentStoragePath,
  isSafeAttachmentStoragePath,
  normalizeAttachmentFilename,
} from "@/lib/validation/attachment";

describe("attachmentFileMetadataSchema", () => {
  it("accepts allowed attachment metadata", () => {
    expect(
      attachmentFileMetadataSchema.parse({
        mimeType: "application/pdf",
        originalFilename: "Lease.pdf",
        sizeBytes: 1234,
      }),
    ).toMatchObject({
      mimeType: "application/pdf",
      originalFilename: "Lease.pdf",
      sizeBytes: 1234,
    });
  });

  it("rejects disallowed MIME types and oversized files", () => {
    expect(
      attachmentFileMetadataSchema.safeParse({
        mimeType: "application/x-msdownload",
        originalFilename: "bad.exe",
        sizeBytes: 1234,
      }).success,
    ).toBe(false);

    expect(
      attachmentFileMetadataSchema.safeParse({
        mimeType: "application/pdf",
        originalFilename: "huge.pdf",
        sizeBytes: ATTACHMENT_MAX_FILE_SIZE_BYTES + 1,
      }).success,
    ).toBe(false);
  });
});

describe("attachment path helpers", () => {
  it("normalizes filenames without preserving user paths", () => {
    expect(normalizeAttachmentFilename("..\\secret\\Lease.pdf")).toBe(
      "Lease.pdf",
    );
  });

  it("builds safe household-scoped storage paths", () => {
    const path = buildAttachmentStoragePath(
      "11111111-1111-1111-1111-111111111111",
      "admin_item",
      "22222222-2222-2222-2222-222222222222",
      "33333333-3333-3333-3333-333333333333",
    );

    expect(path).toBe(
      "households/11111111-1111-1111-1111-111111111111/admin_item/22222222-2222-2222-2222-222222222222/33333333-3333-3333-3333-333333333333",
    );
    expect(isSafeAttachmentStoragePath(path)).toBe(true);
    expect(isSafeAttachmentStoragePath("households/../bad")).toBe(false);
  });
});
