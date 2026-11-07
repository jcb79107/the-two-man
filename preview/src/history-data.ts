import { publication } from "./publication";
import source from "./season1-public.json";
import { teams, season, type Match } from "./data";
import { podWinner, result } from "./domain";

// Stable identity is separate from a season entry. Names are never aggregation keys.
const samplePlayers = teams.flatMap((team, i) =>
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
  sourceId?: string;
  next?: string | null;
  slot?: string | null;
  teamNames?: [string, string];
  holesWon?: [number, number];
  netTotals?: [number | null, number | null];
};
export type Award = {
  teamId: string;
  kind: "champion" | "runner-up" | "pod";
  label: string;
  amount: number | null;
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
  prizePool: number | null;
  sample: boolean;
};
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
const archiveEntries: SeasonEntry[] = source.entries.map((e) => ({
  teamId: `s1-${e.teamId}`,
  name: e.name,
  pod: e.pod.replace(/^Pod /, ""),
  playerIds: e.players.map((p) => `s1-${p.id}`) as [string, string],
  playerNames: e.players.map((p) => p.name) as [string, string],
}));
export const players = [
  ...samplePlayers,
  ...archiveEntries.flatMap((e) =>
    e.playerIds.map((id, i) => ({ id, name: e.playerNames[i] })),
  ),
];
const bracketId = (m: (typeof source.matches)[number]) =>
  m.stage === "CHAMPIONSHIP"
    ? "final"
    : m.stage === "SEMIFINAL"
      ? `s${m.round.match(/\d+/)![0]}`
      : m.stage === "QUARTERFINAL"
        ? `q${m.round.match(/\d+/)![0]}`
        : m.id;
const archiveGames: HistoricalGame[] = source.matches.map((m) => {
  const a = `s1-${m.a}`,
    b = `s1-${m.b}`;
  const summaries = [m.a, m.b].map(
    (id) => m.snapshot.summaries.find((s) => s.teamId === id)!,
  );
  const regular = m.stage === "POD_PLAY";
  const entry = archiveEntries.find((e) => e.teamId === a)!;
  const participants = [m.a, m.b].flatMap((id) =>
    source.entries
      .find((e) => e.teamId === id)!
      .players.map((p) => m.snapshot.players?.find((s) => s.id === p.id)),
  );
  const rows = (key: "gross" | "strokes") =>
    participants.map((p) =>
      Array.from(
        { length: 18 },
        (_, h) => p?.[key]?.[String(h + 1) as keyof typeof p.gross],
      ),
    );
  const gross = rows("gross"),
    strokes = rows("strokes");
  // Summary-only playoffs do not contain player scorecards; never synthesize one.
  const hasCard =
    regular &&
    gross.every((row) =>
      row.every((n) => Number.isInteger(n) && Number(n) > 0),
    ) &&
    strokes.every((row) => row.every((n) => Number.isInteger(n)));
  const card: Match | null = hasCard
    ? {
        id: m.id,
        a,
        b,
        pod: entry.pod,
        status: "official",
        course: m.course ?? "Course not recorded",
        tees: [...new Set(participants.map((p) => p!.tees))].join(" / "),
        date: m.date ?? "",
        lockedAt: null,
        scores: gross as number[][],
        strokes: strokes as number[][],
        evidence: true,
        note: "",
        pars: m.snapshot.holeMeta.map((h) => h.par),
        strokeIndexes: m.snapshot.holeMeta.map((h) => h.strokeIndex),
      }
    : null;
  const lead = Math.abs(summaries[0].holesWon - summaries[1].holesWon);
  const remaining = Math.max(0, 18 - m.snapshot.playedHoles);
  const id = bracketId(m);
  return {
    id,
    sourceId: m.id,
    year: 2026,
    a,
    b,
    phase: regular ? "regular" : "playoffs",
    round:
      m.stage === "CHAMPIONSHIP"
        ? "Final"
        : m.stage === "QUARTERFINAL"
          ? "Quarterfinal"
          : m.stage === "SEMIFINAL"
            ? "Semifinal"
            : m.round,
    date: m.date ?? "",
    course: m.course ?? "Course not recorded",
    winner: m.winner ? `s1-${m.winner}` : null,
    score: regular
      ? `${summaries[0].totalPoints} – ${summaries[1].totalPoints}`
      : lead === 0
        ? "Won in tiebreak"
        : remaining
          ? `${lead} & ${remaining}`
          : `${lead} up`,
    points: regular
      ? [summaries[0].totalPoints, summaries[1].totalPoints]
      : null,
    holesWon: [summaries[0].holesWon, summaries[1].holesWon],
    netTotals: [
      summaries[0].betterBallNetTotal,
      summaries[1].betterBallNetTotal,
    ],
    card,
    href: `/history/2026/matches/${id}`,
    next: m.next
      ? bracketId(source.matches.find((x) => x.id === m.next)!)
      : null,
    slot: m.slot,
    teamNames: [entry.name, archiveEntries.find((e) => e.teamId === b)!.name],
  };
});
const final = archiveGames.find((g) => g.round === "Final")!;
const archiveBase: SeasonRecord = {
  year: 2026,
  number: 1,
  complete: Boolean(final.winner),
  sample: false,
  entries: archiveEntries,
  regularCards: archiveGames.flatMap((g) => (g.card ? [g.card] : [])),
  games: archiveGames,
  champion: final.winner,
  runnerUp: final.winner === final.a ? final.b : final.a,
  prizePool: null,
  awards: [],
};
const archiveStandings = seasonStandings(archiveBase);
export const archive2026: SeasonRecord = {
  ...archiveBase,
  awards: [
    {
      teamId: archiveBase.champion!,
      kind: "champion",
      label: "Champion",
      amount: null,
    },
    {
      teamId: archiveBase.runnerUp!,
      kind: "runner-up",
      label: "Runner-up",
      amount: null,
    },
    ...[...new Set(archiveBase.entries.map((e) => e.pod))].flatMap((pod) => {
      const rows = archiveStandings.filter(
        (r) => archiveBase.entries.find((e) => e.teamId === r.id)?.pod === pod,
      );
      const [first, second] = rows;
      const tied =
        first.won + first.tied / 2 === second.won + second.tied / 2 &&
        first.points === second.points &&
        first.holesWon === second.holesWon &&
        first.netTotal === second.netTotal;
      return tied
        ? []
        : [
            {
              teamId: first.id,
              kind: "pod" as const,
              label: `Pod ${pod} winner`,
              amount: null,
            },
          ];
    }),
  ],
};
export function seasons(current: Match[]): SeasonRecord[] {
  const final = publication.games.find((g) => g.id === "final");
  return [
    {
      year: 2027,
      number: 2,
      sample: true,
      complete: !!final,
      entries,
      games: [...regularGames(current, 2027), ...publication.games],
      regularCards: current,
      champion: final?.winner ?? null,
      runnerUp: final ? (final.a === final.winner ? final.b : final.a) : null,
      prizePool: season.prizePool,
      awards: [
        ...(final
          ? [
              {
                teamId: final.winner!,
                kind: "champion" as const,
                label: "Champions",
                amount: season.championAward,
              },
              {
                teamId: final.a === final.winner ? final.b : final.a,
                kind: "runner-up" as const,
                label: "Runners-up",
                amount: season.runnerUpAward,
              },
            ]
          : []),
        ...["A", "B", "C", "D", "E", "F"].flatMap((pod) => {
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
      ],
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
  earned: number | null;
  points: number;
  regularPlayed: number;
  holesWon: number;
  netTotal: number;
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
          holesWon: 0,
          netTotal: 0,
        };
        row.seasons++;
        row.titles += s.complete && s.champion === entry.teamId ? 1 : 0;
        // Money belongs to the partnership; never infer an individual split.
        if (kind === "teams")
          row.earned =
            row.earned === null || s.prizePool === null
              ? null
              : row.earned +
                s.awards
                  .filter((a) => a.teamId === entry.teamId)
                  .reduce((n, a) => n + (a.amount ?? 0), 0);
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
            const side = g.a === entry.teamId ? 0 : 1;
            const computed = g.card ? result(g.card) : null;
            row.holesWon +=
              g.holesWon?.[side] ??
              computed?.holes.filter((h) => h === (side === 0 ? "a" : "b"))
                .length ??
              0;
            row.netTotal +=
              g.netTotals?.[side] ??
              (side === 0 ? computed?.aNet : computed?.bNet) ??
              0;
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

// Team identities persist across seasons; include only recorded official games.
export function headToHead(records: SeasonRecord[], teamId: string) {
  const rows = new Map<
    string,
    {
      id: string;
      name: string;
      won: number;
      lost: number;
      tied: number;
      games: HistoricalGame[];
    }
  >();
  for (const s of records)
    for (const game of s.games) {
      if (game.a !== teamId && game.b !== teamId) continue;
      const other = game.a === teamId ? game.b : game.a;
      const row = rows.get(other) ?? {
        id: other,
        name: entryName(s, other),
        won: 0,
        lost: 0,
        tied: 0,
        games: [],
      };
      if (!game.winner) row.tied++;
      else if (game.winner === teamId) row.won++;
      else row.lost++;
      row.games.push(game);
      rows.set(other, row);
    }
  return [...rows.values()].sort(
    (a, b) => b.games.length - a.games.length || a.name.localeCompare(b.name),
  );
}

export function seasonStandings(s: SeasonRecord) {
  return careerRows([s], "teams", "regular").sort(
    (a, b) =>
      b.won + b.tied / 2 - (a.won + a.tied / 2) ||
      b.points - a.points ||
      b.holesWon - a.holesWon ||
      a.netTotal - b.netTotal ||
      a.name.localeCompare(b.name),
  );
}
