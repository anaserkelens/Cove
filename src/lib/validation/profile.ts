import { z } from "zod";

import type { Database } from "@/types/database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export const weekStartOptions = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

const fallbackTimeZones = [
  "UTC",
  "Europe/Amsterdam",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Singapore",
  "Australia/Sydney",
] as const;

export const profileFormSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  timezone: z.string().trim().refine(isValidTimeZone, {
    message: "Enter a valid IANA time zone.",
  }),
  locale: z
    .string()
    .trim()
    .min(2)
    .max(35)
    .transform((locale, ctx) => {
      try {
        return Intl.getCanonicalLocales(locale)[0];
      } catch {
        ctx.addIssue({
          code: "custom",
          message: "Enter a valid locale.",
        });
        return z.NEVER;
      }
    }),
  weekStartsOn: z.coerce.number().int().min(0).max(6),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function toProfileUpdate(values: ProfileFormValues) {
  return {
    display_name: values.displayName,
    locale: values.locale,
    timezone: values.timezone,
    week_starts_on: values.weekStartsOn,
  };
}

export function isProfileComplete(profile: Profile | null): boolean {
  return Boolean(profile?.display_name?.trim());
}

export function getTimeZoneOptions(currentTimeZone = "UTC"): string[] {
  const options = new Set<string>(["UTC"]);
  const supportedTimeZones =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : fallbackTimeZones;

  for (const timeZone of supportedTimeZones) {
    if (isValidTimeZone(timeZone)) {
      options.add(timeZone);
    }
  }

  if (isValidTimeZone(currentTimeZone)) {
    options.add(currentTimeZone);
  }

  return [...options].sort((left, right) => {
    if (left === "UTC") {
      return -1;
    }

    if (right === "UTC") {
      return 1;
    }

    return left.localeCompare(right);
  });
}

export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}
