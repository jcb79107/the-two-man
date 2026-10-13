import { describe, expect, it } from "vitest";
import { matches } from "../src/data";
import { approveMatch } from "../src/domain";
import {
  archive2026,
  seasons,
  careerRows,
  careerGames,
  type SeasonRecord,
} from "../src/history-data";

describe("season archive and career records", () => {
  it("keeps complete past seasons independent from current card edits", () => {
    const before = JSON.stringify(archive2026);
    const edited = structuredClone(matches);
    edited[0].scores[0][0] = 2;
    seasons(approveMatch(edited, "m1"));
    expect(JSON.stringify(archive2026)).toBe(before);
    expect(archive2026.regularCards[0].scores).not.toBe(matches[0].scores);
  });
  it("counts only official results and updates careers on approval", () => {
    const before = careerRows(seasons(matches), "teams").find(
      (r) => r.id === "t1",
    )!;
    const after = careerRows(
      seasons(approveMatch(matches, "m1")),
      "teams",
    ).find((r) => r.id === "t1")!;
    expect(after.played).toBe(before.played + 1);
    expect(after.won).toBe(before.won + 1);
    expect(after.titles).toBe(before.titles);
  });
  it("reconciles team appearances, wins and losses against source games", () => {
    const records = seasons(matches);
    const rows = careerRows(records, "teams");
    expect(rows.reduce((n, r) => n + r.played, 0)).toBe(
      records.reduce((n, s) => n + s.games.length * 2, 0),
    );
    expect(rows.reduce((n, r) => n + r.won, 0)).toBe(
      rows.reduce((n, r) => n + r.lost, 0),
    );
    expect(rows.every((r) => r.won + r.lost + r.tied === r.played)).toBe(true);
  });
  it("does not fabricate an active season title or individual prize split", () => {
    expect(seasons(matches)[0].champion).toBeNull();
    expect(
      careerRows([seasons(matches)[0]], "teams").every((r) => r.titles === 0),
    ).toBe(true);
    expect(
      careerRows([archive2026], "players").every((r) => r.earned === 0),
    ).toBe(true);
    expect(
      careerRows([archive2026], "teams").reduce((n, r) => n + r.earned, 0),
    ).toBe(archive2026.prizePool);
  });
  it("honors the champion from the recorded final", () => {
    const final = archive2026.games.find((g) => g.round === "Final")!;
    expect(final.winner).toBe(archive2026.champion);
    expect(
      careerRows([archive2026], "teams").find((r) => r.id === "t7"),
    ).toMatchObject({ won: 5, lost: 0, titles: 1 });
    expect(
      careerRows([archive2026], "players").filter((r) => r.titles === 1),
    ).toHaveLength(2);
  });
  it("keeps playoff results separate from regular-season hole points", () => {
    const rows = careerRows([archive2026], "teams", "playoffs");
    expect(rows.reduce((n, r) => n + r.played, 0)).toBe(14);
    expect(rows.every((r) => r.points === 0 && r.regularPlayed === 0)).toBe(
      true,
    );
    expect(
      archive2026.games
        .filter((g) => g.phase === "playoffs")
        .every((g) => g.card === null && g.points === null),
    ).toBe(true);
  });
  it("follows a stable player identity across a new partnership", () => {
    const s: SeasonRecord = {
      ...archive2026,
      year: 2028,
      complete: false,
      champion: null,
      awards: [],
      entries: [
        {
          teamId: "new-team",
          playerIds: ["p1", "p3"],
          playerNames: ["Bennett", "Sullivan"],
          name: "Bennett & Sullivan",
          pod: "A",
        },
      ],
      games: [
        {
          ...archive2026.games[0],
          a: "new-team",
          winner: "new-team",
          year: 2028,
        },
      ],
      regularCards: [],
    };
    const row = careerRows([archive2026, s], "players").find(
      (r) => r.id === "p1",
    )!;
    expect(row.seasons).toBe(2);
    expect(row.played).toBe(6);
    expect(
      careerRows([archive2026, s], "teams").find((r) => r.id === "t1")?.seasons,
    ).toBe(1);
    expect(careerGames([archive2026, s], "players", "p1")).toHaveLength(6);
  });
  it("gives every archived match a unique, season-scoped source link", () => {
    const links = archive2026.games.map((g) => g.href);
    expect(new Set(links).size).toBe(links.length);
    expect(links.every((h) => h.startsWith("/history/2026/matches/"))).toBe(
      true,
    );
  });
});
