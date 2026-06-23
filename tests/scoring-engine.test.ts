import { describe, expect, it } from "vitest";
import {
  buildMatchPlayerSnapshots,
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
    expect(
      calculatePlayingHandicap({
        handicapIndex: 12.2,
        slope: 129,
        courseRating: 72.1,
        par: 72
      })
    ).toBe(13);
  });

  it("applies handicap allowances to differences in unrounded Course Handicap before rounding", () => {
    const holes = Array.from({ length: 18 }, (_, index) => ({
      holeNumber: index + 1,
      par: 4,
      strokeIndex: index + 1
    }));
    const result = buildMatchPlayerSnapshots({
      allowancePct: 0.85,
      players: [
        {
          playerId: "usga-a",
          playerName: "USGA A",
          teamId: "team-a",
          handicapIndex: 8.6,
          teeId: "tee",
          teeName: "Example",
          slope: 125,
          courseRating: 71,
          par: 71,
          holes
        },
        {
          playerId: "usga-b",
          playerName: "USGA B",
          teamId: "team-a",
          handicapIndex: 10.3,
          teeId: "tee",
          teeName: "Example",
          slope: 125,
          courseRating: 71,
          par: 71,
          holes
        },
        {
          playerId: "low-a",
          playerName: "Low A",
          teamId: "team-b",
          handicapIndex: 0,
          teeId: "tee",
          teeName: "Example",
          slope: 125,
          courseRating: 71,
          par: 71,
          holes
        },
        {
          playerId: "low-b",
          playerName: "Low B",
          teamId: "team-b",
          handicapIndex: 0,
          teeId: "tee",
          teeName: "Example",
          slope: 125,
          courseRating: 71,
          par: 71,
          holes
        }
      ]
    });
    const byPlayerId = new Map(result.players.map((player) => [player.playerId, player]));

    expect(byPlayerId.get("usga-a")).toMatchObject({
      courseHandicap: 10,
      playingHandicap: 8
    });
    expect(byPlayerId.get("usga-b")).toMatchObject({
      courseHandicap: 11,
      playingHandicap: 10
    });
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

  it("uses the scorecard handicap row for relative match strokes after allowance", () => {
    const holes = Array.from({ length: 18 }, (_, index) => ({
      holeNumber: index + 1,
      par: 4,
      strokeIndex: index + 1
    }));
    const result = scoreMatch({
      players: buildThreeHoleInput().players.map((player, index) => ({
        ...player,
        handicapIndex: index === 0 ? 0 : index === 1 ? 10 : index === 2 ? 5 : 5,
        holes
      })),
      holeScores: holes.map((hole) => ({
        holeNumber: hole.holeNumber,
        scores: {
          a1: 4,
          a2: 4,
          b1: 4,
          b2: 4
        }
      }))
    });
    const tenIndexPlayer = result.players.find((player) => player.playerId === "a2");

    expect(result.lowPlayerId).toBe("a1");
    expect(tenIndexPlayer?.matchStrokeCount).toBe(9);
    expect(tenIndexPlayer?.strokesByHole[1]).toBe(1);
    expect(tenIndexPlayer?.strokesByHole[9]).toBe(1);
    expect(tenIndexPlayer?.strokesByHole[10]).toBe(0);
  });

  it("matches USGA 90% four-ball match play strokes from low unrounded course handicap", () => {
    const holes = Array.from({ length: 18 }, (_, index) => ({
      holeNumber: index + 1,
      par: 4,
      strokeIndex: index + 1
    }));
    const result = scoreMatch({
      players: [
        {
          playerId: "jon-stone",
          playerName: "Jonathan Stone",
          teamId: "stone",
          handicapIndex: 16.2,
          teeId: "sunset-blue",
          teeName: "Blue",
          slope: 130,
          courseRating: 70.7,
          par: 72,
          holes
        },
        {
          playerId: "aaron-stone",
          playerName: "Aaron Stone",
          teamId: "stone",
          handicapIndex: 15.6,
          teeId: "sunset-blue",
          teeName: "Blue",
          slope: 130,
          courseRating: 70.7,
          par: 72,
          holes
        },
        {
          playerId: "ryan-rabin",
          playerName: "Ryan Rabin",
          teamId: "rabin-taitz",
          handicapIndex: 22.4,
          teeId: "sunset-blue",
          teeName: "Blue",
          slope: 130,
          courseRating: 70.7,
          par: 72,
          holes
        },
        {
          playerId: "jason-taitz",
          playerName: "Jason Taitz",
          teamId: "rabin-taitz",
          handicapIndex: 15,
          teeId: "sunset-blue",
          teeName: "Blue",
          slope: 130,
          courseRating: 70.7,
          par: 72,
          holes
        }
      ],
      holeScores: holes.map((hole) => ({
        holeNumber: hole.holeNumber,
        scores: {
          "jon-stone": 4,
          "aaron-stone": 4,
          "ryan-rabin": 4,
          "jason-taitz": 4
        }
      }))
    });
    const byPlayerId = new Map(result.players.map((player) => [player.playerId, player]));

    expect(result.lowPlayerId).toBe("jason-taitz");
    expect(byPlayerId.get("ryan-rabin")).toMatchObject({
      courseHandicap: 24,
      playingHandicap: 8,
      matchStrokeCount: 8
    });
    expect(byPlayerId.get("jon-stone")).toMatchObject({
      courseHandicap: 17,
      playingHandicap: 1,
      matchStrokeCount: 1
    });
    expect(byPlayerId.get("aaron-stone")).toMatchObject({
      courseHandicap: 17,
      playingHandicap: 1,
      matchStrokeCount: 1
    });
    expect(byPlayerId.get("jason-taitz")).toMatchObject({
      courseHandicap: 16,
      playingHandicap: 0,
      matchStrokeCount: 0
    });
  });

  it("matches the Heritage Oaks GHIN four-ball example", () => {
    const holes = Array.from({ length: 18 }, (_, index) => ({
      holeNumber: index + 1,
      par: 4,
      strokeIndex: index + 1
    }));
    const result = scoreMatch({
      players: [
        {
          playerId: "brandon",
          playerName: "Brandon Grant",
          teamId: "grant-rausch",
          handicapIndex: 23.5,
          teeId: "heritage-oaks-blue",
          teeName: "Blue",
          slope: 128,
          courseRating: 70.2,
          par: 70,
          holes
        },
        {
          playerId: "ross",
          playerName: "Ross Agins",
          teamId: "agins-deutsch",
          handicapIndex: 20,
          teeId: "heritage-oaks-blue",
          teeName: "Blue",
          slope: 128,
          courseRating: 70.2,
          par: 70,
          holes
        },
        {
          playerId: "noah",
          playerName: "Noah Deutsch",
          teamId: "agins-deutsch",
          handicapIndex: 13.7,
          teeId: "heritage-oaks-blue",
          teeName: "Blue",
          slope: 128,
          courseRating: 70.2,
          par: 70,
          holes
        },
        {
          playerId: "andrew",
          playerName: "Andrew Rausch",
          teamId: "grant-rausch",
          handicapIndex: 5.3,
          teeId: "heritage-oaks-blue",
          teeName: "Blue",
          slope: 128,
          courseRating: 70.2,
          par: 70,
          holes
        }
      ],
      holeScores: holes.map((hole) => ({
        holeNumber: hole.holeNumber,
        scores: {
          brandon: 4,
          ross: 4,
          noah: 4,
          andrew: 4
        }
      }))
    });
    const byPlayerId = new Map(result.players.map((player) => [player.playerId, player]));

    expect(result.lowPlayerId).toBe("andrew");
    expect(byPlayerId.get("brandon")).toMatchObject({
      courseHandicap: 27,
      playingHandicap: 19,
      matchStrokeCount: 18
    });
    expect(byPlayerId.get("ross")).toMatchObject({
      courseHandicap: 23,
      playingHandicap: 15,
      matchStrokeCount: 15
    });
    expect(byPlayerId.get("noah")).toMatchObject({
      courseHandicap: 16,
      playingHandicap: 9,
      matchStrokeCount: 9
    });
    expect(byPlayerId.get("andrew")).toMatchObject({
      courseHandicap: 6,
      playingHandicap: 0,
      matchStrokeCount: 0
    });
  });

  it("scores the Barron match correctly from Bryn Mawr Langford tees", () => {
    const holeMetadata = [
      { holeNumber: 1, par: 5, strokeIndex: 15 },
      { holeNumber: 2, par: 4, strokeIndex: 5 },
      { holeNumber: 3, par: 4, strokeIndex: 11 },
      { holeNumber: 4, par: 4, strokeIndex: 1 },
      { holeNumber: 5, par: 5, strokeIndex: 7 },
      { holeNumber: 6, par: 3, strokeIndex: 9 },
      { holeNumber: 7, par: 4, strokeIndex: 17 },
      { holeNumber: 8, par: 3, strokeIndex: 13 },
      { holeNumber: 9, par: 4, strokeIndex: 3 },
      { holeNumber: 10, par: 3, strokeIndex: 8 },
      { holeNumber: 11, par: 4, strokeIndex: 16 },
      { holeNumber: 12, par: 4, strokeIndex: 6 },
      { holeNumber: 13, par: 5, strokeIndex: 4 },
      { holeNumber: 14, par: 3, strokeIndex: 14 },
      { holeNumber: 15, par: 5, strokeIndex: 10 },
      { holeNumber: 16, par: 3, strokeIndex: 18 },
      { holeNumber: 17, par: 4, strokeIndex: 2 },
      { holeNumber: 18, par: 5, strokeIndex: 12 }
    ];
    const players = [
      {
        playerId: "barron",
        playerName: "Judd Barron",
        teamId: "barron-loewenstein",
        handicapIndex: 9.6
      },
      {
        playerId: "loewenstein",
        playerName: "Judd Loewenstein",
        teamId: "barron-loewenstein",
        handicapIndex: 10.9
      },
      {
        playerId: "holway",
        playerName: "Bradley Holway",
        teamId: "holway-chase",
        handicapIndex: 9.8
      },
      {
        playerId: "chase",
        playerName: "Dylan Chase",
        teamId: "holway-chase",
        handicapIndex: 12.2
      }
    ].map((player) => ({
      ...player,
      teeId: "bryn-mawr-langford-men",
      teeName: "Langford",
      slope: 130,
      courseRating: 72.4,
      par: 72,
      holes: holeMetadata
    }));
    const grossScores: Record<string, number[]> = {
      barron: [5, 5, 4, 4, 6, 3, 5, 3, 4, 4, 5, 4, 6, 4, 6, 4, 5, 5],
      loewenstein: [5, 4, 5, 5, 8, 4, 4, 4, 5, 4, 4, 6, 6, 3, 6, 3, 5, 7],
      holway: [7, 6, 5, 4, 5, 4, 5, 5, 6, 5, 4, 4, 5, 5, 5, 3, 6, 5],
      chase: [6, 4, 5, 3, 7, 4, 3, 4, 5, 3, 4, 4, 6, 4, 5, 3, 6, 6]
    };
    const result = scoreMatch({
      players,
      holeScores: holeMetadata.map((hole, index) => ({
        holeNumber: hole.holeNumber,
        scores: {
          barron: grossScores.barron[index],
          loewenstein: grossScores.loewenstein[index],
          holway: grossScores.holway[index],
          chase: grossScores.chase[index]
        }
      }))
    });
    const byPlayerId = new Map(result.players.map((player) => [player.playerId, player]));
    const barronTeam = result.teamSummaries.find(
      (summary) => summary.teamId === "barron-loewenstein"
    );
    const holwayTeam = result.teamSummaries.find((summary) => summary.teamId === "holway-chase");
    const holeSeventeen = result.holes.find((hole) => hole.holeNumber === 17);

    expect(byPlayerId.get("loewenstein")).toMatchObject({
      courseHandicap: 13,
      playingHandicap: 1,
      matchStrokeCount: 1
    });
    expect(byPlayerId.get("loewenstein")?.strokesByHole[4]).toBe(1);
    expect(byPlayerId.get("loewenstein")?.strokesByHole[17]).toBe(0);
    expect(byPlayerId.get("holway")).toMatchObject({
      courseHandicap: 12,
      playingHandicap: 0,
      matchStrokeCount: 0
    });
    expect(byPlayerId.get("chase")).toMatchObject({
      courseHandicap: 14,
      playingHandicap: 3,
      matchStrokeCount: 3
    });
    expect(byPlayerId.get("chase")?.strokesByHole[17]).toBe(1);
    expect(holeSeventeen?.winningTeamId).toBeNull();
    expect(barronTeam?.totalPoints).toBe(8.5);
    expect(holwayTeam?.totalPoints).toBe(9.5);
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
