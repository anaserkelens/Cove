"use server";

import { redirect } from "next/navigation";

import { sanitizeRedirectPath } from "@/lib/auth/redirects";
import { getFormString } from "@/lib/forms/form-data";
import {
  loginFormSchema,
  passwordResetRequestFormSchema,
  passwordUpdateFormSchema,
  signupFormSchema,
} from "@/lib/validation/auth";
import { createClient } from "@/lib/supabase/server";
import { getRequestOrigin } from "@/server/auth/request";
import { ensureProfileForCurrentUser } from "@/server/profiles/service";

export async function signupAction(formData: FormData) {
  const parsed = signupFormSchema.safeParse({
    email: getFormString(formData, "email"),
    password: getFormString(formData, "password"),
  });

  if (!parsed.success) {
    const errorCode = parsed.error.issues.some((issue) =>
      issue.path.includes("password"),
    )
      ? "weak-password"
      : "invalid-email";
    redirect(`/signup?error=${errorCode}`);
  }

  const supabase = await createClient();
  const origin = await getRequestOrigin();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
    },
  });

  if (error) {
    redirect("/signup?error=signup-failed");
  }

  if (data.session) {
    await ensureProfileForCurrentUser();
    redirect("/onboarding");
  }

  redirect("/login?status=check-email");
}

export async function loginAction(formData: FormData) {
  const parsed = loginFormSchema.safeParse({
    email: getFormString(formData, "email"),
    password: getFormString(formData, "password"),
    redirectTo: getFormString(formData, "redirectTo", "/app"),
  });

  if (!parsed.success) {
    redirect("/login?error=invalid-login");
  }

  const redirectTo = sanitizeRedirectPath(parsed.data.redirectTo, "/app");
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    redirect(
      `/login?next=${encodeURIComponent(redirectTo)}&error=invalid-login`,
    );
  }

  await ensureProfileForCurrentUser();
  redirect(redirectTo);
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login?status=logged-out");
}

export async function requestPasswordResetAction(formData: FormData) {
  const parsed = passwordResetRequestFormSchema.safeParse({
    email: getFormString(formData, "email"),
  });

  if (!parsed.success) {
    redirect("/password-reset?error=invalid-email");
  }

  const supabase = await createClient();
  const origin = await getRequestOrigin();

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  });

  redirect("/password-reset?status=password-reset-sent");
}

export async function updatePasswordAction(formData: FormData) {
  const parsed = passwordUpdateFormSchema.safeParse({
    password: getFormString(formData, "password"),
    confirmPassword: getFormString(formData, "confirmPassword"),
  });

  if (!parsed.success) {
    const errorCode = parsed.error.issues.some((issue) =>
      issue.path.includes("confirmPassword"),
    )
      ? "password-mismatch"
      : "weak-password";
    redirect(`/update-password?error=${errorCode}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    redirect("/update-password?error=password-update-failed");
  }

  await ensureProfileForCurrentUser();
  redirect("/app?status=password-updated");
}
