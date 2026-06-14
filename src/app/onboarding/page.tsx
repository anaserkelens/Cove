import Link from "next/link";
import { redirect } from "next/navigation";

import { FormMessage } from "@/components/FormMessage";
import { Logo } from "@/components/Logo";
import { ProfileForm } from "@/components/ProfileForm";
import { getFormMessage } from "@/lib/forms/messages";
import { isProfileComplete } from "@/lib/validation/profile";
import { requireAuthenticatedUser } from "@/server/auth/session";
import { completeOnboardingAction } from "@/server/profiles/actions";
import { getProfileForCurrentUser } from "@/server/profiles/service";

type OnboardingPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    status?: string | string[];
  }>;
};

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  await requireAuthenticatedUser("/onboarding");
  const profile = await getProfileForCurrentUser();

  if (isProfileComplete(profile)) {
    redirect("/app");
  }

  const message = getFormMessage(await searchParams);

  return (
    <main className="shell" aria-labelledby="page-title">
      <section className="stack">
        <Link href="/" className="brand-link auth-brand" aria-label="Cove home">
          <Logo size={36} />
        </Link>
        <h1 id="page-title">Set up your profile</h1>
        <p>A name and a colour so the household knows it&apos;s you.</p>
        <FormMessage message={message} />
        <ProfileForm
          action={completeOnboardingAction}
          profile={profile}
          submitLabel="Continue"
        />
      </section>
    </main>
  );
}
