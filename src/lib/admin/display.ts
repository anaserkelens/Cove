import { formatMinorMoney } from "@/lib/money/minor-units";
import type { AdminItem, AdminItemStatus } from "@/lib/validation/admin";

export function formatAdminItemType(type: AdminItem["type"]): string {
  return type.replaceAll("_", " ");
}

export function formatAdminItemStatus(status: AdminItemStatus): string {
  return status.replaceAll("_", " ");
}

export function formatAdminItemDate(value: string | null): string {
  if (!value) {
    return "No date";
  }

  const [year, month, day] = value.split("-").map(Number);

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatAdminItemAmount(
  item: Pick<AdminItem, "amount_minor" | "currency_code">,
): string {
  return formatMinorMoney(item.amount_minor, item.currency_code) || "No amount";
}

export function formatAdminItemPrimaryDate(
  item: Pick<AdminItem, "action_date" | "due_date" | "expiry_date">,
): string {
  if (item.due_date) {
    return `Due ${formatAdminItemDate(item.due_date)}`;
  }

  if (item.action_date) {
    return `Act by ${formatAdminItemDate(item.action_date)}`;
  }

  if (item.expiry_date) {
    return `Expires ${formatAdminItemDate(item.expiry_date)}`;
  }

  return "No date";
}
