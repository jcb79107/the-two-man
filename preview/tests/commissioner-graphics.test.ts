import { describe, expect, it } from "vitest";
import { matches } from "../src/data";
import { graphicSvg } from "../src/commissioner-graphic-model";
import { result } from "../src/domain";

describe("commissioner graphics", () => {
  it("uses only a published result and its calculated hole points", () => {
    const match = matches.find((m) => m.status === "official")!;
    const score = result(match);
    const svg = graphicSvg(matches, "result", match.id);
    expect(svg).toContain(`>${score.aPoints}</text>`);
    expect(svg).toContain(`>${score.bPoints}</text>`);
    expect(svg).toContain('width="1080" height="1350"');
    expect(svg).toContain("PREVIEW · SAMPLE DATA");
    expect(() =>
      graphicSvg(
        matches,
        "result",
        matches.find((m) => m.status !== "official")!.id,
      ),
    ).toThrow("published");
    expect(() => graphicSvg(matches, "result", "missing")).toThrow("published");
  });
  it("escapes imported text and leaves source data unchanged", () => {
    const input = structuredClone(matches);
    const match = input.find((m) => m.status === "official")!;
    match.course = '<script> & "course"';
    const before = structuredClone(input);
    expect(graphicSvg(input, "result", match.id)).toContain(
      "&lt;script&gt; &amp; &quot;course&quot;",
    );
    for (const kind of ["standings", "bracket"] as const)
      graphicSvg(input, kind, "");
    expect(input).toEqual(before);
  });
  it("does not treat pending cards as standings results or projected seeds as confirmed", () => {
    const input = matches.map((m) => ({ ...m, status: "scheduled" as const }));
    expect(graphicSvg(input, "standings", "")).toContain(
      "0 of 18 matches completed",
    );
    const bracket = graphicSvg(input, "bracket", "");
    expect(bracket).toContain("Seeds pending");
    expect(bracket).toContain("Seed 1");
    expect(bracket).toContain("Winner SF1");
    expect(bracket).not.toContain("Bennett");
  });
});
