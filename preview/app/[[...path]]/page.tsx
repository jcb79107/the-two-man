import { routeMetadata } from "../../src/route-metadata";
import { offseason } from "../../src/site-mode";
import { PreviewApp } from "../../src/app";
import { teams, matches } from "../../src/data";
import { archive2026, players } from "../../src/history-data";
export const dynamicParams = false;
export function generateStaticParams() {
  if (offseason)
    return [
      { path: [] },
      ...["rules", "review", "history", "champions", "records"].map((p) => ({
        path: [p],
      })),
      { path: ["history", "2026"] },
      ...archive2026.games.map((g) => ({
        path: ["history", "2026", "matches", g.id],
      })),
      ...archive2026.entries.map((e) => ({
        path: ["records", "teams", e.teamId],
      })),
      ...players
        .filter((p) => p.id.startsWith("s1-"))
        .map((p) => ({ path: ["players", p.id] })),
    ];
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
    ...[
      ...teams.map((t) => t.id),
      ...archive2026.entries.map((e) => e.teamId),
    ].map((id) => ({ path: ["records", "teams", id] })),
    ...players.map((p) => ({ path: ["players", p.id] })),
    ...["2026", "2027"].map((y) => ({ path: ["history", y] })),
    ...archive2026.games.map((g) => ({
      path: ["history", "2026", "matches", g.id],
    })),
    ...["q1", "q2", "q3", "q4", "s1", "s2", "final"].map((id) => ({
      path: ["playoffs", id],
    })),
    ...matches.map((m) => ({ path: ["matches", m.id] })),
  ];
}
export default function Page() {
  return <PreviewApp />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path = [] } = await params;
  return routeMetadata(path);
}
