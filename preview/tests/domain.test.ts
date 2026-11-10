import { describe, it, expect } from "vitest";
import { matches, season, teams } from "../src/data";
import {
  result,
  standings,
  qualified,
  podWinner,
  publishDraft,
  approvalError,
  validateCard,
  validSnapshot,
} from "../src/domain";
describe("staged tournament integrity", () => {
  it("blocks approval of future or unsupported cards", () => {
    expect(approvalError(matches[0])).toBeNull();
    for (const changed of [
      { date: "2027-06-29T09:00:00-05:00" },
      { evidence: false },
    ]) {
      const candidate = { ...matches[0], ...changed };
      expect(approvalError(candidate)).not.toBeNull();
      expect(() => publishDraft([candidate], candidate)).toThrow();
    }
  });
  it("rejects malformed saved score arrays without crashing", () => {
    expect(
      validSnapshot(
        matches.map((m, i) => (i === 0 ? { ...m, scores: [null] } : m)),
      ),
    ).toBe(false);
  });
  it("gives each team exactly two fixtures", () => {
    for (const t of teams)
      expect(matches.filter((m) => m.a === t.id || m.b === t.id)).toHaveLength(
        2,
      );
  });
  it("balances the prize pool without assuming payment", () =>
    expect(
      season.podAward * 6 + season.championAward + season.runnerUpAward,
    ).toBe(teams.length * season.buyIn));
  it("excludes draft scores and awards until approved", () => {
    expect(standings(matches).find((r) => r.team.id === "t1")?.played).toBe(1);
    expect(podWinner(matches, "A")).toBeNull();
    const next = publishDraft(matches, matches[0]);
    expect(standings(next).find((r) => r.team.id === "t1")?.played).toBe(2);
    expect(podWinner(next, "A")).toBeNull();
  });
  it("never qualifies while even one card is unfinished", () => {
    const next = matches.map((m, i) => ({
      ...m,
      status: i === 17 ? ("review" as const) : ("official" as const),
    }));
    expect(qualified(next)).toEqual([]);
  });
  it("approves once and does not duplicate a fixture", () => {
    const once = publishDraft(matches, matches[0]);
    expect(publishDraft(once, { ...once[0], note: "Confirmed card" })).toEqual(
      once.map((m, i) => (i === 0 ? { ...m, note: "Confirmed card" } : m)),
    );
    expect(once).toHaveLength(18);
  });
  it("uses supplied hole strokes and conserves 18 points", () => {
    const m = matches[0];
    const r = result(m);
    expect(r.aPoints + r.bPoints).toBe(18);
    expect(r.net[0][0]).toBe(m.scores[0][0] - m.strokes[0][0]);
  });
  it("rejects missing or invalid gross scores", () => {
    const rows = matches[0].scores.map((r) => [...r]);
    rows[0][0] = 0;
    expect(validateCard(rows, matches[0].strokes)).not.toBeNull();
    rows[0][0] = 4.5;
    expect(validateCard(rows, matches[0].strokes)).not.toBeNull();
  });
  it("allows strokes agreed at the tee box without a timestamp", () => {
    expect(
      approvalError({ ...matches[0], lockedAt: matches[0].date }),
    ).toBeNull();
    expect(approvalError({ ...matches[0], lockedAt: null })).toBeNull();
  });
  it("rejects more than one stroke per hole under the tournament allowance", () => {
    const strokes = matches[0].strokes.map((row) => [...row]);
    strokes[0][0] = 2;
    expect(validateCard(matches[0].scores, strokes)).not.toBeNull();
  });
  it("accepts the fixture snapshot and rejects unrelated data", () => {
    expect(validSnapshot(matches)).toBe(true);
    expect(validSnapshot({})).toBe(false);
    expect(validSnapshot(matches.slice(1))).toBe(false);
  });
});

describe("saved fixture identity", () => {
  it("rejects a different pairing even when both teams belong to the same pod", () => {
    const changed = structuredClone(matches);
    changed[0].b = "t3";
    expect(validSnapshot(changed)).toBe(false);
  });
  it("rejects reversing a fixture and moving one into another pod", () => {
    const reversed = structuredClone(matches);
    [reversed[0].a, reversed[0].b] = [reversed[0].b, reversed[0].a];
    expect(validSnapshot(reversed)).toBe(false);
    const moved = structuredClone(matches);
    Object.assign(moved[0], { a: "t4", b: "t5", pod: "B" });
    expect(validSnapshot(moved)).toBe(false);
  });
  it("still restores valid edits to results without mutating the original fixtures", () => {
    const changed = structuredClone(matches);
    changed[0].scores[0][0] = 6;
    changed[0].course = "Edited sample course";
    changed[0].note = "Corrected sample card";
    changed[0].status = "official";
    expect(validSnapshot(changed)).toBe(true);
    expect(changed[0]).not.toEqual(matches[0]);
  });
});

it("rejects malformed optional course data in saved snapshots", () => {
  for (const metadata of [
    { pars: "damaged" },
    { pars: [] },
    { pars: Array(18).fill(0) },
    { strokeIndexes: {} },
    { strokeIndexes: Array(18).fill(1) },
  ]) {
    const saved = structuredClone(matches);
    Object.assign(saved[0], metadata);
    expect(validSnapshot(saved)).toBe(false);
  }
});
