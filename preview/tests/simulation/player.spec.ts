import { test, expect } from "@playwright/test";
const stage = process.env.SIMULATION_STAGE;
test("player journey across the simulated season", async ({ page }) => {
  test.skip(
    !stage,
    "Run through scripts/simulate-player-season.ts in an isolated copy",
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "The Two-Man", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Find your team", exact: true })
    .selectOption("t1");
  await expect(page).toHaveURL(/\/teams\/t1$/);
  await expect(
    page.getByRole("heading", { name: "Bennett & Reed", exact: true }),
  ).toBeVisible();
  if (stage === "start") {
    await page.locator('a[href^="/matches/m1"]').click();
    await expect(
      page.getByRole("heading", { name: "Before you tee off" }),
    ).toBeVisible();
    await expect(
      page.getByText("Season 2 deadline: not yet confirmed."),
    ).toBeVisible();
    await page.goto("/standings?view=qualification");
    await page
      .getByRole("button", { name: "Calculate playoff picture", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Projected eight" }),
    ).toBeVisible();
    await expect(page.locator("#projected-eight")).toBeVisible();
    await page.getByRole("link", { name: "See updated field" }).click();
    await expect(page).toHaveURL(/#projected-eight$/);
    await page.getByRole("button", { name: "Reset scenario" }).click();
    await expect(
      page.getByText(
        "The playoff picture starts with the first completed match.",
      ),
    ).toBeVisible();
  }
  if (stage === "opening") {
    await expect(page.locator(".team-record")).toContainText("1–0–0");
    await page.locator('a[href^="/matches/m1"]').click();
    await expect(
      page.getByRole("heading", { name: "Scorecard", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Back 9", exact: true }).click();
    await expect(page.getByRole("table")).toContainText("Back nine");
    await page
      .getByRole("button", { name: "Agreed strokes", exact: true })
      .click();
    await expect(page.getByText("No strokes", { exact: true })).toBeVisible();
  }
  if (["regular", "tied"].includes(stage!)) {
    await page.goto("/standings?view=qualification");
    await expect(
      page.getByText("Confirmed playoff field", { exact: true }),
    ).toBeVisible();
    const names = await page.locator(".seed-ledger a").allTextContents();
    expect(names).toEqual([
      "Bennett & Reed",
      "Carter & Ellis",
      "Collins & Price",
      "Miller & Grant",
      "Anderson & Cole",
      "Campbell & Ford",
      "Sullivan & Brooks",
      "Morgan & Wells",
    ]);
    await expect(
      page.getByText("Tiebreak needed", { exact: true }),
    ).toHaveCount(0);
    if (stage === "regular")
      await expect(page.getByText(/holes won: 13 vs 12/)).toBeVisible();
    await page.goto("/bracket");
    await expect(
      page.getByText(/Seeds are confirmed after regular-season play/),
    ).toHaveCount(0);
    await page
      .getByRole("combobox", { name: "Follow a team" })
      .selectOption("t4");
    await expect(page).toHaveURL(/team=t4/);
    await expect
      .poll(() =>
        page.locator("#bracket-q3").evaluate((el) => {
          const parent = el.closest('[role="region"]')!;
          const a = el.getBoundingClientRect(),
            b = parent.getBoundingClientRect();
          return a.left >= b.left - 1 && a.right <= b.right + 1;
        }),
      )
      .toBe(true);
  }
  if (stage === "quarters" || stage === "semis") {
    await expect(
      page.locator('.archive-game[href^="/playoffs/q1"]'),
    ).toBeVisible();
    await page.goto(
      stage === "quarters"
        ? "/bracket?round=semis&team=t1"
        : "/bracket?round=final&team=t1",
    );
    await expect(
      page.getByRole("article", {
        name: stage === "quarters" ? "SF1 not played" : "Final not played",
        exact: true,
      }),
    ).toContainText("Pre-match");
    await page.goto("/bracket?round=quarters&team=t5");
    await expect(page.locator(".path-summary")).toHaveText(
      "Morgan & Wells: QF1",
    );
    await page
      .getByRole("link", { name: "Open QF1 result", exact: true })
      .click();
    await expect(page.locator(".playoff-result")).toBeVisible();
    await page.reload();
    await page
      .getByRole("link", { name: "Back to bracket", exact: true })
      .click();
    await expect(page).toHaveURL(/round=quarters&team=t5/);
  }
  if (stage === "final") {
    await expect(
      page.getByRole("link", { name: /Earned · sample awards.*\$2,250/ }),
    ).toBeVisible();
    await expect(page.locator(".team-record")).toContainText("2–0–0");
    await expect(page.locator(".archive-game")).toHaveCount(5);
    await expect(
      page.getByText("$2,250 team total · $1,125 per player", { exact: true }),
    ).toBeVisible();
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: "Bennett & Reed · Season 2 champions",
      }),
    ).toBeVisible();
    await expect(page.locator(".feed-result").first()).toHaveAttribute(
      "href",
      "/playoffs/final",
    );
    await expect(
      page.getByRole("link", { name: "Upcoming matches", exact: true }),
    ).toHaveCount(0);
    await page.goto("/matches?filter=official&q=Bennett");
    await expect(page.locator(".archive-game")).toHaveCount(5);
    await page.locator('.archive-game[href^="/playoffs/final"]').click();
    await expect(page.locator(".playoff-result")).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Scorecard", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("link", { name: "All matches", exact: true }).click();
    await expect(
      page.getByRole("textbox", { name: "Find a team or course" }),
    ).toHaveValue("Bennett");
    await expect(page).toHaveURL(/filter=official&q=Bennett/);
    await page.goto("/teams/t4");
    await expect(
      page.getByRole("link", { name: /Earned · sample awards.*\$1,250/ }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "View career & past seasons" })
      .click();
    await expect(
      page.getByText("Fictional Season 2 career.", { exact: true }),
    ).toBeVisible();
    await page.goto("/earnings");
    await expect(
      page.getByRole("region", { name: "Combined awards" }),
    ).toContainText("$1,125");
    for (const id of ["q1", "q2", "q3", "q4", "s1", "s2", "final"]) {
      await page.goto(`/playoffs/${id}`);
      await expect(page.locator(".playoff-result")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Scorecard", exact: true }),
      ).toHaveCount(0);
    }
  }
  await page.goto("/history/2027");
  await expect(
    page.getByText("Fictional Season 2.", { exact: true }),
  ).toBeVisible();
  if (stage === "quarters" || stage === "semis")
    await expect(
      page.getByText(/18 regular-season results are official/),
    ).toBeVisible();
  for (const route of [
    "/",
    "/matches",
    "/teams/t1",
    "/earnings",
    "/standings?view=qualification",
  ]) {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText("Loading your sample season…")).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      )
      .toBe(true);
  }
  await page.screenshot({
    path: test.info().outputPath(`${stage}.png`),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
