// Run against a locally served preview with Playwright installed:
// PREVIEW_URL=http://127.0.0.1:3027 node tests/browser/scenario-correction.mjs
// PLAYWRIGHT_MODULE and BROWSER_PATH optionally select an existing installation.
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_PATH
    ? { executablePath: process.env.BROWSER_PATH }
    : {}),
});
try {
  const page = await browser.newPage();
  await page.goto(
    `${process.env.PREVIEW_URL || "http://127.0.0.1:3027"}/standings?view=qualification`,
  );
  const details = page.locator(".scenario-details");
  await details.locator("summary").click();
  const total = details.locator('input[type="number"]').first();
  await total.fill("");
  await details.locator("summary").click();
  await page.getByRole("button", { name: "Calculate playoff picture" }).click();
  await page.getByRole("alert").filter({ hasText: "Enter both" }).waitFor();
  assert.equal(await details.evaluate((el) => el.open), true);
  await total.pressSequentially("7");
  await page.waitForFunction(() => !document.querySelector(".form-error"));
  assert.equal(
    await details.evaluate((el) => el.open),
    true,
    "first keystroke must not close correction fields",
  );
  await total.pressSequentially("2");
  assert.equal(await total.inputValue(), "72");
  await page.getByRole("button", { name: "Calculate playoff picture" }).click();
  await page.getByLabel("Scenario comparison").waitFor();
  await details.locator("summary").click();
  assert.equal(
    await details.evaluate((el) => el.open),
    false,
    "manual collapse remains available",
  );
  console.log(
    "PASS: invalid submission, two-keystroke correction, recalculation and manual collapse",
  );
} finally {
  await browser.close();
}
