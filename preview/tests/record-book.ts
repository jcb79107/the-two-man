import { expect, test, type Page } from "@playwright/test";

export async function expectRecordScopeJourney(page: Page) {
  await page.goto("/records?season=2026");
  const rows = page.locator(".record-table tbody tr");
  await expect(rows).toHaveCount(18);
  await page.getByLabel("Match scope").selectOption("playoffs");
  await expect(rows).toHaveCount(8);
  await expect(page.getByRole("status")).toContainText("8 of 8 teams");
  await expect(page.locator(".record-table")).not.toContainText("0–0–0");
  // First-round losses still count as playoff participation.
  await expect(rows.filter({ hasText: "Grant & Rausch" })).toContainText(
    "0–1–0",
  );
  await expect(rows.filter({ hasText: "Nankin & Sacks" })).toContainText(
    "$1,050",
  );
  await page.getByLabel("Rank by").selectOption("rate");
  await expect(page).toHaveURL(/sort=rate/);
  await page.goBack();
  await expect(page.getByLabel("Rank by")).toHaveValue("wins");
  await expect(page.getByLabel("Match scope")).toHaveValue("playoffs");
  await page.goBack();
  await expect(page.getByLabel("Match scope")).toHaveValue("all");
  await expect(rows).toHaveCount(18);
  await page.goForward();
  await expect(rows).toHaveCount(8);
  await page.getByLabel("Records for").selectOption("players");
  await expect(rows).toHaveCount(16);
  await page.reload();
  await expect(page.getByLabel("Records for")).toHaveValue("players");
  await expect(rows).toHaveCount(16);
  await page.getByLabel("Records for").selectOption("teams");
  await expect(rows).toHaveCount(8);
  await page.getByRole("searchbox").fill("Baer");
  await expect(
    page.getByRole("heading", { name: "No matching records." }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("0 of 8 teams");
  await page
    .getByRole("button", { name: "Show all matches", exact: true })
    .click();
  await expect(page.getByRole("searchbox")).toHaveValue("Baer");
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText("Baer & Cadden");
  await expect(page.getByLabel("Match scope")).toBeFocused();
  await page.goBack();
  await expect(page.getByLabel("Match scope")).toHaveValue("playoffs");
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(rows).toHaveCount(8);
  await expect(page.getByRole("searchbox")).toBeFocused();
  await page.getByLabel("Match scope").selectOption("all");
  const originalRank = await rows
    .filter({ hasText: "Baer & Cadden" })
    .locator("td")
    .first()
    .innerText();
  await page.getByRole("searchbox").fill("Jack Cadden");
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText("Baer & Cadden");
  await page.getByRole("searchbox").fill("  jAsOn BaEr  ");
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText("Baer & Cadden");
  await expect(rows.locator("td").first()).toHaveText(originalRank);
  await page.reload();
  await expect(rows).toHaveCount(1);
  await expect(page.getByRole("searchbox")).toHaveValue("  jAsOn BaEr  ");
  await page.getByLabel("Records for").selectOption("players");
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText("Jason Baer");
  await page.goBack();
  await expect(page.getByLabel("Records for")).toHaveValue("teams");
  await expect(rows).toContainText("Baer & Cadden");
  await page.screenshot({
    path: test.info().outputPath("record-name-search.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
