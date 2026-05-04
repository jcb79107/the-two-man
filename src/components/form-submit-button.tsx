"use client";

import { useFormStatus } from "react-dom";

interface FormSubmitButtonProps {
  label: string;
  pendingLabel?: string;
}

export function FormSubmitButton({
  label,
  pendingLabel = "Saving..."
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-pine px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
