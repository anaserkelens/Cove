import { NextRequest, NextResponse } from "next/server";

import { sanitizeRedirectPath } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";
import { ensureProfileForCurrentUser } from "@/server/profiles/service";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeRedirectPath(
    requestUrl.searchParams.get("next"),
    "/app",
  );

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=auth-callback-failed", request.url),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL("/login?error=auth-callback-failed", request.url),
    );
  }

  try {
    await ensureProfileForCurrentUser();
  } catch {
    return NextResponse.redirect(
      new URL("/login?error=auth-callback-failed", request.url),
    );
  }

  return NextResponse.redirect(new URL(next, request.url));
}
