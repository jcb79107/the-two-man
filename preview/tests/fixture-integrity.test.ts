import { expect, it } from "vitest";
import { matches, strokeIndex } from "../src/data";
import { validateCard } from "../src/domain";
it("seeds valid cards with the lowest player at zero and differences on hardest holes", () => {
  for (const match of matches) {
    expect(validateCard(match.scores, match.strokes)).toBeNull();
    expect(match.strokes.map((row) => row.reduce((a, b) => a + b, 0))).toEqual([
      0, 4, 2, 6,
    ]);
    for (const [p, allowance] of [0, 4, 2, 6].entries())
      expect(match.strokes[p]).toEqual(
        strokeIndex.map((index) => Number(index <= allowance)),
      );
  }
});
