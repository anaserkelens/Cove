import { NextResponse } from "next/server";

import { createAttachmentDownloadUrl } from "@/server/attachments/service";

type AttachmentDownloadRouteContext = {
  params: Promise<{
    attachmentId: string;
    householdId: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: AttachmentDownloadRouteContext,
) {
  const { attachmentId, householdId } = await params;

  try {
    const signedUrl = await createAttachmentDownloadUrl(
      householdId,
      attachmentId,
    );

    return NextResponse.redirect(signedUrl);
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
