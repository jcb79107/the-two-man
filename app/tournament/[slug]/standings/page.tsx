import { notFound } from "next/navigation";
import { AllTeamsTable, type AllTeamsRow } from "@/components/all-teams-table";
import { PodWinnerIcon } from "@/components/pod-winner-icon";
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
      <main className="mx-auto flex min-h-screen w-full max-w-[620px] flex-col gap-4 px-4 py-5 pb-24 sm:px-6">
        <SectionCard title="Standings">
          <p className="max-w-[620px] text-sm leading-6 text-ink/76">
            Pods are sorted by record, hole points, holes won, then total net better-ball.
          </p>

          <div className="mt-5 grid grid-cols-3 gap-1.5 rounded-[24px] bg-sand/78 p-1.5">
            <a
              href={`/tournament/${slug}/standings`}
              className={`flex min-h-14 items-center justify-center rounded-[19px] px-3 text-center text-[15px] font-semibold leading-tight transition sm:text-base ${
                currentTab === "pods" ? "bg-pine text-white shadow-[0_8px_18px_rgba(17,32,23,0.18)]" : "text-fairway/82"
              }`}
            >
              <span className="sm:hidden">Pods</span>
              <span className="hidden sm:inline">Pod standings</span>
            </a>
            <a
              href={`/tournament/${slug}/standings?tab=playoff`}
              className={`flex min-h-14 items-center justify-center rounded-[19px] px-3 text-center text-[15px] font-semibold leading-tight transition sm:text-base ${
                currentTab === "playoff" ? "bg-pine text-white shadow-[0_8px_18px_rgba(17,32,23,0.18)]" : "text-fairway/82"
              }`}
            >
              <span className="sm:hidden">Playoff</span>
              <span className="hidden sm:inline">Playoff picture</span>
            </a>
            <a
              href={`/tournament/${slug}/standings?tab=teams`}
              className={`flex min-h-14 items-center justify-center rounded-[19px] px-3 text-center text-[15px] font-semibold leading-tight transition sm:text-base ${
                currentTab === "teams" ? "bg-pine text-white shadow-[0_8px_18px_rgba(17,32,23,0.18)]" : "text-fairway/82"
              }`}
            >
              <span className="sm:hidden">Teams</span>
              <span className="hidden sm:inline">All teams</span>
            </a>
          </div>
        </SectionCard>

        {currentTab === "pods" ? (
          <>
            {hasPostedPodPlayResults ? (
              <section className="grid gap-4">
                {state.podStandings.map(({ pod, rows }) => (
                  <SectionCard key={pod.id} title={pod.name}>
                    <StandingsTable
                      rows={rows}
                      markerTeamIds={rows
                        .filter((row) => wildCardTeamIds.has(row.teamId))
                        .map((row) => row.teamId)}
                      markerLabel={playoffFieldIsSet ? "Clinched wildcard" : "Current wild card"}
                      winnerTeamIds={rows[0] ? [rows[0].teamId] : []}
                      winnerLabel={playoffFieldIsSet ? "Pod winner" : "Current pod leader"}
                    />
                  </SectionCard>
                ))}
              </section>
            ) : (
              <SectionCard
                title="Opening day standings"
                action={
                  <span className="rounded-full bg-[#fff4d8] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a6b08]">
                    {completedPodPlayCount} cards posted
                  </span>
                }
              >
                <div className="rounded-[24px] border border-mist bg-white px-4 py-4">
                  <p className="text-lg font-semibold leading-tight text-ink">
                    The board unlocks after the first final scorecard.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink/70">
                    Once a pod-play result is posted, each pod will sort by record, hole points,
                    holes won, then total net better-ball.
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-sand px-3 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fairway/64">
                        Field
                      </p>
                      <p className="mt-1 text-sm font-semibold text-ink">
                        {state.podStandings.length} pods / {state.standings.length} teams
                      </p>
                    </div>
                    <div className="rounded-2xl bg-sand px-3 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fairway/64">
                        Playoff cut
                      </p>
                      <p className="mt-1 text-sm font-semibold text-ink">6 winners + 2 wild cards</p>
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
                              {entry.typeTone === "winner" ? <PodWinnerIcon className="h-3 w-3" /> : null}
                              {entry.typeTone === "wildcard" ? <WildcardHatIcon className="h-3 w-3" /> : null}
                              {entry.typeLabel}
                            </span>
                          </div>
                          <div className="mt-4 grid grid-cols-4 overflow-hidden rounded-2xl border border-mist bg-sand/45 md:contents md:overflow-visible md:rounded-none md:border-0 md:bg-transparent">
                            <div className="border-r border-mist px-2.5 py-2.5 last:border-r-0 md:rounded-none md:border-r-0 md:bg-transparent md:px-3 md:py-4">
                              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-fairway/62 md:hidden">Rec</p>
                              <p className="mt-1 text-sm font-semibold text-ink md:mt-0">
                                {entry.wins}-{entry.losses}-{entry.ties}
                              </p>
                            </div>
                            <div className="border-r border-mist px-2.5 py-2.5 last:border-r-0 md:rounded-none md:border-r-0 md:bg-transparent md:px-3 md:py-4">
                              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-fairway/62 md:hidden">Pts</p>
                              <p className="mt-1 text-sm font-semibold text-ink md:mt-0">{entry.holePoints}</p>
                            </div>
                            <div className="border-r border-mist px-2.5 py-2.5 last:border-r-0 md:rounded-none md:border-r-0 md:bg-transparent md:px-3 md:py-4">
                              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-fairway/62 md:hidden">Won</p>
                              <p className="mt-1 text-sm font-semibold text-ink md:mt-0">{entry.holesWon}</p>
                            </div>
                            <div className="px-2.5 py-2.5 md:rounded-none md:bg-transparent md:px-3 md:py-4">
                              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-fairway/62 md:hidden">Net</p>
                              <p className="mt-1 text-sm font-semibold text-ink md:mt-0">{entry.totalNetBetterBall ?? "-"}</p>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-[24px] border border-mist bg-white px-4 py-4">
                  <p className="text-lg font-semibold leading-tight text-ink">
                    The playoff picture starts after pod play posts.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink/70">
                    This view will stay quiet until there are official results to rank. Then it will
                    show pod winners, wild cards, and the current eight-team field.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#e3f1ea] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#174f38]">
                      Pod winners
                    </span>
                    <span className="rounded-full bg-[#efe7ff] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5f47a6]">
                      Wild cards
                    </span>
                    <span className="rounded-full bg-sand px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-fairway/70">
                      Eight-team field
                    </span>
                  </div>
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
