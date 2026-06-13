import type { Task } from "@/lib/validation/task";

export function formatTaskDate(value: string | null): string {
  if (!value) {
    return "No due date";
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatTaskStatus(status: Task["status"]): string {
  return status.replaceAll("_", " ");
}

export function formatTaskPriority(priority: Task["priority"]): string {
  return priority;
}
