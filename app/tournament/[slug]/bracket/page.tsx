import { notFound } from "next/navigation";
import { BracketView } from "@/components/bracket-view";
import { PublicNav } from "@/components/public-nav";
import { SectionCard } from "@/components/section-card";
import { ROUTES } from "@/lib/api/routes";
import { formatDateLabel } from "@/lib/server/formatting";
import { getPublicBracketState } from "@/lib/server/public-tournament";

export const dynamic = "force-dynamic";

export default async function TournamentBracketPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const state = await getPublicBracketState(slug);

  if (!state) {
    notFound();
  }

  const liveStatuses = new Set(["READY", "IN_PROGRESS", "SUBMITTED", "REOPENED"]);
  const allMatches = state.rounds.flatMap((round) => round.matches);
  const liveMatchCount = allMatches.filter((match) => liveStatuses.has(match.status)).length;
  const finalMatchCount = allMatches.filter((match) => match.status === "FINAL").length;

  return (
    <>
      <PublicNav slug={slug} seasonIsLive={new Date(state.tournamentStartDate) <= new Date()} />
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-4 py-5 pb-24 sm:px-6 lg:px-8">
        <SectionCard title={state.tournamentName} eyebrow="Knockout board">
          <div>
            <p className="max-w-3xl text-sm leading-6 text-ink/76">
              Swipe through the rounds and tap any matchup to open the posted card.
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-fairway/68">
              Official through {state.officialThrough ? formatDateLabel(state.officialThrough) : "Qualification pending"}
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-[22px] border border-mist bg-white px-3 py-3 sm:px-4 sm:py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-fairway/72">
                  Locked seeds
                </p>
                <p className="mt-1 text-xl font-semibold text-ink sm:text-2xl">{state.seeds.length}/8</p>
              </div>
              <div className="rounded-[22px] border border-mist bg-white px-3 py-3 sm:px-4 sm:py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-fairway/72">
                  Live matches
                </p>
                <p className="mt-1 text-xl font-semibold text-ink sm:text-2xl">{liveMatchCount}</p>
              </div>
              <div className="rounded-[22px] border border-mist bg-white px-3 py-3 sm:px-4 sm:py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-fairway/72">
                  Final matches
                </p>
                <p className="mt-1 text-xl font-semibold text-ink sm:text-2xl">{finalMatchCount}</p>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title={state.bracket?.label ?? "Championship"}>
          {state.rounds.length > 0 ? (
            <BracketView
              rounds={state.rounds.map((round) => ({
                ...round,
                matches: round.matches.map((match) => ({
                  ...match,
                  href: ROUTES.publicMatch(slug, match.id)
                }))
              }))}
            />
          ) : (
            <div className="rounded-[24px] border border-dashed border-[#d8c07d]/55 bg-[linear-gradient(135deg,#fff7e5_0%,#f6edd7_100%)] px-4 py-6">
              <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a6b08]">
                Bracket coming into focus
              </span>
              <p className="mt-3 text-sm leading-6 text-ink/72">
                Quarterfinal matchups appear here as soon as the playoff field locks.
              </p>
            </div>
          )}
        </SectionCard>
      </main>
    </>
  );
}
