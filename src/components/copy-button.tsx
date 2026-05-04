"use client";

import { useState } from "react";

interface CopyButtonProps {
  value: string;
  label?: string;
  onCopy?: () => void;
  className?: string;
}

export function CopyButton({ value, label = "Copy", onCopy, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      onCopy?.();
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={
        className ??
        "rounded-full border border-fairway/15 bg-white px-3 py-2 text-xs font-medium text-ink"
      }
    >
      {copied ? "Copied" : label}
    </button>
  );
}
