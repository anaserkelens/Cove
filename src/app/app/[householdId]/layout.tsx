import Link from "next/link";
import { notFound } from "next/navigation";

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
    <>
      <section className="household-bar" aria-label="Household navigation">
        <HouseholdSwitcher
          currentHouseholdId={householdId}
          households={households}
        />
        <nav>
          <Link href={`/app/${householdId}/dashboard`}>Dashboard</Link>
          <Link href={`/app/${householdId}/tasks`}>Tasks</Link>
          <Link href={`/app/${householdId}/shopping`}>Shopping</Link>
          <Link href={`/app/${householdId}/calendar`}>Calendar</Link>
          <Link href={`/app/${householdId}/members`}>Members</Link>
          <Link href={`/app/${householdId}/settings`}>Settings</Link>
        </nav>
      </section>
      {children}
    </>
  );
}
