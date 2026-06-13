import { notFound } from "next/navigation";

import { HouseholdNav } from "@/components/HouseholdNav";
import { HouseholdSwitcher } from "@/components/HouseholdSwitcher";
import {
  getHouseholdForCurrentUser,
  getMembershipForCurrentUser,
  listHouseholdsForCurrentUser,
} from "@/server/households/service";

type HouseholdLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{
    householdId: string;
  }>;
}>;

export default async function HouseholdLayout({
  children,
  params,
}: HouseholdLayoutProps) {
  const { householdId } = await params;

  try {
    await Promise.all([
      getHouseholdForCurrentUser(householdId),
      getMembershipForCurrentUser(householdId),
    ]);
  } catch {
    notFound();
  }

  const households = await listHouseholdsForCurrentUser();

  return (
    <div className="workspace">
      <aside className="hh-sidebar" aria-label="Household navigation">
        <HouseholdSwitcher
          currentHouseholdId={householdId}
          households={households}
        />
        <HouseholdNav householdId={householdId} />
      </aside>
      <div className="workspace-main">{children}</div>
    </div>
  );
}
