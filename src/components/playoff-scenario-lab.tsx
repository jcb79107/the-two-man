"use client";

import { useMemo, useState } from "react";
import type { QualifiedTeamSeed } from "@/types/models";
import {
  analyzeScenarioNeeds,
  analyzeScenarioScore,
  defaultHolesWonForPoints,
  formatScenarioScore,
  legalHolesWonForPoints,
  type ScenarioConfidence,
  type ScenarioInput
} from "@/lib/playoff-scenarios";

interface PlayoffScenarioLabProps {
  input: ScenarioInput;
  initialTeamIds: string[];
}

const PRESETS = [12, 10, 9.5, 9, 8, 6];

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function confidenceClass(confidence: ScenarioConfidence) {
  switch (confidence) {
    case "controls":
      return "bg-[#e3f1ea] text-[#174f38]";
    case "projected":
      return "bg-[#efe7ff] text-[#5f47a6]";
    case "needs-help":
      return "bg-[#fff4d8] text-[#8a6b08]";
    case "no-path":
      return "bg-[#f8e3dc] text-[#8a3a20]";
    default:
      return "bg-sand text-fairway/72";
  }
}

function qualifierLabel(seed: Pick<QualifiedTeamSeed, "qualifierType" | "seedNumber"> | null) {
  if (!seed) {
    return "Outside";
  }

  return seed.qualifierType === "POD_WINNER" ? `Seed ${seed.seedNumber} pod` : `Seed ${seed.seedNumber} wild card`;
}

function needLine(input: ReturnType<typeof analyzeScenarioNeeds>) {
  if (!input.nextMatch) {
    return "No remaining pod-play match to simulate.";
  }

  if (input.minControlPoints != null) {
    return `Need ${formatScenarioScore(input.minControlPoints)} points to control fate.`;
  }

  if (input.minProjectedPoints != null) {
    return `Need ${formatScenarioScore(input.minProjectedPoints)} points to be projected in.`;
  }

  if (input.minPossiblePoints != null) {
    return `Need at least ${formatScenarioScore(input.minPossiblePoints)} points and help.`;
  }

  return "No path found in the remaining-match model.";
}

function scoreLabel(points: number) {
  return `${formatScenarioScore(points)}-${formatScenarioScore(18 - points)}`;
}

export function PlayoffScenarioLab({ input, initialTeamIds }: PlayoffScenarioLabProps) {
  const teamOrder = useMemo(() => {
    const ordered = unique(initialTeamIds);
    const rest = input.teams
      .map((team) => team.id)
      .filter((teamId) => !ordered.includes(teamId));

    return [...ordered, ...rest];
  }, [initialTeamIds, input.teams]);
  const [selectedTeamId, setSelectedTeamId] = useState(teamOrder[0] ?? input.teams[0]?.id ?? "");
  const [selectedPoints, setSelectedPoints] = useState(10);
  const [selectedHolesWon, setSelectedHolesWon] = useState(defaultHolesWonForPoints(10));
  const [selectedNet, setSelectedNet] = useState("");
  const [opponentNet, setOpponentNet] = useState("");
  const activeTeamId = selectedTeamId || teamOrder[0] || input.teams[0]?.id || "";
  const selectedTeam = input.teams.find((team) => team.id === activeTeamId);
  const legalHoles = legalHolesWonForPoints(selectedPoints);
  const activeHolesWon = legalHoles.includes(selectedHolesWon)
    ? selectedHolesWon
    : defaultHolesWonForPoints(selectedPoints);
  const needs = useMemo(() => analyzeScenarioNeeds(input, activeTeamId), [input, activeTeamId]);
  const analysis = useMemo(() => analyzeScenarioScore(input, activeTeamId, {
    selectedTeamPoints: selectedPoints,
    selectedTeamHolesWon: activeHolesWon,
    selectedTeamNet: selectedNet.trim() === "" ? null : Number(selectedNet),
    opponentNet: opponentNet.trim() === "" ? null : Number(opponentNet)
  }), [activeHolesWon, activeTeamId, input, opponentNet, selectedNet, selectedPoints]);
  const currentSeed = analysis.currentSeed == null
    ? null
    : {
        seedNumber: analysis.currentSeed,
        qualifierType: analysis.currentQualifierType ?? "WILD_CARD"
      };
  const simulatedSeed = analysis.simulatedSeed == null
    ? null
    : {
        seedNumber: analysis.simulatedSeed,
        qualifierType: analysis.simulatedQualifierType ?? "WILD_CARD"
      };
  const tiebreakHint = needs.tiebreakPoints.includes(selectedPoints) || analysis.tiebreakDependent;

  return (
    <section id="scenarios" className="scroll-mt-28">
      <div className="rounded-[24px] border border-[#d7c28d] bg-[linear-gradient(180deg,#fbf7ed_0%,#f7efd9_100%)] p-4 shadow-[0_16px_34px_rgba(76,58,26,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-fairway/62">
              Scenario lab
            </p>
            <h2 className="mt-1 text-xl font-semibold leading-tight text-ink">
              {selectedTeam?.name ?? "Pick a team"}
            </h2>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${confidenceClass(analysis.simulatedStatus.confidence)}`}>
            {analysis.simulatedStatus.label}
          </span>
        </div>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-1.5 text-sm font-semibold text-ink">
            Team
            <select
              value={activeTeamId}
              onChange={(event) => {
                setSelectedTeamId(event.target.value);
                setSelectedNet("");
                setOpponentNet("");
              }}
              className="min-h-12 rounded-[14px] border border-[#d8c8a8] bg-white px-3 text-base font-semibold text-ink outline-none focus:ring-2 focus:ring-pine/25"
            >
              {teamOrder.map((teamId) => {
                const team = input.teams.find((candidate) => candidate.id === teamId);
                if (!team) {
                  return null;
                }

                return (
                  <option key={team.id} value={team.id}>
                    {team.name} - {team.podName}
                  </option>
                );
              })}
            </select>
          </label>

          <div className="rounded-[18px] border border-[#d8c8a8] bg-white px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fairway/60">What you need</p>
                <p className="mt-1 text-base font-semibold leading-snug text-ink">{needLine(needs)}</p>
              </div>
              <span className="rounded-full bg-sand px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-fairway/70">
                {needs.nextMatch ? `vs ${needs.nextMatch.opponentTeamName}` : analysis.currentStatus.label}
              </span>
            </div>
            {needs.minProjectedPoints != null && needs.minControlPoints != null && needs.minProjectedPoints !== needs.minControlPoints ? (
              <p className="mt-2 text-xs leading-5 text-ink/64">
                Projected line: {formatScenarioScore(needs.minProjectedPoints)}. Control line: {formatScenarioScore(needs.minControlPoints)}.
              </p>
            ) : null}
            {needs.watchPods.length > 0 ? (
              <p className="mt-2 text-xs leading-5 text-ink/64">
                Watch: {needs.watchPods.slice(0, 3).join(", ")}
                {needs.watchPods.length > 3 ? "..." : ""}
              </p>
            ) : null}
          </div>
        </div>

        {needs.nextMatch ? (
          <>
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((points) => (
                  <button
                    key={points}
                    type="button"
                    onClick={() => {
                      setSelectedPoints(points);
                      setSelectedHolesWon(defaultHolesWonForPoints(points));
                    }}
                    className={`focus-ring rounded-full px-3 py-2 text-xs font-semibold transition ${
                      selectedPoints === points
                        ? "bg-pine text-white shadow-[0_8px_16px_rgba(18,76,58,0.16)]"
                        : "border border-[#d8c8a8] bg-white text-ink"
                    }`}
                  >
                    {scoreLabel(points)}
                  </button>
                ))}
              </div>

              <label className="mt-4 grid gap-2 text-sm font-semibold text-ink">
                {selectedTeam?.name ?? "Team"} points: {scoreLabel(selectedPoints)}
                <input
                  type="range"
                  min="0"
                  max="18"
                  step="0.5"
                  value={selectedPoints}
                  onChange={(event) => {
                    const nextPoints = Number(event.target.value);
                    setSelectedPoints(nextPoints);
                    setSelectedHolesWon(defaultHolesWonForPoints(nextPoints));
                  }}
                  className="accent-pine"
                />
              </label>

              <details className="mt-3 rounded-[16px] border border-[#d8c8a8] bg-white px-3 py-3">
                <summary className="cursor-pointer text-sm font-semibold text-ink">Tiebreak details</summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-fairway/62">
                    Holes won
                    <select
                      value={activeHolesWon}
                      onChange={(event) => setSelectedHolesWon(Number(event.target.value))}
                      className="min-h-10 rounded-[12px] border border-mist bg-sand/35 px-2 text-sm font-semibold normal-case tracking-normal text-ink"
                    >
                      {legalHoles.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-fairway/62">
                    Team net
                    <input
                      type="number"
                      inputMode="numeric"
                      value={selectedNet}
                      onChange={(event) => setSelectedNet(event.target.value)}
                      className="min-h-10 rounded-[12px] border border-mist bg-sand/35 px-2 text-sm font-semibold normal-case tracking-normal text-ink"
                      placeholder="-"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-fairway/62">
                    Opponent net
                    <input
                      type="number"
                      inputMode="numeric"
                      value={opponentNet}
                      onChange={(event) => setOpponentNet(event.target.value)}
                      className="min-h-10 rounded-[12px] border border-mist bg-sand/35 px-2 text-sm font-semibold normal-case tracking-normal text-ink"
                      placeholder="-"
                    />
                  </label>
                </div>
              </details>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Now", value: qualifierLabel(currentSeed) },
                { label: "Scenario", value: qualifierLabel(simulatedSeed) },
                {
                  label: "Pod rank",
                  value: analysis.simulatedPodRank ? `#${analysis.simulatedPodRank}` : "-"
                }
              ].map((item) => (
                <div key={item.label} className="rounded-[16px] border border-[#d8c8a8] bg-white px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fairway/58">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{item.value}</p>
                </div>
              ))}
            </div>

            {tiebreakHint ? (
              <div className="mt-3 rounded-[16px] border border-[#d8c8a8] bg-[#fff9e8] px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6b08]">
                  Tiebreak watch
                </p>
                <p className="mt-1 text-xs leading-5 text-ink/66">
                  Holes won or net better-ball can change this score answer. Set the tiebreak details once the card is known.
                </p>
              </div>
            ) : null}

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <ScenarioSeedList title="Field after this score" seeds={analysis.simulatedField} selectedTeamId={activeTeamId} />
              <ScenarioSeedList title="Bubble after this score" seeds={analysis.simulatedBubble} selectedTeamId={activeTeamId} compact />
            </div>

            {analysis.helpTeams.length > 0 && analysis.simulatedStatus.confidence !== "controls" ? (
              <p className="mt-3 text-xs leading-5 text-ink/62">
                Could swing on: {analysis.helpTeams.slice(0, 4).join(", ")}
                {analysis.helpTeams.length > 4 ? "..." : ""}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}

function ScenarioSeedList({
  title,
  seeds,
  selectedTeamId,
  compact = false
}: {
  title: string;
  seeds: QualifiedTeamSeed[];
  selectedTeamId: string;
  compact?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-[#d8c8a8] bg-white">
      <div className="border-b border-[#d8c8a8] bg-sand/55 px-3 py-2">
        <p className="text-xs font-semibold text-ink">{title}</p>
      </div>
      <div className="divide-y divide-mist/80">
        {seeds.length > 0 ? seeds.map((seed) => {
          const selected = seed.teamId === selectedTeamId;

          return (
            <div
              key={`${title}-${seed.seedNumber}-${seed.teamId}`}
              className={`grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-2 px-3 py-2.5 ${
                selected ? "bg-[#e3f1ea]" : ""
              }`}
            >
              <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold ${
                selected ? "bg-pine text-white" : "bg-sand text-ink/72"
              }`}>
                {seed.seedNumber}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{seed.teamName}</p>
                {!compact ? (
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-fairway/58">
                    {seed.qualifierType === "POD_WINNER" ? "Pod winner" : "Wild card"}
                  </p>
                ) : null}
              </div>
            </div>
          );
        }) : (
          <p className="px-3 py-4 text-sm text-ink/62">No teams to show yet.</p>
        )}
      </div>
    </div>
  );
}
