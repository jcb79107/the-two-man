"use client";

interface EmailInviteButtonProps {
  href: string;
  onSend?: () => void;
  label?: string;
  className?: string;
}

export function EmailInviteButton({ href, onSend, label = "Email invite", className }: EmailInviteButtonProps) {
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
      className={
        className ??
        "rounded-full border border-fairway/15 bg-white px-3 py-2 text-xs font-medium text-ink"
      }
    >
      {label}
    </button>
  );
}
