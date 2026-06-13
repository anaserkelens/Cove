import type { HouseholdMember } from "@/lib/validation/household";
import { parseTaskRecurrenceRule } from "@/lib/recurrence/tasks";
import type { Task } from "@/lib/validation/task";
import { editableTaskStatuses, taskPriorities } from "@/lib/validation/task";

type TaskFormProps = {
  action: (formData: FormData) => Promise<void>;
  members: HouseholdMember[];
  submitLabel: string;
  task?: Task;
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

export function TaskForm({
  action,
  members,
  submitLabel,
  task,
}: TaskFormProps) {
  const recurrence = parseRecurrence(task?.recurrence_rule ?? null);
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

  return (
    <form className="form-grid" action={action}>
      <label htmlFor="title">Title</label>
      <input
        id="title"
        name="title"
        type="text"
        defaultValue={task?.title ?? ""}
        required
        maxLength={160}
      />

      <label htmlFor="description">Description</label>
      <textarea
        id="description"
        name="description"
        defaultValue={task?.description ?? ""}
        maxLength={2000}
        rows={4}
      />

      {task ? (
        <>
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={task.status} required>
            {editableTaskStatuses.map((status) => (
              <option key={status} value={status}>
                {formatLabel(status)}
              </option>
            ))}
          </select>
        </>
      ) : (
        <input type="hidden" name="status" value="open" />
      )}

      <label htmlFor="priority">Priority</label>
      <select
        id="priority"
        name="priority"
        defaultValue={task?.priority ?? "normal"}
        required
      >
        {taskPriorities.map((priority) => (
          <option key={priority} value={priority}>
            {formatLabel(priority)}
          </option>
        ))}
      </select>

      <label htmlFor="assignedTo">Assigned to</label>
      <select
        id="assignedTo"
        name="assignedTo"
        defaultValue={task?.assigned_to ?? ""}
      >
        <option value="">Unassigned</option>
        {members.map((member) => (
          <option key={member.user_id} value={member.user_id}>
            {member.profile?.display_name ?? "Household member"}
          </option>
        ))}
      </select>

      <label htmlFor="dueDate">Due date</label>
      <input
        id="dueDate"
        name="dueDate"
        type="date"
        defaultValue={task?.due_date ?? ""}
      />

      <fieldset>
        <legend>Recurrence</legend>

        <label htmlFor="recurrencePreset">Repeat</label>
        <select
          id="recurrencePreset"
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

        <label htmlFor="recurrenceInterval">Interval</label>
        <input
          id="recurrenceInterval"
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

        <label htmlFor="recurrenceDayOfMonth">Day of month</label>
        <input
          id="recurrenceDayOfMonth"
          name="recurrenceDayOfMonth"
          type="number"
          min={1}
          max={31}
          defaultValue={recurrenceDayOfMonth}
        />

        <label htmlFor="recurrenceMonth">Month</label>
        <select
          id="recurrenceMonth"
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

function formatLabel(value: string): string {
  return value.replaceAll("_", " ");
}
