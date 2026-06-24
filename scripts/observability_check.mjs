#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const DEFAULT_ORG = "jason-baer";
const DEFAULT_PROJECT = "javascript-nextjs";
const DEFAULT_ENVIRONMENT = "vercel-production";
const DEFAULT_CLARITY_ENV_FILE = "/private/tmp/the-two-man-observability.env";
const CLARITY_ENDPOINT = "https://www.clarity.ms/export-data/api/v1/project-live-insights";

const args = parseArgs(process.argv.slice(2));
loadEnvFile(args.clarityEnvFile);

const failures = [];
const warnings = [];

function parseArgs(argv) {
  const parsed = {
    clarityDays: Number(process.env.CLARITY_DAYS ?? 3),
    clarityEnvFile: process.env.OBSERVABILITY_ENV_FILE ?? DEFAULT_CLARITY_ENV_FILE,
    environment: process.env.SENTRY_ENVIRONMENT ?? DEFAULT_ENVIRONMENT,
    org: process.env.SENTRY_ORG ?? DEFAULT_ORG,
    project: process.env.SENTRY_PROJECT ?? DEFAULT_PROJECT,
    release: process.env.SENTRY_RELEASE ?? null,
    skipClarity: false,
    skipSentry: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--days" && next) {
      parsed.clarityDays = Number(next);
      index += 1;
      continue;
    }

    if (arg === "--clarity-env" && next) {
      parsed.clarityEnvFile = next;
      index += 1;
      continue;
    }

    if (arg === "--environment" && next) {
      parsed.environment = next;
      index += 1;
      continue;
    }

    if (arg === "--org" && next) {
      parsed.org = next;
      index += 1;
      continue;
    }

    if (arg === "--project" && next) {
      parsed.project = next;
      index += 1;
      continue;
    }

    if (arg === "--release" && next) {
      parsed.release = next;
      index += 1;
      continue;
    }

    if (arg === "--skip-clarity") {
      parsed.skipClarity = true;
      continue;
    }

    if (arg === "--skip-sentry") {
      parsed.skipSentry = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!Number.isFinite(parsed.clarityDays) || parsed.clarityDays < 1 || parsed.clarityDays > 3) {
    throw new Error("--days must be 1, 2, or 3 because Clarity only exports the last 1-3 days.");
  }

  return parsed;
}

function printHelp() {
  console.log(`Usage: npm run observability:check -- [options]

Options:
  --org <slug>           Sentry org slug. Default: ${DEFAULT_ORG}
  --project <slug>       Sentry project slug. Default: ${DEFAULT_PROJECT}
  --environment <name>   Sentry environment. Default: ${DEFAULT_ENVIRONMENT}
  --release <version>    Sentry release. Default: current git HEAD
  --days <1|2|3>         Clarity export window. Default: 3
  --clarity-env <path>   Env file with CLARITY_API_TOKEN.
  --skip-sentry          Skip Sentry checks.
  --skip-clarity         Skip Clarity checks.
`);
}

function loadEnvFile(filePath) {
  if (!filePath || !existsSync(filePath)) {
    return;
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/u);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/u.exec(trimmed);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    if (process.env[key]) {
      continue;
    }

    process.env[key] = stripShellQuotes(rawValue.trim());
  }
}

function stripShellQuotes(value) {
  if (
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('"') && value.endsWith('"'))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function resolveSentryCli() {
  if (process.env.SENTRY_CLI_BIN) {
    return process.env.SENTRY_CLI_BIN;
  }

  const localInstall = `${process.env.HOME ?? ""}/.local/bin/sentry`;
  return existsSync(localInstall) ? localInstall : "sentry";
}

function runCommand(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
    env: process.env
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `${command} ${commandArgs.join(" ")} failed with exit ${result.status}\n${result.stderr || result.stdout}`
    );
  }

  return result.stdout.trim();
}

function runJson(command, commandArgs) {
  const output = runCommand(command, commandArgs);
  return output ? JSON.parse(output) : null;
}

function getCurrentCommit() {
  return runCommand("git", ["rev-parse", "HEAD"]);
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  return [];
}

function asNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string" && value.trim() !== "") {
    return Number(value);
  }

  return 0;
}

function shortRelease(release) {
  return release.slice(0, 12);
}

async function main() {
  console.log("Observability health check");
  console.log("==========================");

  if (!args.skipSentry) {
    await checkSentry();
  }

  if (!args.skipClarity) {
    await checkClarity();
  }

  if (warnings.length > 0) {
    console.log("\nWatch items");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (failures.length > 0) {
    console.log("\nFailures");
    for (const failure of failures) {
      console.log(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("\nResult: PASS");
}

async function checkSentry() {
  const sentry = resolveSentryCli();
  const target = `${args.org}/${args.project}`;
  const requestedRelease = args.release ?? getCurrentCommit();
  const { release, releaseView } = resolveSentryRelease(sentry, target, requestedRelease, Boolean(args.release));

  console.log(`\nSentry: ${target}`);
  console.log(`Release: ${shortRelease(release)} (${args.environment})`);

  const latestDeploy = releaseView?.lastDeploy;
  const releaseIssues = asArray(
    runJson(sentry, [
      "issue",
      "list",
      target,
      "--query",
      `release:${release}`,
      "--limit",
      "25",
      "--json",
      "--fields",
      "shortId,title,level,status,lastSeen,permalink"
    ])
  );
  const recentProductionIssues = asArray(
    runJson(sentry, [
      "issue",
      "list",
      target,
      "--query",
      `is:unresolved environment:${args.environment} lastSeen:-24h`,
      "--limit",
      "25",
      "--json",
      "--fields",
      "shortId,title,level,status,lastSeen,permalink"
    ])
  );
  const recentErrorAggregates = asArray(
    runJson(sentry, [
      "explore",
      target,
      "--dataset",
      "errors",
      "--field",
      "title",
      "--field",
      "count()",
      "--query",
      `environment:${args.environment}`,
      "--period",
      "24h",
      "--limit",
      "20",
      "--json"
    ])
  );

  console.log(`New issue groups on release: ${releaseView?.newGroups ?? "unknown"}`);
  console.log(`Issues attached to release: ${releaseIssues.length}`);
  console.log(`Unresolved production issues in 24h: ${recentProductionIssues.length}`);
  console.log(`Production error aggregate rows in 24h: ${recentErrorAggregates.length}`);
  if (latestDeploy) {
    console.log(`Last deploy: ${latestDeploy.environment} ${latestDeploy.dateFinished ?? "unknown date"}`);
  }

  if (releaseIssues.length > 0) {
    failures.push(`Sentry has ${releaseIssues.length} issue(s) attached to release ${shortRelease(release)}.`);
    printIssueList(releaseIssues);
  }

  if (recentProductionIssues.length > 0) {
    failures.push(`Sentry has ${recentProductionIssues.length} unresolved production issue(s) seen in the last 24h.`);
    printIssueList(recentProductionIssues);
  }

  if (recentErrorAggregates.length > 0) {
    failures.push(`Sentry Explore returned ${recentErrorAggregates.length} production error aggregate row(s) for 24h.`);
    for (const row of recentErrorAggregates.slice(0, 5)) {
      console.log(`  - ${row.title ?? "unknown"}: ${row["count()"] ?? "unknown"}`);
    }
  }
}

function resolveSentryRelease(sentry, target, requestedRelease, isExplicitRelease) {
  try {
    return {
      release: requestedRelease,
      releaseView: runJson(sentry, ["release", "view", `${args.org}/${requestedRelease}`, "--json"])
    };
  } catch (error) {
    if (isExplicitRelease) {
      throw error;
    }

    const project = runJson(sentry, ["project", "view", target, "--json"]);
    const latestRelease = project?.latestRelease?.version;
    if (!latestRelease) {
      throw error;
    }

    warnings.push(
      `Current git HEAD ${shortRelease(requestedRelease)} is not a Sentry release yet; using latest Sentry release ${shortRelease(latestRelease)}.`
    );
    return {
      release: latestRelease,
      releaseView: runJson(sentry, ["release", "view", `${args.org}/${latestRelease}`, "--json"])
    };
  }
}

function printIssueList(issues) {
  for (const issue of issues.slice(0, 10)) {
    console.log(`  - ${issue.shortId}: ${issue.title} (${issue.permalink})`);
  }
}

async function checkClarity() {
  const token = process.env.CLARITY_API_TOKEN;
  if (!token) {
    warnings.push(
      `Clarity skipped because CLARITY_API_TOKEN is missing. Expected it in ${args.clarityEnvFile}.`
    );
    return;
  }

  const payload = await fetchClarityByUrl(token);
  const summary = summarizeClarity(payload);

  console.log(`\nClarity: last ${args.clarityDays} day(s)`);
  console.log(`Sessions: ${summary.traffic.totalSessions}`);
  console.log(`Distinct users: ${summary.traffic.distinctUsers}`);
  console.log(`Bot sessions: ${summary.traffic.botSessions}`);
  console.log(`Script errors: ${summary.scriptErrors.total}`);
  console.log(`Error clicks: ${summary.errorClicks.total}`);
  console.log(`Rage clicks: ${summary.rageClicks.total}`);
  console.log(`Dead clicks: ${summary.deadClicks.total} across ${summary.deadClicks.affectedSessions} affected session(s)`);
  console.log(`Quickbacks: ${summary.quickbacks.total} across ${summary.quickbacks.affectedSessions} affected session(s)`);
  console.log(`Excessive scroll: ${summary.excessiveScroll.total}`);

  if (summary.traffic.topUrls.length > 0) {
    console.log("Top URLs:");
    for (const row of summary.traffic.topUrls.slice(0, 5)) {
      console.log(`  - ${row.url}: ${row.sessions} session(s)`);
    }
  }

  if (summary.scriptErrors.total > 0) {
    failures.push(`Clarity reported ${summary.scriptErrors.total} script error(s).`);
    printMetricRows("Script errors", summary.scriptErrors.top);
  }

  if (summary.errorClicks.total > 0) {
    failures.push(`Clarity reported ${summary.errorClicks.total} error click(s).`);
    printMetricRows("Error clicks", summary.errorClicks.top);
  }

  if (summary.rageClicks.total > 0) {
    failures.push(`Clarity reported ${summary.rageClicks.total} rage click(s).`);
    printMetricRows("Rage clicks", summary.rageClicks.top);
  }

  if (summary.deadClicks.total > 0) {
    warnings.push(
      `Clarity reported ${summary.deadClicks.total} dead click(s); inspect recordings/heatmaps for exact targets.`
    );
    printMetricRows("Dead clicks", summary.deadClicks.top);
  }

  if (summary.quickbacks.total > 0) {
    warnings.push(
      `Clarity reported ${summary.quickbacks.total} quickback(s); compare against expected standings/tab navigation.`
    );
    printMetricRows("Quickbacks", summary.quickbacks.top);
  }
}

async function fetchClarityByUrl(token) {
  const url = new URL(CLARITY_ENDPOINT);
  url.searchParams.set("numOfDays", String(args.clarityDays));
  url.searchParams.set("dimension1", "URL");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Clarity request failed: ${response.status} ${text.slice(0, 500)}`);
  }

  return JSON.parse(text);
}

function summarizeClarity(payload) {
  const byMetric = Object.fromEntries(
    payload.map((metric) => [metric.metricName, Array.isArray(metric.information) ? metric.information : []])
  );
  const trafficRows = byMetric.Traffic ?? [];

  return {
    traffic: {
      totalSessions: trafficRows.reduce((sum, row) => sum + asNumber(row.totalSessionCount), 0),
      botSessions: trafficRows.reduce((sum, row) => sum + asNumber(row.totalBotSessionCount), 0),
      distinctUsers: trafficRows.reduce((sum, row) => sum + asNumber(row.distinctUserCount), 0),
      topUrls: trafficRows
        .map((row) => ({
          url: pathOnly(row.Url),
          sessions: asNumber(row.totalSessionCount),
          users: asNumber(row.distinctUserCount)
        }))
        .sort((left, right) => right.sessions - left.sessions)
    },
    scriptErrors: metricSummary(byMetric.ScriptErrorCount ?? []),
    errorClicks: metricSummary(byMetric.ErrorClickCount ?? []),
    rageClicks: metricSummary(byMetric.RageClickCount ?? []),
    deadClicks: metricSummary(byMetric.DeadClickCount ?? []),
    quickbacks: metricSummary(byMetric.QuickbackClick ?? []),
    excessiveScroll: metricSummary(byMetric.ExcessiveScroll ?? [])
  };
}

function metricSummary(rows) {
  const mappedRows = rows
    .map((row) => ({
      url: pathOnly(row.Url),
      sessions: asNumber(row.sessionsCount),
      affectedSessionPct: asNumber(row.sessionsWithMetricPercentage),
      affectedSessions: asNumber(row.pagesViews),
      count: asNumber(row.subTotal)
    }))
    .filter((row) => row.count > 0 || row.affectedSessions > 0)
    .sort((left, right) => right.count - left.count || right.affectedSessionPct - left.affectedSessionPct);

  return {
    total: mappedRows.reduce((sum, row) => sum + row.count, 0),
    affectedSessions: mappedRows.reduce((sum, row) => sum + row.affectedSessions, 0),
    top: mappedRows.slice(0, 8)
  };
}

function pathOnly(raw) {
  if (!raw) {
    return "unknown";
  }

  try {
    const parsed = new URL(raw);
    const scrubbedSearch = parsed.search.replace(/([?&]fbclid=)[^&]+/gu, "$1<redacted>");
    return `${parsed.pathname}${scrubbedSearch}`;
  } catch {
    return raw;
  }
}

function printMetricRows(label, rows) {
  if (rows.length === 0) {
    return;
  }

  console.log(`${label}:`);
  for (const row of rows.slice(0, 5)) {
    console.log(
      `  - ${row.url}: ${row.count} event(s), ${row.affectedSessions} affected session(s), ${row.affectedSessionPct}%`
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
