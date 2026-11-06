import { describe, it, expect } from "vitest";
import { parseScoreRow } from "../src/score-entry-model";
import { teamPath, bracketMatches } from "../src/bracket-model";
import { headToHead, archive2026, seasons } from "../src/history-data";
import { matches } from "../src/data";
describe("fast score entry", () => {
  it("accepts typed or spreadsheet rows without changing score order", () => {
    const row = [4, 5, 3, 6, 4, 5, 3, 5, 4, 5, 3, 6, 4, 5, 3, 4, 6, 4];
    for (const sep of [" ", "\t", ",", "\n"])
      expect(parseScoreRow(row.join(sep))).toEqual(row);
  });
  it("rejects incomplete rows, totals, labels, decimals and invalid gross scores", () => {
    for (const row of [
      Array(17).fill("4"),
      Array(19).fill("4"),
      ["Bennett", ...Array(17).fill("4")],
      ["4.5", ...Array(17).fill("4")],
      ["0", ...Array(17).fill("4")],
      ["21", ...Array(17).fill("4")],
    ])
      expect(() => parseScoreRow(row.join(" "))).toThrow();
  });
});
describe("team path and permanent match links", () => {
  it("stops an eliminated team at its loss and follows champions to the final", () => {
    const nodes = bracketMatches([], archive2026.games);
    expect(teamPath(nodes, "t5")).toEqual(["q1"]);
    expect(teamPath(nodes, "t7")).toEqual(["q4", "s2", "final"]);
    expect(teamPath(nodes, "missing")).toEqual([]);
  });
  it("aggregates only official games across years, preserving original result links", () => {
    const records = seasons(matches);
    const before = structuredClone(records);
    const rows = headToHead(records, "t1");
    const games = records
      .flatMap((s) => s.games)
      .filter((g) => g.a === "t1" || g.b === "t1");
    expect(rows.reduce((n, r) => n + r.games.length, 0)).toBe(games.length);
    for (const row of rows)
      expect(row.won + row.lost + row.tied).toBe(row.games.length);
    expect(
      rows
        .flatMap((r) => r.games)
        .map((g) => g.href)
        .sort(),
    ).toEqual(games.map((g) => g.href).sort());
    expect(records).toEqual(before);
  });
});
