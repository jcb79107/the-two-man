import "server-only";

import { execFile } from "node:child_process";
import { dirname } from "node:path";
import { promisify } from "node:util";
import type {
  CourseDirectoryProvider,
  CourseLookupQuery,
  CourseLookupResult,
  HandicapLookupResult,
  HandicapProvider
} from "@/lib/providers/types";

const execFileAsync = promisify(execFile);

function getUsgaLookupScriptPath() {
  const scriptPath = process.env.USGA_LOOKUP_SCRIPT;

  if (!scriptPath) {
    throw new Error(
      "USGA_LOOKUP_SCRIPT is not configured. Set it to the absolute path of your approved lookup script."
    );
  }

  return scriptPath;
}

const SCRAPE_ENV = {
  ...process.env,
  DISABLED_UNLICENSED_SOURCES: process.env.DISABLED_UNLICENSED_SOURCES ?? "false"
};

// TODO: Replace this scrape-backed implementation with an official provider if/when available.
// Assumption: the user has permission to use the existing course lookup workflow in their environment.

function parseCourseLookupPayload(stdout: string): CourseLookupResult[] {
  const payload = JSON.parse(stdout) as {
    courses?: Array<{
      externalIds?: { usgaCourseId?: number | null };
      name?: string;
      location?: { city?: string | null; state?: string | null };
      teeSets?: { all?: Array<Record<string, unknown>> };
    }>;
  };

  return (payload.courses ?? []).map((course) => {
    const teePayload = Array.isArray(course.teeSets?.all) ? course.teeSets?.all : [];

    return {
      externalCourseId: String(course.externalIds?.usgaCourseId ?? ""),
      provider: "usga-scrape",
      name: String(course.name ?? "Unknown Course"),
      city: course.location?.city ?? null,
      state: course.location?.state ?? null,
      tees: teePayload.map((tee, index) => ({
        externalTeeId: `${course.externalIds?.usgaCourseId ?? "course"}-${index + 1}`,
        name: String(tee.teeName ?? `Tee ${index + 1}`),
        gender:
          String(tee.gender ?? "").toUpperCase() === "M"
            ? "MEN"
            : String(tee.gender ?? "").toUpperCase() === "F"
              ? "WOMEN"
              : "OPEN",
        par: Number(tee.par ?? 72),
        slope: Number(tee.slope ?? 113),
        courseRating: Number(tee.courseRating ?? 72)
      })),
      raw: course as Record<string, unknown>
    };
  });
}

export class UsgaScrapeCourseDirectoryProvider implements CourseDirectoryProvider {
  async searchCourses(query: CourseLookupQuery): Promise<CourseLookupResult[]> {
    const args = ["--name", query.name];

    if (query.state) {
      args.push("--state", query.state);
    }

    const scriptPath = getUsgaLookupScriptPath();
    const { stdout } = await execFileAsync("python3", [scriptPath, ...args], {
      cwd: dirname(scriptPath),
      env: SCRAPE_ENV,
      maxBuffer: 1024 * 1024 * 10
    });

    return parseCourseLookupPayload(stdout);
  }
}

export class PlaceholderGhinHandicapProvider implements HandicapProvider {
  async getCurrentHandicapIndex(ghinNumber: string): Promise<HandicapLookupResult> {
    throw new Error(
      `GHIN handicap lookup is not implemented yet for ${ghinNumber}. Wire this to the approved scrape/provider path next.`
    );
  }
}

export const usgaCourseDirectoryProvider = new UsgaScrapeCourseDirectoryProvider();
export const ghinHandicapProvider = new PlaceholderGhinHandicapProvider();
