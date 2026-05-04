import { describe, expect, it } from "vitest";
import {
  demoBracket,
  demoQualifiedSeeds,
  getBracketRounds,
  getUpcomingMatches
} from "@/lib/demo/mock-data";

describe("playoff progression", () => {
  it("produces eight unique seeded qualifiers", () => {
    expect(demoQualifiedSeeds).toHaveLength(8);
    expect(new Set(demoQualifiedSeeds.map((seed) => seed.teamId)).size).toBe(8);
    expect(demoQualifiedSeeds.map((seed) => seed.seedNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("builds a three-round bracket with quarterfinals, semifinals, and a championship", () => {
    const rounds = getBracketRounds();

    expect(demoBracket.rounds).toHaveLength(3);
    expect(rounds[0]?.matches).toHaveLength(4);
    expect(rounds[1]?.matches).toHaveLength(2);
    expect(rounds[2]?.matches).toHaveLength(1);
  });

  it("keeps the championship as the next upcoming match", () => {
    const upcomingMatches = getUpcomingMatches();

    expect(upcomingMatches).toHaveLength(1);
    expect(upcomingMatches[0]?.id).toBe("championship");
    expect(upcomingMatches[0]?.status).toBe("READY");
  });
});
