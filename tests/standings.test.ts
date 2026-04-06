import { describe, expect, it } from "vitest";
import { computePodStandings } from "@/lib/server/standings";
import type { MatchStandingInput } from "@/lib/server/standings";
import type { TeamProfile } from "@/types/models";
import type { TeamMatchSummary } from "@/lib/scoring/types";

function buildTeam(id: string, name: string, podId: string): TeamProfile {
  return {
    id,
    name,
    podId,
    players: []
  };
}

function buildSummary(
  teamId: string,
  input: Partial<TeamMatchSummary> & Pick<TeamMatchSummary, "resultCode" | "totalPoints" | "holesWon">
): TeamMatchSummary {
  return {
    teamId,
    betterBallGrossTotal: null,
    betterBallNetTotal: null,
    ...input
  };
}

function buildMatch(
  id: string,
  podId: string,
  summaries: TeamMatchSummary[],
  status: MatchStandingInput["status"] = "FINAL"
): MatchStandingInput {
  return {
    id,
    podId,
    stage: "POD_PLAY",
    status,
    teamSummaries: summaries
  };
}

describe("computePodStandings", () => {
  it("uses cumulative net better-ball totals across pod play for the final tiebreaker", () => {
    const teams = [
      buildTeam("team-a", "Alpha", "pod-1"),
      buildTeam("team-b", "Bravo", "pod-1")
    ];
    const matches = [
      buildMatch("m1", "pod-1", [
        buildSummary("team-a", {
          resultCode: "WIN",
          totalPoints: 10,
          holesWon: 9,
          betterBallNetTotal: 34
        }),
        buildSummary("team-b", {
          resultCode: "LOSS",
          totalPoints: 8,
          holesWon: 6,
          betterBallNetTotal: 35
        })
      ]),
      buildMatch("m2", "pod-1", [
        buildSummary("team-a", {
          resultCode: "LOSS",
          totalPoints: 8,
          holesWon: 6,
          betterBallNetTotal: 40
        }),
        buildSummary("team-b", {
          resultCode: "WIN",
          totalPoints: 10,
          holesWon: 9,
          betterBallNetTotal: 38
        })
      ])
    ];

    const standings = computePodStandings(teams, matches);

    expect(standings[0]?.teamId).toBe("team-b");
    expect(standings[0]?.cumulativeNetBetterBall).toBe(73);
    expect(standings[1]?.cumulativeNetBetterBall).toBe(74);
  });

  it("ignores forfeits for cumulative net better-ball while still counting record and points", () => {
    const teams = [
      buildTeam("team-a", "Alpha", "pod-1"),
      buildTeam("team-b", "Bravo", "pod-1")
    ];
    const standings = computePodStandings(teams, [
      buildMatch("m1", "pod-1", [
        buildSummary("team-a", {
          resultCode: "FORFEIT_WIN",
          totalPoints: 12,
          holesWon: 6,
          betterBallNetTotal: null
        }),
        buildSummary("team-b", {
          resultCode: "FORFEIT_LOSS",
          totalPoints: 0,
          holesWon: 0,
          betterBallNetTotal: null
        })
      ], "FORFEIT")
    ]);

    expect(standings[0]).toMatchObject({
      teamId: "team-a",
      wins: 1,
      cumulativeNetBetterBall: null
    });
  });

  it("ignores unfinished pod matches entirely", () => {
    const teams = [
      buildTeam("team-a", "Alpha", "pod-1"),
      buildTeam("team-b", "Bravo", "pod-1")
    ];
    const standings = computePodStandings(teams, [
      buildMatch("m1", "pod-1", [
        buildSummary("team-a", {
          resultCode: "WIN",
          totalPoints: 10,
          holesWon: 9,
          betterBallNetTotal: 70
        }),
        buildSummary("team-b", {
          resultCode: "LOSS",
          totalPoints: 8,
          holesWon: 6,
          betterBallNetTotal: 72
        })
      ], "IN_PROGRESS")
    ]);

    expect(standings[0]).toMatchObject({
      matchesPlayed: 0,
      holePoints: 0
    });
    expect(standings[1]).toMatchObject({
      matchesPlayed: 0,
      holePoints: 0
    });
  });
});
