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
