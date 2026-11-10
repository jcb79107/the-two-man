import { describe, expect, it } from "vitest";
import { matches } from "../src/data";
import { publishDraft } from "../src/domain";
import {
  archive2026,
  seasons,
  careerRows,
  careerGames,
  careerScore,
  compareHistoricalGames,
  type SeasonRecord,
} from "../src/history-data";

describe("season archive and career records", () => {
  it("keeps complete past seasons independent from current card edits", () => {
    const before = JSON.stringify(archive2026);
    const edited = structuredClone(matches);
    edited[0].scores[0][0] = 2;
    seasons(publishDraft(edited, edited[0]));
    expect(JSON.stringify(archive2026)).toBe(before);
    expect(archive2026.regularCards[0].scores).not.toBe(matches[0].scores);
  });
  it("counts only official results and updates careers on approval", () => {
    const before = careerRows(seasons(matches), "teams").find(
      (r) => r.id === "t1",
    )!;
    const after = careerRows(
      seasons(publishDraft(matches, matches[0])),
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
  it("does not fabricate an active season title and labels sample splits through sample records", () => {
    expect(seasons(matches)[0].champion).toBeNull();
    expect(
      careerRows([seasons(matches)[0]], "teams").every((r) => r.titles === 0),
    ).toBe(true);
    const sample = seasons(matches)[0];
    expect(sample.sample).toBe(true);
    expect(
      sample.awards.every((a) => a.perPlayer === (a.amount ?? 0) / 2),
    ).toBe(true);
  });
  it("reconciles confirmed Season 1 team and player payouts to the $3,600 pool", () => {
    expect(archive2026.prizePool).toBe(3600);
    expect(archive2026.awards.filter((a) => a.kind === "pod")).toHaveLength(6);
    expect(
      archive2026.awards.filter((a) => a.kind === "pod").map((a) => a.label),
    ).toEqual([1, 2, 3, 4, 5, 6].map((pod) => `Pod ${pod} winner`));
    expect(archive2026.awards.every((a) => a.perPlayer! * 2 === a.amount)).toBe(
      true,
    );
    expect(archive2026.awards.reduce((n, a) => n + a.amount!, 0)).toBe(3600);
    const teams = careerRows([archive2026], "teams");
    const players = careerRows([archive2026], "players");
    expect(teams.reduce((n, r) => n + r.earned!, 0)).toBe(3600);
    expect(players.reduce((n, r) => n + r.earned!, 0)).toBe(3600);
    expect(teams.find((r) => r.id === archive2026.champion)?.earned).toBe(1800);
    expect(teams.find((r) => r.id === archive2026.runnerUp)?.earned).toBe(1050);
    const runnerUp = archive2026.entries.find(
      (e) => e.teamId === archive2026.runnerUp,
    )!;
    for (const id of runnerUp.playerIds)
      expect(players.find((r) => r.id === id)?.earned).toBe(525);
    for (const row of careerRows([archive2026], "teams", "playoffs"))
      expect(row.earned).toBe(teams.find((r) => r.id === row.id)?.earned);
  });
  it("does not turn unknown award amounts or player splits into zero", () => {
    const unknown = {
      ...archive2026,
      awards: archive2026.awards.map((a) => ({
        ...a,
        amount: null,
        perPlayer: undefined,
      })),
    };
    expect(
      careerRows([unknown], "teams").find((r) => r.id === unknown.champion)
        ?.earned,
    ).toBeNull();
    expect(
      careerRows([unknown], "players").find(
        (r) => r.id === "s1-team-09-player-1",
      )?.earned,
    ).toBeNull();
  });
  it("honors the champion from the recorded final", () => {
    const final = archive2026.games.find((g) => g.round === "Final")!;
    expect(final.winner).toBe(archive2026.champion);
    expect(
      careerRows([archive2026], "teams").find((r) => r.id === "s1-team-09"),
    ).toMatchObject({ won: 4, lost: 1, titles: 1 });
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
          playerIds: ["s1-team-09-player-1", "s1-team-01-player-1"],
          playerNames: ["Barron", "New partner"],
          name: "New partnership",
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
      (r) => r.id === "s1-team-09-player-1",
    )!;
    expect(row.seasons).toBe(2);
    expect(row.played).toBe(6);
    expect(
      careerRows([archive2026, s], "teams").find((r) => r.id === "s1-team-09")
        ?.seasons,
    ).toBe(1);
    expect(
      careerGames([archive2026, s], "players", "s1-team-09-player-1"),
    ).toHaveLength(6);
  });
  it("gives every archived match a unique, season-scoped source link", () => {
    const links = archive2026.games.map((g) => g.href);
    expect(new Set(links).size).toBe(links.length);
    expect(links.every((h) => h.startsWith("/history/2026/matches/"))).toBe(
      true,
    );
  });
});

describe("career score perspective", () => {
  it("shows the featured team's points first without changing the archive", () => {
    for (const game of archive2026.games) {
      const original = JSON.stringify(game);
      if (game.phase === "regular" && game.points) {
        expect(careerScore(game, game.a)).toBe(
          `${game.points[0]} – ${game.points[1]}`,
        );
        expect(careerScore(game, game.b)).toBe(
          `${game.points[1]} – ${game.points[0]}`,
        );
        expect(careerScore({ ...game, points: null }, game.b)).toBe(game.score);
      } else {
        expect(careerScore(game, game.a)).toBe(game.score);
        expect(careerScore(game, game.b)).toBe(game.score);
      }
      expect(careerScore(game, "unknown-team")).toBe(game.score);
      expect(JSON.stringify(game)).toBe(original);
    }
  });
});

it("keeps the undated quarterfinal ahead of regular-season career results", () => {
  const before = JSON.stringify(archive2026);
  for (const [kind, id] of [
    ["teams", "s1-team-13"],
    ["players", "s1-team-13-player-1"],
  ] as const) {
    const games = careerGames([archive2026], kind, id);
    expect(games[0].game.id).toBe("q3");
    expect(games[0].game.date).toBe("");
  }
  expect(JSON.stringify(archive2026)).toBe(before);
});

it("orders history by season, round and played time without relying on source order", () => {
  const games = [...archive2026.games].sort(compareHistoricalGames);
  expect(games[0].id).toBe("final");
  expect(
    games
      .slice(1, 3)
      .map((g) => g.id)
      .sort(),
  ).toEqual(["s1", "s2"]);
  expect(
    games
      .slice(3, 7)
      .map((g) => g.id)
      .sort(),
  ).toEqual(["q1", "q2", "q3", "q4"]);
  expect([...archive2026.games].reverse().sort(compareHistoricalGames)).toEqual(
    games,
  );
  const regular = games.filter((g) => g.phase === "regular");
  expect(regular.map((g) => Date.parse(g.date))).toEqual(
    regular.map((g) => Date.parse(g.date)).sort((a, b) => b - a),
  );
  const nextSeason = { ...regular[0], year: 2028, date: "" };
  expect([games[0], nextSeason].sort(compareHistoricalGames)[0]).toBe(
    nextSeason,
  );
});
