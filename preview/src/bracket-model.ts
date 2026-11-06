import { nameOf } from "./data";
import type { HistoricalGame } from "./history-data";
export type BracketRound = "quarters" | "semis" | "final";
export type BracketSlot = { id: string | null; label: string; seed?: number };
export type BracketMatch = {
  id: string;
  label: string;
  round: BracketRound;
  slots: [BracketSlot, BracketSlot];
  sources?: [string, string];
  next: string | null;
  winner: string | null;
  score: string | null;
  href: string | null;
  date: string | null;
};
const path = [
  { id: "q1", label: "QF1", round: "quarters", seeds: [0, 7], next: "s1" },
  { id: "q2", label: "QF2", round: "quarters", seeds: [3, 4], next: "s1" },
  { id: "q3", label: "QF3", round: "quarters", seeds: [1, 6], next: "s2" },
  { id: "q4", label: "QF4", round: "quarters", seeds: [2, 5], next: "s2" },
  {
    id: "s1",
    label: "SF1",
    round: "semis",
    sources: ["q1", "q2"],
    next: "final",
  },
  {
    id: "s2",
    label: "SF2",
    round: "semis",
    sources: ["q3", "q4"],
    next: "final",
  },
  {
    id: "final",
    label: "Final",
    round: "final",
    sources: ["s1", "s2"],
    next: null,
  },
] as const;
// Uses the existing eight-slot preview path. This is presentation, not seeding,
// qualification or playoff administration. Later slots come only from winners.
export function bracketMatches(
  seedIds: string[] = [],
  games: HistoricalGame[] = [],
): BracketMatch[] {
  const nodes: BracketMatch[] = [];
  for (const p of path) {
    const game = games.find((g) => g.phase === "playoffs" && g.id === p.id);
    const slots: BracketSlot[] =
      "sources" in p
        ? p.sources.map((source) => {
            const node = nodes.find((n) => n.id === source)!;
            const winner = node.winner
              ? node.slots.find((s) => s.id === node.winner)
              : null;
            return winner
              ? { ...winner }
              : { id: null, label: `Winner ${node.label}` };
          })
        : p.seeds.map((seed, i) => {
            const id = game
              ? i === 0
                ? game.a
                : game.b
              : seedIds.length === 8
                ? seedIds[seed]
                : null;
            return {
              id,
              label: id ? nameOf(id) : `Seed ${seed + 1}`,
              ...(!game ? { seed: seed + 1 } : {}),
            };
          });
    const consistent =
      game &&
      slots.some((s) => s.id === game.a) &&
      slots.some((s) => s.id === game.b) &&
      slots.some((s) => s.id === game.winner);
    nodes.push({
      id: p.id,
      label: p.label,
      round: p.round,
      slots: slots as [BracketSlot, BracketSlot],
      sources: "sources" in p ? [...p.sources] : undefined,
      next: p.next,
      winner: consistent ? game.winner : null,
      score: consistent ? game.score : null,
      href: consistent ? game.href : null,
      date: consistent ? game.date : null,
    });
  }
  return nodes;
}

// Includes future feeder rounds only while the team remains alive.
export function teamPath(nodes: BracketMatch[], teamId: string): string[] {
  if (!teamId) return [];
  const start = nodes.find(
    (n) => n.round === "quarters" && n.slots.some((s) => s.id === teamId),
  );
  const ids: string[] = [];
  let node = start;
  while (node) {
    ids.push(node.id);
    if (node.winner && node.winner !== teamId) break;
    node = nodes.find((n) => n.id === node!.next);
  }
  return ids;
}
