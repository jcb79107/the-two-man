import { expect, type Page } from "@playwright/test";

export async function expectGraphicRetry(page: Page, downloadName: string) {
  await page.addInitScript(() => {
    const decode = HTMLImageElement.prototype.decode;
    let attempt = 0;
    HTMLImageElement.prototype.decode = function () {
      if (this.isConnected) return decode.call(this);
      if (attempt++ === 0)
        return Promise.reject(new Error("Graphic test failure"));
      HTMLImageElement.prototype.decode = decode;
      return new Promise<void>((resolve, reject) => {
        Object.assign(window, {
          resumeGraphic: () => decode.call(this).then(resolve, reject),
        });
      });
    };
  });
  await page.goto("/review");
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Graphic test failure",
  );
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByRole("status").filter({ hasText: /Generating|Preparing/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: downloadName })).toHaveCount(0);
  await page.waitForFunction(() => "resumeGraphic" in window);
  await page.evaluate(() =>
    (window as unknown as { resumeGraphic: () => void }).resumeGraphic(),
  );
  await expect(page.getByRole("link", { name: downloadName })).toBeVisible();
  await expect(page.getByRole("link", { name: downloadName })).toBeFocused();
}
