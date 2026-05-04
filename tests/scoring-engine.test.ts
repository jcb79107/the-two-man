import { describe, expect, it } from "vitest";
import {
  calculateCourseHandicap,
  calculatePlayingHandicap,
  scoreForfeit,
  scoreMatch
} from "@/lib/scoring/engine";
import type { MatchScoringInput } from "@/lib/scoring/types";

function buildThreeHoleInput(): MatchScoringInput {
  const holes = [
    { holeNumber: 1, par: 4, strokeIndex: 1 },
    { holeNumber: 2, par: 4, strokeIndex: 2 },
    { holeNumber: 3, par: 3, strokeIndex: 3 }
  ];

  return {
    players: [
      {
        playerId: "a1",
        playerName: "Team A One",
        teamId: "team-a",
        handicapIndex: 10,
        teeId: "tee-1",
        teeName: "Blue",
        slope: 113,
        courseRating: 72,
        par: 72,
        holes
      },
      {
        playerId: "a2",
        playerName: "Team A Two",
        teamId: "team-a",
        handicapIndex: 20,
        teeId: "tee-2",
        teeName: "White",
        slope: 113,
        courseRating: 72,
        par: 72,
        holes
      },
      {
        playerId: "b1",
        playerName: "Team B One",
        teamId: "team-b",
        handicapIndex: 8,
        teeId: "tee-1",
        teeName: "Blue",
        slope: 113,
        courseRating: 72,
        par: 72,
        holes
      },
      {
        playerId: "b2",
        playerName: "Team B Two",
        teamId: "team-b",
        handicapIndex: 16,
        teeId: "tee-2",
        teeName: "White",
        slope: 113,
        courseRating: 72,
        par: 72,
        holes
      }
    ],
    holeScores: [
      {
        holeNumber: 1,
        scores: {
          a1: 5,
          a2: 6,
          b1: 5,
          b2: 6
        }
      },
      {
        holeNumber: 2,
        scores: {
          a1: 4,
          a2: 5,
          b1: 3,
          b2: 5
        }
      },
      {
        holeNumber: 3,
        scores: {
          a1: 5,
          a2: 5,
          b1: 4,
          b2: 5
        }
      }
    ]
  };
}

describe("handicap calculations", () => {
  it("computes course handicap from slope, rating, and par", () => {
    expect(
      calculateCourseHandicap({
        handicapIndex: 10.2,
        slope: 129,
        courseRating: 71.8,
        par: 72
      })
    ).toBe(11);
  });

  it("applies the 90% allowance for playing handicap", () => {
    expect(calculatePlayingHandicap(14, 0.9)).toBe(13);
  });
});

describe("match scoring", () => {
  it("allocates relative strokes and computes better-ball hole points", () => {
    const result = scoreMatch(buildThreeHoleInput());
    const teamA = result.teamSummaries.find((summary) => summary.teamId === "team-a");
    const teamB = result.teamSummaries.find((summary) => summary.teamId === "team-b");
    const teamATwo = result.players.find((player) => player.playerId === "a2");

    expect(result.lowPlayerId).toBe("b1");
    expect(teamATwo?.matchStrokeCount).toBe(3);
    expect(teamATwo?.strokesByHole[1]).toBe(1);
    expect(teamATwo?.strokesByHole[3]).toBe(1);
    expect(teamA?.totalPoints).toBe(2);
    expect(teamB?.totalPoints).toBe(1);
    expect(teamA?.resultCode).toBe("WIN");
    expect(teamB?.resultCode).toBe("LOSS");
  });

  it("caps stroke allocation to one per hole across an 18-hole round", () => {
    const fullHoles = Array.from({ length: 18 }, (_, index) => ({
      holeNumber: index + 1,
      par: index % 3 === 2 ? 3 : 4,
      strokeIndex: index + 1
    }));
    const result = scoreMatch({
      ...buildThreeHoleInput(),
      players: buildThreeHoleInput().players.map((player, index) => ({
        ...player,
        handicapIndex: index === 1 ? 36 : player.handicapIndex,
        holes: fullHoles
      })),
      holeScores: fullHoles.map((hole) => ({
        holeNumber: hole.holeNumber,
        scores: {
          a1: 5,
          a2: 6,
          b1: 5,
          b2: 6
        }
      }))
    });
    const highCapPlayer = result.players.find((player) => player.playerId === "a2");

    expect(highCapPlayer?.matchStrokeCount).toBe(18);
    expect(Object.values(highCapPlayer?.strokesByHole ?? {}).every((value) => value <= 1)).toBe(
      true
    );
  });
});

describe("forfeits", () => {
  it("awards the configured forfeit points and holes won", () => {
    const result = scoreForfeit({
      winnerTeamId: "team-a",
      loserTeamId: "team-b",
      awardedPoints: 12,
      awardedHolesWon: 6
    });

    expect(result[0]).toMatchObject({
      teamId: "team-a",
      totalPoints: 12,
      holesWon: 6,
      resultCode: "FORFEIT_WIN"
    });
    expect(result[1]).toMatchObject({
      teamId: "team-b",
      totalPoints: 0,
      holesWon: 0,
      resultCode: "FORFEIT_LOSS"
    });
  });
});
