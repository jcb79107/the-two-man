import { expect, it } from "vitest";
import { seasonSimulation } from "./season-simulation";
import { loadPublication } from "../src/publication";
import {
  currentSeason,
  careerRows,
  compareHistoricalGames,
} from "../src/history-data";
import { qualified, standings } from "../src/domain";
import { qualificationField, cutoffReason } from "../src/standings-view";
import { matchReturn } from "../src/match-return";

it("carries all 25 results and stacked awards through a complete season", () => {
  const stages = seasonSimulation();
  for (const [key, p] of Object.entries(stages)) {
    const data = loadPublication(p);
    const record = currentSeason(data.matches, data.games);
    expect(record.games.filter((g) => g.phase === "playoffs")).toHaveLength(
      p.playoffs.length,
    );
    if (key !== "final") expect(record.complete).toBe(false);
  }
  const data = loadPublication(stages.final);
  const record = currentSeason(data.matches, data.games);
  expect(record.games).toHaveLength(25);
  expect(record.games.sort(compareHistoricalGames)[0].id).toBe("final");
  const rows = careerRows([record], "teams");
  expect(rows.find((r) => r.id === "t1")).toMatchObject({
    played: 5,
    won: 5,
    earned: 2250,
  });
  expect(rows.find((r) => r.id === "t4")).toMatchObject({
    played: 5,
    lost: 1,
    earned: 1250,
  });
  expect(rows.find((r) => r.id === "t7")?.earned).toBe(250);
  expect(rows.find((r) => r.id === "t5")?.earned).toBe(0);
  expect(
    careerRows([record], "players").find((r) => r.id === "p1")?.earned,
  ).toBe(1125);
  expect(record.awards.reduce((n, a) => n + (a.amount ?? 0), 0)).toBe(4500);
  expect(standings(data.matches).find((r) => r.team.id === "t1")?.won).toBe(2);
});
it("uses confirmed seeds over arbitrary tied projections", () => {
  const p = seasonSimulation().tied;
  const data = loadPublication(p);
  expect(qualified(data.matches)).toEqual([]);
  const field = qualificationField(data.matches, data.seeds);
  expect(field.field.map((r) => r.team.id)).toEqual(data.seeds);
  expect(field.bubble.some((r) => data.seeds.includes(r.team.id))).toBe(false);
  expect(field.ties).toEqual([]);
  expect(qualificationField(data.matches).ties.length).toBeGreaterThan(0);
});
it("explains the decisive wildcard statistic", () => {
  const p = loadPublication(seasonSimulation().regular);
  const field = qualificationField(p.matches);
  expect(cutoffReason(field.field[7], field.bubble[0])).toBe(
    "holes won: 13 vs 12",
  );
});
it("preserves fixed local return routes and rejects unrecognized destinations", () => {
  expect(
    matchReturn(new URLSearchParams("from=matches&filter=official&q=Bennett"))
      .href,
  ).toBe("/matches?filter=official&q=Bennett");
  expect(
    matchReturn(new URLSearchParams("from=bracket&team=t4&round=semis")).href,
  ).toBe("/bracket?round=semis&team=t4");
  expect(matchReturn(new URLSearchParams("from=team&team=t1")).href).toBe(
    "/teams/t1",
  );
  expect(
    matchReturn(new URLSearchParams("from=https://evil.test&team=t1")).href,
  ).toBe("/matches");
});
