import { describe, expect, it } from "vitest";
import { scoreMatch } from "@/lib/scoring/engine";
import {
  applyComputedPublicScorecardCorrections,
  applyPublicScorecardCorrections
} from "@/lib/server/public-scorecard-corrections";

describe("applyPublicScorecardCorrections", () => {
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
      holeScores: []
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
