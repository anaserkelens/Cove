import type { Profile } from "@/lib/validation/profile";
import { getTimeZoneOptions, weekStartOptions } from "@/lib/validation/profile";

type ProfileFormProps = {
  action: (formData: FormData) => Promise<void>;
  profile: Profile;
  submitLabel: string;
};

export function ProfileForm({
  action,
  profile,
  submitLabel,
}: ProfileFormProps) {
  const timeZoneOptions = getTimeZoneOptions(profile.timezone);

  return (
    <form className="form-grid" action={action}>
      <label htmlFor="displayName">Display name</label>
      <input
        id="displayName"
        name="displayName"
        type="text"
        autoComplete="name"
        defaultValue={profile.display_name ?? ""}
        required
        maxLength={80}
      />

      <label htmlFor="timezone">Time zone</label>
      <select
        id="timezone"
        name="timezone"
        defaultValue={profile.timezone}
        required
      >
        {timeZoneOptions.map((timeZone) => (
          <option key={timeZone} value={timeZone}>
            {timeZone}
          </option>
        ))}
      </select>

      <label htmlFor="locale">Locale</label>
      <input
        id="locale"
        name="locale"
        type="text"
        autoComplete="language"
        defaultValue={profile.locale}
        required
      />

      <label htmlFor="weekStartsOn">Week starts on</label>
      <select
        id="weekStartsOn"
        name="weekStartsOn"
        defaultValue={profile.week_starts_on}
        required
      >
        {weekStartOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <button type="submit">{submitLabel}</button>
    </form>
  );
}
