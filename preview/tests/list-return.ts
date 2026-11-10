import { expect, type Page } from "@playwright/test";

export async function expectListReturn(page: Page) {
  for (const kind of ["teams", "players"]) {
    await page.goto(
      `/records?kind=${kind}&season=2026&phase=playoffs&sort=rate&q=Grant`,
    );
    const listUrl = page.url();
    await page.locator(".record-table tbody a").click();
    await expect(
      page.getByRole("link", { name: "The record book", exact: true }),
    ).toBeVisible();
    if (kind === "teams") {
      const newTab = await page.context().newPage();
      await newTab.goto(page.url());
      await newTab
        .getByRole("link", { name: "The record book", exact: true })
        .click();
      await expect(newTab).toHaveURL(listUrl);
      await newTab.close();
    }
    await page.reload();
    await page
      .getByRole("link", { name: "The record book", exact: true })
      .click();
    await expect(page).toHaveURL(listUrl);
    await expect(page.getByRole("searchbox")).toHaveValue("Grant");
    await expect(page.locator(".record-table tbody tr")).toHaveCount(1);
  }
  await page.goto("/history/2026?view=results&phase=playoffs&q=Grant");
  const resultsUrl = page.url();
  await page.locator(".archive-game").click();
  await expect(
    page.getByRole("link", { name: "2026 season archive", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("link", { name: "2026 season archive", exact: true })
    .click();
  await expect(page).toHaveURL(resultsUrl);
  await expect(page.getByLabel("Match scope")).toHaveValue("playoffs");
  await expect(page.getByRole("searchbox")).toHaveValue("Grant");
  await expect(page.locator(".archive-game")).toHaveCount(1);
  await page.goto("/history/2026/matches/final");
  await expect(
    page.getByRole("link", { name: "2026 season archive", exact: true }),
  ).toHaveAttribute("href", "/history/2026?view=playoffs");
  await page.goto("/players/s1-team-13-player-1");
  await expect(
    page.getByRole("link", { name: "The record book", exact: true }),
  ).toHaveAttribute("href", "/records?kind=players");
}
