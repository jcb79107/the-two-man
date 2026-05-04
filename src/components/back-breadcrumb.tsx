"use client";

import type { MouseEvent } from "react";

interface BackBreadcrumbProps {
  fallbackHref: string;
  label?: string;
}

export function BackBreadcrumb({
  fallbackHref,
  label = "Back"
}: BackBreadcrumbProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!document.referrer || window.history.length <= 1) {
      return;
    }

    try {
      const referrer = new URL(document.referrer);

      if (referrer.origin === window.location.origin && referrer.href !== window.location.href) {
        event.preventDefault();
        window.history.back();
      }
    } catch {
      // Fall back to the href when the referrer cannot be parsed.
    }
  }

  return (
    <nav aria-label="Breadcrumb" className="px-1">
      <a
        href={fallbackHref}
        onClick={handleClick}
        className="inline-flex min-h-9 items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-fairway/72 transition hover:text-pine"
      >
        <span className="h-px w-6 bg-fairway/32" aria-hidden="true" />
        {label}
      </a>
    </nav>
  );
}
