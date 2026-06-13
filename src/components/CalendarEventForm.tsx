import { utcIsoToDateTimeLocal } from "@/lib/dates/zoned-date-time";
import type { HouseholdMember } from "@/lib/validation/household";
import { getTimeZoneOptions } from "@/lib/validation/profile";
import { parseTaskRecurrenceRule } from "@/lib/recurrence/tasks";
import type { CalendarEvent } from "@/lib/validation/calendar";

type CalendarEventFormProps = {
  action: (formData: FormData) => Promise<void>;
  event?: CalendarEvent;
  householdTimezone: string;
  idPrefix?: string;
  members: HouseholdMember[];
  submitLabel: string;
};

const weekdays = [
  ["0", "Sunday"],
  ["1", "Monday"],
  ["2", "Tuesday"],
  ["3", "Wednesday"],
  ["4", "Thursday"],
  ["5", "Friday"],
  ["6", "Saturday"],
] as const;

const months = [
  ["1", "January"],
  ["2", "February"],
  ["3", "March"],
  ["4", "April"],
  ["5", "May"],
  ["6", "June"],
  ["7", "July"],
  ["8", "August"],
  ["9", "September"],
  ["10", "October"],
  ["11", "November"],
  ["12", "December"],
] as const;

export function CalendarEventForm({
  action,
  event,
  householdTimezone,
  idPrefix = "calendar-event",
  members,
  submitLabel,
}: CalendarEventFormProps) {
  const timezone = event?.timezone ?? householdTimezone;
  const timeZoneOptions = getTimeZoneOptions(timezone);
  const recurrence = parseRecurrence(event?.recurrence_rule ?? null);
  const recurrencePreset = recurrence?.preset ?? "none";
  const recurrenceInterval =
    recurrence?.preset === "daily" || recurrence?.preset === "every_n_weeks"
      ? recurrence.interval
      : 1;
  const recurrenceWeekdays =
    recurrence?.preset === "weekly"
      ? recurrence.weekdays.map((weekday) => weekday.toString())
      : [];
  const recurrenceDayOfMonth =
    recurrence?.preset === "monthly" || recurrence?.preset === "yearly"
      ? recurrence.dayOfMonth
      : 1;
  const recurrenceMonth =
    recurrence?.preset === "yearly" ? recurrence.month : 1;
  const fieldId = (name: string) => `${idPrefix}-${name}`;

  return (
    <form className="form-grid" action={action}>
      <label htmlFor={fieldId("title")}>Title</label>
      <input
        id={fieldId("title")}
        name="title"
        type="text"
        defaultValue={event?.title ?? ""}
        required
        maxLength={160}
      />

      <label htmlFor={fieldId("description")}>Description</label>
      <textarea
        id={fieldId("description")}
        name="description"
        defaultValue={event?.description ?? ""}
        maxLength={2000}
        rows={4}
      />

      <label htmlFor={fieldId("location")}>Location</label>
      <input
        id={fieldId("location")}
        name="location"
        type="text"
        defaultValue={event?.location ?? ""}
        maxLength={240}
      />

      <label htmlFor={fieldId("eventKind")}>Event type</label>
      <select
        id={fieldId("eventKind")}
        name="eventKind"
        defaultValue={event?.all_day ? "all_day" : "timed"}
        required
      >
        <option value="timed">Timed</option>
        <option value="all_day">All-day</option>
      </select>

      <label htmlFor={fieldId("timezone")}>Time zone</label>
      <select
        id={fieldId("timezone")}
        name="timezone"
        defaultValue={timezone}
        required
      >
        {timeZoneOptions.map((timeZone) => (
          <option key={timeZone} value={timeZone}>
            {timeZone}
          </option>
        ))}
      </select>

      <fieldset>
        <legend>Timed event</legend>

        <label htmlFor={fieldId("startsAtLocal")}>Starts at</label>
        <input
          id={fieldId("startsAtLocal")}
          name="startsAtLocal"
          type="datetime-local"
          defaultValue={
            event?.all_day
              ? ""
              : utcIsoToDateTimeLocal(event?.starts_at ?? null, timezone)
          }
        />

        <label htmlFor={fieldId("endsAtLocal")}>Ends at</label>
        <input
          id={fieldId("endsAtLocal")}
          name="endsAtLocal"
          type="datetime-local"
          defaultValue={
            event?.all_day
              ? ""
              : utcIsoToDateTimeLocal(event?.ends_at ?? null, timezone)
          }
        />
      </fieldset>

      <fieldset>
        <legend>All-day event</legend>

        <label htmlFor={fieldId("startDate")}>Start date</label>
        <input
          id={fieldId("startDate")}
          name="startDate"
          type="date"
          defaultValue={event?.start_date ?? ""}
        />

        <label htmlFor={fieldId("endDate")}>End date</label>
        <input
          id={fieldId("endDate")}
          name="endDate"
          type="date"
          defaultValue={event?.end_date ?? ""}
        />
      </fieldset>

      <label htmlFor={fieldId("assignedTo")}>Assigned to</label>
      <select
        id={fieldId("assignedTo")}
        name="assignedTo"
        defaultValue={event?.assigned_to ?? ""}
      >
        <option value="">Unassigned</option>
        {members.map((member) => (
          <option key={member.user_id} value={member.user_id}>
            {member.profile?.display_name ?? "Household member"}
          </option>
        ))}
      </select>

      <fieldset>
        <legend>Recurrence</legend>

        <label htmlFor={fieldId("recurrencePreset")}>Repeat</label>
        <select
          id={fieldId("recurrencePreset")}
          name="recurrencePreset"
          defaultValue={recurrencePreset}
        >
          <option value="none">Does not repeat</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly on selected days</option>
          <option value="every_n_weeks">Every N weeks</option>
          <option value="monthly">Monthly on day</option>
          <option value="yearly">Yearly</option>
        </select>

        <label htmlFor={fieldId("recurrenceInterval")}>Interval</label>
        <input
          id={fieldId("recurrenceInterval")}
          name="recurrenceInterval"
          type="number"
          min={1}
          max={365}
          defaultValue={recurrenceInterval}
        />

        <div className="checkbox-grid" role="group" aria-label="Weekdays">
          {weekdays.map(([value, label]) => (
            <label key={value}>
              <input
                type="checkbox"
                name="recurrenceWeekdays"
                value={value}
                defaultChecked={recurrenceWeekdays.includes(value)}
              />
              {label}
            </label>
          ))}
        </div>

        <label htmlFor={fieldId("recurrenceDayOfMonth")}>Day of month</label>
        <input
          id={fieldId("recurrenceDayOfMonth")}
          name="recurrenceDayOfMonth"
          type="number"
          min={1}
          max={31}
          defaultValue={recurrenceDayOfMonth}
        />

        <label htmlFor={fieldId("recurrenceMonth")}>Month</label>
        <select
          id={fieldId("recurrenceMonth")}
          name="recurrenceMonth"
          defaultValue={recurrenceMonth}
        >
          {months.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </fieldset>

      <button type="submit">{submitLabel}</button>
    </form>
  );
}

function parseRecurrence(value: string | null) {
  try {
    return parseTaskRecurrenceRule(value);
  } catch {
    return null;
  }
}
