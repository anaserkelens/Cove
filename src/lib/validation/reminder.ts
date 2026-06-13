import { z } from "zod";

import {
  isDateTimeLocal,
  zonedDateTimeToUtcIso,
} from "@/lib/dates/zoned-date-time";
import { isValidTimeZone } from "@/lib/validation/profile";
import type { Database } from "@/types/database";

export type Reminder = Database["public"]["Tables"]["reminders"]["Row"];
export type ReminderStatus = Database["public"]["Enums"]["reminder_status"];

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

export const rawReminderFormSchema = z.object({
  recipientUserId: optionalUuidSchema,
  remindAtLocal: z.string().trim().refine(isDateTimeLocal, {
    message: "Enter a valid date and time.",
  }),
  timezone: z.string().trim().refine(isValidTimeZone, {
    message: "Choose a valid IANA time zone.",
  }),
  title: z.string().trim().min(1).max(160),
});

export const reminderFormSchema = rawReminderFormSchema.transform(
  (values, context) => {
    try {
      return {
        recipientUserId: values.recipientUserId,
        remindAt: zonedDateTimeToUtcIso(values.remindAtLocal, values.timezone),
        title: values.title,
      };
    } catch {
      context.addIssue({
        code: "custom",
        message: "Enter a valid reminder time.",
        path: ["remindAtLocal"],
      });

      return z.NEVER;
    }
  },
);

export type ReminderFormValues = z.infer<typeof reminderFormSchema>;

export function isPendingReminder(reminder: Pick<Reminder, "status">): boolean {
  return reminder.status === "pending";
}

export function isReminderNeedsAttention(
  reminder: Pick<Reminder, "remind_at" | "status">,
  nowIso: string,
): boolean {
  return isPendingReminder(reminder) && reminder.remind_at < nowIso;
}

export function isReminderInRange(
  reminder: Pick<Reminder, "remind_at" | "status">,
  startIso: string,
  endIso: string,
): boolean {
  return (
    isPendingReminder(reminder) &&
    reminder.remind_at >= startIso &&
    reminder.remind_at < endIso
  );
}
