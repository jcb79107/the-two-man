import source from "./season2-results.json";
import { matches as fixtures, teams, type Match } from "./data";
import { publishDraft, validSnapshot } from "./domain";
import { bracketMatches } from "./bracket-model";
import type { HistoricalGame } from "./history-data";
export type PlayoffResult = {
  id: string;
  a: string;
  b: string;
  winner: string;
  score: string;
  date: string;
  course: string;
};
export type Publication = {
  season: 2027;
  revision: number;
  note: string;
  regular: Match[];
  seeds: string[];
  playoffs: PlayoffResult[];
};
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string" && !!v.trim();
export function validPlayedDate(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^2027-\d{2}-\d{2}$/.test(v) &&
    Number.isFinite(Date.parse(v + "T12:00:00Z")) &&
    new Date(v + "T12:00:00Z").toISOString().slice(0, 10) === v
  );
}
export function validPlayoffScore(score: string) {
  if (/^[12] up$/.test(score)) return true;
  const extra = /^(\d+) holes$/.exec(score);
  if (extra) return Number(extra[1]) >= 19 && Number(extra[1]) <= 99;
  const early = /^(\d+) & (\d+)$/.exec(score);
  if (!early) return false;
  const [margin, left] = early.slice(1).map(Number);
  return (
    left >= 1 && margin > left && margin <= left + 2 && margin + left <= 18
  );
}
export function loadPublication(raw: unknown) {
  if (
    !object(raw) ||
    raw.season !== 2027 ||
    !Number.isSafeInteger(raw.revision) ||
    Number(raw.revision) < 0 ||
    !text(raw.note) ||
    !Array.isArray(raw.regular) ||
    !Array.isArray(raw.seeds) ||
    !Array.isArray(raw.playoffs)
  )
    throw new Error(
      "Expected a Season 2 publication with revision, note, regular, seeds and playoffs.",
    );
  let matches = structuredClone(fixtures);
  const seen = new Set<string>();
  for (const item of raw.regular) {
    if (!object(item) || !text(item.id) || seen.has(item.id))
      throw new Error("Duplicate or invalid regular-season match.");
    seen.add(item.id);
    const candidate = matches.map((m) => (m.id === item.id ? item : m));
    if (
      !matches.some((m) => m.id === item.id) ||
      !validSnapshot(candidate) ||
      !validPlayedDate(item.date)
    )
      throw new Error(
        "Regular-season cards require valid scores, capped strokes and a 2027 played date.",
      );
    matches = publishDraft(matches, item as unknown as Match);
  }
  const seeds = raw.seeds as string[];
  if (
    (seeds.length !== 0 && seeds.length !== 8) ||
    new Set(seeds).size !== seeds.length ||
    seeds.some((id) => !teams.some((t) => t.id === id))
  )
    throw new Error("Confirm eight distinct Season 2 teams in seed order.");
  if (seeds.length && matches.some((m) => m.status !== "official"))
    throw new Error(
      "Finish regular-season results before confirming playoff seeds.",
    );
  const games: HistoricalGame[] = [];
  const ids = ["q1", "q2", "q3", "q4", "s1", "s2", "final"];
  if (
    raw.playoffs.some((p) => !object(p) || !ids.includes(String(p.id))) ||
    new Set(raw.playoffs.map((p) => p.id)).size !== raw.playoffs.length
  )
    throw new Error("Invalid or duplicate playoff match.");
  for (const id of ids) {
    const p = raw.playoffs.find((p) => p.id === id);
    if (!p) continue;
    const node = bracketMatches(seeds, games).find((n) => n.id === id)!;
    if (
      !seeds.length ||
      !node.slots.every((s) => s.id) ||
      p.a !== node.slots[0].id ||
      p.b !== node.slots[1].id ||
      ![p.a, p.b].includes(p.winner) ||
      !text(p.score) ||
      !validPlayoffScore(p.score) ||
      !validPlayedDate(p.date) ||
      !text(p.course)
    )
      throw new Error(
        `Check ${id}: participants must follow confirmed seeds/feeder winners; supply winner, result, played date and course.`,
      );
    games.push({
      id,
      year: 2027,
      a: p.a,
      b: p.b,
      winner: p.winner,
      score: p.score,
      date: p.date,
      course: p.course,
      phase: "playoffs",
      round:
        node.round === "quarters"
          ? "Quarterfinal"
          : node.round === "semis"
            ? "Semifinal"
            : "Championship",
      points: null,
      card: null,
      href: `/playoffs/${id}`,
      next: node.next,
    });
  }
  return { matches, games, seeds, revision: Number(raw.revision) };
}
export const publication = loadPublication(source);
