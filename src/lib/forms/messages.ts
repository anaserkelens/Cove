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
  "create-household-failed": "We could not create that household. Try again.",
  "archive-task-failed": "We could not archive that task. Try again.",
  "complete-task-failed": "We could not complete that task. Try again.",
  "archive-shopping-list-failed":
    "We could not archive that shopping list. Try again.",
  "archive-calendar-event-failed":
    "We could not archive that calendar event. Try again.",
  "archive-admin-item-failed":
    "We could not archive that Home Admin item. Try again.",
  "admin-item-archived": "Home Admin item archived.",
  "admin-item-created": "Home Admin item created.",
  "admin-item-updated": "Home Admin item updated.",
  "admin-status-updated": "Home Admin status updated.",
  "attachment-deleted": "Attachment deleted.",
  "attachment-uploaded": "Attachment uploaded.",
  "calendar-archived": "Calendar event archived.",
  "calendar-created": "Calendar event created.",
  "calendar-updated": "Calendar event updated.",
  "create-task-comment-failed": "We could not add that comment. Try again.",
  "create-calendar-event-failed":
    "We could not create that calendar event. Try again.",
  "create-admin-item-failed":
    "We could not create that Home Admin item. Try again.",
  "create-reminder-failed": "We could not create that reminder. Try again.",
  "delete-attachment-failed": "We could not delete that attachment. Try again.",
  "create-shopping-item-failed":
    "We could not add that shopping item. Try again.",
  "create-shopping-list-failed":
    "We could not create that shopping list. Try again.",
  "create-task-failed": "We could not create that task. Try again.",
  "household-updated": "Household settings have been updated.",
  "invalid-household": "Check the household fields and try again.",
  "invalid-invitation":
    "That invitation could not be accepted. It may have expired or been revoked.",
  "invalid-calendar-event": "Check the calendar event fields and try again.",
  "invalid-admin-item": "Check the Home Admin fields and try again.",
  "invalid-admin-status": "Choose a valid Home Admin status.",
  "invalid-attachment": "Choose an allowed file up to 5 MiB.",
  "invalid-reminder": "Check the reminder fields and try again.",
  "invalid-shopping-item": "Check the shopping item fields and try again.",
  "invalid-shopping-item-status": "Choose a valid shopping item status.",
  "invalid-shopping-list": "Check the shopping list name and try again.",
  "invalid-task": "Check the task fields and try again.",
  "invalid-task-comment": "Enter a comment before saving.",
  "invitation-accepted": "Invitation accepted.",
  "invitation-revoked": "Invitation revoked.",
  "readd-shopping-item-failed":
    "We could not add that item back to shopping. Try again.",
  "revoke-invitation-failed":
    "We could not revoke that invitation. Owners only.",
  "reminder-cancelled": "Reminder cancelled.",
  "reminder-created": "Reminder created.",
  "reminder-handled": "Reminder handled.",
  "set-default-shopping-list-failed":
    "We could not make that the default shopping list. Try again.",
  "shopping-item-created": "Shopping item added.",
  "shopping-item-in-cart": "Shopping item marked as in cart.",
  "shopping-item-needed": "Shopping item marked as needed.",
  "shopping-item-purchased": "Shopping item marked as purchased.",
  "shopping-item-readded": "Shopping item added back to shopping.",
  "shopping-item-removed": "Shopping item removed.",
  "shopping-item-updated": "Shopping item updated.",
  "shopping-list-archived": "Shopping list archived.",
  "shopping-list-created": "Shopping list created.",
  "shopping-list-default-set": "Default shopping list updated.",
  "shopping-list-updated": "Shopping list updated.",
  "task-archived": "Task archived.",
  "task-comment-created": "Comment added.",
  "task-completed": "Task completed.",
  "task-created": "Task created.",
  "task-updated": "Task updated.",
  "update-shopping-item-failed":
    "We could not update that shopping item. Try again.",
  "update-shopping-item-status-failed":
    "We could not update that shopping item status. Try again.",
  "update-shopping-list-failed":
    "We could not update that shopping list. Try again.",
  "update-calendar-event-failed":
    "We could not update that calendar event. Try again.",
  "update-admin-item-failed":
    "We could not update that Home Admin item. Try again.",
  "update-admin-status-failed":
    "We could not update that Home Admin status. Try again.",
  "update-reminder-failed": "We could not update that reminder. Try again.",
  "update-task-failed": "We could not update that task. Try again.",
  "upload-attachment-failed":
    "We could not upload that attachment. Check the file type, size, and household quota.",
  "update-household-failed":
    "We could not update household settings. Owners only.",
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
