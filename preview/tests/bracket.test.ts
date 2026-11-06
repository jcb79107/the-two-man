import { describe, it, expect } from "vitest";
import { bracketMatches } from "../src/bracket-model";
import { archive2026 } from "../src/history-data";
describe("connected bracket path", () => {
  it("keeps unplayed later rounds as feeder winners, never assumed seeds", () => {
    const nodes = bracketMatches();
    expect(nodes.find((n) => n.id === "s1")?.slots.map((s) => s.label)).toEqual(
      ["Winner QF1", "Winner QF2"],
    );
    expect(
      nodes.find((n) => n.id === "final")?.slots.map((s) => s.label),
    ).toEqual(["Winner SF1", "Winner SF2"]);
    expect(nodes.every((n) => n.winner === null && n.href === null)).toBe(true);
  });
  it("preserves existing seeding pairs without promoting any team", () => {
    const ids = ["t1", "t4", "t7", "t10", "t13", "t16", "t2", "t5"];
    const nodes = bracketMatches(ids);
    expect(nodes.slice(0, 4).map((n) => n.slots.map((s) => s.id))).toEqual([
      [ids[0], ids[7]],
      [ids[3], ids[4]],
      [ids[1], ids[6]],
      [ids[2], ids[5]],
    ]);
    expect(
      nodes.slice(4).every((n) => n.slots.every((s) => s.id === null)),
    ).toBe(true);
  });
  it("uses archive results consistently through all seven matches without changing history", () => {
    const before = structuredClone(archive2026);
    const nodes = bracketMatches([], archive2026.games);
    expect(nodes).toHaveLength(7);
    for (const n of nodes) {
      expect(n.href).toBe(`/history/2026/matches/${n.id}`);
      if (n.sources)
        expect(n.slots.map((s) => s.id)).toEqual(
          n.sources.map((id) => nodes.find((p) => p.id === id)!.winner),
        );
    }
    expect(nodes.find((n) => n.id === "final")?.winner).toBe(
      archive2026.champion,
    );
    expect(nodes.find((n) => n.id === "q2")?.winner).toBe("t13");
    expect(archive2026).toEqual(before);
  });
  it("does not invent a result when a downstream record contradicts its feeder winners", () => {
    const games = archive2026.games.map((g) =>
      g.id === "s1" ? { ...g, a: "t18" } : g,
    );
    const nodes = bracketMatches([], games);
    expect(nodes.find((n) => n.id === "s1")?.winner).toBeNull();
    expect(nodes.find((n) => n.id === "final")?.slots[0].label).toBe(
      "Winner SF1",
    );
    expect(nodes.find((n) => n.id === "final")?.winner).toBeNull();
  });
  it("does not turn a partial field into locked seeds", () => {
    expect(bracketMatches(["t1"])[0].slots.map((s) => s.id)).toEqual([
      null,
      null,
    ]);
  });
});
