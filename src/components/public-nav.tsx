"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { ROUTES } from "@/lib/api/routes";
import { TwoManLogo } from "@/components/two-man-logo";

interface PublicNavProps {
  slug: string;
  seasonIsLive?: boolean;
}

export function PublicNav({ slug, seasonIsLive = false }: PublicNavProps) {
  const pathname = usePathname();
  const isHomePath = pathname === ROUTES.home || pathname === ROUTES.tournamentHome(slug);
  const links = [
    { label: "Home", href: ROUTES.home },
    { label: "Standings", href: ROUTES.tournamentStandings(slug) },
    { label: "Bracket", href: ROUTES.tournamentBracket(slug) }
  ];

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/65 bg-[#f6efe1]/84 px-4 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur sm:px-6 sm:py-3 lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <Link href={ROUTES.home} className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <TwoManLogo
              className="h-10 w-10 shrink-0 sm:h-12 sm:w-12"
              imageClassName="drop-shadow-[0_8px_16px_rgba(17,32,23,0.14)]"
            />
            <div className="min-w-0 space-y-1">
              <p className="truncate text-[15px] font-semibold text-ink sm:text-base">The Two Man</p>
              <div className="flex items-center gap-2 leading-none">
                <p className="truncate text-[10px] font-medium uppercase tracking-[0.22em] text-fairway/72 sm:text-xs sm:tracking-[0.24em]">
                  2026 season tracker
                </p>
                {seasonIsLive ? (
                  <span className="rounded-full bg-[#1c4f3a] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white sm:px-2.5 sm:py-1 sm:text-[10px] sm:tracking-[0.2em]">
                    Live
                  </span>
                ) : null}
              </div>
            </div>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              href={ROUTES.tournamentRules(slug)}
              className={clsx(
                "rounded-full px-4 py-2 text-sm font-medium transition",
                pathname === ROUTES.tournamentRules(slug)
                  ? "bg-pine text-white shadow-card"
                  : "bg-white/88 text-ink/75 hover:text-ink"
              )}
            >
              Rules
            </Link>
          </div>

          <nav className="hidden items-center gap-2 md:flex">
            {links.map((link) => {
              const active = link.label === "Home" ? isHomePath : pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    "rounded-full px-4 py-2 text-sm font-medium transition",
                    active
                      ? "bg-pine text-white shadow-card"
                      : "bg-white/88 text-ink/75 hover:text-ink"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <Link
            href={ROUTES.tournamentRules(slug)}
            className="rounded-full border border-fairway/15 bg-white/88 px-3 py-1.5 text-xs font-medium text-ink/82 md:hidden"
          >
            Rules
          </Link>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-fairway/10 bg-white/94 px-4 py-2.5 pb-[calc(env(safe-area-inset-bottom)+0.65rem)] backdrop-blur md:hidden">
        <div className="mx-auto grid w-full max-w-md grid-cols-3 gap-2">
          {links.map((link) => {
            const active = link.label === "Home" ? isHomePath : pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "rounded-2xl px-3 py-2 text-center text-[13px] font-medium transition",
                  active ? "bg-pine text-white" : "bg-sand text-ink/75"
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
