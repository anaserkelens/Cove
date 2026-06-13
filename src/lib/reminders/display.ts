import type { ReminderStatus } from "@/lib/validation/reminder";

export function formatReminderTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

export function formatReminderStatus(status: ReminderStatus): string {
  return status.replaceAll("_", " ");
}
