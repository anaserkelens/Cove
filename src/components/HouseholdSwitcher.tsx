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
      <span className="switcher-control">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M3 11 12 3l9 8" />
          <path d="M5 10v10h14V10" />
          <path d="M9 20v-6h6v6" />
        </svg>
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
      </span>
    </label>
  );
}
