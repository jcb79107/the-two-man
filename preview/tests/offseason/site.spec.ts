import { expectGraphicRetry } from "../graphic-recovery";
import { test, expect } from "@playwright/test";
import { archive2026 } from "../../src/history-data";

test("offseason journeys use only the official archive", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "The Two-Man", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Details coming this winter.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("Reset demo")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "The purse", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Revisit the final" }).click();
  await expect(page).toHaveURL(/history\/2026\/matches\/final$/);
  await expect(page.locator(".archived-result")).toContainText(
    "Barron & Loewenstein",
  );
  await expect(page.locator(".archived-result")).toContainText("4 & 2");
  for (const route of [
    "/history",
    "/history/2026?view=results",
    "/history/2026?view=standings",
    "/history/2026?view=playoffs",
    "/records",
    "/rules",
  ]) {
    await page.goto(route);
    await expect(page.locator("main")).not.toContainText(
      /Sample season|fictional demo|Bennett & Reed/,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await expect(page.locator("main")).toContainText(
    "one stroke per hole per player",
  );
  for (const route of [
    "/history/2027",
    "/matches/m1",
    "/players/p1",
    "/api/admin/tournament/bootstrap",
  ])
    expect((await page.request.get(route)).status()).toBe(404);
  expect(errors).toEqual([]);
});
test("every official match and player remains reachable", async ({ page }) => {
  for (const game of archive2026.games) {
    await page.goto(game.href);
    await expect(
      page.getByRole("heading", { name: "Page not found" }),
    ).toHaveCount(0);
    await expect(page.locator("main")).toContainText(game.score);
    await expect(
      page.getByRole("heading", { name: "Scorecard", exact: true }),
    ).toHaveCount(game.phase === "regular" ? 1 : 0);
    if (game.phase === "playoffs") {
      await expect(page.getByText("Hole data not recorded")).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Gross", exact: true }),
      ).toHaveCount(0);
      await expect(
        page.locator('meta[name="description"]'),
      ).not.toHaveAttribute("content", /scorecard/i);
    }
  }
  const id = archive2026.entries[0].playerIds[0];
  await page.goto("/players/" + id);
  await expect(page.locator("main")).toContainText(
    archive2026.entries[0].playerNames[0],
  );
});
test("archive graphics download and invalid result never substitutes another match", async ({
  page,
}) => {
  await page.goto("/review");
  const image = page.getByRole("img", { name: /2026 Final/ });
  await expect(image).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download Instagram graphic" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("two-man-2026-final.png");
  expect(await download.failure()).toBeNull();
  await page
    .getByLabel("Published result")
    .selectOption(archive2026.games.find((g) => g.points)!.id);
  await expect(page.getByRole("img", { name: /^2026 / })).toHaveAttribute(
    "src",
    /^data:image\/png/,
  );
  await page.goto("/review?result=missing");
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "not in the official archive",
  );
  await expect(
    page.getByRole("link", { name: "Download Instagram graphic" }),
  ).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

test("search metadata, sharing images and install icons survive navigation", async ({
  page,
}) => {
  await page.goto("/");
  const homeTitle = await page.title();
  const homeDescription = await page
    .locator('meta[name="description"]')
    .getAttribute("content");
  const cta = page.getByRole("link", { name: "Revisit the final" });
  await expect(cta).toBeInViewport();
  await cta.click();
  await expect(page).toHaveTitle(/2026 Final/);
  await expect(page.locator('meta[name="description"]')).not.toHaveAttribute(
    "content",
    homeDescription!,
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    /2026 Final/,
  );
  const ogImage = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  expect((await page.request.get(new URL(ogImage!).pathname)).status()).toBe(
    200,
  );
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
    "content",
    /mascot/,
  );
  for (const icon of await page
    .locator('link[rel="icon"], link[rel="apple-touch-icon"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")!))) {
    expect((await page.request.get(icon)).status()).toBe(200);
  }
  const manifestUrl = await page
    .locator('link[rel="manifest"]')
    .getAttribute("href");
  const manifest = await (await page.request.get(manifestUrl!)).json();
  for (const icon of manifest.icons)
    expect((await page.request.get(icon.src)).status()).toBe(200);
  await page.goBack();
  await expect(page).toHaveTitle(homeTitle);
  const robots = await page.request.get("/robots.txt");
  expect(await robots.text()).toContain(
    "https://www.thetwoman.site/sitemap.xml",
  );
  const sitemap = await page.request.get("/sitemap.xml");
  expect(await sitemap.text()).toContain("/champions");
  expect(await sitemap.text()).not.toContain("/review");
  const response = await page.goto("/not-a-tournament-page");
  expect(response?.status()).toBe(404);
  await page.getByRole("link", { name: "Back to the clubhouse" }).click();
  await expect(page).toHaveTitle(homeTitle);
});

test("detail titles survive hydration and reload", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/history/2026/matches/final");
  await page
    .getByRole("button", { name: "More navigation", exact: true })
    .click();
  await expect(page).toHaveTitle(/2026 Final/);
  await page.reload();
  await page
    .getByRole("button", { name: "More navigation", exact: true })
    .click();
  await expect(page).toHaveTitle(/2026 Final/);
});

test("graphic retry replaces stale failure with loading before download", async ({
  page,
}) => {
  await expectGraphicRetry(page, "Download Instagram graphic");
  await page.screenshot({
    path: test.info().outputPath("graphic-recovered.png"),
    fullPage: true,
  });
});

test("Season 1 payouts show confirmed player splits and stacked career awards", async ({
  page,
}) => {
  if (test.info().project.name === "mobile")
    await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/history/2026");
  await expect(page.locator(".season-stats")).toContainText("$3,600");
  const awards = page.locator(".archive-honors > div");
  await expect(awards).toHaveCount(8);
  await expect(awards.nth(0)).toContainText(
    "$1,800 per team · $900 per player",
  );
  await expect(awards.nth(1)).toContainText("$900 per team · $450 per player");
  for (let pod = 1; pod <= 6; pod++) {
    await expect(awards.nth(pod + 1)).toContainText(`Pod ${pod} winner`);
    await expect(awards.nth(pod + 1)).toContainText(
      "$150 per team · $75 per player",
    );
  }
  await expect(page.locator("main")).not.toContainText(
    "Prize amount not recorded",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("season-one-payouts.png"),
    fullPage: true,
  });
  await awards.nth(1).getByRole("link").click();
  await expect(page.locator(".season-stats")).toContainText("$1,050");
  const runner = archive2026.entries.find(
    (e) => e.teamId === archive2026.runnerUp,
  )!;
  await page.goto(`/players/${runner.playerIds[0]}`);
  await expect(
    page.getByText("Awards earned:", { exact: false }),
  ).toContainText("$525");
  await page.goto("/records?kind=players");
  await expect(
    page.getByRole("columnheader", { name: "Earned", exact: true }),
  ).toBeVisible();
  await page.getByRole("searchbox").fill(runner.playerNames[0]);
  await expect(page.locator(".record-table tbody")).toContainText("$525");
  await page.goto("/history/2026/matches/final");
  await page.screenshot({
    path: test.info().outputPath("playoff-final.png"),
    fullPage: true,
  });
});
