import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAction } from "@/server/auth/actions";
import { requireAuthenticatedUser } from "@/server/auth/session";
import { getProfileForCurrentUser } from "@/server/profiles/service";
import { isProfileComplete } from "@/lib/validation/profile";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAuthenticatedUser("/app");
  const profile = await getProfileForCurrentUser();

  if (!isProfileComplete(profile)) {
    redirect("/onboarding");
  }

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="app-header">
        <Link href="/app" className="app-title">
          Cove
        </Link>
        <nav aria-label="App navigation">
          <Link href="/app/households">Households</Link>
          <Link href="/app/profile">Profile</Link>
        </nav>
        <form action={logoutAction}>
          <button type="submit">Log out</button>
        </form>
      </header>
      <div id="main-content" className="app-body" tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}
