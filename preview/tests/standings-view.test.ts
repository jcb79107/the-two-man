import { describe, expect, it } from "vitest";
import { matches, teams } from "../src/data";
import { standings, type Standing } from "../src/domain";
import {
  projectField,
  scenarioError,
  simulateMatch,
  sortStandings,
} from "../src/standings-view";
const score = { points: 12, holesWon: 8, aNet: 66, bNet: 74 };
describe("standings column sorting", () => {
  it("sorts numeric columns in both directions without changing competition ranks", () => {
    const rows = standings(matches);
    const before = structuredClone(rows);
    for (const key of ["points", "holesWon", "net", "played"] as const) {
      const asc = sortStandings(rows, key, "asc").map((r) => r[key]);
      expect(asc).toEqual([...asc].sort((a, b) => a - b));
      const desc = sortStandings(rows, key, "desc").map((r) => r[key]);
      expect(desc).toEqual([...desc].sort((a, b) => b - a));
    }
    expect(rows).toEqual(before);
  });
  it("sorts names alphabetically and match record by wins plus half a tie", () => {
    const rows = standings(matches);
    const names = sortStandings(rows, "team", "asc").map((r) =>
      r.team.names.join(" & "),
    );
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    const record = sortStandings(rows, "record", "desc").map(
      (r) => r.won + r.tied * 0.5,
    );
    expect(record).toEqual([...record].sort((a, b) => b - a));
  });
});
describe("playoff picture", () => {
  it("separates six pod leaders, two wild cards and the next four out", () => {
    const picture = projectField(standings(matches));
    expect(picture.field).toHaveLength(8);
    expect(new Set(picture.field.slice(0, 6).map((r) => r.team.pod)).size).toBe(
      6,
    );
    expect(picture.field.slice(6).every((r) => r.route === "Wild card")).toBe(
      true,
    );
    expect(picture.bubble).toHaveLength(4);
    expect(
      new Set([...picture.field, ...picture.bubble].map((r) => r.team.id)).size,
    ).toBe(12);
  });
  it("does not publish a forecast before any result exists", () => {
    expect(
      projectField(
        standings(matches.map((m) => ({ ...m, status: "scheduled" as const }))),
      ).field,
    ).toEqual([]);
  });
  it("reports equal pod and wild-card cutoffs instead of declaring a qualifier", () => {
    const rows: Standing[] = teams.map((team) => ({
      team,
      played: 1,
      won: 0,
      lost: 0,
      tied: 1,
      points: 9,
      holesWon: 0,
      net: 72,
    }));
    const picture = projectField(rows);
    expect(picture.ties).toHaveLength(8);
    expect(picture.ties[0]).toHaveLength(3);
    expect(picture.ties[6]).toHaveLength(6);
    expect(picture.ties[7]).toHaveLength(12);
  });
});
describe("hypothetical match scores", () => {
  it("adds one result only to its two teams without mutating fixtures or published standings", () => {
    const before = structuredClone(matches);
    const original = standings(matches);
    const next = simulateMatch(matches, "m1", score);
    for (const row of next) {
      const old = original.find((r) => r.team.id === row.team.id)!;
      if (row.team.id === matches[0].a) {
        expect(row.won).toBe(old.won + 1);
        expect(row.points - old.points).toBe(12);
        expect(row.holesWon - old.holesWon).toBe(8);
      } else if (row.team.id === matches[0].b) {
        expect(row.lost).toBe(old.lost + 1);
        expect(row.points - old.points).toBe(6);
        expect(row.holesWon - old.holesWon).toBe(2);
      } else expect(row).toEqual(old);
    }
    expect(matches).toEqual(before);
    expect(standings(matches)).toEqual(original);
  });
  it("conserves 18 hole points for half-point scores and gives ties to both teams", () => {
    const before = standings(matches).reduce((n, r) => n + r.points, 0);
    for (const points of [0, 0.5, 8.5, 9, 9.5, 17.5, 18]) {
      const next = simulateMatch(matches, "m1", {
        ...score,
        points,
        holesWon: Math.floor(points),
      });
      expect(next.reduce((n, r) => n + r.points, 0) - before).toBe(18);
      if (points === 9)
        for (const id of [matches[0].a, matches[0].b]) {
          expect(next.find((r) => r.team.id === id)!.tied).toBe(
            standings(matches).find((r) => r.team.id === id)!.tied + 1,
          );
        }
    }
  });
  it("rejects impossible scores, holes won, non-finite and missing net totals", () => {
    for (const invalid of [
      { points: 18.5 },
      { points: 9.2 },
      { points: NaN },
      { points: 12, holesWon: 0 },
      { holesWon: 13 },
      { aNet: 0 },
      { bNet: Infinity },
      { aNet: 72.5 },
    ])
      expect(scenarioError({ ...score, ...invalid })).not.toBeNull();
  });
  it("refuses to replace a completed result or an unknown fixture", () => {
    expect(() => simulateMatch(matches, "m2", score)).toThrow();
    expect(() => simulateMatch(matches, "missing", score)).toThrow();
  });
});
