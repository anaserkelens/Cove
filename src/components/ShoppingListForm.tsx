import type { ShoppingList } from "@/lib/validation/shopping";

type ShoppingListFormProps = {
  action: (formData: FormData) => Promise<void>;
  idPrefix?: string;
  list?: Pick<ShoppingList, "name">;
  submitLabel: string;
};

export function ShoppingListForm({
  action,
  idPrefix = "shopping-list",
  list,
  submitLabel,
}: ShoppingListFormProps) {
  const nameId = `${idPrefix}-name`;

  return (
    <form className="form-grid" action={action}>
      <label htmlFor={nameId}>List name</label>
      <input
        id={nameId}
        name="name"
        type="text"
        defaultValue={list?.name ?? ""}
        required
        maxLength={120}
      />
      <button type="submit">{submitLabel}</button>
    </form>
  );
}
