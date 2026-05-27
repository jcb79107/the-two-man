import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { CourseLookupResult } from "@/lib/providers/types";
import { searchUsgaNcrdbCourses, USGA_TEE_INFO_URL } from "@/lib/providers/usga-ncrdb-client";

const RECOMMENDED_CHICAGOLAND_TARGETS = [
  "Skokie Country Club",
  "Exmoor Country Club",
  "Shoreacres",
  "Bob O'Link Golf Club",
  "Old Elm Club",
  "Onwentsia Club",
  "Westmoreland Country Club",
  "Glen View Club",
  "Indian Hill Club",
  "Knollwood Club",
  "Conway Farms Golf Club",
  "Ravinia Green Country Club",
  "The Glen Club",
  "The Preserve of Highland Park",
  "Heritage Oaks Golf Club",
  "Sportsman's Country Club",
  "Wilmette Golf Club",
  "Winnetka Golf Club",
  "Canal Shores",
  "Old Orchard Country Club",
  "Tam O'Shanter Golf Course",
  "Schaumburg Golf Club"
];

type ExportedUsgaCourse = {
  sourceQuery: string;
  externalCourseId: string;
  name: string;
  city: string | null;
  state: string | null;
  sourceUrl: string;
  tees: CourseLookupResult["tees"];
};

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    state: "IL",
    output: "",
    recommended: false,
    names: [] as string[]
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--state" && args[index + 1]) {
      parsed.state = args[index + 1].toUpperCase();
      index += 1;
    } else if ((arg === "--out" || arg === "--output") && args[index + 1]) {
      parsed.output = args[index + 1];
      index += 1;
    } else if (arg === "--recommended") {
      parsed.recommended = true;
    } else if (arg === "--name" && args[index + 1]) {
      parsed.names.push(args[index + 1]);
      index += 1;
    } else if (!arg.startsWith("--")) {
      parsed.names.push(arg);
    }
  }

  if (parsed.recommended || parsed.names.length === 0) {
    parsed.names = Array.from(new Set([...parsed.names, ...RECOMMENDED_CHICAGOLAND_TARGETS]));
  }

  return parsed;
}

function sourceUrlFor(course: CourseLookupResult) {
  return `${USGA_TEE_INFO_URL}?CourseID=${encodeURIComponent(course.externalCourseId)}`;
}

function exportCourse(sourceQuery: string, course: CourseLookupResult): ExportedUsgaCourse {
  return {
    sourceQuery,
    externalCourseId: `usga-ncrdb-${course.externalCourseId}`,
    name: course.name,
    city: course.city ?? null,
    state: course.state ?? null,
    sourceUrl: sourceUrlFor(course),
    tees: course.tees.map((tee) => ({
      externalTeeId: `usga-${course.externalCourseId}-${tee.externalTeeId}`,
      name: tee.name,
      gender: tee.gender,
      par: tee.par,
      slope: tee.slope,
      courseRating: tee.courseRating
    }))
  };
}

function normalize(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(golf|club|country|course|and|the)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const options = parseArgs();
  const exported: ExportedUsgaCourse[] = [];
  const misses: string[] = [];

  for (const name of options.names) {
    const results = await searchUsgaNcrdbCourses({ name, state: options.state });
    const normalizedName = normalize(name);
    const exactCandidates = results.filter((course) => normalize(course.name) === normalizedName);
    const candidates =
      exactCandidates.length > 0
        ? exactCandidates
        : results.filter((course) => normalize(course.name).includes(normalizedName));

    if (candidates.length === 0) {
      misses.push(name);
      continue;
    }

    exported.push(...candidates.map((course) => exportCourse(name, course)));
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    state: options.state,
    source: "USGA NCRListing",
    courses: exported,
    misses
  };
  const json = `${JSON.stringify(payload, null, 2)}\n`;

  if (options.output) {
    const outputPath = resolve(process.cwd(), options.output);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, json);
  }

  console.log(json);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
