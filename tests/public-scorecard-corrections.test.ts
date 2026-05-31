import { describe, expect, it } from "vitest";
import { scoreMatch } from "@/lib/scoring/engine";
import { applyPublicScorecardCorrections } from "@/lib/server/public-scorecard-corrections";

describe("applyPublicScorecardCorrections", () => {
  it("fixes the Heritage Oaks public card to a 10-8 Grant & Rausch win", () => {
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

    expect(holeNine?.par).toBe(5);
    expect(grantTeam?.totalPoints).toBe(10);
    expect(aginsTeam?.totalPoints).toBe(8);
    expect(frontNinePoints).toEqual({ grant: 4, agins: 5 });
  });
});
