import type { MetadataRoute } from "next";
import { offseason } from "../src/site-mode";
import { archive2026, players } from "../src/history-data";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  if (!offseason) return [];
  return [
    "/",
    "/history",
    "/history/2026",
    "/rules",
    "/records",
    "/champions",
    ...archive2026.entries.map((e) => `/records/teams/${e.teamId}`),
    ...players
      .filter((p) => p.id.startsWith("s1-"))
      .map((p) => `/players/${p.id}`),
    ...archive2026.games.map((g) => g.href),
  ].map((path) => ({ url: `https://www.thetwoman.site${path}` }));
}
