import { PreviewApp } from "../../src/app";
import { teams, matches } from "../../src/data";
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
      "brand",
    ].map((p) => ({ path: [p] })),
    ...teams.map((t) => ({ path: ["teams", t.id] })),
    ...matches.map((m) => ({ path: ["matches", m.id] })),
  ];
}
export default function Page() {
  return <PreviewApp />;
}
