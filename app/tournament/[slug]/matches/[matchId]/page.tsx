import { notFound } from "next/navigation";
import { PublicNav } from "@/components/public-nav";
import { PublicMatchScorecard } from "@/components/public-match-scorecard";
import { SectionCard } from "@/components/section-card";
import {
  ScorecardTableFrame,
  scorecardBodyCellClass,
  scorecardHeaderCellClass,
  scorecardLabelCellClass,
  scorecardScoreMarkClass,
  type ScorecardSegment
} from "@/components/scorecard-table";
import type { TeamMatchSummary } from "@/lib/scoring/types";
import { formatDateTimeLabel } from "@/lib/server/formatting";
import { getPublicMatchState } from "@/lib/server/public-tournament";

export const dynamic = "force-dynamic";

function scoreMarkClass(
  score: number | null | undefined,
  par: number | undefined,
  compact = false
) {
  if (score == null || par == null) {
    return "border-transparent bg-transparent text-ink/35";
  }

  const delta = score - par;

  if (delta <= -2) {
    return compact
      ? "rounded-full border-[1.5px] border-[#7b7b7b] bg-white text-ink shadow-[0_0_0_2px_white,0_0_0_3.5px_#7b7b7b]"
      : "rounded-full border-[3px] border-[#7b7b7b] bg-white text-ink shadow-[inset_0_0_0_4px_white,inset_0_0_0_7px_#7b7b7b]";
  }

  if (delta === -1) {
    return "rounded-full border-[3px] border-[#7b7b7b] bg-white text-ink";
  }

  if (delta === 0) {
    return "rounded-none border-2 border-transparent bg-white text-ink";
  }

  if (delta === 1) {
    return "rounded-none border-[3px] border-[#7b7b7b] bg-white text-ink";
  }

  return compact
    ? "rounded-none border-[1.5px] border-[#7b7b7b] bg-white text-ink shadow-[0_0_0_2px_white,0_0_0_3.5px_#7b7b7b]"
    : "rounded-none border-[3px] border-[#7b7b7b] bg-white text-ink shadow-[inset_0_0_0_4px_white,inset_0_0_0_7px_#7b7b7b]";
}

function formatCourseLocation(course: { city: string | null; state: string | null } | null) {
  if (!course) {
    return "Course TBD";
  }

  return [course.city, course.state].filter(Boolean).join(", ") || "Course TBD";
}

function segmentLabel(start: number) {
  return start === 1 ? "Front 9" : "Back 9";
}

function statusPillClass(status: string) {
  if (status === "FINAL") {
    return "bg-[#e3f1ea] text-[#174f38]";
  }

  if (status === "FORFEIT") {
    return "bg-[#efe7ff] text-[#5f47a6]";
  }

  if (status === "IN_PROGRESS" || status === "READY" || status === "REOPENED") {
    return "bg-[#fff1c9] text-[#8a6b08]";
  }

  return "bg-sand text-ink/72";
}

function formatStat(value: number | null | undefined) {
  if (value == null) {
    return "-";
  }

  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function resultCodeLabel(resultCode: string) {
  switch (resultCode) {
    case "WIN":
      return "Winner";
    case "LOSS":
      return "Runner-up";
    case "TIE":
      return "Tied";
    case "FORFEIT_WIN":
      return "Forfeit win";
    case "FORFEIT_LOSS":
      return "Forfeit loss";
    default:
      return resultCode.replaceAll("_", " ").toLowerCase();
  }
}

function teamInitials(name: string) {
  return name
    .split(/\s+|&/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.at(0)?.toUpperCase())
    .join("");
}

type PublicScorecardPlayer = {
  playerId: string;
  playerName: string;
  teamId: string;
  teeName: string;
  handicapIndex: number;
  matchStrokeCount: number;
  strokesByHole: Record<number, number>;
  grossByHole: Record<number, number>;
  netByHole: Record<number, number>;
};

type PublicScorecardHole = {
  holeNumber: number;
  teamPoints: Record<string, number>;
  teamBetterBallNet: Record<string, number>;
  winningTeamId: string | null;
};

type PublicScorecardHoleMeta = {
  holeNumber: number;
  par: number;
  strokeIndex: number;
  yardage: number | null;
};

type PublicScorecardData = {
  players: PublicScorecardPlayer[];
  holes: PublicScorecardHole[];
  holeMeta: PublicScorecardHoleMeta[];
  teamSummaries: TeamMatchSummary[];
};

export default async function PublicMatchPage({
  params
}: {
  params: Promise<{ slug: string; matchId: string }>;
}) {
  const { slug, matchId } = await params;
  const data = await getPublicMatchState(slug, matchId);

  if (!data) {
    notFound();
  }

  if (data.scorecard) {
    const scorecard = data.scorecard as unknown as PublicScorecardData;
    const scorecardTeams = [
      {
        id: data.homeTeam?.id ?? "home",
        name: data.homeTeam?.name ?? data.match.homeSeedLabel ?? "Home team",
        tone: "pine" as const,
        players: scorecard.players.filter((player) => player.teamId === data.homeTeam?.id)
      },
      {
        id: data.awayTeam?.id ?? "away",
        name: data.awayTeam?.name ?? data.match.awaySeedLabel ?? "Away team",
        tone: "purple" as const,
        players: scorecard.players.filter((player) => player.teamId === data.awayTeam?.id)
      }
    ];
    const scoredHolesByNumber = new Map(
      scorecard.holes.map((hole) => [hole.holeNumber, hole])
    );
    const scorecardHoles = scorecard.holeMeta.map((hole) => {
      const scored = scoredHolesByNumber.get(hole.holeNumber);

      return {
        holeNumber: hole.holeNumber,
        par: hole.par,
        strokeIndex: hole.strokeIndex,
        yardage: hole.yardage ?? null,
        teamPoints: scored?.teamPoints ?? {},
        teamBetterBallNet: scored?.teamBetterBallNet ?? {},
        winningTeamId: scored?.winningTeamId ?? null
      };
    });

    return (
      <>
        <PublicNav slug={slug} seasonIsLive={new Date(data.tournamentStartDate) <= new Date()} />
        <main className="mx-auto min-h-screen w-full max-w-[620px] px-4 py-6 pb-24 sm:px-6">
          <PublicMatchScorecard
            roundLabel={data.match.roundLabel}
            status={data.match.status}
            resultLabel={data.match.resultLabel ?? null}
            courseName={data.course?.name ?? "Course TBD"}
            courseLocation={formatCourseLocation(data.course)}
            playedOnLabel={data.playedOn ? formatDateTimeLabel(data.playedOn) : "Date pending"}
            teams={scorecardTeams}
            summaries={scorecard.teamSummaries}
            holes={scorecardHoles}
            backHref={`/tournament/${slug}`}
          />
        </main>
      </>
    );
  }

  const legacyScorecard = data.scorecard as unknown as PublicScorecardData | null;
  const teams = [
    {
      id: data.homeTeam?.id ?? "home",
      name: data.homeTeam?.name ?? data.match.homeSeedLabel ?? "Home team",
      headerClass: "bg-pine text-white",
      accentClass: "border-pine bg-[#f5fbf7]",
      chipClass: "bg-pine text-white",
      rowFillClass: "bg-[rgba(18,76,58,0.5)] text-pine",
      players: ((legacyScorecard?.players ?? []) as PublicScorecardPlayer[]).filter(
        (player) => player.teamId === data.homeTeam?.id
      )
    },
    {
      id: data.awayTeam?.id ?? "away",
      name: data.awayTeam?.name ?? data.match.awaySeedLabel ?? "Away team",
      headerClass: "bg-[#5f4b8b] text-white",
      accentClass: "border-[#d8cffa] bg-[#fbf8ff]",
      chipClass: "bg-[#5f4b8b] text-white",
      rowFillClass: "bg-[rgba(95,75,139,0.5)] text-[#4f3e75]",
      players: ((legacyScorecard?.players ?? []) as PublicScorecardPlayer[]).filter(
        (player) => player.teamId === data.awayTeam?.id
      )
    }
  ];

  const visibleSegments = [
    { start: 1, end: 9 },
    { start: 10, end: 18 }
  ];
  const publishedScorecard = legacyScorecard;
  const summaryByTeamId = new Map(
    publishedScorecard?.teamSummaries.map((summary) => [summary.teamId, summary]) ?? []
  );
  const winningSummary =
    publishedScorecard?.teamSummaries.find(
      (summary) => summary.resultCode === "WIN" || summary.resultCode === "FORFEIT_WIN"
    ) ?? null;
  const winningTeam = teams.find((team) => team.id === winningSummary?.teamId) ?? null;
  const matchFacts = [
    data.course?.name ?? "Course TBD",
    data.playedOn ? formatDateTimeLabel(data.playedOn) : "Date pending",
    formatCourseLocation(data.course)
  ];
  const holeMetaByNumber = new Map(
    publishedScorecard?.holeMeta.map((hole) => [hole.holeNumber, hole]) ?? []
  );
  const holeStories =
    publishedScorecard?.holes.map((hole) => {
      const meta = holeMetaByNumber.get(hole.holeNumber);
      const holeWinner = teams.find((team) => team.id === hole.winningTeamId) ?? null;
      const homeNet = hole.teamBetterBallNet[teams[0].id] ?? null;
      const awayNet = hole.teamBetterBallNet[teams[1].id] ?? null;

      return {
        holeNumber: hole.holeNumber,
        par: meta?.par ?? null,
        winner: holeWinner,
        homeNet,
        awayNet,
        isHalved: hole.winningTeamId == null
      };
    }) ?? [];

  return (
    <>
      <PublicNav slug={slug} seasonIsLive={new Date(data.tournamentStartDate) <= new Date()} />
      <main className="mx-auto flex min-h-screen w-full max-w-[620px] flex-col gap-4 px-4 py-6 pb-24 sm:px-6">
        {publishedScorecard ? (
          <>
            <SectionCard
              title={winningTeam ? `${winningTeam.name} wins` : "Final result"}
              eyebrow="Final result"
              action={
                <span
                  className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${statusPillClass(
                    data.match.status
                  )}`}
                >
                  {data.match.status}
                </span>
              }
              className="overflow-hidden"
            >
              <div className="rounded-[24px] border border-gold/55 bg-[linear-gradient(135deg,#fff8df_0%,#f7ecd0_52%,#fffdf6_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.76)] md:p-5">
                <p className="text-[2rem] font-semibold leading-none text-pine md:text-[2.8rem]">
                  {data.match.resultLabel ?? `${teams[0].name} vs ${teams[1].name}`}
                </p>
                <div className="mt-4 flex flex-wrap gap-x-2 gap-y-1 text-sm leading-6 text-ink/72">
                  {matchFacts.map((fact, index) => (
                    <span key={`${fact}-${index}`} className="inline-flex items-center gap-2">
                      {index > 0 ? <span className="text-ink/32">•</span> : null}
                      {fact}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {teams.map((team) => {
                  const summary = summaryByTeamId.get(team.id);
                  const isWinner =
                    summary?.resultCode === "WIN" || summary?.resultCode === "FORFEIT_WIN";

                  return (
                    <div
                      key={team.id}
                      className={`rounded-[22px] border px-4 py-4 ${
                        isWinner ? team.accentClass : "border-mist bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="label-caps text-fairway/70">
                            {summary ? resultCodeLabel(summary.resultCode) : "Team"}
                          </p>
                          <h3 className="mt-2 text-xl font-semibold leading-tight text-ink">
                            {team.name}
                          </h3>
                        </div>
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                            isWinner ? team.chipClass : "bg-sand text-ink/70"
                          }`}
                        >
                          {teamInitials(team.name)}
                        </span>
                      </div>
                      <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
                        <div className="rounded-2xl bg-sand/65 px-3 py-3">
                          <dt className="label-caps text-fairway/70">Pts</dt>
                          <dd className="mt-1 text-lg font-semibold text-ink">
                            {formatStat(summary?.totalPoints)}
                          </dd>
                        </div>
                        <div className="rounded-2xl bg-sand/65 px-3 py-3">
                          <dt className="label-caps text-fairway/70">Won</dt>
                          <dd className="mt-1 text-lg font-semibold text-ink">
                            {formatStat(summary?.holesWon)}
                          </dd>
                        </div>
                        <div className="rounded-2xl bg-sand/65 px-3 py-3">
                          <dt className="label-caps text-fairway/70">Net</dt>
                          <dd className="mt-1 text-lg font-semibold text-ink">
                            {formatStat(summary?.betterBallNetTotal)}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  );
                })}
              </div>
            </SectionCard>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px] md:items-start">
              <SectionCard title="Hole story" eyebrow="Better-ball net">
                <div className="overflow-hidden rounded-[22px] border border-mist bg-white md:grid md:grid-cols-2">
                  {holeStories.map((hole, index) => (
                    <div
                      key={`hole-story-${hole.holeNumber}`}
                      className={`grid grid-cols-[3.4rem_1fr_auto] items-center gap-3 px-3 py-3 text-sm ${
                        index > 0 ? "border-t border-mist" : ""
                      } lg:border-t lg:border-mist lg:[&:nth-child(-n+2)]:border-t-0 lg:[&:nth-child(odd)]:border-r`}
                    >
                      <div>
                        <p className="font-semibold text-ink">H{hole.holeNumber}</p>
                        <p className="mt-0.5 text-xs text-ink/54">
                          {hole.par ? `Par ${hole.par}` : "Par -"}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`truncate font-semibold ${
                              hole.winner?.id === teams[0].id ? "text-pine" : "text-ink/68"
                            }`}
                          >
                            {teams[0].name}
                          </span>
                          <span className="font-semibold text-ink">{formatStat(hole.homeNet)}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span
                            className={`truncate font-semibold ${
                              hole.winner?.id === teams[1].id ? "text-[#5f4b8b]" : "text-ink/68"
                            }`}
                          >
                            {teams[1].name}
                          </span>
                          <span className="font-semibold text-ink">{formatStat(hole.awayNet)}</span>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          hole.isHalved ? "bg-sand text-ink/68" : hole.winner?.chipClass ?? "bg-sand text-ink/68"
                        }`}
                      >
                        {hole.isHalved ? "Half" : teamInitials(hole.winner?.name ?? "")}
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Card setup" eyebrow="Strokes and tees">
                <div className="grid gap-3">
                  {teams.map((team) => (
                    <div key={team.id} className="rounded-[22px] border border-mist bg-white p-3">
                      <h3 className="px-1 text-base font-semibold text-ink">{team.name}</h3>
                      <div className="mt-2 divide-y divide-mist overflow-hidden rounded-2xl border border-mist">
                        {team.players.map((player) => (
                          <div
                            key={player.playerId}
                            className="grid grid-cols-[1fr_auto] gap-3 bg-white px-3 py-2.5 text-sm"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-ink">{player.playerName}</p>
                              <p className="mt-0.5 text-xs uppercase tracking-[0.14em] text-fairway/68">
                                {player.teeName}
                              </p>
                            </div>
                            <div className="text-right text-xs leading-5 text-ink/70">
                              <p>{player.handicapIndex.toFixed(1)} index</p>
                              <p>{player.matchStrokeCount} strokes</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>

            <SectionCard title="Official scorecard" eyebrow="Full card">
              <details className="group rounded-[22px] border border-mist bg-white p-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-[18px] bg-sand/70 px-4 py-3 text-sm font-semibold text-ink marker:hidden">
                  <span>Show hole-by-hole scorecard</span>
                  <span className="text-xs uppercase tracking-[0.16em] text-fairway/70 group-open:hidden">
                    Open
                  </span>
                  <span className="hidden text-xs uppercase tracking-[0.16em] text-fairway/70 group-open:inline">
                    Close
                  </span>
                </summary>
                <div className="mt-4 space-y-4">
                  {visibleSegments.map((segment) => {
                    const holes = publishedScorecard.holeMeta.filter(
                      (hole) => hole.holeNumber >= segment.start && hole.holeNumber <= segment.end
                    );
                    const scorecardSegment: ScorecardSegment = segment.start === 1 ? "front" : "back";

                    return (
                      <div
                        key={`segment-${segment.start}`}
                        className="rounded-[20px] border border-mist bg-white p-3"
                      >
                        <h3 className="mb-3 text-lg font-semibold text-ink">
                          {segmentLabel(segment.start)}
                        </h3>
                  <div className="mb-3 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-fairway/68">
                    <span>Full card view</span>
                    <span>
                      {segment.start === 1 ? "Out only" : "In + Tot"}
                    </span>
                  </div>

                  <ScorecardTableFrame
                    segment={scorecardSegment}
                    className="-mx-2 px-2"
                  >
                        <div className={`border-b border-r border-[#d7c28d] bg-[#7a766f] text-white ${scorecardLabelCellClass}`}>
                          Hole
                        </div>
                        {holes.map((hole) => (
                          <div
                            key={`hole-${segment.start}-${hole.holeNumber}`}
                            className={`border-b border-r border-[#d7c28d] bg-[#7a766f] text-white ${scorecardHeaderCellClass}`}
                          >
                            {hole.holeNumber}
                          </div>
                        ))}
                        {segment.start === 1 ? (
                          <div className={`border-b border-r border-[#d7c28d] bg-[#7a766f] text-white ${scorecardHeaderCellClass}`}>
                            Out
                          </div>
                        ) : (
                          <>
                            <div className={`border-b border-r border-[#d7c28d] bg-[#7a766f] text-white ${scorecardHeaderCellClass}`}>
                              In
                            </div>
                            <div className={`border-b border-r border-[#d7c28d] bg-[#7a766f] text-white ${scorecardHeaderCellClass}`}>
                              Tot
                            </div>
                          </>
                        )}

                        <div className={`border-b border-r border-[#b9c8d9] bg-[linear-gradient(180deg,#dfe9f4_0%,#c8d7e8_100%)] text-[#23405f] ${scorecardLabelCellClass}`}>
                          HDCP
                        </div>
                        {holes.map((hole) => (
                          <div
                            key={`si-${segment.start}-${hole.holeNumber}`}
                            className={`border-b border-r border-[#b9c8d9] bg-[linear-gradient(180deg,#f3f7fb_0%,#e3edf7_100%)] font-semibold text-[#23405f] ${scorecardHeaderCellClass}`}
                          >
                            {hole.strokeIndex}
                          </div>
                        ))}
                        {segment.start === 1 ? (
                          <div className={`border-b border-r border-[#b9c8d9] bg-[linear-gradient(180deg,#f3f7fb_0%,#e3edf7_100%)] font-semibold text-[#23405f] ${scorecardHeaderCellClass}`}>
                            Out
                          </div>
                        ) : (
                          <>
                            <div className={`border-b border-r border-[#b9c8d9] bg-[linear-gradient(180deg,#f3f7fb_0%,#e3edf7_100%)] font-semibold text-[#23405f] ${scorecardHeaderCellClass}`}>
                              In
                            </div>
                            <div className={`border-b border-r border-[#b9c8d9] bg-[linear-gradient(180deg,#f3f7fb_0%,#e3edf7_100%)] font-semibold text-[#23405f] ${scorecardHeaderCellClass}`}>
                              Tot
                            </div>
                          </>
                        )}

                        <div className={`border-b border-r border-[#d7c28d] bg-[linear-gradient(180deg,#f4e5b3_0%,#ead28b_100%)] text-ink ${scorecardLabelCellClass}`}>
                          Par
                        </div>
                        {holes.map((hole) => (
                          <div
                            key={`par-${segment.start}-${hole.holeNumber}`}
                            className={`border-b border-r border-[#d7c28d] bg-[linear-gradient(180deg,#f9edc1_0%,#efdda4_100%)] font-semibold text-ink ${scorecardHeaderCellClass}`}
                          >
                            {hole.par}
                          </div>
                        ))}
                        {segment.start === 1 ? (
                          <div className={`border-b border-r border-[#d7c28d] bg-[linear-gradient(180deg,#f9edc1_0%,#efdda4_100%)] font-semibold text-ink ${scorecardHeaderCellClass}`}>
                            {publishedScorecard.holeMeta
                              .filter((hole) => hole.holeNumber <= 9)
                              .reduce((total, hole) => total + hole.par, 0)}
                          </div>
                        ) : (
                          <>
                            <div className={`border-b border-r border-[#d7c28d] bg-[linear-gradient(180deg,#f9edc1_0%,#efdda4_100%)] font-semibold text-ink ${scorecardHeaderCellClass}`}>
                              {publishedScorecard.holeMeta
                                .filter((hole) => hole.holeNumber >= 10)
                                .reduce((total, hole) => total + hole.par, 0)}
                            </div>
                            <div className={`border-b border-r border-[#d7c28d] bg-[linear-gradient(180deg,#f9edc1_0%,#efdda4_100%)] font-semibold text-ink ${scorecardHeaderCellClass}`}>
                              {publishedScorecard.holeMeta.reduce((total, hole) => total + hole.par, 0)}
                            </div>
                          </>
                        )}

                        {teams.map((team) => (
                          <div key={`team-${segment.start}-${team.id}`} className="contents">
                            {team.players.map((player) => (
                              <div key={`${segment.start}-${player.playerId}`} className="contents">
                                <div className="border-b border-r border-[#d7c28d] bg-white px-2 py-2 sm:px-4 sm:py-4">
                                  <p className="text-[11px] font-semibold leading-tight text-ink sm:text-sm">{player.playerName}</p>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-ink/56 sm:mt-2 sm:text-xs">
                                    <span className="rounded-full border border-mist px-2 py-0.5 font-medium text-ink/72">
                                      Gross
                                    </span>
                                    <span>{player.teeName}</span>
                                    <span>•</span>
                                    <span>{player.matchStrokeCount} strokes</span>
                                  </div>
                                </div>
                                {holes.map((hole) => {
                                  const gross = player.grossByHole[hole.holeNumber] ?? null;
                                  const strokeCount = player.strokesByHole[hole.holeNumber] ?? 0;

                                  return (
                                    <div
                                      key={`${segment.start}-${player.playerId}-${hole.holeNumber}`}
                                      className={`border-b border-r border-[#d7c28d] bg-white ${scorecardBodyCellClass}`}
                                    >
                                      <div className="relative mx-auto w-fit">
                                        {strokeCount > 0 ? (
                                          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#a47f12]" />
                                        ) : null}
                                        <span
                                          className={`mx-auto flex items-center justify-center border-2 font-semibold ${scorecardScoreMarkClass} ${scoreMarkClass(
                                            gross,
                                            hole.par,
                                            true
                                          )}`}
                                        >
                                          {gross ?? ""}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                                {segment.start === 1 ? (
                                  <div className={`border-b border-r border-[#d7c28d] bg-white ${scorecardBodyCellClass}`}>
                                    <span className={`mx-auto flex items-center justify-center font-semibold text-ink ${scorecardScoreMarkClass}`}>
                                      {publishedScorecard.holeMeta
                                        .filter((hole) => hole.holeNumber <= 9)
                                        .reduce((total, hole) => {
                                          const net = player.netByHole[hole.holeNumber];
                                          return net != null ? total + net : total;
                                        }, 0)}
                                    </span>
                                  </div>
                                ) : (
                                  <>
                                    <div className={`border-b border-r border-[#d7c28d] bg-white ${scorecardBodyCellClass}`}>
                                      <span className={`mx-auto flex items-center justify-center font-semibold text-ink ${scorecardScoreMarkClass}`}>
                                        {publishedScorecard.holeMeta
                                          .filter((hole) => hole.holeNumber >= 10)
                                          .reduce((total, hole) => {
                                            const net = player.netByHole[hole.holeNumber];
                                            return net != null ? total + net : total;
                                          }, 0)}
                                      </span>
                                    </div>
                                    <div className={`border-b border-r border-[#d7c28d] bg-white ${scorecardBodyCellClass}`}>
                                      <span className={`mx-auto flex items-center justify-center font-semibold text-ink ${scorecardScoreMarkClass}`}>
                                        {publishedScorecard.holeMeta.reduce((total, hole) => {
                                          const net = player.netByHole[hole.holeNumber];
                                          return net != null ? total + net : total;
                                        }, 0)}
                                      </span>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}

                            <div className={`border-b border-r px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] sm:px-4 sm:py-4 sm:text-sm ${team.headerClass}`}>
                              {team.name} Net
                            </div>
                            {holes.map((hole) => {
                              const holeResult = publishedScorecard.holes.find(
                                (entry) => entry.holeNumber === hole.holeNumber
                              );
                              const teamNet = holeResult?.teamBetterBallNet[team.id] ?? null;

                              return (
                                <div
                                  key={`${segment.start}-${team.id}-net-${hole.holeNumber}`}
                                  className={`border-b border-r text-center ${team.rowFillClass} ${scorecardBodyCellClass}`}
                                >
                                  <span
                                    className={`mx-auto flex items-center justify-center font-semibold ${scorecardScoreMarkClass} ${
                                      teamNet == null ? "text-current/35" : "text-current"
                                    }`}
                                  >
                                    {teamNet ?? ""}
                                  </span>
                                </div>
                              );
                            })}
                            {segment.start === 1 ? (
                              <div className={`border-b border-r text-center ${team.rowFillClass} ${scorecardBodyCellClass}`}>
                                <span className={`mx-auto flex items-center justify-center font-semibold text-current ${scorecardScoreMarkClass}`}>
                                  {publishedScorecard.holes
                                    .filter((hole) => hole.holeNumber <= 9)
                                    .reduce((total, hole) => {
                                      const teamNet = hole.teamBetterBallNet[team.id] ?? null;

                                      return teamNet != null ? total + teamNet : total;
                                    }, 0)}
                                </span>
                              </div>
                            ) : (
                              <>
                                <div className={`border-b border-r text-center ${team.rowFillClass} ${scorecardBodyCellClass}`}>
                                  <span className={`mx-auto flex items-center justify-center font-semibold text-current ${scorecardScoreMarkClass}`}>
                                    {publishedScorecard.holes
                                      .filter((hole) => hole.holeNumber >= 10)
                                      .reduce((total, hole) => {
                                        const teamNet = hole.teamBetterBallNet[team.id] ?? null;

                                        return teamNet != null ? total + teamNet : total;
                                      }, 0)}
                                  </span>
                                </div>
                                <div className={`border-b border-r text-center ${team.rowFillClass} ${scorecardBodyCellClass}`}>
                                  <span className={`mx-auto flex items-center justify-center font-semibold text-current ${scorecardScoreMarkClass}`}>
                                    {publishedScorecard.holes.reduce((total, hole) => {
                                      const holeResult = publishedScorecard.holes.find(
                                        (entry) => entry.holeNumber === hole.holeNumber
                                      );
                                      const teamNet = holeResult?.teamBetterBallNet[team.id] ?? null;

                                      return teamNet != null ? total + teamNet : total;
                                    }, 0)}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                  </ScorecardTableFrame>
                      </div>
                    );
                  })}
                </div>
              </details>
            </SectionCard>
          </>
        ) : (
          <SectionCard title="Match status">
            <p className="text-sm leading-7 text-ink/80">
              This match is not final yet, so the full public scorecard is still on the way.
            </p>
          </SectionCard>
        )}
      </main>
    </>
  );
}
