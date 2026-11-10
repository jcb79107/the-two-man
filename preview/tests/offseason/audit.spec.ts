import { test } from "@playwright/test";
import { auditPublicSurfaces } from "../platform-audit";

test("platform audit covers public surfaces and archive routes", async ({
  page,
}) => {
  test.setTimeout(120000);
  await auditPublicSurfaces(page);
});
