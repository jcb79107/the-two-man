import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  db: {
    match: {
      findUnique: vi.fn()
    },
    $transaction: vi.fn()
  },
  getPrivateMatchRecordByToken: vi.fn(),
  isAdminAuthenticated: vi.fn(),
  syncTournamentBracketTx: vi.fn()
}));

vi.mock("@/lib/server/db", () => ({
  db: mocks.db
}));

vi.mock("@/lib/server/matches", () => ({
  getPrivateMatchRecordByToken: mocks.getPrivateMatchRecordByToken
}));

vi.mock("@/lib/server/admin-auth", () => ({
  isAdminAuthenticated: mocks.isAdminAuthenticated
}));

vi.mock("@/lib/server/bracket-sync", () => ({
  syncTournamentBracketTx: mocks.syncTournamentBracketTx
}));

const holes = Array.from({ length: 18 }, (_, index) => ({
  holeNumber: index + 1,
  par: index % 2 === 0 ? 4 : 5,
  strokeIndex: index + 1
}));

function buildMatchFixture() {
  const players = [
    { playerId: "p1", playerName: "Player One", teamId: "home-team" },
    { playerId: "p2", playerName: "Player Two", teamId: "home-team" },
    { playerId: "p3", playerName: "Player Three", teamId: "away-team" },
    { playerId: "p4", playerName: "Player Four", teamId: "away-team" }
  ];

  return {
    id: "match-1",
    tournamentId: "tournament-1",
    privateToken: "private-token",
    status: "READY",
    stage: "POD_PLAY",
    roundLabel: "Pod Match 1",
    isOverride: false,
    reopenedAt: null,
    finalizedAt: null,
    submittedAt: null,
    winningTeamId: null,
    overrideNote: null,
    homeTeam: {
      id: "home-team",
      name: "Home Team",
      roster: players
        .filter((player) => player.teamId === "home-team")
        .map((player) => ({
          player: {
            id: player.playerId,
            displayName: player.playerName
          }
        }))
    },
    awayTeam: {
      id: "away-team",
      name: "Away Team",
      roster: players
        .filter((player) => player.teamId === "away-team")
        .map((player) => ({
          player: {
            id: player.playerId,
            displayName: player.playerName
          }
        }))
    },
    playerSelections: players.map((player) => ({
      playerId: player.playerId,
      player: {
        displayName: player.playerName
      },
      teamId: player.teamId,
      teeId: "tee-1",
      teeNameSnapshot: "Blue",
      handicapIndexSnapshot: 10,
      slopeSnapshot: 113,
      courseRatingSnapshot: 72,
      parSnapshot: 72,
      tee: {
        holes
      }
    }))
  };
}

async function postScorecard(body: unknown) {
  const { POST } = await import("../app/api/matches/[token]/scorecard/route");

  return POST(
    new Request("http://localhost/api/matches/private-token/scorecard", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }),
    {
      params: Promise.resolve({ token: "private-token" })
    }
  );
}

describe("private scorecard API validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.match.findUnique.mockResolvedValue(buildMatchFixture());
    mocks.db.$transaction.mockRejectedValue(new Error("Validation should stop before a transaction."));
    mocks.isAdminAuthenticated.mockResolvedValue(false);
  });

  it("rejects duplicate hole rows before saving a draft", async () => {
    const response = await postScorecard({
      action: "saveDraft",
      scores: [
        { holeNumber: 1, scores: { p1: "4" } },
        { holeNumber: 1, scores: { p1: "5" } }
      ]
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Hole 1 was submitted more than once."
    });
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects score payloads for players outside the match", async () => {
    const response = await postScorecard({
      action: "saveDraft",
      scores: [{ holeNumber: 1, scores: { p1: "4", rogue: "5" } }]
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Submitted scores included a player who is not part of this match."
    });
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });

  it("requires all 18 template holes before publishing", async () => {
    const response = await postScorecard({
      action: "publish",
      scores: holes.slice(0, 17).map((hole) => ({
        holeNumber: hole.holeNumber,
        scores: {
          p1: "4",
          p2: "5",
          p3: "4",
          p4: "5"
        }
      }))
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "All 18 holes must be submitted before publishing."
    });
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });
});
