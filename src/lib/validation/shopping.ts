import { z } from "zod";

import type { Database } from "@/types/database";

export type ShoppingList =
  Database["public"]["Tables"]["shopping_lists"]["Row"];
export type ShoppingItem =
  Database["public"]["Tables"]["shopping_items"]["Row"];
export type ShoppingItemStatus =
  Database["public"]["Enums"]["shopping_item_status"];

export const shoppingItemStatuses = [
  "needed",
  "in_cart",
  "purchased",
  "removed",
] as const;

const optionalUuidSchema = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .refine(
    (value) => value === null || z.string().uuid().safeParse(value).success,
    {
      message: "Choose a valid household member.",
    },
  );

const optionalQuantitySchema = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? Number(value) : null))
  .refine(
    (value) =>
      value === null ||
      (Number.isFinite(value) && value > 0 && value <= 999999),
    {
      message: "Enter a quantity greater than 0.",
    },
  );

export const shoppingListFormSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export type ShoppingListFormValues = z.infer<typeof shoppingListFormSchema>;

export const shoppingItemFormSchema = z.object({
  assignedTo: optionalUuidSchema,
  name: z.string().trim().min(1).max(160),
  note: z
    .string()
    .trim()
    .max(1000)
    .transform((value) => (value.length > 0 ? value : null)),
  quantity: optionalQuantitySchema,
  recurringHint: z.boolean().default(false),
  unit: z
    .string()
    .trim()
    .max(40)
    .transform((value) => (value.length > 0 ? value : null)),
});

export type ShoppingItemFormValues = z.infer<typeof shoppingItemFormSchema>;

export const shoppingItemStatusFormSchema = z.object({
  status: z.enum(shoppingItemStatuses),
});

export type ShoppingItemStatusFormValues = z.infer<
  typeof shoppingItemStatusFormSchema
>;

export function isActiveShoppingItemStatus(
  status: ShoppingItemStatus,
): boolean {
  return status === "needed" || status === "in_cart";
}

export function isPurchasedShoppingItemStatus(
  status: ShoppingItemStatus,
): boolean {
  return status === "purchased";
}
