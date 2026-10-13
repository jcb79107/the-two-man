import { matches as fixtures, teams, season, type Match } from "./data";
import { podWinner, result } from "./domain";

// Stable identity is separate from a season entry. Names are never aggregation keys.
export const players = teams.flatMap((team, i) =>
  team.names.map((name, j) => ({ id: `p${i * 2 + j + 1}`, name })),
);
export type SeasonEntry = {
  teamId: string;
  playerIds: [string, string];
  playerNames: [string, string];
  name: string;
  pod: string;
};
export const entries: SeasonEntry[] = teams.map((team, i) => ({
  teamId: team.id,
  playerIds: [`p${i * 2 + 1}`, `p${i * 2 + 2}`],
  name: team.names.join(" & "),
  playerNames: [...team.names],
  pod: team.pod,
}));
export type HistoricalGame = {
  id: string;
  year: number;
  a: string;
  b: string;
  phase: "regular" | "playoffs";
  round: string;
  date: string;
  course: string;
  winner: string | null;
  score: string;
  points: [number, number] | null;
  card: Match | null;
  href: string;
};
export type Award = {
  teamId: string;
  kind: "champion" | "runner-up" | "pod";
  label: string;
  amount: number;
};
export type SeasonRecord = {
  year: number;
  number: number;
  complete: boolean;
  entries: SeasonEntry[];
  games: HistoricalGame[];
  awards: Award[];
  regularCards: Match[];
  champion: string | null;
  runnerUp: string | null;
  prizePool: number;
};
const archivedCards: Match[] = fixtures.map((m, i) => ({
  ...m,
  id: `s2026-${m.id}`,
  status: "official",
  date: `2026-06-${String(2 + i).padStart(2, "0")}T09:00:00-05:00`,
  lockedAt: `2026-05-30T09:00:00-05:00`,
  scores: m.scores.map((r) => [...r]),
  strokes: m.strokes.map((r) => [...r]),
  note: "Fictional archive fixture; not a real Season 1 result.",
}));
function regularGames(cards: Match[], year: number): HistoricalGame[] {
  return cards
    .filter((m) => m.status === "official")
    .map((m) => {
      const r = result(m);
      return {
        id: m.id,
        year,
        a: m.a,
        b: m.b,
        phase: "regular",
        round: `Pod ${m.pod}`,
        date: m.date,
        course: m.course,
        winner: r.winner,
        score: `${r.aPoints} – ${r.bPoints}`,
        points: [r.aPoints, r.bPoints],
        card: m,
        href:
          year === 2027
            ? `/matches/${m.id}`
            : `/history/${year}/matches/${m.id}`,
      };
    });
}
const playoffFixtures = [
  ["q1", "t1", "t5", "t1", "Quarterfinal", "2026-07-12", "3 & 2"],
  ["q2", "t10", "t13", "t13", "Quarterfinal", "2026-07-18", "1 up"],
  ["q3", "t4", "t2", "t4", "Quarterfinal", "2026-07-19", "2 & 1"],
  ["q4", "t7", "t16", "t7", "Quarterfinal", "2026-07-25", "4 & 3"],
  ["s1", "t1", "t13", "t1", "Semifinal", "2026-08-09", "2 up"],
  ["s2", "t4", "t7", "t7", "Semifinal", "2026-08-16", "1 up"],
  ["final", "t1", "t7", "t7", "Final", "2026-09-13", "2 & 1"],
];
const archivedPlayoffs: HistoricalGame[] = playoffFixtures.map(
  ([id, a, b, winner, round, date, score]) => ({
    id,
    year: 2026,
    a,
    b,
    winner,
    round,
    date: `${date}T09:00:00-05:00`,
    score,
    phase: "playoffs",
    course: "The Glen Club",
    points: null,
    card: null,
    href: `/history/2026/matches/${id}`,
  }),
);
export const archive2026: SeasonRecord = {
  year: 2026,
  number: 1,
  complete: true,
  entries: entries.map((e) => ({
    ...e,
    playerIds: [...e.playerIds],
    playerNames: [...e.playerNames],
  })),
  regularCards: archivedCards,
  games: [...regularGames(archivedCards, 2026), ...archivedPlayoffs],
  champion: "t7",
  runnerUp: "t1",
  prizePool: 3600,
  awards: [
    ...["t1", "t4", "t7", "t10", "t13", "t16"].map(
      (teamId, i): Award => ({
        teamId,
        kind: "pod",
        label: `Pod ${"ABCDEF"[i]} winner`,
        amount: 200,
      }),
    ),
    { teamId: "t7", kind: "champion", label: "Champion", amount: 1600 },
    { teamId: "t1", kind: "runner-up", label: "Runner-up", amount: 800 },
  ],
};
export function seasons(current: Match[]): SeasonRecord[] {
  return [
    {
      year: 2027,
      number: 2,
      complete: false,
      entries,
      games: regularGames(current, 2027),
      regularCards: current,
      champion: null,
      runnerUp: null,
      prizePool: season.prizePool,
      awards: ["A", "B", "C", "D", "E", "F"].flatMap((pod) => {
        const teamId = podWinner(current, pod);
        return teamId
          ? [
              {
                teamId,
                kind: "pod" as const,
                label: `Pod ${pod} winner`,
                amount: season.podAward,
              },
            ]
          : [];
      }),
    },
    archive2026,
  ];
}
export function entryName(s: SeasonRecord, id: string) {
  return s.entries.find((e) => e.teamId === id)?.name ?? "Unknown team";
}
export type CareerRow = {
  id: string;
  name: string;
  seasons: number;
  played: number;
  won: number;
  lost: number;
  tied: number;
  titles: number;
  earned: number;
  points: number;
  regularPlayed: number;
};
export function careerRows(
  records: SeasonRecord[],
  kind: "teams" | "players",
  phase: "all" | "regular" | "playoffs" = "all",
): CareerRow[] {
  const rows = new Map<string, CareerRow>();
  for (const s of records)
    for (const entry of s.entries) {
      const ids = kind === "teams" ? [entry.teamId] : entry.playerIds;
      for (const id of ids) {
        const row = rows.get(id) ?? {
          id,
          name:
            kind === "teams"
              ? entry.name
              : (players.find((p) => p.id === id)?.name ?? id),
          seasons: 0,
          played: 0,
          won: 0,
          lost: 0,
          tied: 0,
          titles: 0,
          earned: 0,
          points: 0,
          regularPlayed: 0,
        };
        row.seasons++;
        row.titles += s.complete && s.champion === entry.teamId ? 1 : 0;
        // Money belongs to the partnership; never infer an individual split.
        if (kind === "teams")
          row.earned += s.awards
            .filter((a) => a.teamId === entry.teamId)
            .reduce((n, a) => n + a.amount, 0);
        for (const g of s.games.filter(
          (g) =>
            (g.a === entry.teamId || g.b === entry.teamId) &&
            (phase === "all" || g.phase === phase),
        )) {
          row.played++;
          row.won += g.winner === entry.teamId ? 1 : 0;
          row.lost += g.winner !== null && g.winner !== entry.teamId ? 1 : 0;
          row.tied += g.winner === null ? 1 : 0;
          if (g.points) {
            row.points += g.points[g.a === entry.teamId ? 0 : 1];
            row.regularPlayed++;
          }
        }
        rows.set(id, row);
      }
    }
  return [...rows.values()];
}
export function careerGames(
  records: SeasonRecord[],
  kind: "teams" | "players",
  id: string,
) {
  return records
    .flatMap((s) => {
      const ids = s.entries
        .filter((e) =>
          kind === "teams" ? e.teamId === id : e.playerIds.includes(id),
        )
        .map((e) => e.teamId);
      return s.games
        .filter((g) => ids.includes(g.a) || ids.includes(g.b))
        .map((game) => ({
          season: s,
          game,
          teamId: ids.find((t) => t === game.a || t === game.b)!,
        }));
    })
    .sort((a, b) => b.game.date.localeCompare(a.game.date));
}
