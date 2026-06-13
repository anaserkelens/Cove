import { formatMinorMoneyInput } from "@/lib/money/minor-units";
import { parseTaskRecurrenceRule } from "@/lib/recurrence/tasks";
import type { AdminItem } from "@/lib/validation/admin";
import { adminItemTypes } from "@/lib/validation/admin";
import type { HouseholdMember } from "@/lib/validation/household";

type AdminItemFormProps = {
  action: (formData: FormData) => Promise<void>;
  householdCurrencyCode: string;
  householdTimezone: string;
  idPrefix?: string;
  item?: AdminItem;
  members: HouseholdMember[];
  submitLabel: string;
};

const currencyOptions = ["EUR", "USD", "GBP", "CAD", "AUD"] as const;

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

export function AdminItemForm({
  action,
  householdCurrencyCode,
  householdTimezone,
  idPrefix = "admin-item",
  item,
  members,
  submitLabel,
}: AdminItemFormProps) {
  const recurrence = parseRecurrence(item?.recurrence_rule ?? null);
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
  const currencyCode = item?.currency_code ?? householdCurrencyCode;

  return (
    <form className="form-grid" action={action}>
      <label htmlFor={fieldId("title")}>Title</label>
      <input
        id={fieldId("title")}
        name="title"
        type="text"
        defaultValue={item?.title ?? ""}
        required
        maxLength={160}
      />

      <label htmlFor={fieldId("type")}>Type</label>
      <select
        id={fieldId("type")}
        name="type"
        defaultValue={item?.type ?? "bill"}
        required
      >
        {adminItemTypes.map((type) => (
          <option key={type} value={type}>
            {formatLabel(type)}
          </option>
        ))}
      </select>

      <label htmlFor={fieldId("description")}>Description</label>
      <textarea
        id={fieldId("description")}
        name="description"
        defaultValue={item?.description ?? ""}
        maxLength={2000}
        rows={4}
      />

      <label htmlFor={fieldId("ownerId")}>Owner</label>
      <select
        id={fieldId("ownerId")}
        name="ownerId"
        defaultValue={item?.owner_id ?? ""}
      >
        <option value="">Unassigned</option>
        {members.map((member) => (
          <option key={member.user_id} value={member.user_id}>
            {member.profile?.display_name ?? "Household member"}
          </option>
        ))}
      </select>

      <label htmlFor={fieldId("providerName")}>Provider</label>
      <input
        id={fieldId("providerName")}
        name="providerName"
        type="text"
        defaultValue={item?.provider_name ?? ""}
        maxLength={160}
      />

      <label htmlFor={fieldId("referenceNumber")}>Reference number</label>
      <input
        id={fieldId("referenceNumber")}
        name="referenceNumber"
        type="text"
        defaultValue={item?.reference_number ?? ""}
        maxLength={160}
      />

      <label htmlFor={fieldId("amount")}>Amount</label>
      <input
        id={fieldId("amount")}
        name="amount"
        type="text"
        inputMode="decimal"
        defaultValue={formatMinorMoneyInput(
          item?.amount_minor ?? null,
          item?.currency_code ?? null,
        )}
      />

      <label htmlFor={fieldId("currencyCode")}>Currency</label>
      <select
        id={fieldId("currencyCode")}
        name="currencyCode"
        defaultValue={currencyCode}
      >
        {currencyOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <label htmlFor={fieldId("dueDate")}>Due date</label>
      <input
        id={fieldId("dueDate")}
        name="dueDate"
        type="date"
        defaultValue={item?.due_date ?? ""}
      />

      <label htmlFor={fieldId("actionDate")}>Action date</label>
      <input
        id={fieldId("actionDate")}
        name="actionDate"
        type="date"
        defaultValue={item?.action_date ?? ""}
      />

      <label htmlFor={fieldId("expiryDate")}>Expiry date</label>
      <input
        id={fieldId("expiryDate")}
        name="expiryDate"
        type="date"
        defaultValue={item?.expiry_date ?? ""}
      />

      <label className="checkbox-row" htmlFor={fieldId("autoPay")}>
        <input
          id={fieldId("autoPay")}
          name="autoPay"
          type="checkbox"
          defaultChecked={item?.auto_pay ?? false}
        />
        Auto-pay
      </label>

      <input
        type="hidden"
        name="recurrenceTimezone"
        value={householdTimezone}
      />

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

      <label htmlFor={fieldId("notes")}>Notes</label>
      <textarea
        id={fieldId("notes")}
        name="notes"
        defaultValue={item?.notes ?? ""}
        maxLength={4000}
        rows={4}
      />

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
