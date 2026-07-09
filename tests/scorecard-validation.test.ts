import { describe, expect, it } from "vitest";
import {
  buildPublishedHoleScores,
  validateSubmittedScoreRows
} from "@/lib/server/scorecard-validation";

const playerIds = ["p1", "p2", "p3", "p4"];
const holeTemplate = Array.from({ length: 18 }, (_, index) => ({ holeNumber: index + 1 }));

describe("scorecard submission validation", () => {
  it("rejects duplicate hole rows before they hit the database", () => {
    expect(() =>
      validateSubmittedScoreRows({
        action: "saveDraft",
        playerIds,
        holeTemplate,
        scores: [
          { holeNumber: 1, scores: { p1: "4" } },
          { holeNumber: 1, scores: { p1: "5" } }
        ]
      })
    ).toThrow("Hole 1 was submitted more than once.");
  });

  it("rejects unknown player ids in submitted score payloads", () => {
    expect(() =>
      validateSubmittedScoreRows({
        action: "saveDraft",
        playerIds,
        holeTemplate,
        scores: [{ holeNumber: 1, scores: { p1: "4", rogue: "5" } }]
      })
    ).toThrow("Submitted scores included a player who is not part of this match.");
  });

  it("requires all 18 holes before publishing", () => {
    expect(() =>
      validateSubmittedScoreRows({
        action: "publish",
        stage: "POD_PLAY",
        playerIds,
        holeTemplate,
        scores: holeTemplate.slice(0, 17).map((hole) => ({
          holeNumber: hole.holeNumber,
          scores: { p1: "4", p2: "5", p3: "4", p4: "5" }
        }))
      })
    ).toThrow("All 18 holes must be submitted before publishing.");
  });

  it("allows playoff publish payloads to stop after completed holes", () => {
    const persistedRows = validateSubmittedScoreRows({
      action: "publish",
      stage: "QUARTERFINAL",
      playerIds,
      holeTemplate,
      scores: holeTemplate.slice(0, 15).map((hole) => ({
        holeNumber: hole.holeNumber,
        scores: { p1: "4", p2: "5", p3: "5", p4: "6" }
      }))
    });

    const published = buildPublishedHoleScores({
      playerIds,
      holeTemplate,
      persistedRows,
      stage: "QUARTERFINAL"
    });

    expect(published).toHaveLength(15);
    expect(published.at(-1)?.holeNumber).toBe(15);
  });

  it("rejects playoff publish payloads with skipped holes", () => {
    expect(() =>
      validateSubmittedScoreRows({
        action: "publish",
        stage: "SEMIFINAL",
        playerIds,
        holeTemplate,
        scores: [
          { holeNumber: 1, scores: { p1: "4", p2: "5", p3: "4", p4: "5" } },
          { holeNumber: 3, scores: { p1: "4", p2: "5", p3: "4", p4: "5" } }
        ]
      })
    ).toThrow("Playoff scorecards must be completed in hole order before publishing.");
  });

  it("builds published hole scores aligned to the template", () => {
    const persistedRows = validateSubmittedScoreRows({
      action: "publish",
      playerIds,
      holeTemplate,
      scores: holeTemplate.map((hole) => ({
        holeNumber: hole.holeNumber,
        scores: { p1: "4", p2: "5", p3: "4", p4: "5" }
      }))
    });

    const published = buildPublishedHoleScores({
      playerIds,
      holeTemplate,
      persistedRows
    });

    expect(published).toHaveLength(18);
    expect(published[0]).toEqual({
      holeNumber: 1,
      scores: { p1: 4, p2: 5, p3: 4, p4: 5 }
    });
    expect(published[17]?.holeNumber).toBe(18);
  });
});
