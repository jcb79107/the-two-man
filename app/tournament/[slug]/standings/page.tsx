import Link from "next/link";
import { notFound } from "next/navigation";
import { clsx } from "clsx";
import { AllTeamsTable, type AllTeamsRow } from "@/components/all-teams-table";
import { PodWinnerIcon } from "@/components/pod-winner-icon";
import { PlayoffScenarioLab } from "@/components/playoff-scenario-lab";
import { PublicNav } from "@/components/public-nav";
import { SectionCard } from "@/components/section-card";
import { StandingsTable } from "@/components/standings-table";
import { WildcardHatIcon } from "@/components/wildcard-hat-icon";
import { analyzePlayoffClinches, type ScenarioInput } from "@/lib/playoff-scenarios";
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

  const activePlayoffSeeds = playoffFieldIsSet ? state.computedSeeds : state.projectedPlayoffField;
  const activeWildCards = playoffFieldIsSet ? state.wildCards : state.wildCardProjection;
  const wildCardTeamIds = new Set<string>(
    activeWildCards.map((entry: { teamId: string }) => entry.teamId)
  );
  const wildCardPositionByTeamId = new Map(
    activeWildCards.map((entry: { teamId: string }, index) => [entry.teamId, index + 1])
  );
  const seededTeamIds = new Set(activePlayoffSeeds.map((entry) => entry.teamId));
  const podNameById = Object.fromEntries(state.tournament.pods.map((pod) => [pod.id, pod.name]));
  const scenarioInput: ScenarioInput = {
    pods: state.tournament.pods.map((pod) => ({
      id: pod.id,
      name: pod.name
    })),
    teams: state.tournament.teams
      .map((team) => {
        const podId = team.podMemberships[0]?.podId ?? "";
        return {
          id: team.id,
          name: team.name,
          podId,
          podName: podNameById[podId] ?? "Pod"
        };
      })
      .filter((team) => team.podId),
    standings: state.standings,
    matches: state.tournament.matches.map((match) => ({
      id: match.id,
      podId: match.podId,
      stage: match.stage,
      status: match.status,
      roundLabel: match.roundLabel,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId
    }))
  };
  const playoffClinches = analyzePlayoffClinches(scenarioInput);
  const clinchedTeamById = new Map(
    playoffClinches.clinchedTeams.map((team) => [team.teamId, team])
  );
  const clinchedTeamIds = new Set(playoffClinches.clinchedTeams.map((team) => team.teamId));
  const clinchedPodWinnerTeamIds = new Set(
    playoffClinches.clinchedTeams
      .filter((team) => team.clinchType === "POD_WINNER")
      .map((team) => team.teamId)
  );
  const clinchedWildCardTeamIds = new Set(
    playoffClinches.clinchedTeams
      .filter((team) => team.clinchType === "WILD_CARD")
      .map((team) => team.teamId)
  );
  const playoffFieldStatus = playoffFieldIsSet
    ? "Set"
    : playoffClinches.clinchedTeams.length > 0
      ? `${playoffClinches.clinchedTeams.length}/8 clinched`
      : "Projected";
  const wildCardMarkerLabels = Object.fromEntries(
    [...wildCardTeamIds].map((teamId) => [
      teamId,
      clinchedWildCardTeamIds.has(teamId) ? "Clinched wildcard" : "Projected wild card"
    ])
  );
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
  const playoffField = activePlayoffSeeds.map((entry) => {
    const standing = state.standings.find((row) => row.teamId === entry.teamId);
    const pod = state.tournament.pods.find((candidate) => candidate.id === entry.podId);
    const isPodWinner = entry.qualifierType === "POD_WINNER";
    const wildCardPosition = wildCardPositionByTeamId.get(entry.teamId);
    const clinch = clinchedTeamById.get(entry.teamId);

    return {
      id: entry.teamId,
      slotLabel: isPodWinner || !wildCardPosition
        ? `#${entry.seedNumber}`
        : `#${entry.seedNumber} WC${wildCardPosition}`,
      teamName: entry.teamName,
      detailLabel: pod?.name ?? "Wildcard",
      typeLabel: playoffFieldIsSet
        ? isPodWinner
          ? "Pod winner"
          : "Wild card"
        : clinch?.clinchType === "POD_WINNER"
          ? "Clinched pod winner"
          : clinch?.clinchType === "WILD_CARD"
            ? "Clinched wild card"
            : clinch?.clinchType === "PLAYOFF_BERTH"
              ? "Clinched playoff berth"
              : isPodWinner
                ? "Projected pod winner"
                : "Projected wild card",
      typeTone: isPodWinner ? "winner" : "wildcard",
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
          ...activeWildCards.map((entry, index) => {
            const standing = state.standings.find((row) => row.teamId === entry.teamId);
            const pod = state.tournament.pods.find((candidate) => candidate.id === standing?.podId);
            return {
              id: entry.teamId,
              slotLabel: `WC${index + 1}`,
              teamName: entry.teamName,
              detailLabel: pod?.name ?? "Wildcard",
              typeLabel: playoffFieldIsSet ? "Wild card line" : "Projected wild card",
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
  const wildCardBubbleRows = state.wildCardBubble.map((entry, index) => {
    const standing = state.standings.find((row) => row.teamId === entry.teamId);
    const pod = state.tournament.pods.find((candidate) => candidate.id === entry.podId);

    return {
      id: entry.teamId,
      slotLabel: `B${index + 1}`,
      teamName: entry.teamName,
      detailLabel: pod?.name ?? "Wildcard",
      typeLabel: "On bubble",
      typeTone: "bubble" as const,
      wins: standing?.wins ?? 0,
      losses: standing?.losses ?? 0,
      ties: standing?.ties ?? 0,
      holePoints: standing?.holePoints ?? 0,
      holesWon: standing?.holesWon ?? 0,
      totalNetBetterBall: standing?.cumulativeNetBetterBall ?? null
    };
  });
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
    markerCode: clinchedPodWinnerTeamIds.has(row.teamId)
      ? "Y"
      : clinchedTeamIds.has(row.teamId)
        ? "X"
        : playoffFieldIsSet
          ? "E"
          : seededTeamIds.has(row.teamId)
            ? "PB"
            : null,
    markerLabel: clinchedPodWinnerTeamIds.has(row.teamId)
      ? "Clinched pod"
      : clinchedTeamIds.has(row.teamId)
        ? clinchedWildCardTeamIds.has(row.teamId)
          ? "Clinched wildcard"
          : "Clinched playoff berth"
        : playoffFieldIsSet
          ? "Eliminated from playoff"
          : seededTeamIds.has(row.teamId)
            ? "Projected playoff field"
            : null
  }));
  const standingsTabs = [
    {
      key: "pods",
      href: `/tournament/${slug}/standings`,
      mobileLabel: "Pods",
      desktopLabel: "Pod standings"
    },
    {
      key: "playoff",
      href: `/tournament/${slug}/standings?tab=playoff`,
      mobileLabel: "Playoff",
      desktopLabel: "Playoff picture"
    },
    {
      key: "teams",
      href: `/tournament/${slug}/standings?tab=teams`,
      mobileLabel: "Teams",
      desktopLabel: "All teams"
    }
  ] as const;
  const scenarioTeamIds = [
    ...new Set([
      ...state.wildCardProjection.map((entry) => entry.teamId),
      ...state.wildCardBubble.map((entry) => entry.teamId),
      ...state.projectedPlayoffField.map((entry) => entry.teamId),
      ...state.standings.map((entry) => entry.teamId)
    ])
  ];

  return (
    <>
      <PublicNav slug={slug} seasonIsLive={new Date(state.tournament.startDate) <= new Date()} />
      <main className="mx-auto flex min-h-screen w-full max-w-[620px] flex-col gap-4 px-4 py-5 pb-24 sm:px-6">
        <SectionCard title="Standings">
          <p className="max-w-[620px] text-sm leading-6 text-ink/76">
            Pods are sorted by record, hole points, holes won, then total net better-ball.
          </p>

          <div className="mt-5 grid grid-cols-3 gap-1.5 rounded-[24px] bg-sand/78 p-1.5">
            {standingsTabs.map((tab) => {
              const active = currentTab === tab.key;
              const tabClassName = clsx(
                "focus-ring flex min-h-14 items-center justify-center rounded-[19px] px-3 text-center text-[15px] font-semibold leading-tight transition sm:text-base",
                active
                  ? "cursor-default bg-pine text-white shadow-[0_8px_18px_rgba(17,32,23,0.18)]"
                  : "text-fairway/82 hover:bg-white/70 hover:text-ink"
              );
              const tabLabel = (
                <>
                  <span className="sm:hidden">{tab.mobileLabel}</span>
                  <span className="hidden sm:inline">{tab.desktopLabel}</span>
                </>
              );

              return active ? (
                <span key={tab.key} aria-current="page" className={tabClassName}>
                  {tabLabel}
                </span>
              ) : (
                <Link key={tab.key} href={tab.href} className={tabClassName}>
                  {tabLabel}
                </Link>
              );
            })}
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
                      markerLabel={playoffFieldIsSet ? "Clinched wildcard" : "Projected wild card"}
                      markerLabels={wildCardMarkerLabels}
                      winnerTeamIds={rows[0] ? [rows[0].teamId] : []}
                      winnerLabel={
                        rows[0] && clinchedPodWinnerTeamIds.has(rows[0].teamId)
                          ? "Clinched pod winner"
                          : playoffFieldIsSet
                            ? "Pod winner"
                            : "Current pod leader"
                      }
                    />
                  </SectionCard>
                ))}
              </section>
            ) : (
              <section className="grid gap-4">
                <SectionCard
                  title="Pods are set"
                  action={
                    <span className="rounded-full bg-[#fff4d8] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a6b08]">
                      Opening day
                    </span>
                  }
                >
                  <p className="text-sm leading-6 text-ink/72">
                    Standings will sort once the first official pod-play card is posted. Until then,
                    every pod starts level.
                  </p>
                </SectionCard>

                {state.podStandings.map(({ pod, rows }) => (
                  <SectionCard key={pod.id} title={pod.name}>
                    <div className="overflow-hidden rounded-[22px] border border-mist bg-white">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] bg-sand px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-fairway/68">
                        <span>Team</span>
                        <span>Status</span>
                      </div>
                      <div className="divide-y divide-mist">
                        {rows.map((row) => (
                          <article
                            key={row.teamId}
                            className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-base font-semibold text-ink">{row.teamName}</p>
                              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-fairway/58">
                                0-0-0 / no card posted
                              </p>
                            </div>
                            <span className="rounded-full bg-sand px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-fairway/68">
                              Ready
                            </span>
                          </article>
                        ))}
                      </div>
                    </div>
                  </SectionCard>
                ))}
              </section>
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
                  {!playoffFieldIsSet && playoffClinches.clinchedTeams.length > 0 ? (
                    <div className="mb-4 rounded-[20px] border border-[#b9d7c8] bg-[#edf7f1] px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-[#174f38]">
                            {playoffClinches.clinchedTeams.length} playoff spots are locked
                          </p>
                          <p className="mt-1 text-sm leading-5 text-ink/68">
                            {clinchedPodWinnerTeamIds.size} pod winners
                            {clinchedWildCardTeamIds.size > 0
                              ? ` and ${clinchedWildCardTeamIds.size} wild card${clinchedWildCardTeamIds.size === 1 ? "" : "s"}`
                              : ""}
                            {playoffClinches.remainingBerths === 1
                              ? " are in. The final pod-play match will settle the last wild card."
                              : ` are in. ${playoffClinches.remainingBerths} berths remain.`}
                          </p>
                        </div>
                        <span className="inline-flex shrink-0 rounded-full bg-pine px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                          Clinched
                        </span>
                      </div>
                    </div>
                  ) : null}

                  <div className="overflow-hidden rounded-2xl border border-mist bg-white">
                    <div className="divide-y divide-mist/80">
                      {playoffPictureRows.map((entry) => (
                        <article key={entry.id} className="px-4 py-4">
                          <div>
                            <span className="inline-flex rounded-full bg-pine px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                              {entry.slotLabel}
                            </span>
                          </div>
                          <div className="mt-3">
                            <p className="text-base font-semibold text-ink">{entry.teamName}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-fairway/68">{entry.detailLabel}</p>
                          </div>
                          <div className="mt-3">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                                entry.typeTone === "winner"
                                  ? "bg-[#e3f1ea] text-[#174f38]"
                                  : entry.typeTone === "wildcard"
                                    ? "bg-[#efe7ff] text-[#5f47a6]"
                                    : "bg-sand text-fairway/72"
                              }`}
                            >
                              {entry.typeTone === "winner" ? <PodWinnerIcon className="h-3 w-3" /> : null}
                              {entry.typeTone === "wildcard" ? <WildcardHatIcon className="h-3 w-3" /> : null}
                              {entry.typeLabel}
                            </span>
                          </div>
                          <div className="mt-4 grid grid-cols-4 overflow-hidden rounded-2xl border border-mist bg-sand/45">
                            <div className="border-r border-mist px-2.5 py-2.5 last:border-r-0">
                              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-fairway/62">Rec</p>
                              <p className="mt-1 text-sm font-semibold text-ink">
                                {entry.wins}-{entry.losses}-{entry.ties}
                              </p>
                            </div>
                            <div className="border-r border-mist px-2.5 py-2.5 last:border-r-0">
                              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-fairway/62">Pts</p>
                              <p className="mt-1 text-sm font-semibold text-ink">{entry.holePoints}</p>
                            </div>
                            <div className="border-r border-mist px-2.5 py-2.5 last:border-r-0">
                              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-fairway/62">Won</p>
                              <p className="mt-1 text-sm font-semibold text-ink">{entry.holesWon}</p>
                            </div>
                            <div className="px-2.5 py-2.5">
                              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-fairway/62">Net</p>
                              <p className="mt-1 text-sm font-semibold text-ink">{entry.totalNetBetterBall ?? "-"}</p>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>

                  {!playoffFieldIsSet && wildCardBubbleRows.length > 0 ? (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-mist bg-white">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mist bg-sand/65 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-ink">Wild Card Bubble</p>
                          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-fairway/62">
                            Next 4 out
                          </p>
                        </div>
                        <span className="inline-flex rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-fairway/72">
                          If ended today
                        </span>
                      </div>
                      <div className="divide-y divide-mist/80">
                        {wildCardBubbleRows.map((entry) => (
                          <article
                            key={entry.id}
                            className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
                          >
                            <span className="mt-0.5 inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-sand px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-fairway/76">
                              {entry.slotLabel}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ink">{entry.teamName}</p>
                              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-fairway/62">
                                {entry.detailLabel}
                              </p>
                            </div>
                            <div className="col-span-2 grid grid-cols-4 overflow-hidden rounded-2xl border border-mist bg-sand/35 text-sm sm:col-span-1 sm:min-w-[260px]">
                              <div className="border-r border-mist px-2.5 py-2">
                                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-fairway/60">Rec</p>
                                <p className="mt-1 font-semibold text-ink">
                                  {entry.wins}-{entry.losses}-{entry.ties}
                                </p>
                              </div>
                              <div className="border-r border-mist px-2.5 py-2">
                                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-fairway/60">Pts</p>
                                <p className="mt-1 font-semibold text-ink">{entry.holePoints}</p>
                              </div>
                              <div className="border-r border-mist px-2.5 py-2">
                                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-fairway/60">Won</p>
                                <p className="mt-1 font-semibold text-ink">{entry.holesWon}</p>
                              </div>
                              <div className="px-2.5 py-2">
                                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-fairway/60">Net</p>
                                <p className="mt-1 font-semibold text-ink">{entry.totalNetBetterBall ?? "-"}</p>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : null}
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

            <PlayoffScenarioLab input={scenarioInput} initialTeamIds={scenarioTeamIds} />

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
