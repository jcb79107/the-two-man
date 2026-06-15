import { beforeEach, describe, expect, it, vi } from "vitest";

const getPublicTournamentStateMock = vi.fn();

vi.mock("@/lib/server/public-tournament", () => ({
  getPublicTournamentState: getPublicTournamentStateMock
}));

describe("public standings API", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns projected playoff fields separately from official wild cards", async () => {
    getPublicTournamentStateMock.mockResolvedValue({
      podStandings: [],
      wildCards: [],
      projectedPlayoffField: [
        {
          seedNumber: 7,
          qualifierType: "WILD_CARD",
          teamId: "team-wc-1",
          teamName: "Wild One",
          podId: "pod-1"
        }
      ],
      wildCardProjection: [
        {
          seedNumber: 7,
          qualifierType: "WILD_CARD",
          teamId: "team-wc-1",
          teamName: "Wild One",
          podId: "pod-1"
        }
      ],
      wildCardBubble: [
        {
          seedNumber: 9,
          qualifierType: "WILD_CARD",
          teamId: "team-bubble-1",
          teamName: "Bubble One",
          podId: "pod-2"
        }
      ]
    });

    const { GET } = await import("../app/api/public/tournament/[slug]/standings/route");
    const response = await GET({} as Request, {
      params: Promise.resolve({ slug: "the-two-man-2026" })
    });

    await expect(response.json()).resolves.toEqual({
      tournamentSlug: "the-two-man-2026",
      pods: [],
      wildCards: [],
      projectedPlayoffField: [
        {
          seedNumber: 7,
          qualifierType: "WILD_CARD",
          teamId: "team-wc-1",
          teamName: "Wild One",
          podId: "pod-1"
        }
      ],
      wildCardProjection: [
        {
          seedNumber: 7,
          qualifierType: "WILD_CARD",
          teamId: "team-wc-1",
          teamName: "Wild One",
          podId: "pod-1"
        }
      ],
      wildCardBubble: [
        {
          seedNumber: 9,
          qualifierType: "WILD_CARD",
          teamId: "team-bubble-1",
          teamName: "Bubble One",
          podId: "pod-2"
        }
      ]
    });
  });
});
