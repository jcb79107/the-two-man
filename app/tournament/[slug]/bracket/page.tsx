import { notFound } from "next/navigation";
import { BracketView } from "@/components/bracket-view";
import { PublicNav } from "@/components/public-nav";
import { SectionCard } from "@/components/section-card";
import { ROUTES } from "@/lib/api/routes";
import { getPublicBracketState } from "@/lib/server/public-tournament";

export const dynamic = "force-dynamic";

const quarterfinalSeedPairs = [
  [1, 8],
  [4, 5],
  [3, 6],
  [2, 7]
] as const;

export default async function TournamentBracketPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ round?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([
    params,
    searchParams ?? Promise.resolve<{ round?: string }>({})
  ]);
  const state = await getPublicBracketState(slug);

  if (!state) {
    notFound();
  }

  const projectedSeeds = new Map(state.playoffField.map((seed) => [seed.seedNumber, seed]));
  const hasProjectedSeeds = projectedSeeds.size > 0;

  return (
    <>
      <PublicNav slug={slug} seasonIsLive={new Date(state.tournamentStartDate) <= new Date()} />
      <main className="mx-auto flex min-h-screen w-full max-w-[620px] flex-col gap-4 px-4 py-5 pb-24 sm:px-6">
        <SectionCard title={state.bracket?.label ?? "Championship"}>
          {state.rounds.length > 0 ? (
            <BracketView
              initialRound={query.round}
              rounds={state.rounds.map((round) => ({
                ...round,
                matches: round.matches.map((match) => ({
                  ...match,
                  href: ROUTES.publicMatch(slug, match.id)
                }))
              }))}
            />
          ) : (
            <div className="rounded-[24px] border border-mist bg-white px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-lg font-semibold leading-tight text-ink">
                  Quarterfinal path
                </p>
                <span className="rounded-full bg-[#fff4d8] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a6b08]">
                  Waiting on pod play
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-ink/70">
                The bracket opens once the six pod winners and two wild cards are official. This is
                the seed order the field will drop into.
              </p>

              <div className="mt-4 grid gap-3">
                {quarterfinalSeedPairs.map(([topSeed, bottomSeed], index) => {
                  const top = projectedSeeds.get(topSeed);
                  const bottom = projectedSeeds.get(bottomSeed);

                  return (
                    <div
                      key={`${topSeed}-${bottomSeed}`}
                      className="overflow-hidden rounded-[20px] border border-mist bg-white"
                    >
                      <div className="border-b border-mist bg-sand/55 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fairway/62">
                          Quarterfinal {index + 1}
                        </p>
                      </div>
                      {[
                        { seedNumber: topSeed, seed: top, label: topSeed <= 6 ? "Pod winner" : "Wild card" },
                        { seedNumber: bottomSeed, seed: bottom, label: bottomSeed <= 6 ? "Pod winner" : "Wild card" }
                      ].map((slot) => (
                        <div
                          key={slot.seedNumber}
                          className="grid grid-cols-[3.25rem_1fr] items-center gap-3 border-b border-mist/80 px-3 py-3 last:border-b-0"
                        >
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-pine text-sm font-semibold text-white">
                            {slot.seedNumber}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink">
                              {slot.seed?.teamName ?? `Seed ${slot.seedNumber}`}
                            </p>
                            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/45">
                              {slot.seed?.podName ?? slot.label}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-2xl border border-dashed border-[#c8b77f] bg-sand/35 px-3 py-3">
                <p className="text-xs leading-5 text-ink/62">
                  {hasProjectedSeeds
                    ? "Projected teams are shown from the current table and will lock when pod play is complete."
                    : "Seeds will populate here as official pod-play results begin posting."}
                </p>
              </div>
            </div>
          )}
        </SectionCard>
      </main>
    </>
  );
}
