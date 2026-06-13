"use client";

import { useActionState, useId, useState } from "react";

type CreateInvitationActionState = {
  error?: string;
  invitationLink?: string;
  ok: boolean;
};

type InviteMemberFormProps = {
  action: (
    state: CreateInvitationActionState,
    formData: FormData,
  ) => Promise<CreateInvitationActionState>;
};

const initialState: CreateInvitationActionState = {
  ok: false,
};

export function InviteMemberForm({ action }: InviteMemberFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [copied, setCopied] = useState(false);
  const linkInputId = useId();

  async function copyInvitationLink() {
    if (!state.invitationLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(state.invitationLink);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="stack">
      <form className="form-grid" action={formAction}>
        <label htmlFor="invite-email">Invite email</label>
        <input
          id="invite-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
        />
        <button type="submit" disabled={isPending}>
          {isPending ? "Creating invitation..." : "Create invitation"}
        </button>
      </form>

      {state.error ? (
        <p className="form-message form-message-error" role="alert">
          {state.error}
        </p>
      ) : null}

      {state.invitationLink ? (
        <div className="form-grid">
          <label htmlFor={linkInputId}>Invitation link</label>
          <input
            id={linkInputId}
            type="text"
            value={state.invitationLink}
            readOnly
          />
          <button type="button" onClick={copyInvitationLink}>
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
