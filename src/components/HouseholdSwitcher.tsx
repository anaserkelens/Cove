"use client";

import type { Household } from "@/lib/validation/household";

type HouseholdSwitcherProps = {
  currentHouseholdId: string;
  households: Pick<Household, "id" | "name">[];
};

export function HouseholdSwitcher({
  currentHouseholdId,
  households,
}: HouseholdSwitcherProps) {
  if (households.length === 0) {
    return null;
  }

  return (
    <label className="switcher-label">
      <span>Household</span>
      <select
        value={currentHouseholdId}
        onChange={(event) => {
          const householdId = event.currentTarget.value;

          if (householdId) {
            window.location.assign(`/app/${householdId}/dashboard`);
          }
        }}
      >
        {households.map((household) => (
          <option key={household.id} value={household.id}>
            {household.name}
          </option>
        ))}
      </select>
    </label>
  );
}
