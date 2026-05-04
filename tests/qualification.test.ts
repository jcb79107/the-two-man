import { describe, expect, it } from "vitest";
import { computeQualifiedSeeds } from "@/lib/server/qualification";
import type { StandingsRow } from "@/types/models";

function row(input: Partial<StandingsRow> & Pick<StandingsRow, "teamId" | "teamName" | "podId">): StandingsRow {
  return {
    matchesPlayed: 2,
    wins: 1,
    losses: 1,
    ties: 0,
    matchRecordPoints: 1,
    holePoints: 9,
    holesWon: 9,
    cumulativeNetBetterBall: 72,
    ...input
  };
}

describe("qualification", () => {
  it("does not lock seeds until every pod has a confirmed winner", () => {
    const standings = [
      row({ teamId: "a1", teamName: "Alpha", podId: "pod-a", wins: 2, matchRecordPoints: 2 }),
      row({ teamId: "b1", teamName: "Bravo", podId: "pod-b" }),
      row({ teamId: "b2", teamName: "Charlie", podId: "pod-b" }),
      row({ teamId: "c1", teamName: "Delta", podId: "pod-c", wins: 2, matchRecordPoints: 2 })
    ];

    const seeds = computeQualifiedSeeds({
      pods: [
        { id: "pod-a", name: "Pod A" },
        { id: "pod-b", name: "Pod B" },
        { id: "pod-c", name: "Pod C" }
      ],
      standings,
      podStandings: [
        { pod: { id: "pod-a", name: "Pod A" }, rows: standings.filter((entry) => entry.podId === "pod-a") },
        { pod: { id: "pod-b", name: "Pod B" }, rows: standings.filter((entry) => entry.podId === "pod-b") },
        { pod: { id: "pod-c", name: "Pod C" }, rows: standings.filter((entry) => entry.podId === "pod-c") }
      ],
      matches: [
        { podId: "pod-a", stage: "POD_PLAY", status: "FINAL" },
        { podId: "pod-a", stage: "POD_PLAY", status: "FINAL" },
        { podId: "pod-b", stage: "POD_PLAY", status: "SCHEDULED" },
        { podId: "pod-c", stage: "POD_PLAY", status: "FINAL" },
        { podId: "pod-c", stage: "POD_PLAY", status: "FINAL" }
      ]
    });

    expect(seeds).toHaveLength(0);
  });

  it("locks a pod winner early when a team reaches 2-0 even if the pod's last match is unplayed", () => {
    const standings = [
      row({ teamId: "a1", teamName: "Alpha", podId: "pod-a", wins: 2, matchRecordPoints: 2, holePoints: 14 }),
      row({ teamId: "a2", teamName: "Atlas", podId: "pod-a", wins: 0, losses: 1, matchRecordPoints: 0 }),
      row({ teamId: "a3", teamName: "Apex", podId: "pod-a", wins: 0, losses: 1, matchRecordPoints: 0 }),
      row({ teamId: "b1", teamName: "Bravo", podId: "pod-b", wins: 2, matchRecordPoints: 2 }),
      row({ teamId: "c1", teamName: "Charlie", podId: "pod-c", wins: 2, matchRecordPoints: 2 })
    ];

    const seeds = computeQualifiedSeeds({
      pods: [
        { id: "pod-a", name: "Pod A" },
        { id: "pod-b", name: "Pod B" },
        { id: "pod-c", name: "Pod C" }
      ],
      standings,
      podStandings: [
        { pod: { id: "pod-a", name: "Pod A" }, rows: standings.filter((entry) => entry.podId === "pod-a") },
        { pod: { id: "pod-b", name: "Pod B" }, rows: standings.filter((entry) => entry.podId === "pod-b") },
        { pod: { id: "pod-c", name: "Pod C" }, rows: standings.filter((entry) => entry.podId === "pod-c") }
      ],
      matches: [
        { podId: "pod-a", stage: "POD_PLAY", status: "FINAL" },
        { podId: "pod-a", stage: "POD_PLAY", status: "FINAL" },
        { podId: "pod-a", stage: "POD_PLAY", status: "SCHEDULED" },
        { podId: "pod-b", stage: "POD_PLAY", status: "FINAL" },
        { podId: "pod-b", stage: "POD_PLAY", status: "FINAL" },
        { podId: "pod-c", stage: "POD_PLAY", status: "FINAL" },
        { podId: "pod-c", stage: "POD_PLAY", status: "FINAL" }
      ]
    });

    expect(seeds.map((entry) => entry.teamId)).toEqual(["a1", "b1", "c1", "a3", "a2"]);
  });

  it("ranks pod winners first and then appends two wild cards", () => {
    const standings = [
      row({ teamId: "a1", teamName: "Alpha", podId: "pod-a", wins: 2, matchRecordPoints: 2, holePoints: 13 }),
      row({ teamId: "a2", teamName: "Atlas", podId: "pod-a", holePoints: 7 }),
      row({ teamId: "b1", teamName: "Bravo", podId: "pod-b", wins: 2, matchRecordPoints: 2, holePoints: 11 }),
      row({ teamId: "b2", teamName: "Beacon", podId: "pod-b", holePoints: 8 }),
      row({ teamId: "c1", teamName: "Charlie", podId: "pod-c", wins: 2, matchRecordPoints: 2, holePoints: 10 }),
      row({ teamId: "c2", teamName: "Comet", podId: "pod-c", holePoints: 9 }),
      row({ teamId: "wc1", teamName: "Wild One", podId: "pod-d", holePoints: 12, holesWon: 10 }),
      row({ teamId: "wc2", teamName: "Wild Two", podId: "pod-e", holePoints: 11, holesWon: 9 }),
      row({ teamId: "out", teamName: "Outside", podId: "pod-f", holePoints: 6, holesWon: 5 })
    ];

    const seeds = computeQualifiedSeeds({
      pods: [
        { id: "pod-a", name: "Pod A" },
        { id: "pod-b", name: "Pod B" },
        { id: "pod-c", name: "Pod C" }
      ],
      standings,
      podStandings: [
        { pod: { id: "pod-a", name: "Pod A" }, rows: standings.filter((entry) => entry.podId === "pod-a") },
        { pod: { id: "pod-b", name: "Pod B" }, rows: standings.filter((entry) => entry.podId === "pod-b") },
        { pod: { id: "pod-c", name: "Pod C" }, rows: standings.filter((entry) => entry.podId === "pod-c") }
      ],
      matches: [
        { podId: "pod-a", stage: "POD_PLAY", status: "FINAL" },
        { podId: "pod-a", stage: "POD_PLAY", status: "FINAL" },
        { podId: "pod-b", stage: "POD_PLAY", status: "FINAL" },
        { podId: "pod-b", stage: "POD_PLAY", status: "FINAL" },
        { podId: "pod-c", stage: "POD_PLAY", status: "FINAL" },
        { podId: "pod-c", stage: "POD_PLAY", status: "FINAL" }
      ]
    });

    expect(seeds.map((entry) => entry.seedNumber)).toEqual([1, 2, 3, 4, 5]);
    expect(seeds.map((entry) => entry.teamId)).toEqual(["a1", "b1", "c1", "wc1", "wc2"]);
    expect(seeds[3]?.qualifierType).toBe("WILD_CARD");
  });

  it("uses the full tiebreak stack to order wild cards", () => {
    const standings = [
      row({
        teamId: "a1",
        teamName: "Alpha",
        podId: "pod-a",
        wins: 2,
        matchRecordPoints: 2,
        holePoints: 13
      }),
      row({
        teamId: "b1",
        teamName: "Bravo",
        podId: "pod-b",
        wins: 2,
        matchRecordPoints: 2,
        holePoints: 12
      }),
      row({
        teamId: "c1",
        teamName: "Charlie",
        podId: "pod-c",
        wins: 2,
        matchRecordPoints: 2,
        holePoints: 11
      }),
      row({
        teamId: "wc1",
        teamName: "Wild One",
        podId: "pod-d",
        holePoints: 10,
        holesWon: 8,
        cumulativeNetBetterBall: 74
      }),
      row({
        teamId: "wc2",
        teamName: "Wild Two",
        podId: "pod-e",
        holePoints: 10,
        holesWon: 8,
        cumulativeNetBetterBall: 72
      }),
      row({
        teamId: "wc3",
        teamName: "Wild Three",
        podId: "pod-f",
        holePoints: 10,
        holesWon: 7,
        cumulativeNetBetterBall: 68
      })
    ];

    const seeds = computeQualifiedSeeds({
      pods: [
        { id: "pod-a", name: "Pod A" },
        { id: "pod-b", name: "Pod B" },
        { id: "pod-c", name: "Pod C" }
      ],
      standings,
      podStandings: [
        { pod: { id: "pod-a", name: "Pod A" }, rows: standings.filter((entry) => entry.podId === "pod-a") },
        { pod: { id: "pod-b", name: "Pod B" }, rows: standings.filter((entry) => entry.podId === "pod-b") },
        { pod: { id: "pod-c", name: "Pod C" }, rows: standings.filter((entry) => entry.podId === "pod-c") }
      ],
      matches: [
        { podId: "pod-a", stage: "POD_PLAY", status: "FINAL" },
        { podId: "pod-a", stage: "POD_PLAY", status: "FINAL" },
        { podId: "pod-b", stage: "POD_PLAY", status: "FINAL" },
        { podId: "pod-b", stage: "POD_PLAY", status: "FINAL" },
        { podId: "pod-c", stage: "POD_PLAY", status: "FINAL" },
        { podId: "pod-c", stage: "POD_PLAY", status: "FINAL" }
      ]
    });

    expect(seeds.slice(3).map((entry) => entry.teamId)).toEqual(["wc2", "wc1"]);
  });

  it("keeps all pod winners ahead of wild cards in the final seed list", () => {
    const standings = [
      row({
        teamId: "a1",
        teamName: "Alpha",
        podId: "pod-a",
        wins: 2,
        matchRecordPoints: 2,
        holePoints: 9
      }),
      row({
        teamId: "b1",
        teamName: "Bravo",
        podId: "pod-b",
        wins: 2,
        matchRecordPoints: 2,
        holePoints: 8
      }),
      row({
        teamId: "c1",
        teamName: "Charlie",
        podId: "pod-c",
        wins: 2,
        matchRecordPoints: 2,
        holePoints: 7
      }),
      row({
        teamId: "wc1",
        teamName: "Wild One",
        podId: "pod-d",
        wins: 1,
        losses: 1,
        matchRecordPoints: 1,
        holePoints: 14,
        holesWon: 12,
        cumulativeNetBetterBall: 68
      }),
      row({
        teamId: "wc2",
        teamName: "Wild Two",
        podId: "pod-e",
        wins: 1,
        losses: 1,
        matchRecordPoints: 1,
        holePoints: 13,
        holesWon: 11,
        cumulativeNetBetterBall: 69
      })
    ];

    const seeds = computeQualifiedSeeds({
      pods: [
        { id: "pod-a", name: "Pod A" },
        { id: "pod-b", name: "Pod B" },
        { id: "pod-c", name: "Pod C" }
      ],
      standings,
      podStandings: [
        { pod: { id: "pod-a", name: "Pod A" }, rows: standings.filter((entry) => entry.podId === "pod-a") },
        { pod: { id: "pod-b", name: "Pod B" }, rows: standings.filter((entry) => entry.podId === "pod-b") },
        { pod: { id: "pod-c", name: "Pod C" }, rows: standings.filter((entry) => entry.podId === "pod-c") }
      ],
      matches: [
        { podId: "pod-a", stage: "POD_PLAY", status: "FINAL" },
        { podId: "pod-a", stage: "POD_PLAY", status: "FINAL" },
        { podId: "pod-b", stage: "POD_PLAY", status: "FINAL" },
        { podId: "pod-b", stage: "POD_PLAY", status: "FINAL" },
        { podId: "pod-c", stage: "POD_PLAY", status: "FINAL" },
        { podId: "pod-c", stage: "POD_PLAY", status: "FINAL" }
      ]
    });

    expect(seeds.map((entry) => entry.qualifierType)).toEqual([
      "POD_WINNER",
      "POD_WINNER",
      "POD_WINNER",
      "WILD_CARD",
      "WILD_CARD"
    ]);
  });
});
