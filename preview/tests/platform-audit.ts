import { expect, test, type Page } from "@playwright/test";
import { archive2026 } from "../src/history-data";

export async function auditPublicSurfaces(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const routes = [
    "/",
    "/rules",
    "/history",
    "/champions",
    "/records",
    "/records?q=Nobody",
    "/history/2026",
    "/history/2026?view=standings",
    "/history/2026?view=playoffs",
    "/history/2026?view=results",
    "/history/2026?view=results&q=Nobody",
    "/records/teams/s1-team-13",
    "/players/s1-team-11-player-1",
    "/history/2026/matches/q3",
    archive2026.games.find((g) => g.card)!.href,
    "/review?result=missing",
  ];
  for (const route of routes) {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
      route,
    ).toBe(true);
    if (
      route === "/history/2026?view=standings" ||
      route === "/records/teams/s1-team-13"
    ) {
      await page.screenshot({
        path: test
          .info()
          .outputPath(
            route.includes("standings")
              ? "standings-320.png"
              : "career-320.png",
          ),
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
      route,
    ).toBe(true);
  }
  for (const route of [
    "/records",
    "/history/2026?view=standings",
    "/history/2026/matches/q3",
  ]) {
    await page.goto(route);
    await page.setViewportSize({ width: 720, height: 500 });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
      `720px reflow: ${route}`,
    ).toBe(true);
  }
  await page.goto("/records/teams/s1-team-13");
  await expect(page.locator(".career-match-list a").first()).toContainText(
    "Quarterfinal",
  );
  await expect(page.locator(".career-match-list a").first()).toContainText(
    "Date not recorded",
  );
  await page.goto("/history/2026?view=results");
  const hrefs = await page
    .locator(".archive-game")
    .evaluateAll((links) =>
      links.map((link) => new URL((link as HTMLAnchorElement).href).pathname),
    );
  expect(hrefs[0]).toBe("/history/2026/matches/final");
  expect(hrefs.indexOf("/history/2026/matches/q3")).toBeLessThan(7);
  for (const entry of archive2026.entries) {
    for (const route of [
      `/records/teams/${entry.teamId}`,
      ...entry.playerIds.map((id) => `/players/${id}`),
    ])
      expect((await page.request.get(route)).status(), route).toBe(200);
  }
  await page.goto("/records?q=Nobody");
  await expect(page.locator(".empty-content")).toBeVisible();
  await page.getByRole("button", { name: "Clear search", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("searchbox")).toBeFocused();
  expect(errors).toEqual([]);
}
