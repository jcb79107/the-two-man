import { describe, expect, it } from "vitest";
import {
  computeOfficialResultSnapshotForMatch,
  getOfficialResultSnapshotForMatch
} from "@/lib/server/official-result-snapshot";

const holes = [
  { holeNumber: 1, par: 4, strokeIndex: 1 },
  { holeNumber: 2, par: 4, strokeIndex: 2 },
  { holeNumber: 3, par: 4, strokeIndex: 3 }
];

function buildMatch() {
  return {
    id: "snapshot-match",
    publicScorecardSlug: "snapshot-match",
    status: "FINAL",
    winningTeamId: "team-a",
    homeTeamId: "team-a",
    awayTeamId: "team-b",
    tournament: {
      forfeitPointsAwarded: 12,
      forfeitHolesWonAwarded: 6
    },
    playerSelections: [
      {
        playerId: "a1",
        teamId: "team-a",
        teeId: "tee",
        teeNameSnapshot: "Blue",
        handicapIndexSnapshot: 0,
        slopeSnapshot: 113,
        courseRatingSnapshot: 72,
        parSnapshot: 72,
        player: { displayName: "A One" },
        tee: { holes }
      },
      {
        playerId: "a2",
        teamId: "team-a",
        teeId: "tee",
        teeNameSnapshot: "Blue",
        handicapIndexSnapshot: 0,
        slopeSnapshot: 113,
        courseRatingSnapshot: 72,
        parSnapshot: 72,
        player: { displayName: "A Two" },
        tee: { holes }
      },
      {
        playerId: "b1",
        teamId: "team-b",
        teeId: "tee",
        teeNameSnapshot: "Blue",
        handicapIndexSnapshot: 0,
        slopeSnapshot: 113,
        courseRatingSnapshot: 72,
        parSnapshot: 72,
        player: { displayName: "B One" },
        tee: { holes }
      },
      {
        playerId: "b2",
        teamId: "team-b",
        teeId: "tee",
        teeNameSnapshot: "Blue",
        handicapIndexSnapshot: 0,
        slopeSnapshot: 113,
        courseRatingSnapshot: 72,
        parSnapshot: 72,
        player: { displayName: "B Two" },
        tee: { holes }
      }
    ],
    holeScores: [
      { holeNumber: 1, playerId: "a1", grossScore: 4 },
      { holeNumber: 1, playerId: "a2", grossScore: 5 },
      { holeNumber: 1, playerId: "b1", grossScore: 5 },
      { holeNumber: 1, playerId: "b2", grossScore: 5 },
      { holeNumber: 2, playerId: "a1", grossScore: 4 },
      { holeNumber: 2, playerId: "a2", grossScore: 5 },
      { holeNumber: 2, playerId: "b1", grossScore: 4 },
      { holeNumber: 2, playerId: "b2", grossScore: 5 },
      { holeNumber: 3, playerId: "a1", grossScore: 5 },
      { holeNumber: 3, playerId: "a2", grossScore: 5 },
      { holeNumber: 3, playerId: "b1", grossScore: 4 },
      { holeNumber: 3, playerId: "b2", grossScore: 5 }
    ]
  };
}

describe("official result snapshots", () => {
  it("freezes finalized results instead of recomputing from later raw score changes", () => {
    const match = buildMatch();
    const snapshot = computeOfficialResultSnapshotForMatch(match);

    expect(snapshot?.teamSummaries.find((summary) => summary.teamId === "team-a")).toMatchObject({
      totalPoints: 1.5,
      resultCode: "WIN"
    });

    const changedMatch = {
      ...match,
      officialResultSnapshot: snapshot,
      holeScores: match.holeScores.map((score) =>
        score.playerId.startsWith("a")
          ? {
              ...score,
              grossScore: 9
            }
          : {
              ...score,
              grossScore: 3
            }
      )
    };
    const frozen = getOfficialResultSnapshotForMatch(changedMatch);

    expect(frozen?.teamSummaries.find((summary) => summary.teamId === "team-a")).toMatchObject({
      totalPoints: 1.5,
      resultCode: "WIN"
    });
    expect(frozen?.teamSummaries.find((summary) => summary.teamId === "team-b")).toMatchObject({
      totalPoints: 1.5,
      resultCode: "LOSS"
    });
  });
});
