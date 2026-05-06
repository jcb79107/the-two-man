"use client";

import { useMemo, useState } from "react";
import { MatchScorecardSummary, type MatchScorecardSummaryTeam } from "@/components/match-scorecard-summary";

type TeamTone = "pine" | "purple";
type Segment = "front" | "back";

interface PublicMatchTeam {
  id: string;
  name: string;
  tone: TeamTone;
  players: PublicMatchPlayer[];
}

interface PublicMatchPlayer {
  playerId: string;
  playerName: string;
  teamId: string;
  teeName: string;
  handicapIndex: number;
  matchStrokeCount: number;
  strokesByHole: Record<number, number>;
  grossByHole: Record<number, number>;
  netByHole: Record<number, number | null>;
}

interface PublicMatchHole {
  holeNumber: number;
  par: number;
  strokeIndex: number;
  yardage: number | null;
  teamPoints: Record<string, number>;
  teamBetterBallNet: Record<string, number>;
  winningTeamId: string | null;
}

interface PublicMatchSummary {
  teamId: string;
  totalPoints: number;
  holesWon: number;
  betterBallNetTotal: number | null;
  resultCode: string;
}

interface PublicMatchScorecardProps {
  roundLabel: string;
  status: string;
  resultLabel: string | null;
  courseName: string;
  courseLocation: string;
  playedOnLabel: string;
  teams: PublicMatchTeam[];
  summaries: PublicMatchSummary[];
  holes: PublicMatchHole[];
  backHref?: string;
}

const segmentRanges: Record<Segment, { label: string; summaryLabel: string; holes: number[] }> = {
  front: { label: "Front 9", summaryLabel: "Out", holes: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
  back: { label: "Back 9", summaryLabel: "In", holes: [10, 11, 12, 13, 14, 15, 16, 17, 18] }
};

function formatStat(value: number | null | undefined) {
  if (value == null) {
    return "-";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatVsPar(value: number) {
  if (value === 0) return "E";
  return value > 0 ? `+${value}` : String(value);
}

function formatHandicapIndex(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return "Index not set";
  }

  return `Index ${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}`;
}

function googleMapsSearchHref(courseName: string, courseLocation: string) {
  const query = [courseName, courseLocation !== "Course TBD" ? courseLocation : ""]
    .filter(Boolean)
    .join(" ");

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function lastName(name: string) {
  const cleaned = name.trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  return parts.at(-1) ?? cleaned;
}

function initials(name: string) {
  return name
    .split(/\s+|&/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function teamColor(tone: TeamTone) {
  return tone === "pine"
    ? {
        soft: "bg-[#e3f1ea]",
        border: "border-[#b4d4c5]",
        text: "text-pine",
        marker: "bg-pine"
      }
    : {
        soft: "bg-[#f0ebfb]",
        border: "border-[#d7cdf1]",
        text: "text-[#4f3e75]",
        marker: "bg-[#5f47a6]"
      };
}

function scoreShape(score: number | null | undefined, par: number) {
  if (score == null) {
    return "border-transparent text-ink/28";
  }

  const delta = score - par;

  if (delta <= -2) {
    return "rounded-full border-[5px] border-[#102018] text-ink shadow-[inset_0_0_0_2px_#fffaf0] [border-style:double]";
  }

  if (delta === -1) {
    return "rounded-full border-[4px] border-[#102018] text-ink";
  }

  if (delta === 1) {
    return "rounded-[4px] border-[4px] border-[#102018] text-ink";
  }

  if (delta >= 2) {
    return "rounded-[4px] border-[5px] border-[#102018] text-ink shadow-[inset_0_0_0_2px_#fffaf0] [border-style:double]";
  }

  return "border-transparent text-ink";
}

function sumPar(holes: PublicMatchHole[]) {
  return holes.reduce((total, hole) => total + hole.par, 0);
}

function sumYards(holes: PublicMatchHole[]) {
  const yards = holes.map((hole) => hole.yardage).filter((value): value is number => value != null);
  return yards.length > 0 ? yards.reduce((total, value) => total + value, 0) : null;
}

function sumTeamNet(holes: PublicMatchHole[], teamId: string) {
  return holes.reduce((total, hole) => total + (hole.teamBetterBallNet[teamId] ?? 0), 0);
}

function sumPlayerGross(player: PublicMatchPlayer, holes: PublicMatchHole[]) {
  return holes.reduce((total, hole) => total + (player.grossByHole[hole.holeNumber] ?? 0), 0);
}

function splitSummary(holes: PublicMatchHole[], teamId: string) {
  const net = sumTeamNet(holes, teamId);
  return {
    net,
    vsPar: net - sumPar(holes)
  };
}

export function PublicMatchScorecard({
  roundLabel,
  status,
  courseName,
  courseLocation,
  playedOnLabel,
  teams,
  summaries,
  holes,
  backHref = "/"
}: PublicMatchScorecardProps) {
  const [segment, setSegment] = useState<Segment>("front");

  const summaryByTeamId = useMemo(
    () => new Map(summaries.map((summary) => [summary.teamId, summary])),
    [summaries]
  );
  const winner =
    teams.find((team) => {
      const summary = summaryByTeamId.get(team.id);
      return summary?.resultCode === "WIN" || summary?.resultCode === "FORFEIT_WIN";
    }) ?? teams[0];
  const activeHoleNumbers = segmentRanges[segment].holes;
  const activeHoles = holes.filter((hole) => activeHoleNumbers.includes(hole.holeNumber));
  const frontHoles = holes.filter((hole) => hole.holeNumber <= 9);
  const backHoles = holes.filter((hole) => hole.holeNumber >= 10);
  const activePar = sumPar(activeHoles);
  const activeYards = sumYards(activeHoles);
  const roundPar = sumPar(holes);
  const roundYards = sumYards(holes);
  const showRoundTotal = segment === "back";
  const summaryColumnCount = showRoundTotal ? 2 : 1;
  const tableGridTemplate = `132px repeat(${activeHoles.length}, 56px) repeat(${summaryColumnCount}, 62px)`;
  const strokeSummaries = teams.flatMap((team) =>
    team.players.map((player) => ({
      playerId: player.playerId,
      playerName: lastName(player.playerName),
      teamName: team.name,
      teeName: player.teeName || "TBD",
      handicapIndex: formatHandicapIndex(player.handicapIndex).replace(/^Index\s+/i, ""),
      strokeCount: player.matchStrokeCount,
      strokeHoles: Object.entries(player.strokesByHole)
        .filter(([, strokes]) => strokes > 0)
        .map(([holeNumber]) => Number(holeNumber))
        .sort((left, right) => left - right)
    }))
  );
  const summaryTeams: MatchScorecardSummaryTeam[] = teams.map((team) => {
    const summary = summaryByTeamId.get(team.id);
    const isWinner = team.id === winner?.id;
    const front = splitSummary(frontHoles, team.id);
    const back = splitSummary(backHoles, team.id);
    const totalNet = summary?.betterBallNetTotal ?? sumTeamNet(holes, team.id);
    const totalVsPar = totalNet - sumPar(holes);

    return {
      id: team.id,
      name: team.name,
      label: isWinner ? "Winner" : "Runner-up",
      score: formatStat(summary?.totalPoints),
      tone: team.tone,
      stats: [
        { label: "Out", value: formatVsPar(front.vsPar) },
        { label: "In", value: formatVsPar(back.vsPar) },
        { label: "Total", value: formatVsPar(totalVsPar) }
      ]
    };
  });

  return (
    <div className="mx-auto w-full max-w-[430px] space-y-4 md:max-w-[620px]">
      <div className="flex items-center gap-3">
        <a
          href={backHref}
          className="inline-flex min-h-11 items-center rounded-full border border-pine/15 bg-white/80 px-4 text-xs font-semibold uppercase tracking-[0.12em] text-ink/70"
        >
          Back
        </a>
      </div>

      <MatchScorecardSummary
        eyebrow={roundLabel}
        title={`${winner?.name ?? "Match"} wins`}
        headingLevel="h1"
        statusLabel={status}
        courseName={courseName}
        courseHref={googleMapsSearchHref(courseName, courseLocation)}
        courseDetails={[
          playedOnLabel,
          ...(courseLocation !== "Course TBD" ? [courseLocation] : [])
        ]}
        teams={summaryTeams}
        strokes={strokeSummaries}
      />

      <section className="rounded-[26px] border border-[#d7c28d] bg-white/92 p-4 shadow-[0_14px_34px_rgba(17,32,23,0.08)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c5a250]">
          {courseName}
        </p>
        <h2 className="mt-1 text-2xl font-semibold leading-tight text-ink">Official scorecard</h2>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {(["front", "back"] as Segment[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSegment(item)}
              className={`min-h-12 rounded-full border px-4 text-base font-semibold transition ${
                segment === item ? "border-pine bg-pine text-white" : "border-[#d7c28d] bg-white text-ink/58"
              }`}
            >
              {segmentRanges[item].label}
            </button>
          ))}
        </div>

        <div className="-mx-4 mt-4 overflow-x-auto overscroll-x-contain px-4 pb-2">
          <div
            className="overflow-hidden rounded-[24px] border border-[#bfa66a] bg-white"
            style={{
              gridTemplateColumns: tableGridTemplate,
              minWidth: showRoundTotal ? "760px" : "720px"
            }}
          >
            <div
              className="grid bg-[#f2ead9]"
              style={{ gridTemplateColumns: tableGridTemplate }}
            >
              <div className="sticky left-0 z-10 border-b border-r border-[#bfa66a] bg-[#f2ead9] px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/58">
                Hole
              </div>
              {activeHoles.map((hole) => (
                <div key={hole.holeNumber} className="border-b border-r border-[#c8b77f] px-1 py-2 text-center">
                  <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-pine/10 text-sm font-semibold text-ink">
                    {hole.holeNumber}
                  </span>
                </div>
              ))}
              <div className="border-b border-r border-[#c8b77f] px-2 py-3 text-center text-sm font-semibold text-ink">
                {segmentRanges[segment].summaryLabel}
              </div>
              {showRoundTotal ? (
                <div className="border-b border-r border-[#c8b77f] px-2 py-3 text-center text-sm font-semibold text-ink">
                  Total
                </div>
              ) : null}

              {[
                {
                  label: "HCP",
                  values: activeHoles.map((hole) => hole.strokeIndex),
                  activeTotal: "",
                  roundTotal: ""
                },
                {
                  label: "Yards",
                  values: activeHoles.map((hole) => hole.yardage ?? "-"),
                  activeTotal: activeYards ?? "",
                  roundTotal: roundYards ?? ""
                },
                {
                  label: "Par",
                  values: activeHoles.map((hole) => hole.par),
                  activeTotal: activePar,
                  roundTotal: roundPar
                }
              ].map(({ label, values, activeTotal, roundTotal }) => (
                <div key={label as string} className="contents">
                  <div className="sticky left-0 z-10 border-b border-r border-[#bfa66a] bg-[#fffaf0] px-3 py-3 text-sm font-semibold text-ink">
                    {label}
                  </div>
                  {(values as Array<number | string>).map((value, index) => (
                    <div
                      key={`${label}-${activeHoles[index]?.holeNumber}`}
                      className="border-b border-r border-[#c8b77f] px-1 py-3 text-center text-sm font-semibold text-ink/64"
                    >
                      {value}
                    </div>
                  ))}
                  <div className="border-b border-r border-[#c8b77f] bg-[#f7f1e3] px-2 py-3 text-center text-sm font-semibold text-ink">
                    {activeTotal}
                  </div>
                  {showRoundTotal ? (
                    <div className="border-b border-r border-[#c8b77f] bg-[#efe7d6] px-2 py-3 text-center text-sm font-semibold text-ink">
                      {roundTotal}
                    </div>
                  ) : null}
                </div>
              ))}

              {teams.map((team) => {
                const colors = teamColor(team.tone);
                const teamTotal = sumTeamNet(activeHoles, team.id);

                return (
                  <div key={team.id} className="contents">
                    {team.players.map((player) => (
                      <div key={player.playerId} className="contents">
                        <div
                          className={`sticky left-0 z-10 border-b border-r border-[#bfa66a] bg-[#fffaf0] px-3 py-3 ${colors.text}`}
                        >
                          <p className="truncate text-sm font-semibold text-ink">{lastName(player.playerName)}</p>
                          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/54">
                            Gross
                          </p>
                          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/42">
                            {player.matchStrokeCount} stroke{player.matchStrokeCount === 1 ? "" : "s"}
                          </p>
                        </div>
                        {activeHoles.map((hole) => {
                          const gross = player.grossByHole[hole.holeNumber] ?? null;
                          const isUsed =
                            gross != null &&
                            gross - (player.strokesByHole[hole.holeNumber] ?? 0) ===
                              hole.teamBetterBallNet[team.id];
                          const strokes = player.strokesByHole[hole.holeNumber] ?? 0;

                          return (
                            <div
                              key={`${player.playerId}-${hole.holeNumber}`}
                              className={`border-b border-r border-[#c8b77f] px-1 py-2 text-center ${
                                isUsed ? colors.soft : "bg-white"
                              }`}
                            >
                              <span className="relative mx-auto grid h-10 w-10 place-items-center">
                                <span
                                  className={`grid h-8 w-8 place-items-center text-base font-semibold ${scoreShape(
                                    gross,
                                    hole.par
                                  )}`}
                                >
                                  {gross ?? ""}
                                </span>
                                {strokes > 0 ? (
                                  <span
                                    aria-label={`${strokes} handicap stroke${strokes === 1 ? "" : "s"}`}
                                    className={`absolute right-0 top-0 h-3.5 w-3.5 rounded-full ${colors.marker}`}
                                  />
                                ) : null}
                              </span>
                            </div>
                          );
                        })}
                        <div className="border-b border-r border-[#c8b77f] bg-[#f7f1e3] px-2 py-3 text-center text-base font-semibold text-ink">
                          {sumPlayerGross(player, activeHoles)}
                        </div>
                        {showRoundTotal ? (
                          <div className="border-b border-r border-[#c8b77f] bg-[#efe7d6] px-2 py-3 text-center text-base font-semibold text-ink">
                            {sumPlayerGross(player, holes)}
                          </div>
                        ) : null}
                      </div>
                    ))}

                    <div className={`sticky left-0 z-10 border-b border-r border-[#bfa66a] px-3 py-3 ${colors.soft}`}>
                      <p className="truncate text-sm font-semibold text-ink">{initials(team.name)} best ball</p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/54">
                        Team net used
                      </p>
                    </div>
                    {activeHoles.map((hole) => {
                      const teamNet = hole.teamBetterBallNet[team.id] ?? null;

                      return (
                        <div
                          key={`${team.id}-net-${hole.holeNumber}`}
                          className="border-b border-r border-[#c8b77f] bg-white px-1 py-2 text-center"
                        >
                          <span
                            className={`mx-auto grid h-8 w-8 place-items-center text-base font-semibold ${
                              teamNet != null ? scoreShape(teamNet, hole.par) : "text-ink/28"
                            }`}
                          >
                            {formatStat(teamNet)}
                          </span>
                        </div>
                      );
                    })}
                    <div className={`border-b border-r border-[#c8b77f] px-2 py-3 text-center text-base font-semibold ${colors.soft} text-ink`}>
                      {teamTotal}
                    </div>
                    {showRoundTotal ? (
                      <div className={`border-b border-r border-[#c8b77f] px-2 py-3 text-center text-base font-semibold ${colors.soft} text-ink`}>
                        {sumTeamNet(holes, team.id)}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
