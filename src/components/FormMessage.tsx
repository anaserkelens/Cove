import type { FormMessage as FormMessageValue } from "@/lib/forms/messages";

type FormMessageProps = {
  message: FormMessageValue | null;
};

export function FormMessage({ message }: FormMessageProps) {
  if (!message) {
    return null;
  }

  return (
    <p
      className={`form-message form-message-${message.kind}`}
      role={message.kind === "error" ? "alert" : "status"}
    >
      {message.text}
    </p>
  );
}
