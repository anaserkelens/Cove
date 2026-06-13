import { formatReminderTime } from "@/lib/reminders/display";
import type { ReminderListItem } from "@/server/reminders/service";
import {
  cancelReminderAction,
  markReminderSentAction,
} from "@/server/reminders/actions";

type ReminderListProps = {
  emptyText: string;
  householdId: string;
  redirectPath: string;
  reminders: ReminderListItem[];
  timeZone: string;
};

export function ReminderList({
  emptyText,
  householdId,
  redirectPath,
  reminders,
  timeZone,
}: ReminderListProps) {
  if (reminders.length === 0) {
    return <p>{emptyText}</p>;
  }

  return (
    <ul className="plain-list">
      {reminders.map((reminder) => {
        const markHandled = markReminderSentAction.bind(
          null,
          householdId,
          reminder.id,
          redirectPath,
        );
        const cancelReminder = cancelReminderAction.bind(
          null,
          householdId,
          reminder.id,
          redirectPath,
        );

        return (
          <li key={reminder.id}>
            <span>
              {reminder.title} -{" "}
              {formatReminderTime(reminder.remind_at, timeZone)}
            </span>
            <span>
              {reminder.recipient?.display_name ?? "Household"} - created by{" "}
              {reminder.creator?.display_name ?? "Household member"}
            </span>
            <div className="inline-actions">
              <form action={markHandled}>
                <button type="submit">Handled</button>
              </form>
              <form action={cancelReminder}>
                <button type="submit">Cancel</button>
              </form>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
