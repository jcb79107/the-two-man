import { describe, expect, it } from "vitest";
import { computeQualifiedSeeds } from "@/lib/server/qualification";
import { computePodStandings, type MatchStandingInput } from "@/lib/server/standings";
import type { TeamMatchSummary } from "@/lib/scoring/types";
import type { TeamProfile } from "@/types/models";

function team(id: string, name: string, podId: string): TeamProfile {
  return {
    id,
    name,
    podId,
    players: []
  };
}

function summary(
  teamId: string,
  totalPoints: number,
  holesWon: number,
  betterBallNetTotal: number | null,
  resultCode: TeamMatchSummary["resultCode"]
): TeamMatchSummary {
  return {
    teamId,
    totalPoints,
    holesWon,
    betterBallGrossTotal: null,
    betterBallNetTotal,
    resultCode
  };
}

function podMatch(
  id: string,
  podId: string,
  left: TeamMatchSummary,
  right: TeamMatchSummary
): MatchStandingInput {
  return {
    id,
    podId,
    stage: "POD_PLAY",
    status: "FINAL",
    teamSummaries: [left, right]
  };
}

function buildTournamentScenario() {
  const teams: TeamProfile[] = [
    team("a1", "Alpha", "pod-a"),
    team("a2", "Apex", "pod-a"),
    team("a3", "Atlas", "pod-a"),
    team("b1", "Bravo", "pod-b"),
    team("b2", "Beacon", "pod-b"),
    team("b3", "Bolt", "pod-b"),
    team("c1", "Charlie", "pod-c"),
    team("c2", "Comet", "pod-c"),
    team("c3", "Crown", "pod-c"),
    team("d1", "Delta", "pod-d"),
    team("d2", "Drift", "pod-d"),
    team("d3", "Dune", "pod-d"),
    team("e1", "Echo", "pod-e"),
    team("e2", "Edge", "pod-e"),
    team("e3", "Elm", "pod-e"),
    team("f1", "Falcon", "pod-f"),
    team("f2", "Flint", "pod-f"),
    team("f3", "Forge", "pod-f")
  ];

  const matches: MatchStandingInput[] = [
    podMatch("a-m1", "pod-a", summary("a1", 11, 7, 70, "WIN"), summary("a2", 7, 4, 75, "LOSS")),
    podMatch("a-m2", "pod-a", summary("a1", 10, 6, 71, "WIN"), summary("a3", 8, 5, 74, "LOSS")),
    podMatch("a-m3", "pod-a", summary("a2", 9, 5, 73, "TIE"), summary("a3", 9, 5, 72, "TIE")),

    podMatch("b-m1", "pod-b", summary("b1", 10, 6, 72, "WIN"), summary("b2", 8, 4, 76, "LOSS")),
    podMatch("b-m2", "pod-b", summary("b1", 9.5, 5, 73, "WIN"), summary("b3", 8.5, 5, 74, "LOSS")),
    podMatch("b-m3", "pod-b", summary("b2", 11, 7, 71, "WIN"), summary("b3", 7, 4, 77, "LOSS")),

    podMatch("c-m1", "pod-c", summary("c1", 9, 5, 74, "TIE"), summary("c2", 9, 5, 73, "TIE")),
    podMatch("c-m2", "pod-c", summary("c1", 10, 6, 72, "WIN"), summary("c3", 8, 4, 78, "LOSS")),
    podMatch("c-m3", "pod-c", summary("c2", 10.5, 6, 71, "WIN"), summary("c3", 7.5, 4, 79, "LOSS")),

    podMatch("d-m1", "pod-d", summary("d1", 11, 7, 69, "WIN"), summary("d2", 7, 4, 76, "LOSS")),
    podMatch("d-m2", "pod-d", summary("d1", 10, 6, 70, "WIN"), summary("d3", 8, 4, 77, "LOSS")),
    podMatch("d-m3", "pod-d", summary("d2", 9, 5, 73, "TIE"), summary("d3", 9, 5, 74, "TIE")),

    podMatch("e-m1", "pod-e", summary("e1", 8, 4, 75, "LOSS"), summary("e2", 10, 6, 71, "WIN")),
    podMatch("e-m2", "pod-e", summary("e1", 10, 6, 72, "WIN"), summary("e3", 8, 4, 76, "LOSS")),
    podMatch("e-m3", "pod-e", summary("e2", 10.5, 6, 70, "WIN"), summary("e3", 7.5, 4, 78, "LOSS")),

    podMatch("f-m1", "pod-f", summary("f1", 9, 5, 74, "TIE"), summary("f2", 9, 5, 72, "TIE")),
    podMatch("f-m2", "pod-f", summary("f1", 10, 6, 71, "WIN"), summary("f3", 8, 4, 77, "LOSS")),
    podMatch("f-m3", "pod-f", summary("f2", 10, 6, 70, "WIN"), summary("f3", 8, 4, 78, "LOSS"))
  ];

  return { teams, matches };
}

describe("tournament progression trust", () => {
  it("builds the correct eight-team playoff field and quarterfinal pairings from completed pod play", () => {
    const { teams, matches } = buildTournamentScenario();

    const standings = computePodStandings(teams, matches);
    const podStandings = ["pod-a", "pod-b", "pod-c", "pod-d", "pod-e", "pod-f"].map((podId) => ({
      pod: { id: podId, name: podId.toUpperCase() },
      rows: standings.filter((row) => row.podId === podId)
    }));

    const seeds = computeQualifiedSeeds({
      pods: podStandings.map((entry) => entry.pod),
      standings,
      podStandings,
      matches: matches.map((match) => ({
        podId: match.podId,
        stage: match.stage,
        status: match.status
      }))
    });

    expect(seeds).toHaveLength(8);
    expect(podStandings.map((entry) => `${entry.pod.id}:${entry.rows[0]?.teamId}`)).toEqual([
      "pod-a:a1",
      "pod-b:b1",
      "pod-c:c2",
      "pod-d:d1",
      "pod-e:e2",
      "pod-f:f2"
    ]);

    expect(seeds.filter((seed) => seed.qualifierType === "POD_WINNER").map((seed) => seed.teamId)).toEqual([
      "d1",
      "a1",
      "e2",
      "b1",
      "c2"
      ,
      "f2"
    ]);
    expect(seeds.filter((seed) => seed.qualifierType === "WILD_CARD").map((seed) => seed.teamId)).toEqual([
      "f1",
      "c1"
    ]);
    expect(seeds.map((seed) => `${seed.seedNumber}:${seed.teamId}`)).toEqual([
      "1:d1",
      "2:a1",
      "3:e2",
      "4:b1",
      "5:c2",
      "6:f2",
      "7:f1",
      "8:c1"
    ]);

    const qfPairings = [
      [seeds[0]?.teamId, seeds[7]?.teamId],
      [seeds[3]?.teamId, seeds[4]?.teamId],
      [seeds[1]?.teamId, seeds[6]?.teamId],
      [seeds[2]?.teamId, seeds[5]?.teamId]
    ];

    expect(qfPairings).toEqual([
      ["d1", "c1"],
      ["b1", "c2"],
      ["a1", "f1"],
      ["e2", "f2"]
    ]);
  });

  it("holds the playoff field open until every pod has a confirmed winner in a full tournament scenario", () => {
    const { teams, matches } = buildTournamentScenario();
    const standings = computePodStandings(teams, matches);
    const podStandings = ["pod-a", "pod-b", "pod-c", "pod-d", "pod-e", "pod-f"].map((podId) => ({
      pod: { id: podId, name: podId.toUpperCase() },
      rows: standings.filter((row) => row.podId === podId)
    }));

    const seeds = computeQualifiedSeeds({
      pods: podStandings.map((entry) => entry.pod),
      standings,
      podStandings,
      matches: matches.map((match) => ({
        podId: match.podId,
        stage: match.stage,
        status: match.id === "c-m3" ? "IN_PROGRESS" : match.status
      }))
    });

    expect(seeds).toHaveLength(0);
  });
});
