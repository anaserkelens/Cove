import { FormMessage } from "@/components/FormMessage";
import { ProfileForm } from "@/components/ProfileForm";
import { getFormMessage } from "@/lib/forms/messages";
import { updateProfileAction } from "@/server/profiles/actions";
import { getProfileForCurrentUser } from "@/server/profiles/service";

type ProfilePageProps = {
  searchParams: Promise<{
    error?: string | string[];
    status?: string | string[];
  }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const profile = await getProfileForCurrentUser();
  const message = getFormMessage(await searchParams);

  return (
    <main className="app-main" aria-labelledby="page-title">
      <section className="stack">
        <h1 id="page-title">Profile</h1>
        <FormMessage message={message} />
        <ProfileForm
          action={updateProfileAction}
          profile={profile}
          submitLabel="Save profile"
        />
      </section>
    </main>
  );
}
