import type { HouseholdMember } from "@/lib/validation/household";

type ReminderFormProps = {
  action: (formData: FormData) => Promise<void>;
  householdTimezone: string;
  idPrefix?: string;
  members: HouseholdMember[];
};

export function ReminderForm({
  action,
  householdTimezone,
  idPrefix = "reminder",
  members,
}: ReminderFormProps) {
  const fieldId = (name: string) => `${idPrefix}-${name}`;

  return (
    <form className="form-grid" action={action}>
      <label htmlFor={fieldId("title")}>Reminder</label>
      <input
        id={fieldId("title")}
        name="title"
        type="text"
        maxLength={160}
        required
      />

      <label htmlFor={fieldId("remindAtLocal")}>When</label>
      <input
        id={fieldId("remindAtLocal")}
        name="remindAtLocal"
        type="datetime-local"
        required
      />

      <label htmlFor={fieldId("recipientUserId")}>Recipient</label>
      <select id={fieldId("recipientUserId")} name="recipientUserId">
        <option value="">Household</option>
        {members.map((member) => (
          <option key={member.user_id} value={member.user_id}>
            {member.profile?.display_name ?? "Household member"}
          </option>
        ))}
      </select>

      <input type="hidden" name="timezone" value={householdTimezone} />

      <button type="submit">Create reminder</button>
    </form>
  );
}
