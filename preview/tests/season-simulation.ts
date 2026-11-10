import { matches, pars, type Match } from "../src/data";
import { qualified } from "../src/domain";
import { loadPublication, type Publication } from "../src/publication";
import { bracketMatches } from "../src/bracket-model";

// Fictional fixtures shared by the full-season regression and isolated UI rehearsal.
export function seasonSimulation() {
  const regular: Match[] = matches.map((m, i) => ({
    ...structuredClone(m),
    status: "official",
    date: `2027-06-${String(i + 1).padStart(2, "0")}`,
    note: "Fictional season simulation",
    scores: Array.from({ length: 4 }, (_, p) =>
      pars.map((par, h) => {
        const wins = 12 - Math.floor(i / 3);
        return (
          par +
          m.strokes[p][h] +
          (p % 2) +
          (p < 2 ? Number(h >= wins && h < wins + 2) : Number(h < wins))
        );
      }),
    ),
  }));
  const complete: Publication = {
    season: 2027,
    revision: 118,
    note: "Fictional season simulation",
    regular,
    seeds: qualified(regular).map((r) => r.team.id),
    playoffs: [],
  };
  const stages: Record<string, Publication> = {};
  for (const [stage, count] of [
    ["start", 0],
    ["opening", 1],
    ["regular", 18],
  ] as const)
    stages[stage] = {
      ...structuredClone(complete),
      revision: 100 + count,
      regular: regular.slice(0, count),
      seeds: count === 18 ? complete.seeds : [],
    };
  for (const id of ["q1", "q2", "q3", "q4", "s1", "s2", "final"]) {
    const data = loadPublication(complete);
    const node = bracketMatches(data.seeds, data.games).find(
      (n) => n.id === id,
    )!;
    complete.playoffs.push({
      id,
      a: node.slots[0].id!,
      b: node.slots[1].id!,
      winner: node.slots[0].id!,
      score: id === "final" ? "19 holes" : "2 & 1",
      date:
        id === "final"
          ? "2027-07-24"
          : id.startsWith("s")
            ? "2027-07-17"
            : "2027-07-10",
      course: "The Glen Club",
    });
    complete.revision++;
    if (["q4", "s2", "final"].includes(id))
      stages[id === "q4" ? "quarters" : id === "s2" ? "semis" : "final"] =
        structuredClone(complete);
  }
  stages.tied = {
    ...structuredClone(stages.regular),
    revision: 150,
    regular: regular.map((m) => ({
      ...m,
      scores: structuredClone(regular[0].scores),
      strokes: structuredClone(regular[0].strokes),
    })),
  };
  return stages;
}
