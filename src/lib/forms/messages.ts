const messages = {
  "check-email": "Check your email to continue.",
  "invalid-email": "Enter a valid email address.",
  "invalid-login": "The email or password is incorrect.",
  "invalid-profile": "Check the profile fields and try again.",
  "logged-out": "You have been logged out.",
  "missing-session": "Please log in to continue.",
  "password-mismatch": "The passwords do not match.",
  "password-reset-sent":
    "If an account exists for that email, a password reset link has been sent.",
  "password-updated": "Your password has been updated.",
  "password-update-failed": "We could not update your password. Try again.",
  "profile-updated": "Your profile has been updated.",
  "signup-failed": "We could not create your account. Try again.",
  "update-profile-failed": "We could not update your profile. Try again.",
  "weak-password": "Use a password with at least 8 characters.",
  "auth-callback-failed": "We could not complete authentication. Try again.",
} as const;

export type MessageCode = keyof typeof messages;

export type FormMessage = {
  kind: "error" | "status";
  text: string;
};

export function getFormMessage(searchParams: {
  error?: string | string[];
  status?: string | string[];
}): FormMessage | null {
  const error = readParam(searchParams.error);
  const status = readParam(searchParams.status);

  if (error && error in messages) {
    return { kind: "error", text: messages[error as MessageCode] };
  }

  if (status && status in messages) {
    return { kind: "status", text: messages[status as MessageCode] };
  }

  return null;
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
