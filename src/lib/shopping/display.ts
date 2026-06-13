import type { ShoppingItemStatus } from "@/lib/validation/shopping";

export function formatShoppingQuantity(
  quantity: number | null,
  unit: string | null,
): string {
  if (quantity === null && !unit) {
    return "";
  }

  if (quantity === null) {
    return unit ?? "";
  }

  const formattedQuantity = Number.isInteger(quantity)
    ? quantity.toString()
    : quantity.toLocaleString("en", { maximumFractionDigits: 2 });

  return unit ? `${formattedQuantity} ${unit}` : formattedQuantity;
}

export function formatShoppingStatus(status: ShoppingItemStatus): string {
  return status.replaceAll("_", " ");
}
