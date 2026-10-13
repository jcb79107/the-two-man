import { describe, it, expect } from "vitest";
import { matches, season, teams } from "../src/data";
import {
  result,
  standings,
  qualified,
  podWinner,
  approveMatch,
  approvalError,
  lockAllowed,
  validateCard,
  validSnapshot,
} from "../src/domain";
describe("staged tournament integrity", () => {
  it("blocks approval of future, unlocked, or unsupported cards", () => {
    expect(approvalError(matches[0])).toBeNull();
    for (const changed of [
      { date: "2027-06-29T09:00:00-05:00" },
      { lockedAt: null },
      { evidence: false },
    ]) {
      const candidate = { ...matches[0], ...changed };
      expect(approvalError(candidate)).not.toBeNull();
      expect(approveMatch([candidate], candidate.id)[0].status).toBe("review");
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
    const next = approveMatch(matches, "m1");
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
    const once = approveMatch(matches, "m1");
    expect(approveMatch(once, "m1")).toEqual(once);
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
  it("accepts exactly 24 hours, rejects one second inside cutoff", () => {
    expect(
      lockAllowed("2027-06-25T12:00:00-05:00", "2027-06-24T12:00:00-05:00"),
    ).toBe(true);
    expect(
      lockAllowed("2027-06-25T11:59:59-05:00", "2027-06-24T12:00:00-05:00"),
    ).toBe(false);
    expect(lockAllowed("", "2027-06-24T12:00:00-05:00")).toBe(false);
  });
  it("accepts the fixture snapshot and rejects unrelated data", () => {
    expect(validSnapshot(matches)).toBe(true);
    expect(validSnapshot({})).toBe(false);
    expect(validSnapshot(matches.slice(1))).toBe(false);
  });
});
