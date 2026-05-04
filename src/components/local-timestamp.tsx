"use client";

interface LocalTimestampProps {
  value: string | null;
  fallback?: string;
}

function formatLocalTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(date);
}

export function LocalTimestamp({ value, fallback = "Time pending" }: LocalTimestampProps) {
  const label = formatLocalTimestamp(value) ?? fallback;

  return <span suppressHydrationWarning>{label}</span>;
}
