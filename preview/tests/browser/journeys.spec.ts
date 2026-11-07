import { test, expect } from "@playwright/test";
import { archive2026 } from "../../src/history-data";

test("official history, final, career and record filters survive reload", async ({
  page,
}) => {
  await page.goto("/history");
  await expect(
    page.getByRole("heading", { name: "Season history", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("history.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: /View final result/ }).click();
  await expect(page).toHaveURL(/\/history\/2026\/matches\/final$/);
  await expect(
    page
      .locator(".archived-result")
      .getByRole("heading", { name: "Barron & Loewenstein", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("4 & 2", { exact: true })).toBeVisible();
  await expect(page.getByText("Hole data not recorded")).toBeVisible();
  await page.getByRole("link", { name: "Barron & Loewenstein career" }).click();
  await expect(
    page.getByRole("heading", { name: "Barron & Loewenstein", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("4–1–0", { exact: true }).first()).toBeVisible();
  await page.goto("/records");
  await expect(
    page.getByRole("link", { name: "Bennett & Reed", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Records for").selectOption("players");
  await expect(page).toHaveURL(/kind=players/);
  await page.getByLabel("Match scope").selectOption("playoffs");
  await expect(page).toHaveURL(/phase=playoffs/);
  await page.getByLabel("Rank by").selectOption("titles");
  await expect(page).toHaveURL(/sort=titles/);
  await page.reload();
  await expect(page.getByLabel("Records for")).toHaveValue("players");
  await expect(page.getByLabel("Match scope")).toHaveValue("playoffs");
  await expect(page.getByLabel("Rank by")).toHaveValue("titles");
});

test("archive scorecard uses recorded course pars and genuine participants", async ({
  page,
}) => {
  const game = archive2026.games.find((g) => g.card)!;
  await page.goto(game.href);
  await expect(
    page.getByRole("heading", { name: "Scorecard", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: /^Par / }).locator("td").first(),
  ).toHaveText(String(game.card!.pars![0]));
  await page.getByRole("button", { name: "Back 9", exact: true }).click();
  await expect(
    page.getByRole("row", { name: /^Par / }).locator("td").first(),
  ).toHaveText(String(game.card!.pars![9]));
  await page.getByRole("button", { name: "Net", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Net", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("scenario fields stay open while correcting invalid input", async ({
  page,
}) => {
  await page.goto("/standings?view=qualification");
  const details = page.locator(".scenario-details");
  await details.locator("summary").click();
  const total = details.locator('input[type="number"]').first();
  await total.fill("");
  await details.locator("summary").click();
  await page.getByRole("button", { name: "Calculate playoff picture" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Enter both" }),
  ).toContainText("Enter both");
  await expect(details).toHaveAttribute("open", "");
  await total.pressSequentially("7");
  await expect(details).toHaveAttribute("open", "");
  await total.pressSequentially("2");
  await page.getByRole("button", { name: "Calculate playoff picture" }).click();
  await expect(page.getByLabel("Scenario comparison")).toBeVisible();
  await details.locator("summary").click();
  await expect(details).not.toHaveAttribute("open", "");
});

test("commissioner correction persists a draft and requires review before publication", async ({
  page,
}) => {
  await page.goto("/review?match=m18");
  await page
    .getByLabel("Correction reason (required)")
    .fill("Verified original card again");
  await page
    .getByLabel("Course", { exact: true })
    .fill("Correction test course");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("Course", { exact: true })).toHaveValue(
    "Correction test course",
  );
  await page.goto("/matches/m18");
  await expect(
    page.getByText("Correction test course", { exact: false }),
  ).toHaveCount(0);
  await page.goto("/review?match=m18");
  await page
    .getByRole("button", { name: "Review result", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Publish correction", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Confirm that you checked" }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: /I checked all 18 holes/ }).check();
  await page
    .getByRole("button", { name: "Publish correction", exact: true })
    .click();
  await expect(
    page.getByText("Result published.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "View published scorecard" }).click();
  await expect(page).toHaveURL(/\/matches\/m18$/);
  await page.reload();
  await expect(page.locator(".match-location")).toContainText(
    "Correction test course",
  );
  await page.goto("/history/2026/matches/final");
  await expect(page.getByText("4 & 2", { exact: true })).toBeVisible();
});

test("all main journeys render without page errors or document overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of [
    "/",
    "/matches",
    "/standings",
    "/bracket",
    "/earnings",
    "/rules",
    "/history",
    "/champions",
    "/records",
    "/history/2026?view=playoffs",
    "/review",
  ]) {
    await page.goto(path);
    await expect(page.locator("main h1").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
      path,
    ).toBe(true);
  }
  await page.screenshot({
    path: test.info().outputPath("commissioner.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("all graphic templates produce downloadable images", async ({ page }) => {
  for (const graphic of ["result", "standings", "bracket"]) {
    await page.goto(`/review?tab=graphics&graphic=${graphic}`);
    await expect(
      page.getByRole("link", { name: "Download PNG" }),
    ).toBeVisible();
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: "Download PNG" }).click();
    expect((await download).suggestedFilename()).toMatch(/\.png$/);
  }
});

test("unreadable saved drafts are reported without overwriting recovery data", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("fixture")) {
      localStorage.setItem("two-man-commissioner-drafts-v1", "{damaged draft");
      sessionStorage.setItem("fixture", "yes");
    }
  });
  await page.goto("/review");
  await expect(
    page.getByText(/Saved drafts could not be restored/),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("two-man-commissioner-drafts-v1"),
      ),
    )
    .toBe("{damaged draft");
  await page.reload();
  await expect(
    page.getByText(/Saved drafts could not be restored/),
  ).toBeVisible();
});

test("failed publication keeps draft and supports retry without duplicate results", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (
        key === "two-man-season2-preview-v1" &&
        !sessionStorage.getItem("publication-failed")
      ) {
        original.call(sessionStorage, "publication-failed", "yes");
        throw new DOMException("Test quota failure", "QuotaExceededError");
      }
      original.call(this, key, value);
    };
  });
  await page.goto("/review?match=m18");
  await page
    .getByLabel("Correction reason (required)")
    .fill("Verify failed save recovery");
  await page
    .getByRole("button", { name: "Review result", exact: true })
    .click();
  await page.getByRole("checkbox", { name: /I checked all 18 holes/ }).check();
  await page.getByRole("button", { name: "Publish correction" }).click();
  await expect(
    page.getByText("Result published for this visit.", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem("two-man-commissioner-drafts-v1") || "{}",
        ).m18,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Retry saving" }).click();
  await expect(
    page.getByText("Result published.", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(
            localStorage.getItem("two-man-commissioner-drafts-v1") || "{}",
          ).m18,
      ),
    )
    .toBeUndefined();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("two-man-season2-preview-v1") || "[]")
          .length,
    ),
  ).toBe(18);
});

test("commissioner can enter a pending result directly from the results desk", async ({
  page,
}) => {
  await page.goto("/review");
  await page
    .getByRole("link", { name: "Enter result", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/match=m1/);
  await page.getByLabel("Course", { exact: true }).fill("");
  await page
    .getByRole("button", { name: "Review result", exact: true })
    .click();
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  await page
    .getByLabel("Course", { exact: true })
    .fill("New result test course");
  await page
    .getByText("Have a typed row? Paste 18 scores", { exact: true })
    .click();
  for (let player = 0; player < 4; player++) {
    await page
      .getByRole("combobox", { name: /^Player/ })
      .selectOption(String(player));
    await page
      .getByLabel(/^18 gross scores for/)
      .fill(Array(18).fill(4).join(" "));
    await page.getByRole("button", { name: "Apply row to draft" }).click();
  }
  await page
    .getByRole("checkbox", {
      name: /Sample card and GHIN screenshots received/,
    })
    .check();
  await page
    .getByRole("button", { name: "Review result", exact: true })
    .click();
  await page.getByRole("checkbox", { name: /I checked all 18 holes/ }).check();
  await page
    .getByRole("button", { name: "Publish result", exact: true })
    .click();
  await expect(
    page.getByText("Result published.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "View published scorecard" }).click();
  await expect(page).toHaveURL(/\/matches\/m1$/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Scorecard", exact: true }),
  ).toBeVisible();
});
