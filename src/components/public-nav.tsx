"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { ROUTES } from "@/lib/api/routes";
import { TwoManLogo } from "@/components/two-man-logo";

const INSTAGRAM_URL = "https://www.instagram.com/twomantournament/";

function InstagramIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

interface PublicNavProps {
  slug: string;
  seasonIsLive?: boolean;
}

export function PublicNav({ slug }: PublicNavProps) {
  const pathname = usePathname();
  const isHomePath = pathname === ROUTES.home || pathname === ROUTES.tournamentHome(slug);
  const links = [
    { label: "Home", href: ROUTES.home },
    { label: "Standings", href: ROUTES.tournamentStandings(slug) },
    { label: "Bracket", href: ROUTES.tournamentBracket(slug) }
  ];
  const desktopLinks = [
    ...links,
    { label: "Rules", href: ROUTES.tournamentRules(slug) }
  ];

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-mist bg-[#fffcf7] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 sm:py-3 lg:px-8">
        <div className="mx-auto flex w-full max-w-[960px] items-center justify-between gap-4">
          <Link href={ROUTES.home} className="focus-ring flex min-w-0 items-center gap-3 rounded-lg">
            <TwoManLogo
              className="h-10 w-10 shrink-0 sm:h-12 sm:w-12"
              priority
            />
            <div className="min-w-0 space-y-1">
              <p className="truncate text-[15px] font-semibold text-ink sm:text-base">The Two Man</p>
              <div className="flex items-center gap-2 leading-none">
                <p className="truncate text-xs font-medium text-[#526057]">
                  2026 season
                </p>
              </div>
            </div>
          </Link>

          <nav aria-label="Tournament" className="hidden items-center gap-1 md:flex">
            {desktopLinks.map((link) => {
              const active = link.label === "Home" ? isHomePath : pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "focus-ring inline-flex min-h-11 items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-pine text-white"
                      : "text-[#526057] hover:bg-[#eef1ec] hover:text-ink"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Open The Two Man on Instagram"
              title="Instagram"
              className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#526057] transition-colors hover:bg-[#eef1ec] hover:text-pine"
            >
              <InstagramIcon />
            </a>
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Open The Two Man on Instagram"
              title="Instagram"
              className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#526057] transition-colors hover:bg-[#eef1ec] hover:text-pine"
            >
              <InstagramIcon />
            </a>
            <Link
              href={ROUTES.tournamentRules(slug)}
              className="focus-ring inline-flex min-h-11 items-center rounded-lg border border-mist bg-white px-3 py-2 text-sm font-medium text-ink"
            >
              Rules
            </Link>
          </div>
        </div>
      </header>

      <nav aria-label="Tournament" className="fixed inset-x-0 bottom-0 z-30 border-t border-mist bg-[#fffcf7] px-4 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] md:hidden">
        <div className="mx-auto grid w-full max-w-md grid-cols-3 gap-2">
          {links.map((link) => {
            const active = link.label === "Home" ? isHomePath : pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "focus-ring flex min-h-11 items-center justify-center rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors",
                  active ? "bg-pine text-white" : "text-[#526057] hover:bg-[#eef1ec]"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
