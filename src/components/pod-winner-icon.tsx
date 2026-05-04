interface PodWinnerIconProps {
  className?: string;
}

export function PodWinnerIcon({ className = "h-4 w-4" }: PodWinnerIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M7 2h10v3h3a1 1 0 0 1 1 1c0 3.26-1.62 5.92-4.48 6.84A6.02 6.02 0 0 1 13 16.92V19h4a1 1 0 1 1 0 2H7a1 1 0 1 1 0-2h4v-2.08a6.02 6.02 0 0 1-3.52-4.08C4.62 11.92 3 9.26 3 6a1 1 0 0 1 1-1h3V2Zm10 5v3.58c1.41-.73 2.28-2.02 2.46-3.58H17ZM7 10.58V7H4.54c.18 1.56 1.05 2.85 2.46 3.58Z" />
    </svg>
  );
}
