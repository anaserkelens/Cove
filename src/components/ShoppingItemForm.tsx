import type { HouseholdMember } from "@/lib/validation/household";
import type { ShoppingItem } from "@/lib/validation/shopping";

type ShoppingItemFormProps = {
  action: (formData: FormData) => Promise<void>;
  idPrefix?: string;
  item?: ShoppingItem;
  members: HouseholdMember[];
  submitLabel: string;
};

export function ShoppingItemForm({
  action,
  idPrefix = "shopping-item",
  item,
  members,
  submitLabel,
}: ShoppingItemFormProps) {
  const fieldId = (name: string) => `${idPrefix}-${name}`;

  return (
    <form className="form-grid" action={action}>
      <label htmlFor={fieldId("name")}>Item</label>
      <input
        id={fieldId("name")}
        name="name"
        type="text"
        defaultValue={item?.name ?? ""}
        required
        maxLength={160}
      />

      <label htmlFor={fieldId("quantity")}>Quantity</label>
      <input
        id={fieldId("quantity")}
        name="quantity"
        type="number"
        min="0.01"
        max="999999"
        step="any"
        defaultValue={item?.quantity ?? ""}
      />

      <label htmlFor={fieldId("unit")}>Unit</label>
      <input
        id={fieldId("unit")}
        name="unit"
        type="text"
        defaultValue={item?.unit ?? ""}
        maxLength={40}
      />

      <label htmlFor={fieldId("assignedTo")}>Assigned to</label>
      <select
        id={fieldId("assignedTo")}
        name="assignedTo"
        defaultValue={item?.assigned_to ?? ""}
      >
        <option value="">Unassigned</option>
        {members.map((member) => (
          <option key={member.user_id} value={member.user_id}>
            {member.profile?.display_name ?? "Household member"}
          </option>
        ))}
      </select>

      <label htmlFor={fieldId("note")}>Note</label>
      <textarea
        id={fieldId("note")}
        name="note"
        defaultValue={item?.note ?? ""}
        maxLength={1000}
        rows={3}
      />

      <label className="checkbox-row" htmlFor={fieldId("recurringHint")}>
        <input
          id={fieldId("recurringHint")}
          name="recurringHint"
          type="checkbox"
          defaultChecked={item?.recurring_hint ?? false}
        />
        Buy regularly
      </label>

      <button type="submit">{submitLabel}</button>
    </form>
  );
}
