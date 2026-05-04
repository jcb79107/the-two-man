import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/server/app-url";
import { getLatestTournamentSlug } from "@/lib/server/public-tournament";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getAppUrl();
  const now = new Date();
  const routes = ["/"];

  try {
    const latestSlug = await getLatestTournamentSlug();

    if (latestSlug) {
      routes.push(
        `/tournament/${latestSlug}/standings`,
        `/tournament/${latestSlug}/bracket`,
        `/tournament/${latestSlug}/rules`
      );
    }
  } catch {
    // Allow builds without a live database connection to emit a minimal sitemap.
  }

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now
  }));
}
