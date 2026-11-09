import { expect, type Page } from "@playwright/test";

export async function expectScorecardClarity(page: Page) {
  await page.goto("/history/2026/matches/9d21d132165a4737add5c");
  const card = page.locator(".scorecard");
  const player = (name: string) =>
    card
      .getByRole("row")
      .filter({ has: page.getByRole("rowheader", { name: new RegExp(name) }) });
  await expect(
    card.locator(".scorecard-guide, .best-ball-label, .best-ball-cell"),
  ).toHaveCount(0);
  await expect(card.locator(".score-team")).toHaveCount(2);
  await expect(card.locator(".score-team-a .score-player")).toHaveCount(2);
  await expect(card.locator(".score-team-b .score-player")).toHaveCount(2);
  await expect(card.locator(".score-team-a .net-row")).toContainText(
    "Better ball",
  );
  await expect(card.locator(".score-team-b .net-row")).toContainText(
    "Better ball",
  );
  await expect(
    player("Jason Baer").locator(".score-number").nth(0),
  ).toHaveClass(/\bbogey\b/);
  await expect(
    player("Jason Baer").locator(".score-number").nth(1),
  ).toHaveClass(/\bdouble-bogey\b/);
  await expect(
    player("Jason Baer").locator(".score-number").nth(2),
  ).toHaveClass(/\bpar\b/);
  await expect(
    player("Andrew Rausch").locator(".score-number").nth(1),
  ).toHaveClass(/\bbirdie\b/);
  await expect(
    player("Andrew Rausch").locator(".score-number").nth(1),
  ).toHaveCSS("border-radius", "50%");
  await expect(player("Jason Baer").locator(".score-number").nth(1)).toHaveCSS(
    "border-top-style",
    "double",
  );
  await expect(
    player("Brandon Grant").locator(".score-number").first(),
  ).toHaveText("5");
  await expect(card.locator(".hole-result td").nth(9)).toHaveText(
    "A 5.5 : 3.5 B",
  );
  await expect(card.locator(".hole-result td").last()).toHaveText("A 8 : 10 B");
  await expect(card.getByRole("group", { name: "Score type" })).toHaveCount(0);
  await expect(card.locator(".stroke-dot")).toHaveCount(0);
  await expect(card.locator(".scorecard-mode-note")).toContainText(
    "actual strokes",
  );
  await card.getByRole("button", { name: "Back 9", exact: true }).click();
  await expect(card.locator(".hole-result td").nth(9)).toHaveText(
    "A 2.5 : 6.5 B",
  );
  await expect(card.locator(".hole-result td").last()).toHaveText("A 8 : 10 B");
  await card.getByRole("button", { name: "Front 9", exact: true }).click();
  // The full grid scrolls while player names remain visible.
  const scroll = card.getByRole("region");
  const name = player("Jason Baer").getByRole("rowheader");
  const before = await name.boundingBox();
  await scroll.evaluate((el) => {
    el.scrollLeft = el.scrollWidth;
  });
  const after = await name.boundingBox();
  expect(after!.x).toBeCloseTo(before!.x, 0);
  await card.getByRole("button", { name: "Back 9", exact: true }).click();
  await expect.poll(() => scroll.evaluate((el) => el.scrollLeft)).toBe(0);
  await card.getByRole("button", { name: "Front 9", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

export async function expectGrossScoresWithNetBetterBall(page: Page) {
  await page.goto("/history/2026/matches/de05c8eb11914228b9af4");
  const card = page.locator(".scorecard");
  const barsi = card
    .locator(".score-player")
    .filter({ hasText: "Peter Barsi" });
  await expect(barsi.locator(".score-number").nth(3)).toHaveText("7");
  await expect(barsi.locator(".score-number").nth(3)).toHaveClass(
    /double-bogey/,
  );
  await expect(barsi.locator(".score-number").nth(4)).toHaveText("7");
  await expect(card.locator(".score-team-a .net-row td").nth(4)).toHaveText(
    "5",
  );
  await expect(
    card.locator(".score-team-a .net-row .score-total").last(),
  ).toHaveText("81");
  await expect(
    card.locator(".score-team-b .net-row .score-total").last(),
  ).toHaveText("85");
  await expect(card.locator(".hole-result td").last()).toHaveText("A 10 : 8 B");
  await expect(card.getByRole("button", { name: /^(Gross|Net)$/ })).toHaveCount(
    0,
  );
  await expect(card.locator(".stroke-dot")).toHaveCount(0);
}
