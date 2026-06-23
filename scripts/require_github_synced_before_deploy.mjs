import { execFileSync } from "node:child_process";

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

const status = git(["status", "--porcelain"]);

if (status) {
  console.error("Refusing to deploy: commit and push the working tree first.");
  console.error(status);
  process.exit(1);
}

const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);

if (!branch || branch === "HEAD") {
  console.error("Refusing to deploy: checkout is detached, so it cannot be verified against GitHub.");
  process.exit(1);
}

git(["fetch", "origin", branch]);

const localHead = git(["rev-parse", "HEAD"]);
const remoteHead = git(["rev-parse", `origin/${branch}`]);

if (localHead !== remoteHead) {
  console.error(`Refusing to deploy: ${branch} is not synced with origin/${branch}.`);
  console.error(`Run: git push origin ${branch}`);
  process.exit(1);
}

console.log(`GitHub sync verified: ${branch} at ${localHead.slice(0, 12)}.`);
