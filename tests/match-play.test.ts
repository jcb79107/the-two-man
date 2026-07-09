import { describe, expect, it } from "vitest";
import { getMatchPlayDecision, formatMatchPlayResultLabel } from "@/lib/scoring/match-play";

const summaries = [
  {
    teamId: "team-a",
    totalPoints: 11,
    holesWon: 11,
    betterBallGrossTotal: 60,
    betterBallNetTotal: 58,
    resultCode: "WIN" as const
  },
  {
    teamId: "team-b",
    totalPoints: 4,
    holesWon: 4,
    betterBallGrossTotal: 64,
    betterBallNetTotal: 62,
    resultCode: "LOSS" as const
  }
];

describe("match play decisions", () => {
  it("closes a playoff match once the lead exceeds remaining holes", () => {
    const decision = getMatchPlayDecision({
      teamSummaries: summaries,
      playedHoleCount: 15,
      totalHoleCount: 18
    });

    expect(decision).toMatchObject({
      isComplete: true,
      winningTeamId: "team-a",
      lead: 7,
      holesRemaining: 3
    });
  });

  it("ignores a tiebreak winner while the match is not tied after regulation", () => {
    const decision = getMatchPlayDecision({
      teamSummaries: [
        { ...summaries[0], totalPoints: 7, holesWon: 7 },
        { ...summaries[1], totalPoints: 5, holesWon: 5 }
      ],
      playedHoleCount: 12,
      totalHoleCount: 18,
      winningTeamId: "team-b"
    });

    expect(decision).toMatchObject({
      isComplete: false,
      winningTeamId: null,
      leaderTeamId: "team-a"
    });
  });

  it("formats a closed-out match-play result", () => {
    expect(
      formatMatchPlayResultLabel({
        teamSummaries: summaries,
        teamNames: {
          "team-a": "Alpha",
          "team-b": "Bravo"
        },
        playedHoleCount: 15,
        totalHoleCount: 18
      })
    ).toBe("Alpha wins 7&3");
  });
});
