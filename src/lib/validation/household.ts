import { z } from "zod";

import { isValidTimeZone } from "@/lib/validation/profile";
import type { Database } from "@/types/database";

export type Household = Database["public"]["Tables"]["households"]["Row"];
export type HouseholdMembership =
  Database["public"]["Tables"]["household_memberships"]["Row"];

export type HouseholdMember = HouseholdMembership & {
  profile: Pick<
    Database["public"]["Tables"]["profiles"]["Row"],
    "display_name" | "id" | "locale" | "timezone"
  > | null;
};

export const currencyCodeSchema = z
  .string()
  .trim()
  .length(3)
  .transform((currencyCode) => currencyCode.toUpperCase())
  .refine((currencyCode) => /^[A-Z]{3}$/.test(currencyCode), {
    message: "Enter a valid three-letter currency code.",
  });

export const householdFormSchema = z.object({
  name: z.string().trim().min(1).max(120),
  timezone: z.string().trim().refine(isValidTimeZone, {
    message: "Enter a valid IANA time zone.",
  }),
  currencyCode: currencyCodeSchema.default("EUR"),
});

export type HouseholdFormValues = z.infer<typeof householdFormSchema>;

export function toHouseholdSettingsUpdate(values: HouseholdFormValues) {
  return {
    currency_code: values.currencyCode,
    name: values.name,
    timezone: values.timezone,
  };
}

export function slugifyHouseholdName(rawName: string): string {
  const slug = rawName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return slug.length > 0 ? slug : "household";
}

export function isActiveOwner(
  membership: Pick<HouseholdMembership, "role" | "status"> | null,
): boolean {
  return membership?.role === "owner" && membership.status === "active";
}
