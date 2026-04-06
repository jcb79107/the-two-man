import { notFound } from "next/navigation";
import { AllTeamsTable, type AllTeamsRow } from "@/components/all-teams-table";
import { PublicNav } from "@/components/public-nav";
import { SectionCard } from "@/components/section-card";
import { StandingsTable } from "@/components/standings-table";
import { WildcardHatIcon } from "@/components/wildcard-hat-icon";
import { getPublicTournamentState } from "@/lib/server/public-tournament";

export const dynamic = "force-dynamic";

export default async function TournamentStandingsPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const state = await getPublicTournamentState(slug);

  if (!state) {
    notFound();
  }

  const currentTab =
    resolvedSearchParams?.tab === "playoff"
      ? "playoff"
      : resolvedSearchParams?.tab === "teams"
        ? "teams"
        : "pods";
  const totalPodPlayCount = state.tournament.matches.filter((match) => match.stage === "POD_PLAY").length;
  const completedPodPlayCount = state.tournament.matches.filter(
    (match) =>
      match.stage === "POD_PLAY" && (match.status === "FINAL" || match.status === "FORFEIT")
  ).length;
  const hasPostedPodPlayResults = completedPodPlayCount > 0;
  const playoffFieldIsSet =
    totalPodPlayCount > 0 &&
    completedPodPlayCount === totalPodPlayCount &&
    state.computedSeeds.length === Math.min(8, state.tournament.teams.length);
  const playoffFieldStatus = playoffFieldIsSet ? "Set" : "Projected";

  const wildCardTeamIds = new Set<string>(
    state.wildCards.map((entry: { teamId: string }) => entry.teamId)
  );
  const seededTeamIds = new Set(state.computedSeeds.map((entry) => entry.teamId));
  const podWinnerTeamIds = new Set(
    state.computedSeeds
      .filter((entry) => entry.qualifierType === "POD_WINNER")
      .map((entry) => entry.teamId)
  );
  const wildcardRows = state.standings.filter((row) => wildCardTeamIds.has(row.teamId));
  const podNameById = Object.fromEntries(state.tournament.pods.map((pod) => [pod.id, pod.name]));
  const podRankByTeamId = Object.fromEntries(
    state.podStandings.flatMap(({ rows }) => rows.map((row, index) => [row.teamId, index + 1]))
  );
  const podLeaders = state.podStandings.map(({ pod, rows }) => {
    const leader = rows[0];
    return {
      podId: pod.id,
      podName: pod.name,
      teamId: leader?.teamId ?? null,
      teamName: leader?.teamName ?? "TBD",
      wins: leader?.wins ?? 0,
      losses: leader?.losses ?? 0,
      ties: leader?.ties ?? 0,
      holePoints: leader?.holePoints ?? 0,
      holesWon: leader?.holesWon ?? 0,
      totalNetBetterBall: leader?.cumulativeNetBetterBall ?? null
    };
  });
  const playoffField = state.computedSeeds.map((entry) => {
    const standing = state.standings.find((row) => row.teamId === entry.teamId);
    const pod = state.tournament.pods.find((candidate) => candidate.id === entry.podId);

    return {
      id: entry.teamId,
      slotLabel: `#${entry.seedNumber}`,
      teamName: entry.teamName,
      detailLabel: pod?.name ?? "Wildcard",
      typeLabel: entry.qualifierType === "POD_WINNER" ? "Pod winner" : "Wild card",
      typeTone: entry.qualifierType === "POD_WINNER" ? "winner" : "wildcard",
      wins: standing?.wins ?? 0,
      losses: standing?.losses ?? 0,
      ties: standing?.ties ?? 0,
      holePoints: standing?.holePoints ?? 0,
      holesWon: standing?.holesWon ?? 0,
      totalNetBetterBall: standing?.cumulativeNetBetterBall ?? null
    };
  });
  const playoffPictureRows =
    playoffField.length > 0
      ? playoffField
      : [
          ...podLeaders.map((entry) => ({
            id: entry.podId,
            slotLabel: entry.podName,
            teamName: entry.teamName,
            detailLabel: "Current pod leader",
            typeLabel: "Leader",
            typeTone: "winner" as const,
            wins: entry.wins,
            losses: entry.losses,
            ties: entry.ties,
            holePoints: entry.holePoints,
            holesWon: entry.holesWon,
            totalNetBetterBall: entry.totalNetBetterBall
          })),
          ...state.wildCards.map((entry, index) => {
            const standing = state.standings.find((row) => row.teamId === entry.teamId);
            const pod = state.tournament.pods.find((candidate) => candidate.id === standing?.podId);
            return {
              id: entry.teamId,
              slotLabel: `WC${index + 1}`,
              teamName: entry.teamName,
              detailLabel: pod?.name ?? "Wildcard",
              typeLabel: "Wild card line",
              typeTone: "wildcard" as const,
              wins: standing?.wins ?? 0,
              losses: standing?.losses ?? 0,
              ties: standing?.ties ?? 0,
              holePoints: standing?.holePoints ?? 0,
              holesWon: standing?.holesWon ?? 0,
              totalNetBetterBall: standing?.cumulativeNetBetterBall ?? null
            };
          })
        ];
  const allTeamsRows: AllTeamsRow[] = state.standings.map((row) => ({
    teamId: row.teamId,
    teamName: row.teamName,
    podName: podNameById[row.podId] ?? row.podId,
    podRank: podRankByTeamId[row.teamId] ?? 99,
    matchesPlayed: row.matchesPlayed,
    wins: row.wins,
    losses: row.losses,
    ties: row.ties,
    matchRecordPoints: row.matchRecordPoints,
    holePoints: row.holePoints,
    holesWon: row.holesWon,
    totalNetBetterBall: row.cumulativeNetBetterBall,
    markerCode: playoffFieldIsSet
      ? podWinnerTeamIds.has(row.teamId)
        ? "Y"
        : seededTeamIds.has(row.teamId)
          ? "X"
          : "E"
      : seededTeamIds.has(row.teamId)
        ? "PB"
        : null,
    markerLabel: playoffFieldIsSet
      ? podWinnerTeamIds.has(row.teamId)
        ? "Clinched pod"
        : seededTeamIds.has(row.teamId)
          ? "Clinched wildcard"
          : "Eliminated from playoff"
      : seededTeamIds.has(row.teamId)
        ? "Projected playoff field"
        : null
  }));

  return (
    <>
      <PublicNav slug={slug} seasonIsLive={new Date(state.tournament.startDate) <= new Date()} />
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-4 py-5 pb-24 sm:px-6 lg:px-8">
        <SectionCard title={`${state.tournament.name} standings`}>
          <p className="max-w-3xl text-sm leading-6 text-ink/76">
            Pods are sorted by record, hole points, holes won, then total net better-ball.
          </p>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            <a
              href={`/tournament/${slug}/standings`}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                currentTab === "pods" ? "bg-pine text-white" : "bg-sand text-fairway/80"
              }`}
            >
              Pod standings
            </a>
            <a
              href={`/tournament/${slug}/standings?tab=playoff`}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                currentTab === "playoff" ? "bg-pine text-white" : "bg-sand text-fairway/80"
              }`}
            >
              Playoff picture
            </a>
            <a
              href={`/tournament/${slug}/standings?tab=teams`}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                currentTab === "teams" ? "bg-pine text-white" : "bg-sand text-fairway/80"
              }`}
            >
              All teams
            </a>
          </div>
        </SectionCard>

        {currentTab === "pods" ? (
          <>
            {hasPostedPodPlayResults ? (
              <section className="grid gap-4 xl:grid-cols-2">
                {state.podStandings.map(({ pod, rows }) => (
                  <SectionCard key={pod.id} title={pod.name}>
                    <StandingsTable
                      rows={rows}
                      winnerTeamIds={rows[0] ? [rows[0].teamId] : []}
                      winnerLabel={playoffFieldIsSet ? "Pod winner" : "Current pod leader"}
                    />
                  </SectionCard>
                ))}
              </section>
            ) : (
              <SectionCard title="Standings open after the first official card">
                <div className="rounded-[26px] border border-dashed border-[#d8c07d]/55 bg-[linear-gradient(135deg,#fff7e5_0%,#f6edd7_100%)] px-5 py-5 sm:px-6 sm:py-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a6b08]">
                      Opening day
                    </span>
                    <span className="text-sm text-ink/66">{completedPodPlayCount} official cards posted</span>
                  </div>

                  <p className="mt-4 text-lg font-semibold text-ink">
                    Pod tables will appear once the first pod-play match is completed and posted.
                  </p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/72">
                    Until then, every team is still level. As soon as the first official result lands, this page will
                    start sorting each pod by record, hole points, holes won, and total net better-ball.
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[22px] border border-white/70 bg-white/75 px-4 py-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fairway/72">
                        Field
                      </p>
                      <p className="mt-2 text-base font-semibold text-ink">
                        {state.podStandings.length} pods, {state.standings.length} teams
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-white/70 bg-white/75 px-4 py-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fairway/72">
                        Wild cards
                      </p>
                      <p className="mt-2 text-base font-semibold text-ink">
                        The top 2 non-pod winners join the playoff field.
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-white/70 bg-white/75 px-4 py-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fairway/72">
                        Next step
                      </p>
                      <p className="mt-2 text-base font-semibold text-ink">
                        Post the first official card to start the board.
                      </p>
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}
          </>
        ) : currentTab === "playoff" ? (
          <>
            <SectionCard
              title="Playoff Field"
              action={
                <span
                  className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                    playoffFieldIsSet ? "bg-[#e3f1ea] text-[#174f38]" : "bg-[#efe7ff] text-[#5f47a6]"
                  }`}
                >
                  {playoffFieldStatus}
                </span>
              }
            >
              {hasPostedPodPlayResults ? (
                <>
                  <div className="overflow-hidden rounded-2xl border border-mist bg-white">
                    <div className="hidden grid-cols-[84px_minmax(0,1.2fr)_110px_94px_94px_94px_104px] bg-sand text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-fairway/80 md:grid">
                      <div className="px-4 py-3">Slot</div>
                      <div className="px-4 py-3">Team</div>
                      <div className="px-3 py-3">Type</div>
                      <div className="px-3 py-3">Record</div>
                      <div className="px-3 py-3">Hole Pts</div>
                      <div className="px-3 py-3">Holes Won</div>
                      <div className="px-3 py-3">Total Net BB</div>
                    </div>

                    <div className="divide-y divide-mist/80">
                      {playoffPictureRows.map((entry) => (
                        <article key={entry.id} className="px-4 py-4 md:grid md:grid-cols-[84px_minmax(0,1.2fr)_110px_94px_94px_94px_104px] md:items-center md:gap-0 md:px-0 md:py-0">
                          <div className="md:px-4 md:py-4">
                            <span className="inline-flex rounded-full bg-pine px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                              {entry.slotLabel}
                            </span>
                          </div>
                          <div className="mt-3 md:mt-0 md:px-4 md:py-4">
                            <p className="text-base font-semibold text-ink">{entry.teamName}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-fairway/68">{entry.detailLabel}</p>
                          </div>
                          <div className="mt-3 md:mt-0 md:px-3 md:py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                                entry.typeTone === "winner"
                                  ? "bg-[#e3f1ea] text-[#174f38]"
                                  : "bg-[#efe7ff] text-[#5f47a6]"
                              }`}
                            >
                              {entry.typeTone === "wildcard" ? <WildcardHatIcon className="h-3 w-3" /> : null}
                              {entry.typeLabel}
                            </span>
                          </div>
                          <div className="mt-4 grid grid-cols-4 gap-2 md:contents">
                            <div className="rounded-2xl bg-sand px-3 py-3 md:rounded-none md:bg-transparent md:px-3 md:py-4">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fairway/68 md:hidden">Record</p>
                              <p className="mt-1 text-sm font-semibold text-ink md:mt-0">
                                {entry.wins}-{entry.losses}-{entry.ties}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-sand px-3 py-3 md:rounded-none md:bg-transparent md:px-3 md:py-4">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fairway/68 md:hidden">Hole Pts</p>
                              <p className="mt-1 text-sm font-semibold text-ink md:mt-0">{entry.holePoints}</p>
                            </div>
                            <div className="rounded-2xl bg-sand px-3 py-3 md:rounded-none md:bg-transparent md:px-3 md:py-4">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fairway/68 md:hidden">Holes Won</p>
                              <p className="mt-1 text-sm font-semibold text-ink md:mt-0">{entry.holesWon}</p>
                            </div>
                            <div className="rounded-2xl bg-sand px-3 py-3 md:rounded-none md:bg-transparent md:px-3 md:py-4">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fairway/68 md:hidden">Total Net BB</p>
                              <p className="mt-1 text-sm font-semibold text-ink md:mt-0">{entry.totalNetBetterBall ?? "-"}</p>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-[26px] border border-dashed border-[#d8c07d]/55 bg-[linear-gradient(135deg,#fff7e5_0%,#f6edd7_100%)] px-5 py-5 sm:px-6 sm:py-6">
                  <p className="text-lg font-semibold text-ink">The playoff field will build itself once pod results start posting.</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/72">
                    Once the first official pod result lands, this board starts projecting the eight-team field.
                  </p>
                </div>
              )}
            </SectionCard>

          </>
        ) : (
          <SectionCard title="All teams">
            <AllTeamsTable rows={allTeamsRows} />
          </SectionCard>
        )}
      </main>
    </>
  );
}
