import { describe, expect, it, vi } from "vitest";

async function loadSite(mode: "offseason" | "preview") {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SITE_MODE", mode);
  return import("../app/[[...path]]/page");
}

describe("route metadata", () => {
  it("gives every exported public route its own title and description", async () => {
    const { generateMetadata, generateStaticParams } =
      await loadSite("offseason");
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const { path } of generateStaticParams()) {
      const meta = await generateMetadata({
        params: Promise.resolve({ path }),
      });
      expect(meta).toHaveProperty("title");
      expect(meta).toHaveProperty("description");
      const result = meta as {
        title: string;
        description: string;
        openGraph: { title: string; description: string };
        alternates: { canonical: string };
      };
      expect(titles.has(result.title)).toBe(false);
      expect(descriptions.has(result.description)).toBe(false);
      titles.add(result.title);
      descriptions.add(result.description);
      expect(result.openGraph.title).toContain(result.title);
      expect(result.openGraph.description).toBe(result.description);
      expect(result.alternates.canonical).toBe("/" + path.join("/"));
    }
  });

  it("identifies the official final without exposing sample participants", async () => {
    const { generateMetadata } = await loadSite("offseason");
    const meta = await generateMetadata({
      params: Promise.resolve({
        path: ["history", "2026", "matches", "final"],
      }),
    });
    expect(meta).toMatchObject({
      title: expect.stringContaining("Final"),
      description: expect.stringContaining("Barron & Loewenstein"),
    });
    expect(JSON.stringify(meta)).not.toMatch(/Bennett|Reed/);
  });

  it("keeps all demo routes and commissioner tools out of search", async () => {
    const { generateMetadata, generateStaticParams } =
      await loadSite("preview");
    for (const { path } of generateStaticParams()) {
      const meta = await generateMetadata({
        params: Promise.resolve({ path }),
      });
      expect(meta).toMatchObject({
        robots: { index: false, follow: false },
        title: expect.any(String),
        description: expect.any(String),
      });
      expect(meta).not.toHaveProperty("alternates");
    }
    const live = await loadSite("offseason");
    expect(
      await live.generateMetadata({
        params: Promise.resolve({ path: ["review"] }),
      }),
    ).toMatchObject({ robots: { index: false, follow: false } });
  });

  it("includes every indexable public route in the sitemap, but no review tools", async () => {
    const { generateStaticParams } = await loadSite("offseason");
    const { default: sitemap } = await import("../app/sitemap");
    const urls = sitemap().map(({ url }) => new URL(url).pathname);
    expect(urls).toEqual(
      expect.arrayContaining(
        generateStaticParams()
          .filter(({ path }) => path[0] !== "review")
          .map(({ path }) => "/" + path.join("/")),
      ),
    );
    expect(urls).not.toContain("/review");
  });
});
