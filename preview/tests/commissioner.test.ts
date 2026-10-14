import { describe, it, expect } from "vitest";
import { matches } from "../src/data";
import { publishDraft, standings, approvalError } from "../src/domain";
describe("commissioner publication", () => {
  it("preserves the official result while editing and replaces it once on publication", () => {
    const before = structuredClone(matches);
    const official = before.find((m) => m.status === "official")!;
    const draft = structuredClone(official);
    draft.scores[0][0] = 20;
    draft.note = "Corrected transposed score";
    expect(standings(before)).toEqual(standings(matches));
    const next = publishDraft(before, draft);
    expect(next).toHaveLength(before.length);
    expect(before).toEqual(matches);
    expect(next.find((m) => m.id === draft.id)?.scores[0][0]).toBe(20);
    expect(publishDraft(next, draft)).toEqual(next);
    expect(next.filter((m) => m.id !== draft.id)).toEqual(
      before.filter((m) => m.id !== draft.id),
    );
  });
  it("requires a correction reason and rejects a draft for another fixture", () => {
    const m = matches.find((m) => m.status === "official")!;
    expect(() => publishDraft(matches, { ...m, note: "" })).toThrow("Explain");
    expect(() => publishDraft(matches, { ...matches[0], a: "t18" })).toThrow(
      "fixture",
    );
  });
  it("rejects incomplete scores, invalid dates, missing evidence and malformed stroke allocations", () => {
    const m = structuredClone(matches[0]);
    m.scores[0][17] = 0;
    expect(() => publishDraft(matches, m)).toThrow();
    expect(approvalError({ ...matches[0], date: "not-a-date" })).not.toBeNull();
    expect(() =>
      publishDraft(matches, { ...matches[0], evidence: false }),
    ).toThrow();
    const strokes = matches[0].strokes.map((row) => [...row]);
    strokes[0][17] = -1;
    expect(() => publishDraft(matches, { ...matches[0], strokes })).toThrow();
  });
  it("publishes a new result only to the selected fixture", () => {
    const draft = { ...matches[0], note: "Checked sample evidence" };
    const next = publishDraft(matches, draft);
    expect(next[0].status).toBe("official");
    expect(next.slice(1)).toEqual(matches.slice(1));
    expect(standings(next).find((r) => r.team.id === draft.a)?.played).toBe(2);
  });
});
