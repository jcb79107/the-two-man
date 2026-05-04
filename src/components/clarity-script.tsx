"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const CLARITY_ID = "wikeavgki1";
const CLARITY_HOSTNAME = "www.thetwoman.site";
const SCRIPT_ID = "microsoft-clarity";

declare global {
  interface Window {
    clarity?: {
      (...args: unknown[]): void;
      q?: unknown[];
    };
  }
}

export function ClarityScript() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.location.hostname !== CLARITY_HOSTNAME || pathname?.startsWith("/admin")) {
      return;
    }

    if (document.getElementById(SCRIPT_ID)) {
      return;
    }

    window.clarity =
      window.clarity ||
      function clarityQueue(...args: unknown[]) {
        window.clarity!.q = window.clarity!.q || [];
        window.clarity!.q.push(args);
      };

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://www.clarity.ms/tag/${CLARITY_ID}`;
    document.head.appendChild(script);
  }, [pathname]);

  return null;
}
