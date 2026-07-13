import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Resvg } from "@resvg/resvg-js";

const routePath = path.join(process.cwd(), "app", "api", "admin", "graphics", "[id]", "route.ts");
const generatorPath = path.join(process.cwd(), "src", "components", "admin-instagram-graphic-generator.tsx");
const fontPath = path.join(process.cwd(), "public", "two-man-export-font.ttf");

describe("admin graphic PNG export", () => {
  it("keeps the route on the bundled-font renderer instead of system SVG fonts", () => {
    const routeSource = readFileSync(routePath, "utf8");
    const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
    };

    expect(packageJson.dependencies?.["@resvg/resvg-js"]).toBeTruthy();
    expect(packageJson.dependencies?.sharp).toBeUndefined();
    expect(routeSource).toContain("@resvg/resvg-js");
    expect(routeSource).toContain("two-man-export-font.ttf");
    expect(routeSource).toContain("fontFiles");
    expect(routeSource).toContain("loadSystemFonts: false");
    expect(routeSource).toContain("X-Two-Man-Graphic-Renderer");
    expect(routeSource).not.toContain('import("sharp")');
  });

  it("keeps the thin text variant wired through preview and export", () => {
    const routeSource = readFileSync(routePath, "utf8");
    const generatorSource = readFileSync(generatorPath, "utf8");

    expect(routeSource).toContain('const THIN_TEXT_VARIANT_PARAM = "thin-text"');
    expect(routeSource).toContain("X-Two-Man-Graphic-Variant");
    expect(generatorSource).toContain("Thin text");
    expect(generatorSource).toContain("variant");
    expect(generatorSource).toContain("GRAPHIC_TEXT_WEIGHTS");
  });

  it("keeps playoff graphic mode wired through preview and export", () => {
    const routeSource = readFileSync(routePath, "utf8");
    const generatorSource = readFileSync(generatorPath, "utf8");

    expect(routeSource).toContain("X-Two-Man-Graphic-Mode");
    expect(routeSource).toContain("renderPlayoffGraphicSvg");
    expect(generatorSource).toContain("Playoff");
    expect(generatorSource).toContain("drawPlayoffGraphic");
  });

  it("renders real PNG text using the bundled export font", () => {
    expect(existsSync(fontPath)).toBe(true);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="160" viewBox="0 0 600 160">
      <rect width="600" height="160" fill="#fffaf0" />
      <text x="300" y="72" text-anchor="middle" font-family="TwoManExport" font-size="32" fill="#102017">Stone &amp; Stone vs Rabin &amp; Taitz</text>
      <text x="300" y="112" text-anchor="middle" font-family="TwoManExport" font-size="22" fill="#102017">May 25 / Sunset Valley Golf Club</text>
    </svg>`;

    const png = new Resvg(svg, {
      font: {
        defaultFontFamily: "TwoManExport",
        fontFiles: [fontPath],
        loadSystemFonts: false
      }
    })
      .render()
      .asPng();

    expect(Buffer.from(png.subarray(0, 8))).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect(png.byteLength).toBeGreaterThan(4000);
  });
});
