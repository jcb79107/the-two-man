"use client";

interface EmailInviteButtonProps {
  href: string;
  onSend?: () => void;
  label?: string;
}

export function EmailInviteButton({ href, onSend, label = "Email invite" }: EmailInviteButtonProps) {
  function handleClick() {
    onSend?.();
    const openedWindow = window.open(href, "_blank", "noopener,noreferrer");

    if (!openedWindow) {
      window.location.href = href;
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-full border border-fairway/15 bg-white px-3 py-2 text-xs font-medium text-ink"
    >
      {label}
    </button>
  );
}
