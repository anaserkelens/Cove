import type { Household } from "@/lib/validation/household";
import { getTimeZoneOptions } from "@/lib/validation/profile";

const currencyOptions = ["EUR", "USD", "GBP", "CAD", "AUD"] as const;

type HouseholdFormProps = {
  action: (formData: FormData) => Promise<void>;
  household?: Pick<Household, "currency_code" | "name" | "timezone">;
  submitLabel: string;
};

export function HouseholdForm({
  action,
  household,
  submitLabel,
}: HouseholdFormProps) {
  const currentTimeZone = household?.timezone ?? "UTC";
  const timeZoneOptions = getTimeZoneOptions(currentTimeZone);

  return (
    <form className="form-grid" action={action}>
      <label htmlFor="name">Household name</label>
      <input
        id="name"
        name="name"
        type="text"
        autoComplete="organization"
        defaultValue={household?.name ?? ""}
        required
        maxLength={120}
      />

      <label htmlFor="timezone">Default time zone</label>
      <select
        id="timezone"
        name="timezone"
        defaultValue={currentTimeZone}
        required
      >
        {timeZoneOptions.map((timeZone) => (
          <option key={timeZone} value={timeZone}>
            {timeZone}
          </option>
        ))}
      </select>

      <label htmlFor="currencyCode">Currency</label>
      <select
        id="currencyCode"
        name="currencyCode"
        defaultValue={household?.currency_code ?? "EUR"}
        required
      >
        {currencyOptions.map((currencyCode) => (
          <option key={currencyCode} value={currencyCode}>
            {currencyCode}
          </option>
        ))}
      </select>

      <button type="submit">{submitLabel}</button>
    </form>
  );
}
