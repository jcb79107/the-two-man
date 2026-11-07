import { pods, type Match } from "./data";
import { compareStanding, standings, type Standing } from "./domain";

export type SortKey =
  | "team"
  | "record"
  | "points"
  | "holesWon"
  | "net"
  | "played";
export const sortKeys: SortKey[] = [
  "team",
  "record",
  "points",
  "holesWon",
  "net",
  "played",
];
export function sortStandings(
  rows: Standing[],
  key: SortKey,
  direction: "asc" | "desc",
) {
  return [...rows].sort((a, b) => {
    const value =
      key === "team"
        ? a.team.names.join(" & ").localeCompare(b.team.names.join(" & "))
        : key === "record"
          ? a.won + a.tied * 0.5 - (b.won + b.tied * 0.5) || b.lost - a.lost
          : a[key] - b[key];
    return (
      (direction === "asc" ? value : -value) ||
      compareStanding(a, b) ||
      a.team.id.localeCompare(b.team.id)
    );
  });
}

export function projectField(rows: Standing[]) {
  if (!rows.some((r) => r.played))
    return { field: [], bubble: [], ties: [] as Standing[][] };
  const order = (items: Standing[]) =>
    [...items].sort(
      (a, b) => compareStanding(a, b) || a.team.id.localeCompare(b.team.id),
    );
  const leaders = pods
    .map((pod) => order(rows.filter((r) => r.team.pod === pod))[0])
    .filter((r): r is Standing => !!r);
  const podIds = new Set(leaders.map((r) => r.team.id));
  const rest = order(rows.filter((r) => !podIds.has(r.team.id)));
  const field = [...order(leaders), ...rest.slice(0, 2)].map((row, i) => ({
    ...row,
    seed: i + 1,
    route: i < leaders.length ? "Pod winner" : "Wild card",
  }));
  const ties: Standing[][] = [];
  // Surface every unresolved pod lead and the wild-card cut, rather than
  // silently treating stable display order as a qualification decision.
  for (const leader of leaders) {
    const group = rows.filter(
      (r) => r.team.pod === leader.team.pod && compareStanding(r, leader) === 0,
    );
    if (group.length > 1) ties.push(group);
  }
  const seenSeeds = new Set<string>();
  for (const leader of leaders) {
    if (seenSeeds.has(leader.team.id)) continue;
    const group = leaders.filter((r) => compareStanding(r, leader) === 0);
    group.forEach((r) => seenSeeds.add(r.team.id));
    if (group.length > 1) ties.push(group);
  }
  if (rest[1]) {
    const group = rest.filter((r) => compareStanding(r, rest[1]) === 0);
    if (group.length > 1) ties.push(group);
  }
  return { field, bubble: rest.slice(2, 6), ties };
}

export type ScenarioScore = {
  points: number;
  holesWon: number;
  aNet: number;
  bNet: number;
};
export function scenarioError(score: ScenarioScore): string | null {
  if (
    !Number.isFinite(score.points) ||
    score.points < 0 ||
    score.points > 18 ||
    !Number.isInteger(score.points * 2)
  )
    return "Hole points must be between 0 and 18 in half-point steps.";
  const halves = 2 * (score.points - score.holesWon);
  const bWins = 18 - halves - score.holesWon;
  if (
    !Number.isInteger(score.holesWon) ||
    score.holesWon < 0 ||
    halves < 0 ||
    bWins < 0
  )
    return "Holes won must fit the selected score across 18 holes.";
  if (
    ![score.aNet, score.bNet].every((n) => Number.isSafeInteger(n) && n <= 360)
  )
    return "Enter a whole-number net better-ball total no greater than 360 for each team.";
  // GHIN allocations can produce negative net scores; gross scores remain capped at 20.
  const difference = score.bNet - score.aNet;
  if (
    !Number.isSafeInteger(difference) ||
    score.aNet > 360 - score.holesWon ||
    score.bNet > 360 - bWins ||
    (bWins === 0 && difference < score.holesWon) ||
    (score.holesWon === 0 && difference > -bWins)
  )
    return "Net totals must be possible for the selected holes won and halved.";
  return null;
}
export function simulateMatch(
  matches: Match[],
  id: string,
  score: ScenarioScore,
): Standing[] {
  const match = matches.find((m) => m.id === id);
  if (!match || match.status === "official")
    throw new Error("Choose a match without a published result.");
  const error = scenarioError(score);
  if (error) throw new Error(error);
  const bPoints = 18 - score.points;
  const halves = 2 * (score.points - score.holesWon);
  const bWins = 18 - halves - score.holesWon;
  return standings(matches)
    .map((row) => {
      if (row.team.id !== match.a && row.team.id !== match.b) return row;
      const isA = row.team.id === match.a;
      const points = isA ? score.points : bPoints;
      return {
        ...row,
        played: row.played + 1,
        won: row.won + Number(points > 9),
        lost: row.lost + Number(points < 9),
        tied: row.tied + Number(points === 9),
        points: row.points + points,
        holesWon: row.holesWon + (isA ? score.holesWon : bWins),
        net: row.net + (isA ? score.aNet : score.bNet),
      };
    })
    .sort(compareStanding);
}
