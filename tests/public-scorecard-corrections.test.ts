import { describe, expect, it } from "vitest";
import { scoreMatch } from "@/lib/scoring/engine";
import {
  applyComputedPublicScorecardCorrections,
  applyPublicScorecardCorrections
} from "@/lib/server/public-scorecard-corrections";

type TestHoleScore = {
  holeNumber: number;
  playerId: string;
  grossScore: number;
};

describe("applyPublicScorecardCorrections", () => {
  it("normalizes legacy Bryn Mawr hole handicaps even when a public match is already posted", () => {
    const holes = [
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
      { holeNumber: 12, par: 4, strokeIndex: 4 },
      { holeNumber: 13, par: 5, strokeIndex: 6 },
      { holeNumber: 14, par: 3, strokeIndex: 14 },
      { holeNumber: 15, par: 5, strokeIndex: 10 },
      { holeNumber: 16, par: 3, strokeIndex: 18 },
      { holeNumber: 17, par: 4, strokeIndex: 2 },
      { holeNumber: 18, par: 5, strokeIndex: 12 }
    ];

    const match = applyPublicScorecardCorrections({
      id: "posted-bryn-mawr-match",
      publicScorecardSlug: "posted-bryn-mawr-match",
      playerSelections: [
        {
          playerId: "player-1",
          player: { displayName: "Player 1" },
          teamId: "team-a",
          teeId: "tee-1",
          teeNameSnapshot: "Langford",
          handicapIndexSnapshot: 4.2,
          slopeSnapshot: 130,
          courseRatingSnapshot: 72.4,
          parSnapshot: 72,
          tee: { holes }
        }
      ],
      holeScores: [] as TestHoleScore[]
    });

    expect(match.playerSelections[0]?.tee.holes.find((hole) => hole.holeNumber === 12)?.strokeIndex).toBe(6);
    expect(match.playerSelections[0]?.tee.holes.find((hole) => hole.holeNumber === 13)?.strokeIndex).toBe(4);
  });

  it("corrects Holway and Chase over Barron and Loewenstein to 9.5-8.5", () => {
    const holes = [
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
    const playerScores = {
      barron: [5, 5, 4, 4, 6, 3, 5, 3, 4, 4, 5, 4, 6, 4, 6, 4, 5, 5],
      loewenstein: [5, 4, 5, 5, 8, 4, 4, 4, 5, 4, 4, 6, 6, 3, 6, 3, 5, 7],
      holway: [7, 6, 5, 4, 5, 4, 5, 5, 6, 5, 4, 4, 5, 5, 5, 3, 6, 5],
      chase: [6, 4, 5, 3, 7, 4, 3, 4, 5, 3, 4, 4, 6, 4, 5, 3, 5, 6]
    };
    const match = applyPublicScorecardCorrections({
      id: "790d2420711943629dafc",
      publicScorecardSlug: "790d2420711943629dafc",
      playerSelections: [
        {
          playerId: "barron",
          player: { displayName: "Judd Barron" },
          teamId: "barron-loewenstein",
          teeId: "bryn-mawr-langford-men",
          teeNameSnapshot: "Langford",
          handicapIndexSnapshot: 9.6,
          slopeSnapshot: 130,
          courseRatingSnapshot: 72.4,
          parSnapshot: 72,
          tee: { holes }
        },
        {
          playerId: "loewenstein",
          player: { displayName: "Judd Loewenstein" },
          teamId: "barron-loewenstein",
          teeId: "bryn-mawr-langford-men",
          teeNameSnapshot: "Langford",
          handicapIndexSnapshot: 10.9,
          slopeSnapshot: 130,
          courseRatingSnapshot: 72.4,
          parSnapshot: 72,
          tee: { holes }
        },
        {
          playerId: "holway",
          player: { displayName: "Bradley Holway" },
          teamId: "holway-chase",
          teeId: "bryn-mawr-langford-men",
          teeNameSnapshot: "Langford",
          handicapIndexSnapshot: 9.8,
          slopeSnapshot: 130,
          courseRatingSnapshot: 72.4,
          parSnapshot: 72,
          tee: { holes }
        },
        {
          playerId: "chase",
          player: { displayName: "Dylan Chase" },
          teamId: "holway-chase",
          teeId: "bryn-mawr-langford-men",
          teeNameSnapshot: "Langford",
          handicapIndexSnapshot: 12.2,
          slopeSnapshot: 130,
          courseRatingSnapshot: 72.4,
          parSnapshot: 72,
          tee: { holes }
        }
      ],
      holeScores: Object.entries(playerScores).flatMap(([playerId, grossScores]) =>
        grossScores.map((grossScore, index) => ({
          holeNumber: index + 1,
          playerId,
          grossScore
        }))
      )
    });

    const result = scoreMatch({
      players: match.playerSelections.map((selection) => ({
        playerId: selection.playerId,
        playerName: selection.player.displayName,
        teamId: selection.teamId,
        handicapIndex: Number(selection.handicapIndexSnapshot),
        teeId: selection.teeId,
        teeName: selection.teeNameSnapshot,
        slope: selection.slopeSnapshot,
        courseRating: Number(selection.courseRatingSnapshot),
        par: selection.parSnapshot,
        holes: selection.tee.holes
      })),
      holeScores: holes.map((hole) => ({
        holeNumber: hole.holeNumber,
        scores: Object.fromEntries(
          match.holeScores
            .filter((entry) => entry.holeNumber === hole.holeNumber)
            .map((entry) => [entry.playerId, entry.grossScore])
        )
      }))
    });

    const chaseHoleSeventeen = match.holeScores.find(
      (entry) => entry.playerId === "chase" && entry.holeNumber === 17
    );
    const barronTeam = result.teamSummaries.find((summary) => summary.teamId === "barron-loewenstein");
    const holwayTeam = result.teamSummaries.find((summary) => summary.teamId === "holway-chase");

    expect(chaseHoleSeventeen?.grossScore).toBe(6);
    expect(result.holes.find((hole) => hole.holeNumber === 17)?.winningTeamId).toBeNull();
    expect(barronTeam?.totalPoints).toBe(8.5);
    expect(holwayTeam?.totalPoints).toBe(9.5);
  });

  it("corrects Daitch and Reimer against Malkin and Jolcolver to a 9-9 tie", () => {
    const holes = [
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
    const playerScores = {
      malkin: [5, 5, 4, 5, 5, 3, 5, 4, 5, 3, 5, 5, 5, 4, 6, 2, 5, 6],
      jolcover: [6, 5, 5, 6, 6, 4, 4, 3, 5, 4, 5, 5, 6, 4, 5, 4, 5, 6],
      daitch: [5, 6, 5, 7, 5, 4, 5, 3, 5, 5, 6, 5, 7, 3, 6, 4, 6, 7],
      reimer: [4, 7, 4, 7, 6, 4, 5, 4, 5, 4, 5, 6, 7, 6, 7, 4, 6, 6]
    };
    const match = applyPublicScorecardCorrections({
      id: "5d58d0c0b37f4b87a570a",
      publicScorecardSlug: "5d58d0c0b37f4b87a570a",
      playerSelections: [
        {
          playerId: "malkin",
          player: { displayName: "Eli Malkin" },
          teamId: "malkin-jolcolver",
          teeId: "bryn-mawr-langford-men",
          teeNameSnapshot: "Langford",
          handicapIndexSnapshot: 7.1,
          slopeSnapshot: 130,
          courseRatingSnapshot: 72.4,
          parSnapshot: 72,
          tee: { holes }
        },
        {
          playerId: "jolcover",
          player: { displayName: "Isaac Jolcover" },
          teamId: "malkin-jolcolver",
          teeId: "bryn-mawr-langford-men",
          teeNameSnapshot: "Langford",
          handicapIndexSnapshot: 7.1,
          slopeSnapshot: 130,
          courseRatingSnapshot: 72.4,
          parSnapshot: 72,
          tee: { holes }
        },
        {
          playerId: "daitch",
          player: { displayName: "Jacob Daitch" },
          teamId: "daitch-reimer",
          teeId: "bryn-mawr-langford-men",
          teeNameSnapshot: "Langford",
          handicapIndexSnapshot: 17.4,
          slopeSnapshot: 130,
          courseRatingSnapshot: 72.4,
          parSnapshot: 72,
          tee: { holes }
        },
        {
          playerId: "reimer",
          player: { displayName: "Noah Reimer" },
          teamId: "daitch-reimer",
          teeId: "bryn-mawr-langford-men",
          teeNameSnapshot: "Langford",
          handicapIndexSnapshot: 6,
          slopeSnapshot: 130,
          courseRatingSnapshot: 72.4,
          parSnapshot: 72,
          tee: { holes }
        }
      ],
      holeScores: Object.entries(playerScores).flatMap(([playerId, grossScores]) =>
        grossScores.map((grossScore, index) => ({
          holeNumber: index + 1,
          playerId,
          grossScore
        }))
      )
    });

    const result = scoreMatch({
      players: match.playerSelections.map((selection) => ({
        playerId: selection.playerId,
        playerName: selection.player.displayName,
        teamId: selection.teamId,
        handicapIndex: Number(selection.handicapIndexSnapshot),
        teeId: selection.teeId,
        teeName: selection.teeNameSnapshot,
        slope: selection.slopeSnapshot,
        courseRating: Number(selection.courseRatingSnapshot),
        par: selection.parSnapshot,
        holes: selection.tee.holes
      })),
      holeScores: holes.map((hole) => ({
        holeNumber: hole.holeNumber,
        scores: Object.fromEntries(
          match.holeScores
            .filter((entry) => entry.holeNumber === hole.holeNumber)
            .map((entry) => [entry.playerId, entry.grossScore])
        )
      }))
    });
    const correctedResult = applyComputedPublicScorecardCorrections("5d58d0c0b37f4b87a570a", {
      ...result,
      players: match.playerSelections.map((selection) => {
        const grossByHole = Object.fromEntries(
          match.holeScores
            .filter((entry) => entry.playerId === selection.playerId)
            .map((entry) => [entry.holeNumber, entry.grossScore])
        );
        const snapshot = result.players.find((player) => player.playerId === selection.playerId);

        return {
          playerId: selection.playerId,
          playerName: selection.player.displayName,
          teamId: selection.teamId,
          teeName: selection.teeNameSnapshot,
          handicapIndex: Number(selection.handicapIndexSnapshot),
          matchStrokeCount: snapshot?.matchStrokeCount ?? 0,
          strokesByHole: snapshot?.strokesByHole ?? {},
          grossByHole,
          netByHole: Object.fromEntries(
            result.holes.map((hole) => [hole.holeNumber, hole.playerNetScores[selection.playerId] ?? null])
          )
        };
      }),
      teamSummaries: [
        {
          teamId: "malkin-jolcolver",
          totalPoints: 8.5,
          holesWon: 5,
          betterBallGrossTotal: 79,
          betterBallNetTotal: 78,
          resultCode: "TIE"
        },
        {
          teamId: "daitch-reimer",
          totalPoints: 9.5,
          holesWon: 6,
          betterBallGrossTotal: 89,
          betterBallNetTotal: 79,
          resultCode: "TIE"
        }
      ]
    });

    const reimerHoleOne = match.holeScores.find(
      (entry) => entry.playerId === "reimer" && entry.holeNumber === 1
    );
    const daitch = correctedResult.players.find((player) => player.playerId === "daitch");
    const malkinTeam = correctedResult.teamSummaries.find((summary) => summary.teamId === "malkin-jolcolver");
    const daitchTeam = correctedResult.teamSummaries.find((summary) => summary.teamId === "daitch-reimer");

    expect(reimerHoleOne?.grossScore).toBe(4);
    expect(daitch?.strokesByHole[8]).toBe(0);
    expect(daitch?.strokesByHole[17]).toBe(1);
    expect(correctedResult.holes.find((hole) => hole.holeNumber === 8)).toMatchObject({
      winningTeamId: null,
      teamPoints: { "malkin-jolcolver": 0.5, "daitch-reimer": 0.5 },
      teamBetterBallNet: { "malkin-jolcolver": 3, "daitch-reimer": 3 }
    });
    expect(malkinTeam).toMatchObject({ totalPoints: 9, resultCode: "TIE" });
    expect(daitchTeam).toMatchObject({ totalPoints: 9, resultCode: "TIE" });
  });

  it("corrects Stone and Stone over Rabin and Taitz to 10-8", () => {
    const holes = [
      { holeNumber: 1, par: 4, strokeIndex: 7 },
      { holeNumber: 2, par: 5, strokeIndex: 5 },
      { holeNumber: 3, par: 4, strokeIndex: 9 },
      { holeNumber: 4, par: 3, strokeIndex: 13 },
      { holeNumber: 5, par: 4, strokeIndex: 3 },
      { holeNumber: 6, par: 3, strokeIndex: 15 },
      { holeNumber: 7, par: 5, strokeIndex: 1 },
      { holeNumber: 8, par: 4, strokeIndex: 17 },
      { holeNumber: 9, par: 4, strokeIndex: 11 },
      { holeNumber: 10, par: 4, strokeIndex: 14 },
      { holeNumber: 11, par: 3, strokeIndex: 16 },
      { holeNumber: 12, par: 5, strokeIndex: 4 },
      { holeNumber: 13, par: 4, strokeIndex: 2 },
      { holeNumber: 14, par: 3, strokeIndex: 12 },
      { holeNumber: 15, par: 4, strokeIndex: 6 },
      { holeNumber: 16, par: 4, strokeIndex: 8 },
      { holeNumber: 17, par: 5, strokeIndex: 10 },
      { holeNumber: 18, par: 4, strokeIndex: 18 }
    ];
    const playerScores = {
      jonStone: [6, 5, 5, 5, 6, 3, 6, 5, 5, 7, 3, 7, 4, 5, 4, 4, 6, 5],
      aaronStone: [4, 6, 5, 4, 5, 4, 6, 4, 5, 6, 5, 8, 6, 5, 5, 5, 5, 5],
      rabin: [6, 4, 5, 6, 6, 3, 6, 5, 4, 7, 4, 6, 6, 4, 5, 7, 8, 5],
      taitz: [5, 7, 7, 5, 5, 4, 7, 6, 6, 7, 3, 5, 4, 3, 6, 6, 5, 6]
    };
    const match = applyPublicScorecardCorrections({
      id: "a33ade26035147989b239",
      publicScorecardSlug: "a33ade26035147989b239",
      playerSelections: [
        {
          playerId: "jonStone",
          player: { displayName: "Jon Stone" },
          teamId: "stone-stone",
          teeId: "sunset-blue",
          teeNameSnapshot: "Blue",
          handicapIndexSnapshot: 16.2,
          slopeSnapshot: 130,
          courseRatingSnapshot: 70.7,
          parSnapshot: 72,
          tee: { holes }
        },
        {
          playerId: "aaronStone",
          player: { displayName: "Aaron Stone" },
          teamId: "stone-stone",
          teeId: "sunset-blue",
          teeNameSnapshot: "Blue",
          handicapIndexSnapshot: 15.6,
          slopeSnapshot: 130,
          courseRatingSnapshot: 70.7,
          parSnapshot: 72,
          tee: { holes }
        },
        {
          playerId: "rabin",
          player: { displayName: "Ryan Rabin" },
          teamId: "rabin-taitz",
          teeId: "sunset-blue",
          teeNameSnapshot: "Blue",
          handicapIndexSnapshot: 22.4,
          slopeSnapshot: 130,
          courseRatingSnapshot: 70.7,
          parSnapshot: 72,
          tee: { holes }
        },
        {
          playerId: "taitz",
          player: { displayName: "Jason Taitz" },
          teamId: "rabin-taitz",
          teeId: "sunset-blue",
          teeNameSnapshot: "Blue",
          handicapIndexSnapshot: 15,
          slopeSnapshot: 130,
          courseRatingSnapshot: 70.7,
          parSnapshot: 72,
          tee: { holes }
        }
      ],
      holeScores: Object.entries(playerScores).flatMap(([playerId, grossScores]) =>
        grossScores.map((grossScore, index) => ({
          holeNumber: index + 1,
          playerId,
          grossScore
        }))
      )
    });

    const result = scoreMatch({
      players: match.playerSelections.map((selection) => ({
        playerId: selection.playerId,
        playerName: selection.player.displayName,
        teamId: selection.teamId,
        handicapIndex: Number(selection.handicapIndexSnapshot),
        teeId: selection.teeId,
        teeName: selection.teeNameSnapshot,
        slope: selection.slopeSnapshot,
        courseRating: Number(selection.courseRatingSnapshot),
        par: selection.parSnapshot,
        holes: selection.tee.holes
      })),
      holeScores: holes.map((hole) => ({
        holeNumber: hole.holeNumber,
        scores: Object.fromEntries(
          match.holeScores
            .filter((entry) => entry.holeNumber === hole.holeNumber)
            .map((entry) => [entry.playerId, entry.grossScore])
        )
      }))
    });

    const rabinHoleEighteen = match.holeScores.find(
      (entry) => entry.playerId === "rabin" && entry.holeNumber === 18
    );
    const stoneTeam = result.teamSummaries.find((summary) => summary.teamId === "stone-stone");
    const rabinTeam = result.teamSummaries.find((summary) => summary.teamId === "rabin-taitz");

    expect(rabinHoleEighteen?.grossScore).toBe(6);
    expect(result.holes.find((hole) => hole.holeNumber === 18)).toMatchObject({
      winningTeamId: "stone-stone",
      teamPoints: { "stone-stone": 1, "rabin-taitz": 0 },
      teamBetterBallNet: { "stone-stone": 5, "rabin-taitz": 6 }
    });
    expect(stoneTeam).toMatchObject({ totalPoints: 10, holesWon: 6, resultCode: "WIN" });
    expect(rabinTeam).toMatchObject({ totalPoints: 8, holesWon: 4, resultCode: "LOSS" });
  });

  it("fixes the Heritage Oaks public card to the official maroon-tee 10-8 result", () => {
    const holes = [
      { holeNumber: 1, par: 5, strokeIndex: 7 },
      { holeNumber: 2, par: 4, strokeIndex: 1 },
      { holeNumber: 3, par: 3, strokeIndex: 15 },
      { holeNumber: 4, par: 4, strokeIndex: 13 },
      { holeNumber: 5, par: 4, strokeIndex: 9 },
      { holeNumber: 6, par: 3, strokeIndex: 17 },
      { holeNumber: 7, par: 5, strokeIndex: 3 },
      { holeNumber: 8, par: 3, strokeIndex: 11 },
      { holeNumber: 9, par: 4, strokeIndex: 5 },
      { holeNumber: 10, par: 3, strokeIndex: 18 },
      { holeNumber: 11, par: 4, strokeIndex: 10 },
      { holeNumber: 12, par: 4, strokeIndex: 4 },
      { holeNumber: 13, par: 4, strokeIndex: 12 },
      { holeNumber: 14, par: 3, strokeIndex: 16 },
      { holeNumber: 15, par: 4, strokeIndex: 6 },
      { holeNumber: 16, par: 4, strokeIndex: 14 },
      { holeNumber: 17, par: 5, strokeIndex: 2 },
      { holeNumber: 18, par: 4, strokeIndex: 8 }
    ];
    const match = applyPublicScorecardCorrections({
      id: "a9ba0d7cbda94ddda8a7a",
      publicScorecardSlug: "pod-1-match-3-a9ba0d7cbda94ddda8a7a",
      playerSelections: [
        {
          playerId: "team-13-player-1",
          player: { displayName: "Andrew Rausch" },
          teamId: "team-13",
          teeId: "heritage-oaks-blue",
          teeNameSnapshot: "Blue",
          handicapIndexSnapshot: 5.3,
          slopeSnapshot: 128,
          courseRatingSnapshot: 70.2,
          parSnapshot: 70,
          tee: { holes }
        },
        {
          playerId: "team-13-player-2",
          player: { displayName: "Brandon Grant" },
          teamId: "team-13",
          teeId: "heritage-oaks-blue",
          teeNameSnapshot: "Blue",
          handicapIndexSnapshot: 23.5,
          slopeSnapshot: 128,
          courseRatingSnapshot: 70.2,
          parSnapshot: 70,
          tee: { holes }
        },
        {
          playerId: "team-15-player-1",
          player: { displayName: "Ross Agins" },
          teamId: "team-15",
          teeId: "heritage-oaks-blue",
          teeNameSnapshot: "Blue",
          handicapIndexSnapshot: 20,
          slopeSnapshot: 128,
          courseRatingSnapshot: 70.2,
          parSnapshot: 70,
          tee: { holes }
        },
        {
          playerId: "team-15-player-2",
          player: { displayName: "Noah Deutsch" },
          teamId: "team-15",
          teeId: "heritage-oaks-blue",
          teeNameSnapshot: "Blue",
          handicapIndexSnapshot: 13.7,
          slopeSnapshot: 128,
          courseRatingSnapshot: 70.2,
          parSnapshot: 70,
          tee: { holes }
        }
      ],
      holeScores: [] as TestHoleScore[]
    });

    const result = scoreMatch({
      players: match.playerSelections.map((selection) => ({
        playerId: selection.playerId,
        playerName: selection.player.displayName,
        teamId: selection.teamId,
        handicapIndex: Number(selection.handicapIndexSnapshot),
        teeId: selection.teeId,
        teeName: selection.teeNameSnapshot,
        slope: selection.slopeSnapshot,
        courseRating: Number(selection.courseRatingSnapshot),
        par: selection.parSnapshot,
        holes: selection.tee.holes
      })),
      holeScores: holes.map((hole) => ({
        holeNumber: hole.holeNumber,
        scores: Object.fromEntries(
          match.holeScores
            .filter((entry) => entry.holeNumber === hole.holeNumber)
            .map((entry) => [entry.playerId, entry.grossScore])
        )
      }))
    });

    const holeNine = match.playerSelections[0]?.tee.holes.find((hole) => hole.holeNumber === 9);
    const grantTeam = result.teamSummaries.find((summary) => summary.teamId === "team-13");
    const aginsTeam = result.teamSummaries.find((summary) => summary.teamId === "team-15");
    const frontNinePoints = result.holes
      .filter((hole) => hole.holeNumber <= 9)
      .reduce(
        (totals, hole) => ({
          grant: totals.grant + (hole.teamPoints["team-13"] ?? 0),
          agins: totals.agins + (hole.teamPoints["team-15"] ?? 0)
        }),
        { grant: 0, agins: 0 }
      );
    const winningHoles = {
      grant: result.holes
        .filter((hole) => hole.winningTeamId === "team-13")
        .map((hole) => hole.holeNumber),
      agins: result.holes
        .filter((hole) => hole.winningTeamId === "team-15")
        .map((hole) => hole.holeNumber),
      tied: result.holes
        .filter((hole) => hole.winningTeamId == null)
        .map((hole) => hole.holeNumber)
    };

    expect(match.playerSelections[0]?.teeNameSnapshot).toBe("Maroon");
    expect(holeNine?.par).toBe(4);
    expect(grantTeam?.totalPoints).toBe(10);
    expect(aginsTeam?.totalPoints).toBe(8);
    expect(frontNinePoints).toEqual({ grant: 4, agins: 5 });
    expect(winningHoles).toEqual({
      grant: [1, 3, 7, 10, 14, 16, 17],
      agins: [2, 5, 8, 9, 12],
      tied: [4, 6, 11, 13, 15, 18]
    });
  });
});

describe("applyPublicScorecardCorrections", () => {
  it("forces the Briarwood public card onto the II-tee hole metadata", () => {
    const match = applyPublicScorecardCorrections({
      id: "f13e674887224826adc18",
      publicScorecardSlug: "f13e674887224826adc18",
      playerSelections: [
        {
          playerId: "team-04-player-1",
          player: { displayName: "Zach Nankin" },
          teamId: "team-04",
          teeId: "briarwood-wrong-tee",
          teeNameSnapshot: "III",
          handicapIndexSnapshot: 3.6,
          slopeSnapshot: 0,
          courseRatingSnapshot: 0,
          parSnapshot: 72,
          tee: {
            holes: Array.from({ length: 18 }, (_, index) => ({
              holeNumber: index + 1,
              par: 4,
              strokeIndex: 18 - index,
              yardage: 999
            }))
          }
        }
      ],
      holeScores: []
    });

    expect(match.playerSelections[0]?.teeNameSnapshot).toBe("II");
    expect(match.playerSelections[0]?.tee.holes.find((hole) => hole.holeNumber === 1)).toMatchObject({
      par: 4,
      strokeIndex: 7,
      yardage: 410
    });
    expect(match.playerSelections[0]?.tee.holes.find((hole) => hole.holeNumber === 12)).toMatchObject({
      par: 4,
      strokeIndex: 2,
      yardage: 435
    });
    expect(match.playerSelections[0]?.tee.holes.find((hole) => hole.holeNumber === 18)).toMatchObject({
      par: 4,
      strokeIndex: 12,
      yardage: 380
    });
  });
});

describe("applyComputedPublicScorecardCorrections", () => {
  it("applies the Briarwood 90-percent stroke correction from the posted scorecard", () => {
    const corrected = applyComputedPublicScorecardCorrections("f13e674887224826adc18", {
      players: [
        {
          playerId: "team-04-player-1",
          playerName: "zack nankin",
          teamId: "team-04",
          teeName: "II",
          handicapIndex: 5,
          matchStrokeCount: 0,
          strokesByHole: {},
          grossByHole: { 1: 4, 2: 4, 3: 4, 4: 3, 5: 5, 6: 5, 7: 5, 8: 3, 9: 5, 10: 4, 11: 5, 12: 4, 13: 5, 14: 4, 15: 3, 16: 4, 17: 4, 18: 4 },
          netByHole: {}
        },
        {
          playerId: "team-04-player-2",
          playerName: "Jonah Sacks",
          teamId: "team-04",
          teeName: "II",
          handicapIndex: 15,
          matchStrokeCount: 11,
          strokesByHole: {},
          grossByHole: { 1: 4, 2: 5, 3: 5, 4: 5, 5: 5, 6: 4, 7: 5, 8: 4, 9: 4, 10: 4, 11: 6, 12: 5, 13: 6, 14: 7, 15: 4, 16: 5, 17: 6, 18: 6 },
          netByHole: {}
        },
        {
          playerId: "team-17-player-1",
          playerName: "Zach Lieberman",
          teamId: "team-17",
          teeName: "II",
          handicapIndex: 14,
          matchStrokeCount: 9,
          strokesByHole: {},
          grossByHole: { 1: 5, 2: 6, 3: 7, 4: 4, 5: 6, 6: 5, 7: 6, 8: 5, 9: 6, 10: 5, 11: 6, 12: 4, 13: 7, 14: 7, 15: 4, 16: 7, 17: 4, 18: 4 },
          netByHole: {}
        },
        {
          playerId: "team-17-player-2",
          playerName: "Noah Pickus",
          teamId: "team-17",
          teeName: "II",
          handicapIndex: 15,
          matchStrokeCount: 11,
          strokesByHole: {},
          grossByHole: { 1: 5, 2: 6, 3: 7, 4: 4, 5: 6, 6: 4, 7: 6, 8: 5, 9: 5, 10: 6, 11: 3, 12: 5, 13: 6, 14: 5, 15: 3, 16: 5, 17: 6, 18: 5 },
          netByHole: {}
        }
      ],
      holes: Array.from({ length: 18 }, (_, index) => ({
        holeNumber: index + 1,
        teamPoints: {},
        teamBetterBallNet: {},
        winningTeamId: null
      })),
      teamSummaries: []
    });

    expect(corrected.players.find((player) => player.playerId === "team-17-player-1")).toMatchObject({
      playerName: "Zak Lieberman",
      handicapIndex: 11,
      matchStrokeCount: 6
    });
    expect(corrected.players.find((player) => player.playerId === "team-17-player-2")).toMatchObject({
      handicapIndex: 11.8,
      matchStrokeCount: 8
    });
    expect(corrected.players.find((player) => player.playerId === "team-04-player-2")).toMatchObject({
      handicapIndex: 12,
      matchStrokeCount: 9
    });
    expect(corrected.teamSummaries).toEqual([
      expect.objectContaining({ teamId: "team-04", totalPoints: 13.5, holesWon: 11 }),
      expect.objectContaining({ teamId: "team-17", totalPoints: 4.5, holesWon: 2 })
    ]);
    expect(corrected.players.find((player) => player.playerId === "team-04-player-2")?.strokesByHole[5]).toBe(0);
    expect(corrected.players.find((player) => player.playerId === "team-04-player-2")?.strokesByHole[17]).toBe(1);
    expect(corrected.holes.find((hole) => hole.holeNumber === 6)).toMatchObject({
      winningTeamId: "team-04",
      teamPoints: { "team-04": 1, "team-17": 0 }
    });
    expect(corrected.holes.find((hole) => hole.holeNumber === 13)).toMatchObject({
      winningTeamId: "team-04",
      teamPoints: { "team-04": 1, "team-17": 0 }
    });
    expect(corrected.holes.find((hole) => hole.holeNumber === 16)).toMatchObject({
      winningTeamId: null,
      teamPoints: { "team-04": 0.5, "team-17": 0.5 }
    });
    expect(corrected.holes.find((hole) => hole.holeNumber === 17)).toMatchObject({
      winningTeamId: null,
      teamPoints: { "team-04": 0.5, "team-17": 0.5 }
    });
    expect(corrected.holes.find((hole) => hole.holeNumber === 1)).toMatchObject({
      par: 4,
      strokeIndex: 7,
      yardage: 410
    });
    expect(corrected.holes.find((hole) => hole.holeNumber === 12)).toMatchObject({
      par: 4,
      strokeIndex: 2,
      yardage: 435
    });
    expect(corrected.holeMeta?.find((hole) => hole.holeNumber === 17)).toMatchObject({
      par: 4,
      strokeIndex: 8,
      yardage: 380
    });
  });
});
