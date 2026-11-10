import { expect, test, type Page } from "@playwright/test";

export async function expectCareerScorePerspective(page: Page) {
  const match = "/history/2026/matches/9d21d132165a4737add5c";
  await page.goto("/records/teams/s1-team-13");
  const history = page.locator(`.career-match-list a[href="${match}"]`);
  await expect(history).toContainText("W");
  await expect(history).toContainText("10 – 8");
  await page
    .locator(".rivalry-list summary")
    .filter({ hasText: "Baer & Cadden" })
    .click();
  await expect(
    page.locator(`.rivalry-results a[href="${match}"]`),
  ).toContainText("Win · 10 – 8");
  await page.screenshot({
    path: test.info().outputPath("career-score-perspective.png"),
    fullPage: true,
  });
  await page.goto("/players/s1-team-13-player-1");
  await expect(
    page.locator(`.career-match-list a[href="${match}"]`),
  ).toContainText("10 – 8");
  await page.goto("/records/teams/s1-team-01");
  await expect(
    page.locator(`.career-match-list a[href="${match}"]`),
  ).toContainText("8 – 10");
  await expect(
    page.locator(`.career-match-list a[href="${match}"]`),
  ).toContainText("L");
  await page.locator(`.career-match-list a[href="${match}"]`).click();
  await expect(page.locator(".archived-result")).toContainText("8 – 10");
}
