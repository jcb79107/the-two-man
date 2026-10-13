import { teams, PREVIEW_NOW, type Match, type Team } from "./data";
export function validateCard(
  scores: number[][],
  strokes: number[][],
): string | null {
  if (scores.length !== 4 || scores.some((r) => r.length !== 18))
    return "Enter 18 hole scores for all four players.";
  if (
    scores.some((r) => r.some((s) => !Number.isInteger(s) || s < 1 || s > 20))
  )
    return "Gross scores must be whole numbers between 1 and 20.";
  if (
    strokes.length !== 4 ||
    strokes.some(
      (r) =>
        r.length !== 18 ||
        r.some((s) => !Number.isInteger(s) || s < 0 || s > 3),
    )
  )
    return "Check the agreed stroke allocation for each player.";
  return null;
}
export function result(m: Match) {
  const net = m.scores.map((r, p) => r.map((s, h) => s - m.strokes[p][h]));
  const a = net[0].map((s, h) => Math.min(s, net[1][h]));
  const b = net[2].map((s, h) => Math.min(s, net[3][h]));
  const holes = a.map((s, h) => (s < b[h] ? "a" : s > b[h] ? "b" : "tie"));
  const aPoints = holes.reduce(
    (n, h) => n + (h === "a" ? 1 : h === "tie" ? 0.5 : 0),
    0,
  );
  const bPoints = 18 - aPoints;
  return {
    net,
    a,
    b,
    holes,
    aPoints,
    bPoints,
    winner: aPoints > bPoints ? m.a : aPoints < bPoints ? m.b : null,
    aNet: a.reduce((x, y) => x + y, 0),
    bNet: b.reduce((x, y) => x + y, 0),
  };
}
export type Standing = {
  team: Team;
  played: number;
  won: number;
  lost: number;
  tied: number;
  points: number;
  holesWon: number;
  net: number;
};
export function standings(ms: Match[]): Standing[] {
  return teams
    .map((team) => {
      const row: Standing = {
        team,
        played: 0,
        won: 0,
        lost: 0,
        tied: 0,
        points: 0,
        holesWon: 0,
        net: 0,
      };
      for (const m of ms.filter(
        (m) => m.status === "official" && (m.a === team.id || m.b === team.id),
      )) {
        const r = result(m),
          isA = m.a === team.id;
        row.played++;
        row.won += r.winner === team.id ? 1 : 0;
        row.lost += r.winner !== null && r.winner !== team.id ? 1 : 0;
        row.tied += r.winner === null ? 1 : 0;
        row.points += isA ? r.aPoints : r.bPoints;
        row.holesWon += r.holes.filter((h) => h === (isA ? "a" : "b")).length;
        row.net += isA ? r.aNet : r.bNet;
      }
      return row;
    })
    .sort(compareStanding);
}
export function compareStanding(a: Standing, b: Standing) {
  return (
    b.won + b.tied * 0.5 - (a.won + a.tied * 0.5) ||
    b.points - a.points ||
    b.holesWon - a.holesWon ||
    a.net - b.net
  );
}
export function podWinner(ms: Match[], pod: string) {
  const games = ms.filter((m) => m.pod === pod);
  if (games.length !== 3 || games.some((m) => m.status !== "official"))
    return null;
  const rows = standings(games).filter((r) => r.team.pod === pod);
  return compareStanding(rows[0], rows[1]) === 0 ? null : rows[0].team.id;
}
export function qualified(ms: Match[]) {
  if (ms.length !== 18 || ms.some((m) => m.status !== "official")) return [];
  const rows = standings(ms);
  const winners = ["A", "B", "C", "D", "E", "F"].map((p) => podWinner(ms, p));
  if (winners.some((w) => !w)) return [];
  const podRows = rows.filter((r) => winners.includes(r.team.id));
  const rest = rows.filter((r) => !winners.includes(r.team.id));
  if (
    compareStanding(rest[1], rest[2]) === 0 ||
    compareStanding(rest[0], rest[1]) === 0
  )
    return [];
  if (podRows.some((r, i) => i > 0 && compareStanding(podRows[i - 1], r) === 0))
    return [];
  return [...podRows, ...rest.slice(0, 2)];
}
export function lockAllowed(teeTime: string, now: string) {
  return (
    Number.isFinite(Date.parse(teeTime)) &&
    Date.parse(teeTime) - Date.parse(now) >= 24 * 60 * 60 * 1000
  );
}
export function approvalError(m: Match): string | null {
  if (!m.date || Date.parse(m.date) > Date.parse(PREVIEW_NOW))
    return "This match has not been played yet in the sample season.";
  if (!m.lockedAt || !lockAllowed(m.date, m.lockedAt))
    return "Strokes must be locked at least 24 hours before tee time. This match needs commissioner resolution.";
  if (!m.evidence) return "A scorecard is required before approval.";
  return validateCard(m.scores, m.strokes);
}
export function approveMatch(ms: Match[], id: string) {
  return ms.map((m) =>
    m.id === id && m.status === "review" && !approvalError(m)
      ? { ...m, status: "official" as const }
      : m,
  );
}
export function validSnapshot(value: unknown): value is Match[] {
  if (!Array.isArray(value) || value.length !== 18) return false;
  return value.every((m, i) => {
    if (!m || typeof m !== "object") return false;
    const teamA = teams.find((t) => t.id === m.a);
    const teamB = teams.find((t) => t.id === m.b);
    return (
      m.id === `m${i + 1}` &&
      !!teamA &&
      !!teamB &&
      m.a !== m.b &&
      teamA.pod === m.pod &&
      teamB.pod === m.pod &&
      ["official", "review", "scheduled", "unbooked", "correction"].includes(
        m.status,
      ) &&
      Array.isArray(m.scores) &&
      m.scores.every(Array.isArray) &&
      Array.isArray(m.strokes) &&
      m.strokes.every(Array.isArray) &&
      validateCard(m.scores, m.strokes) === null &&
      typeof m.date === "string" &&
      (!m.date || Number.isFinite(Date.parse(m.date))) &&
      (m.lockedAt === null ||
        (typeof m.lockedAt === "string" &&
          Number.isFinite(Date.parse(m.lockedAt)))) &&
      typeof m.course === "string" &&
      typeof m.tees === "string" &&
      typeof m.note === "string" &&
      typeof m.evidence === "boolean"
    );
  });
}
