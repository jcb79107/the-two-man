import { expect, type Page } from "@playwright/test";

export async function expectScorecardClarity(page: Page) {
  await page.goto("/history/2026/matches/9d21d132165a4737add5c");
  const card = page.locator(".scorecard");
  await expect(card.locator(".scorecard-guide")).toContainText(
    "not necessarily the hole winner",
  );
  await expect(card.locator(".scorecard-guide")).toContainText(
    "the score counts once",
  );
  await expect(card.locator(".scorecard-guide")).toContainText(
    "Gross = shots taken",
  );
  const player = (name: string) =>
    card
      .getByRole("row")
      .filter({ has: page.getByRole("rowheader", { name: new RegExp(name) }) });
  await expect(player("Jason Baer").locator("td").first()).not.toHaveClass(
    /best-ball-cell/,
  );
  await expect(player("Jack Cadden").locator("td").first()).toContainText(
    "Best",
  );
  // Equal net scores both get marked, even when their gross scores differ.
  await expect(player("Andrew Rausch").locator("td").first()).toContainText(
    "Best",
  );
  await expect(player("Brandon Grant").locator("td").first()).toContainText(
    "Best",
  );
  await expect(
    player("Brandon Grant").locator(".score-number").first(),
  ).toHaveText("5");
  await expect(card.locator(".hole-result td").nth(9)).toHaveText(
    "A 5.5 : 3.5 B",
  );
  await expect(card.locator(".hole-result td").last()).toHaveText("A 8 : 10 B");
  await card.getByRole("button", { name: "Net", exact: true }).click();
  await expect(card.locator(".scorecard-guide")).toContainText(
    "already deducted",
  );
  await expect(
    player("Brandon Grant").locator(".score-number").first(),
  ).toHaveText("4");
  await expect(player("Brandon Grant").locator("td").first()).toContainText(
    "Best",
  );
  await card.getByRole("button", { name: "Back 9", exact: true }).click();
  await expect(card.locator(".hole-result td").nth(9)).toHaveText(
    "A 2.5 : 6.5 B",
  );
  await expect(card.locator(".hole-result td").last()).toHaveText("A 8 : 10 B");
  await card.getByRole("button", { name: "Front 9", exact: true }).click();
  await card.getByRole("button", { name: "Gross", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
