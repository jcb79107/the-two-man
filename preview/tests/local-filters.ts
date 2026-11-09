import { expect, type Page } from "@playwright/test";

export async function expectLocalFilters(page: Page) {
  for (const route of ["/history/2026?view=results", "/records?season=2026"]) {
    await page.goto(route);
    await page.getByRole("searchbox").focus();
    const requests: string[] = [];
    await page.route("**/*", async (request) => {
      if (["fetch", "xhr"].includes(request.request().resourceType())) {
        const url = new URL(request.request().url());
        const pathname = route.split("?")[0];
        if (url.pathname === pathname || url.pathname === `${pathname}.txt`) {
          requests.push(url.href);
        }
        await request.abort();
      } else await request.continue();
    });
    try {
      await page.getByRole("searchbox").fill("Baer");
      await expect(page.getByRole("searchbox")).toHaveValue("Baer");
      await page.getByLabel("Match scope").selectOption("playoffs");
      await expect(page.getByRole("status")).toContainText("0 of");
      await expect(page).toHaveURL(/q=Baer/);
      await expect(page).toHaveURL(/phase=playoffs/);
      await page
        .getByRole("button", { name: "Show all matches", exact: true })
        .click();
      await expect(page.getByRole("searchbox")).toHaveValue("Baer");
      await expect(page.getByRole("status")).toContainText(
        route.startsWith("/history") ? "2 of 25" : "1 of 18",
      );
      await page.goBack();
      await expect(page.getByLabel("Match scope")).toHaveValue("playoffs");
      await expect(page.getByRole("status")).toContainText("0 of");
      expect(
        requests,
        "Already-loaded filters should not request route data",
      ).toEqual([]);
    } finally {
      await page.unrouteAll({ behavior: "wait" });
    }
  }
}
