import { execFileSync } from "node:child_process";

// Inspect the index, not the filesystem: ignored files can still be force-added.
const paths = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const forbidden = paths.filter((path) => path.split("/").some((part) =>
  part.startsWith(".next") ||
  [".rscinfo", "node_modules", ".vercel"].includes(part) ||
  ((part === ".env" || part.startsWith(".env.")) &&
    ![".env.example", ".env.sample", ".env.template"].includes(part))
));

if (forbidden.length) {
  console.error("Remove generated artifacts and private environment files from the Git index:");
  for (const path of forbidden) console.error(`- ${JSON.stringify(path)}`);
  console.error("File contents were not read. This is a path guard, not a general secret scanner.");
  process.exitCode = 1;
} else {
  console.log("Tracked artifact check passed.");
}
