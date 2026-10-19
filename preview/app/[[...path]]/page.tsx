import { PreviewApp } from "../../src/app";
import { teams, matches } from "../../src/data";
import { archive2026, players } from "../../src/history-data";
export const dynamicParams = false;
export function generateStaticParams() {
  return [
    { path: [] },
    ...[
      "standings",
      "matches",
      "bracket",
      "earnings",
      "rules",
      "submit",
      "review",
      "history",
      "champions",
      "records",
    ].map((p) => ({ path: [p] })),
    ...teams.map((t) => ({ path: ["teams", t.id] })),
    ...teams.map((t) => ({ path: ["records", "teams", t.id] })),
    ...players.map((p) => ({ path: ["players", p.id] })),
    ...["2026", "2027"].map((y) => ({ path: ["history", y] })),
    ...archive2026.games.map((g) => ({
      path: ["history", "2026", "matches", g.id],
    })),
    ...matches.map((m) => ({ path: ["matches", m.id] })),
  ];
}
export default function Page() {
  return <PreviewApp />;
}
