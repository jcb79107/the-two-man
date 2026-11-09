import type { MetadataRoute } from "next";
import { offseason } from "../src/site-mode";
export const dynamic = "force-static";
export default function robots(): MetadataRoute.Robots {
  return offseason
    ? {
        rules: { userAgent: "*", allow: "/", disallow: "/review" },
        sitemap: "https://www.thetwoman.site/sitemap.xml",
      }
    : { rules: { userAgent: "*", disallow: "/" } };
}
