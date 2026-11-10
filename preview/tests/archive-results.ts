import { expect, type Page } from "@playwright/test";

export async function expectArchiveResultsJourney(page: Page) {
  await page.goto("/history/2026?view=results");
  const cards = page.locator(".archive-game");
  const search = page.getByRole("searchbox", { name: "Find a player or team" });
  const scope = page.getByLabel("Match scope");
  await expect(cards).toHaveCount(25);
  await search.fill("  jAsOn BaEr  ");
  await expect(cards).toHaveCount(2);
  await expect(page.getByRole("status")).toHaveText("2 of 25 official results");
  await page.reload();
  await expect(search).toHaveValue("  jAsOn BaEr  ");
  await expect(cards).toHaveCount(2);
  await cards.filter({ hasText: "Grant & Rausch" }).click();
  await expect(page).toHaveURL(/matches\/9d21d132165a4737add5c\?/);
  await page.goBack();
  await expect(cards).toHaveCount(2);
  await expect(search).toHaveValue("  jAsOn BaEr  ");
  await scope.selectOption("playoffs");
  await expect(
    page.getByRole("heading", { name: "No matching results" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Show all matches", exact: true })
    .click();
  await expect(cards).toHaveCount(2);
  await expect(scope).toBeFocused();
  await page.goBack();
  await expect(scope).toHaveValue("playoffs");
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(search).toBeFocused();
  await expect(scope).toHaveValue("playoffs");
  await expect(cards).toHaveCount(7);
  await expect(cards.filter({ hasText: "Date not recorded" })).toHaveCount(1);
  await scope.selectOption("regular");
  await expect(cards).toHaveCount(18);
  await page.goBack();
  await expect(cards).toHaveCount(7);
  await page.goForward();
  await expect(cards).toHaveCount(18);
  await search.fill("Nobody matches");
  await expect(cards).toHaveCount(0);
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(cards).toHaveCount(18);
  await search.fill("Baer & Cadden");
  await expect(cards).toHaveCount(2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
