import { describe, expect, it } from "vitest";
import {
  analyzeScenarioNeeds,
  analyzeScenarioScore,
  legalHolesWonForPoints,
  type ScenarioInput
} from "@/lib/playoff-scenarios";
import type { StandingsRow } from "@/types/models";

const pods = [
  { id: "pod-a", name: "Pod A" },
  { id: "pod-b", name: "Pod B" },
  { id: "pod-c", name: "Pod C" }
];

const teams = [
  { id: "a1", name: "Alpha", podId: "pod-a", podName: "Pod A" },
  { id: "a2", name: "Apex", podId: "pod-a", podName: "Pod A" },
  { id: "a3", name: "Atlas", podId: "pod-a", podName: "Pod A" },
  { id: "b1", name: "Bravo", podId: "pod-b", podName: "Pod B" },
  { id: "b2", name: "Beacon", podId: "pod-b", podName: "Pod B" },
  { id: "b3", name: "Bolt", podId: "pod-b", podName: "Pod B" },
  { id: "c1", name: "Charlie", podId: "pod-c", podName: "Pod C" },
  { id: "c2", name: "Comet", podId: "pod-c", podName: "Pod C" },
  { id: "c3", name: "Crown", podId: "pod-c", podName: "Pod C" }
];

function row(input: Partial<StandingsRow> & Pick<StandingsRow, "teamId" | "teamName" | "podId">): StandingsRow {
  return {
    matchesPlayed: 1,
    wins: 0,
    losses: 1,
    ties: 0,
    matchRecordPoints: 0,
    holePoints: 8,
    holesWon: 4,
    cumulativeNetBetterBall: 74,
    ...input
  };
}

function baseInput(): ScenarioInput {
  return {
    pods,
    teams,
    standings: [
      row({
        teamId: "a1",
        teamName: "Alpha",
        podId: "pod-a",
        matchesPlayed: 2,
        wins: 2,
        losses: 0,
        matchRecordPoints: 2,
        holePoints: 20,
        holesWon: 14,
        cumulativeNetBetterBall: 148
      }),
      row({ teamId: "a2", teamName: "Apex", podId: "pod-a", holePoints: 8, holesWon: 5 }),
      row({ teamId: "a3", teamName: "Atlas", podId: "pod-a", holePoints: 8, holesWon: 5 }),
      row({
        teamId: "b1",
        teamName: "Bravo",
        podId: "pod-b",
        matchesPlayed: 2,
        wins: 2,
        losses: 0,
        matchRecordPoints: 2,
        holePoints: 20,
        holesWon: 13,
        cumulativeNetBetterBall: 149
      }),
      row({ teamId: "b2", teamName: "Beacon", podId: "pod-b", holePoints: 8, holesWon: 4 }),
      row({ teamId: "b3", teamName: "Bolt", podId: "pod-b", holePoints: 7, holesWon: 3 }),
      row({
        teamId: "c1",
        teamName: "Charlie",
        podId: "pod-c",
        matchesPlayed: 2,
        wins: 2,
        losses: 0,
        matchRecordPoints: 2,
        holePoints: 20,
        holesWon: 12,
        cumulativeNetBetterBall: 150
      }),
      row({ teamId: "c2", teamName: "Comet", podId: "pod-c", holePoints: 8, holesWon: 4 }),
      row({ teamId: "c3", teamName: "Crown", podId: "pod-c", holePoints: 7, holesWon: 3 })
    ],
    matches: [
      {
        id: "match-a",
        podId: "pod-a",
        stage: "POD_PLAY",
        status: "SCHEDULED",
        roundLabel: "Pod A Match 3",
        homeTeamId: "a2",
        awayTeamId: "a3"
      },
      {
        id: "match-b",
        podId: "pod-b",
        stage: "POD_PLAY",
        status: "SCHEDULED",
        roundLabel: "Pod B Match 3",
        homeTeamId: "b2",
        awayTeamId: "b3"
      },
      {
        id: "match-c",
        podId: "pod-c",
        stage: "POD_PLAY",
        status: "SCHEDULED",
        roundLabel: "Pod C Match 3",
        homeTeamId: "c2",
        awayTeamId: "c3"
      }
    ]
  };
}

describe("playoff scenarios", () => {
  it("finds projected and control thresholds while other one-match teams can still move", () => {
    const needs = analyzeScenarioNeeds(baseInput(), "a2");

    expect(needs.nextMatch).toMatchObject({
      opponentTeamName: "Atlas",
      roundLabel: "Pod A Match 3"
    });
    expect(needs.minProjectedPoints).not.toBeNull();
    expect(needs.minProjectedPoints ?? 99).toBeLessThan(needs.minControlPoints ?? 0);
    expect(needs.minControlPoints).toBe(18);
    expect(needs.watchPods).toEqual(expect.arrayContaining(["Pod B", "Pod C"]));
  });

  it("distinguishes projected in from controlling fate", () => {
    const projected = analyzeScenarioScore(baseInput(), "a2", {
      selectedTeamPoints: 12,
      selectedTeamHolesWon: 10
    });
    const controls = analyzeScenarioScore(baseInput(), "a2", {
      selectedTeamPoints: 18,
      selectedTeamHolesWon: 18
    });

    expect(projected.simulatedStatus.confidence).toBe("projected");
    expect(projected.controlsFate).toBe(false);
    expect(controls.simulatedStatus.confidence).toBe("controls");
    expect(controls.controlsFate).toBe(true);
  });

  it("distinguishes pod-winner and wild-card paths", () => {
    const wildCard = analyzeScenarioScore(baseInput(), "a2", {
      selectedTeamPoints: 12,
      selectedTeamHolesWon: 10
    });
    const input = baseInput();
    input.standings = input.standings.map((standing) => {
      if (standing.teamId === "a1") {
        return {
          ...standing,
          wins: 1,
          losses: 1,
          matchRecordPoints: 1,
          holePoints: 17,
          holesWon: 11
        };
      }
      if (standing.teamId === "a2") {
        return {
          ...standing,
          wins: 1,
          losses: 0,
          matchRecordPoints: 1,
          holePoints: 10,
          holesWon: 7
        };
      }
      return standing;
    });
    const podWinner = analyzeScenarioScore(input, "a2", {
      selectedTeamPoints: 10,
      selectedTeamHolesWon: 7
    });

    expect(wildCard.simulatedQualifierType).toBe("WILD_CARD");
    expect(podWinner.simulatedQualifierType).toBe("POD_WINNER");
    expect(podWinner.controlsFate).toBe(true);
  });

  it("supports half-point scores", () => {
    const analysis = analyzeScenarioScore(baseInput(), "a2", {
      selectedTeamPoints: 9.5,
      selectedTeamHolesWon: 8
    });

    expect(analysis.opponentPoints).toBe(8.5);
    expect(analysis.projectedIn).toBe(true);
  });

  it("flags scores where holes won can change the answer", () => {
    const input = baseInput();
    input.matches = [input.matches[0]!];
    input.standings = input.standings.map((standing) => {
      if (standing.teamId === "b2") {
        return {
          ...standing,
          wins: 1,
          losses: 1,
          matchRecordPoints: 1,
          holePoints: 18,
          holesWon: 12
        };
      }
      if (standing.teamId === "c2") {
        return {
          ...standing,
          wins: 1,
          losses: 1,
          matchRecordPoints: 1,
          holePoints: 18,
          holesWon: 11
        };
      }
      return standing;
    });

    const needs = analyzeScenarioNeeds(input, "a2");
    const lowHoles = analyzeScenarioScore(input, "a2", {
      selectedTeamPoints: 10,
      selectedTeamHolesWon: legalHolesWonForPoints(10)[0]
    });
    const highHoles = analyzeScenarioScore(input, "a2", {
      selectedTeamPoints: 10,
      selectedTeamHolesWon: legalHolesWonForPoints(10).at(-1)
    });

    expect(needs.tiebreakPoints).toContain(10);
    expect(lowHoles.projectedIn).toBe(false);
    expect(highHoles.projectedIn).toBe(true);
  });

  it("shows no-match status for teams without remaining pod play", () => {
    const needs = analyzeScenarioNeeds(baseInput(), "a1");

    expect(needs.nextMatch).toBeNull();
    expect(needs.currentSeed).toBe(1);
    expect(needs.scoreAnalyses).toHaveLength(0);
  });
});
