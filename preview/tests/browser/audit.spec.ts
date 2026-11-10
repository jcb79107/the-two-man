import { test, expect } from "@playwright/test";
import { matches } from "../../src/data";
import { auditPublicSurfaces } from "../platform-audit";

test("platform audit covers public surfaces and archive routes", async ({
  page,
}) => {
  test.setTimeout(120000);
  await auditPublicSurfaces(page);
});

test("malformed saved course metadata falls back without crashing", async ({
  page,
}) => {
  const snapshot = structuredClone(matches);
  Object.assign(snapshot.find((m) => m.status === "official")!, {
    pars: "damaged",
  });
  await page.addInitScript(
    (saved) =>
      localStorage.setItem("two-man-season2-preview-v1", JSON.stringify(saved)),
    snapshot,
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    `/matches/${snapshot.find((m) => m.status === "official")!.id}`,
  );
  await expect(
    page.getByText(/Saved preview could not be restored/),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Scorecard", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("partial damaged drafts stay recoverable while another draft is edited", async ({
  page,
}) => {
  const valid = { match: matches[0], note: matches[0].note };
  await page.addInitScript((draft) => {
    if (!sessionStorage.getItem("audit-seeded")) {
      localStorage.setItem(
        "two-man-commissioner-drafts-v1",
        JSON.stringify({ m1: draft, m2: { match: "damaged" } }),
      );
      sessionStorage.setItem("audit-seeded", "yes");
    }
  }, valid);
  await page.goto("/review?match=m1");
  await expect(
    page.getByText(/Some saved drafts could not be restored/),
  ).toBeVisible();
  const course = page.getByLabel("Course", { exact: true });
  await course.fill("The Preserve at Oak Meadows — Championship Course");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("two-man-commissioner-drafts-v1")!).m1
            .match.course,
      ),
    )
    .toContain("The Preserve");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("two-man-commissioner-drafts-v1")!).m2,
    ),
  ).toEqual({ match: "damaged" });
  await page.reload();
  await expect(course).toHaveValue(
    "The Preserve at Oak Meadows — Championship Course",
  );
  await page.goto("/review?match=m2");
  await page.getByLabel("Course", { exact: true }).fill("Replacement draft");
  await page
    .getByRole("button", { name: "Discard draft", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Discard and return", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("two-man-commissioner-drafts-v1")!)
            .m2,
      ),
    )
    .toBeUndefined();
  await page.reload();
  await expect(
    page.getByText(/Some saved drafts could not be restored/),
  ).toHaveCount(0);
});

test("unreadable draft storage is not overwritten by edits and reset enables saving", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("audit-seeded")) {
      localStorage.setItem("two-man-commissioner-drafts-v1", "{broken");
      sessionStorage.setItem("audit-seeded", "yes");
    }
  });
  await page.goto("/review?match=m1");
  await page.getByLabel("Course", { exact: true }).fill("Visit-only course");
  await expect(page.getByText(/Draft changes are visit-only/)).toBeVisible();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("two-man-commissioner-drafts-v1"),
    ),
  ).toBe("{broken");
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await page
    .getByRole("button", { name: "Restore sample", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/review?match=m1");
  await page.getByLabel("Course", { exact: true }).fill("Saved after reset");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("two-man-commissioner-drafts-v1")!).m1
            ?.match.course,
      ),
    )
    .toBe("Saved after reset");
});

test("unplayed teams share competition rank across table sorts", async ({
  page,
}) => {
  const saved = matches.map((m) => ({ ...m, status: "scheduled" }));
  await page.addInitScript(
    (value) =>
      localStorage.setItem("two-man-season2-preview-v1", JSON.stringify(value)),
    saved,
  );
  await page.goto("/standings?view=field");
  await expect(page.locator(".rank")).toHaveText(Array(18).fill("1"));
  await page.getByRole("button", { name: "Sort by Team", exact: true }).click();
  await expect(page).toHaveURL(/sort=team/);
  await page.reload();
  await expect(page.locator(".rank")).toHaveText(Array(18).fill("1"));
});
