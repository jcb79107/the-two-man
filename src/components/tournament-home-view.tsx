import { ActivityFeed } from "@/components/activity-feed";
import { PublicNav } from "@/components/public-nav";
import { SectionCard } from "@/components/section-card";
import { TwoManLogo } from "@/components/two-man-logo";
import { ROUTES } from "@/lib/api/routes";
import {
  RULES_JUDGE_LABEL,
  RULES_JUDGE_URL
} from "@/lib/content/rules-judge";
import type { ActivityFeedEvent } from "@/types/models";

interface TournamentHomeViewProps {
  slug: string;
  tournamentName: string;
  feed: ActivityFeedEvent[];
  seasonIsLive?: boolean;
}

export function TournamentHomeView({
  slug,
  tournamentName,
  feed,
  seasonIsLive = false
}: TournamentHomeViewProps) {
  return (
    <>
      <PublicNav slug={slug} seasonIsLive={seasonIsLive} />

      <main className="mx-auto flex min-h-screen w-full max-w-[760px] flex-col gap-6 px-4 py-6 pb-24 sm:px-6">
        <div className="grid gap-4">
          <h1 className="sr-only">{tournamentName}</h1>
          <section className="relative flex min-h-[192px] items-center justify-center overflow-hidden px-4 py-2 text-ink md:min-h-[224px]">
            <div className="relative flex items-center justify-center text-center">
              <TwoManLogo
                className="h-48 w-48 shrink-0 md:h-56 md:w-56"
                priority
              />
            </div>
          </section>

          <section className="rounded-2xl border border-mist bg-[#fffcf7] p-4 md:p-5">
            <div>
              <p className="text-xs font-medium text-[#526057]">
                Need a ruling?
              </p>
              <a
                href={RULES_JUDGE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open the rules judge in a new tab"
                className="focus-ring mt-2 flex min-h-12 w-full items-center justify-between gap-4 rounded-lg border border-mist bg-white px-4 py-3 text-left text-ink transition-colors hover:bg-[#f4f5f1]"
              >
                <span className="flex items-center gap-4">
                  <span className="block">
                    <span className="block text-sm font-semibold sm:text-base">Open rules judge</span>
                    <span className="mt-0.5 block text-xs text-[#526057] sm:text-sm">{RULES_JUDGE_LABEL}</span>
                  </span>
                </span>
                <span className="shrink-0 text-xs text-[#526057]">New tab <span aria-hidden="true">↗</span></span>
              </a>
            </div>
          </section>
        </div>

        <SectionCard title="Live feed">
          <ActivityFeed
            events={feed}
            linkForMatch={(matchId) => ROUTES.publicMatch(slug, matchId)}
            linkForBracket={(round) => `${ROUTES.tournamentBracket(slug)}?round=${round}`}
          />
        </SectionCard>
      </main>
    </>
  );
}
