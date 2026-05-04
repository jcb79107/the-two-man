import { notFound } from "next/navigation";
import { BracketView } from "@/components/bracket-view";
import { PublicNav } from "@/components/public-nav";
import { SectionCard } from "@/components/section-card";
import { ROUTES } from "@/lib/api/routes";
import { getPublicBracketState } from "@/lib/server/public-tournament";

export const dynamic = "force-dynamic";

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
                  Bracket opens when the playoff field is set.
                </p>
                <span className="rounded-full bg-[#fff4d8] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a6b08]">
                  Waiting on pod play
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-ink/70">
                Once the six pod winners and two wild cards are official, this page becomes the
                round-by-round championship board.
              </p>

              <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-2xl border border-mist bg-sand/45 text-center">
                <div className="border-r border-mist px-2 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fairway/62">
                    1
                  </p>
                  <p className="mt-1 text-xs font-semibold text-ink">Pods</p>
                </div>
                <div className="border-r border-mist px-2 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fairway/62">
                    2
                  </p>
                  <p className="mt-1 text-xs font-semibold text-ink">Field</p>
                </div>
                <div className="px-2 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fairway/62">
                    3
                  </p>
                  <p className="mt-1 text-xs font-semibold text-ink">Bracket</p>
                </div>
              </div>
            </div>
          )}
        </SectionCard>
      </main>
    </>
  );
}
