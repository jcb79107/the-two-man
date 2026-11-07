import { readFile, writeFile, rename, unlink } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { loadPublication } from "../src/publication";
const target = new URL("../src/season2-results.json", import.meta.url);
const archive = new URL("../src/season1-public.json", import.meta.url);
const hash = (data: string) => createHash("sha256").update(data).digest("hex");
async function main() {
  const [input, mode] = process.argv.slice(2);
  if (!input || (mode && mode !== "--write"))
    throw new Error(
      "Usage: npm run results -- /path/publication.json [--write]. Default: validate and show changes only.",
    );
  const before = await readFile(target, "utf8");
  const old = JSON.parse(before);
  const next = JSON.parse(await readFile(input, "utf8"));
  const result = loadPublication(next);
  if (next.revision !== old.revision + 1)
    throw new Error(
      `Revision conflict: expected ${old.revision + 1}. Read the latest publication first.`,
    );
  if (
    hash(await readFile(archive, "utf8")) !==
    "b3954c209d4c604bee07c3a9fbdc15331674e0380f7887b3b4c169976dca9a87"
  )
    throw new Error("Season 1 archive integrity check failed.");
  const changed = [
    ...next.regular
      .filter(
        (m: { id: string }) =>
          JSON.stringify(m) !==
          JSON.stringify(
            old.regular.find((p: { id: string }) => p.id === m.id),
          ),
      )
      .map((m: { id: string }) => m.id),
    ...next.playoffs
      .filter(
        (m: { id: string }) =>
          JSON.stringify(m) !==
          JSON.stringify(
            old.playoffs.find((p: { id: string }) => p.id === m.id),
          ),
      )
      .map((m: { id: string }) => m.id),
  ];
  console.log(
    JSON.stringify(
      {
        revision: next.revision,
        note: next.note,
        changed,
        removed: [...old.regular, ...old.playoffs]
          .filter(
            (m: { id: string }) =>
              ![...next.regular, ...next.playoffs].some(
                (p: { id: string }) => p.id === m.id,
              ),
          )
          .map((m: { id: string }) => m.id),
        seeds: result.seeds,
        links: changed.map((id: string) => ({
          result: id.startsWith("m") ? `/matches/${id}` : `/playoffs/${id}`,
          graphic: `/review?result=${id}`,
        })),
      },
      null,
      2,
    ),
  );
  if (mode !== "--write") return;
  const temp = fileURLToPath(target) + ".tmp";
  await writeFile(temp, JSON.stringify(next, null, 2) + "\n", { flag: "wx" });
  try {
    if ((await readFile(target, "utf8")) !== before)
      throw new Error(
        "Publication changed during validation; retry from the latest revision.",
      );
    await rename(temp, target);
  } catch (error) {
    await unlink(temp);
    throw error;
  }
  console.log(
    "Saved Season 2 publication only. Run checks, commit and deploy the preview to share it.",
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
