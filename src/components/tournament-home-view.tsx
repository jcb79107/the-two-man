import { ActivityFeed } from "@/components/activity-feed";
import { PublicNav } from "@/components/public-nav";
import { RulesJudgeIcon } from "@/components/rules-judge-icon";
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

      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 px-4 py-5 pb-24 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[26px] border border-[#d8c07d]/60 bg-[linear-gradient(135deg,#f7f1e3_0%,#efdfb0_100%)] px-4 py-4 text-ink shadow-[0_18px_40px_rgba(17,32,23,0.12)] md:rounded-[30px] md:px-5 md:py-5 md:shadow-[0_24px_60px_rgba(17,32,23,0.14)]">
          <div className="flex flex-col items-center justify-center gap-2 text-center md:gap-3">
            <TwoManLogo
              className="h-40 w-40 shrink-0 md:h-52 md:w-52"
              imageClassName="drop-shadow-[0_16px_30px_rgba(17,32,23,0.18)]"
              priority
            />
          </div>
        </section>

        <section className="rounded-[22px] border border-mist bg-white px-4 py-3 shadow-[0_10px_24px_rgba(17,32,23,0.08)]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fairway/70">
              Need a ruling?
            </p>
            <a
              href={RULES_JUDGE_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex w-full items-center justify-between rounded-[22px] bg-pine px-4 py-3 text-left text-white shadow-[0_14px_28px_rgba(17,32,23,0.18)] transition hover:bg-[#103126]"
            >
              <span className="flex items-center gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/18 bg-white/10 text-white">
                  <RulesJudgeIcon className="h-5 w-5" />
                </span>
                <span className="block">
                  <span className="block text-sm font-semibold sm:text-base">Launch rules judge</span>
                  <span className="mt-0.5 block text-xs text-white/70 sm:text-sm">{RULES_JUDGE_LABEL}</span>
                </span>
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/78 sm:text-sm">Open</span>
            </a>
          </div>
        </section>

        <SectionCard title="Live feed">
          <ActivityFeed events={feed} linkForMatch={(matchId) => ROUTES.publicMatch(slug, matchId)} />
        </SectionCard>
      </main>
    </>
  );
}
