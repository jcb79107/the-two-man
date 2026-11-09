import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import source from "../src/season1-public.json";
import { archive2026, careerRows, seasons } from "../src/history-data";
import { matches } from "../src/data";
import { result } from "../src/domain";
import { bracketMatches } from "../src/bracket-model";

describe("preserved Season 1 public records", () => {
  it("contains exactly the preserved participants and official outcomes", () => {
    expect(source.entries).toHaveLength(18);
    expect(archive2026.entries.flatMap((e) => e.playerIds)).toHaveLength(36);
    expect(archive2026.games).toHaveLength(25);
    expect(archive2026.regularCards).toHaveLength(18);
    for (const game of archive2026.games) {
      const original = source.matches.find((m) => m.id === game.sourceId)!;
      expect(original.status).toBe("FINAL");
      expect(original.snapshot.version).toBe(1);
      expect(game.winner).toBe(
        original.winner ? `s1-${original.winner}` : null,
      );
      expect(original.snapshot.winner).toBe(original.winner);
      expect([game.a, game.b]).toEqual([
        `s1-${original.a}`,
        `s1-${original.b}`,
      ]);
      if (game.card) {
        const computed = result(game.card);
        expect([computed.aPoints, computed.bPoints]).toEqual(game.points);
        expect(computed.winner).toBe(game.winner);
        const originalPlayers = [original.a, original.b].flatMap((id) =>
          source.entries
            .find((e) => e.teamId === id)!
            .players.map(
              (p) => original.snapshot.players!.find((x) => x.id === p.id)!,
            ),
        );
        expect(computed.net).toEqual(
          originalPlayers.map((p) =>
            Array.from(
              { length: 18 },
              (_, h) => p.net[String(h + 1) as keyof typeof p.net],
            ),
          ),
        );
        expect([computed.aNet, computed.bNet]).toEqual(game.netTotals);
        expect(game.card.pars).toHaveLength(18);
        expect(game.card.strokeIndexes).toHaveLength(18);
      } else {
        expect(game.phase).toBe("playoffs");
        expect(game.points).toBeNull();
      }
    }
  });
  it("preserves actual feeders and final rather than the demo bracket", () => {
    const nodes = bracketMatches([], archive2026.games);
    expect(nodes.find((n) => n.id === "s1")?.sources).toEqual(["q1", "q4"]);
    expect(nodes.find((n) => n.id === "s2")?.sources).toEqual(["q2", "q3"]);
    expect(nodes.find((n) => n.id === "final")).toMatchObject({
      winner: "s1-team-09",
      score: "4 & 2",
    });
    expect(
      nodes.find((n) => n.id === "final")?.slots.map((s) => s.label),
    ).toEqual(["Barron & Loewenstein", "Nankin & Sacks"]);
    expect(archive2026.games.find((g) => g.id === "q2")?.score).toBe(
      "Won in tiebreak",
    );
    expect(archive2026.games.find((g) => g.id === "q3")?.date).toBe("");
  });
  it("keeps sample identities and money out of real career records", () => {
    const real = seasons(matches).filter((s) => !s.sample);
    expect(real).toHaveLength(1);
    const rows = careerRows(real, "teams");
    expect(rows.every((r) => r.id.startsWith("s1-") && r.earned === null)).toBe(
      true,
    );
    expect(rows.reduce((n, r) => n + r.played, 0)).toBe(50);
    const text = JSON.stringify(source);
    expect(text).not.toMatch(
      /privateToken|email|phoneNumber|ghinNumber|overrideNote|DATABASE_URL/,
    );
  });
  it("pins the imported public source fingerprint", () => {
    const actual = createHash("sha256")
      .update(readFileSync("src/season1-public.json"))
      .digest("hex");
    expect(actual).toBe(
      readFileSync("docs/season1-public.sha256", "utf8").trim(),
    );
  });
});
