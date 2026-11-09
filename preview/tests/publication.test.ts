import { describe, it, expect } from "vitest";
import {
  loadPublication,
  validPlayedDate,
  validPlayoffScore,
  type Publication,
} from "../src/publication";
import { matches, dateLabel } from "../src/data";
import { graphicSvg } from "../src/commissioner-graphic-model";
import { bracketMatches } from "../src/bracket-model";
export function completedSeason(): Publication {
  return {
    season: 2027,
    revision: 1,
    note: "Sample completion for validation",
    regular: matches
      .filter((m) => m.status !== "official")
      .map((m) => ({
        ...structuredClone(m),
        date: "2027-06-23",
        evidence: true,
      })),
    seeds: ["t1", "t2", "t4", "t5", "t7", "t8", "t10", "t11"],
    playoffs: [],
  };
}
describe("Codex Season 2 publication", () => {
  it("validates regular cards without modifying the fixtures", () => {
    const before = structuredClone(matches);
    expect(
      loadPublication(completedSeason()).matches.every(
        (m) => m.status === "official",
      ),
    ).toBe(true);
    expect(matches).toEqual(before);
  });
  it("rejects other seasons, malformed dates, missing evidence and strokes over the cap", () => {
    for (const mutate of [
      (p: Publication) => {
        p.season = 2026 as 2027;
      },
      (p: Publication) => {
        p.regular[0].strokes[0][0] = 2;
      },
      (p: Publication) => {
        p.regular[0].evidence = false;
      },
      (p: Publication) => {
        p.regular[0].date = "2027-02-30";
      },
      (p: Publication) => {
        p.regular[0].a = "season1-team";
      },
    ]) {
      const p = completedSeason();
      mutate(p);
      expect(() => loadPublication(p)).toThrow();
    }
    for (const date of ["2027-13-12", "2027-02-30", "2026-06-01", null])
      expect(validPlayedDate(date)).toBe(false);
  });
  it("advances playoff winners, produces result graphics, and refuses stale downstream pairings", () => {
    const p = completedSeason();
    for (const id of ["q1", "q2", "q3", "q4", "s1", "s2", "final"]) {
      const data = loadPublication(p);
      const node = bracketMatches(data.seeds, data.games).find(
        (n) => n.id === id,
      )!;
      p.playoffs.push({
        id,
        a: node.slots[0].id!,
        b: node.slots[1].id!,
        winner: node.slots[0].id!,
        score: "4 & 2",
        date: "2027-07-01",
        course: "Sample course",
      });
    }
    const data = loadPublication(p);
    const svg = graphicSvg(
      data.matches,
      "result",
      "final",
      data.games,
      data.seeds,
    );
    expect(svg).toContain("CHAMPIONS");
    expect(svg).toContain("4 &amp; 2");
    expect(svg).not.toContain("Hole points");
    expect(
      graphicSvg(data.matches, "bracket", "", data.games, data.seeds),
    ).toContain("✓");
    p.playoffs[0].winner = p.playoffs[0].b;
    expect(() => loadPublication(p)).toThrow(/s1/);
  });
  it("requires resolved participants and rejects invalid playoff outcomes", () => {
    const p = completedSeason();
    p.playoffs = [
      {
        id: "s1",
        a: "t1",
        b: "t2",
        winner: "t1",
        score: "4 & 2",
        date: "2027-07-01",
        course: "Sample",
      },
    ];
    expect(() => loadPublication(p)).toThrow();
    for (const score of ["AS", "1 & 2", "9 & 1", "3 up", "0 up"])
      expect(validPlayoffScore(score)).toBe(false);
    for (const score of ["4 & 2", "10 & 8", "1 up", "2 up", "19 holes"])
      expect(validPlayoffScore(score)).toBe(true);
  });
  it("exports complete scorecards only, with supplied strokes and net totals", () => {
    const m = matches.find((m) => m.status === "official")!;
    const svg = graphicSvg(matches, "scorecard", m.id);
    expect(svg).toContain("SCORECARD");
    expect(svg).toContain("team best net");
    expect(svg).toContain("•");
    expect(() => graphicSvg(matches, "scorecard", "q1")).toThrow(
      /regular-season/,
    );
  });
});

it("preserves the played date without inventing a tee time", () => {
  expect(dateLabel("2027-06-23", true)).toBe("Jun 23");
});
