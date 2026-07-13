import { describe, expect, it } from "vitest";
import { formatMatchPlayResultLabel } from "@/lib/scoring/match-play";
import {
  buildManualMatchPlaySnapshot,
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
    stage: "POD_PLAY",
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

  it("freezes a playoff result once match play is closed out before 18", () => {
    const fullHoles = Array.from({ length: 18 }, (_, index) => ({
      holeNumber: index + 1,
      par: 4,
      strokeIndex: index + 1
    }));
    const baseMatch = buildMatch();
    const match = {
      ...baseMatch,
      stage: "QUARTERFINAL",
      winningTeamId: "team-a",
      playerSelections: baseMatch.playerSelections.map((selection) => ({
        ...selection,
        tee: { holes: fullHoles }
      })),
      holeScores: fullHoles.slice(0, 15).flatMap((hole) => [
        { holeNumber: hole.holeNumber, playerId: "a1", grossScore: 4 },
        { holeNumber: hole.holeNumber, playerId: "a2", grossScore: 5 },
        { holeNumber: hole.holeNumber, playerId: "b1", grossScore: hole.holeNumber <= 4 ? 4 : 5 },
        { holeNumber: hole.holeNumber, playerId: "b2", grossScore: 6 }
      ])
    };
    const snapshot = computeOfficialResultSnapshotForMatch(match);

    expect(snapshot?.winningTeamId).toBe("team-a");
    expect(snapshot?.holes).toHaveLength(15);
    expect(snapshot?.holeMeta).toHaveLength(15);
    expect(snapshot?.teamSummaries.find((summary) => summary.teamId === "team-a")).toMatchObject({
      holesWon: 11,
      resultCode: "WIN"
    });
  });

  it("builds a manual playoff result snapshot without hole-by-hole scores", () => {
    const snapshot = buildManualMatchPlaySnapshot({
      homeTeamId: "team-a",
      awayTeamId: "team-b",
      winningTeamId: "team-b",
      lead: 4,
      holesRemaining: 3,
      playedHoleCount: 15,
      generatedAt: new Date("2026-07-15T12:00:00.000Z")
    });

    expect(snapshot?.players).toEqual([]);
    expect(snapshot?.holes).toHaveLength(15);
    expect(snapshot?.winningTeamId).toBe("team-b");
    expect(
      formatMatchPlayResultLabel({
        teamSummaries: snapshot?.teamSummaries ?? [],
        teamNames: {
          "team-a": "Alpha",
          "team-b": "Bravo"
        },
        playedHoleCount: snapshot?.holes.length ?? 0,
        totalHoleCount: 18,
        winningTeamId: snapshot?.winningTeamId
      })
    ).toBe("Bravo wins 4&3");
  });
});
