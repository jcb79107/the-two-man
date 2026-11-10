import {
  mkdtempSync,
  cpSync,
  symlinkSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { seasonSimulation } from "../tests/season-simulation";
import { loadPublication } from "../src/publication";

// Never write rehearsal publications into the real checkout.
const source = resolve(__dirname, "..");
const target = mkdtempSync(join(tmpdir(), "two-man-season-rehearsal-"));
for (const path of [
  "src",
  "app",
  "public",
  "scripts",
  "tests",
  "package.json",
  "tsconfig.json",
  "next-env.d.ts",
  "next.config.ts",
  "playwright.simulation.config.ts",
])
  cpSync(join(source, path), join(target, path), { recursive: true });
symlinkSync(join(source, "node_modules"), join(target, "node_modules"), "dir");
const data = join(target, "src/data.ts");
const original = readFileSync(data, "utf8");
assert(
  original.includes("export const season = {"),
  "Fixture reset marker missing",
);
writeFileSync(
  data,
  original.replace(
    "export const season = {",
    'matches.forEach(m => { m.status = "scheduled"; });\nexport const season = {',
  ),
);
console.log(`Isolated simulation: ${target}`);
for (const [stage, publication] of Object.entries(seasonSimulation())) {
  loadPublication(publication);
  writeFileSync(
    join(target, "src/season2-results.json"),
    JSON.stringify(publication, null, 2),
  );
  console.log(`\nVerifying ${stage}`);
  const run = spawnSync(
    process.execPath,
    [
      join(source, "node_modules/@playwright/test/cli.js"),
      "test",
      "--config",
      "playwright.simulation.config.ts",
    ],
    {
      cwd: target,
      env: {
        ...process.env,
        SIMULATION_STAGE: stage,
        NEXT_PUBLIC_SITE_MODE: "preview",
      },
      stdio: "inherit",
    },
  );
  if (run.status !== 0) process.exit(run.status ?? 1);
}
console.log(`All seven stages passed. Evidence: ${target}/simulation-results`);
