import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { Prisma, PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";

const execFileAsync = promisify(execFile);

function loadLocalEnv() {
  for (const relativePath of [".env.local", ".env"]) {
    const filePath = resolve(process.cwd(), relativePath);

    if (!existsSync(filePath)) {
      continue;
    }

    const contents = readFileSync(filePath, "utf8");

    for (const rawLine of contents.split("\n")) {
      const line = rawLine.trim();

      if (!line || line.startsWith("#")) {
        continue;
      }

      const separatorIndex = line.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim().replace(/^"(.*)"$/, "$1");

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
}

loadLocalEnv();

const db = new PrismaClient({ log: ["error"] });
const DEFAULT_TOKENS = "A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z".split(",");

function getUsgaLookupScriptPath() {
  const scriptPath = process.env.USGA_LOOKUP_SCRIPT;

  if (!scriptPath) {
    throw new Error(
      "USGA_LOOKUP_SCRIPT is not configured. Set it to the absolute path of your approved lookup script."
    );
  }

  return scriptPath;
}

type CourseLookupHole = {
  holeNumber: number;
  par: number;
  strokeIndex: number;
  yardage?: number;
};

type CourseLookupResult = {
  externalCourseId: string;
  provider: string;
  name: string;
  city?: string | null;
  state?: string | null;
  tees: Array<{
    externalTeeId: string;
    name: string;
    gender: string;
    par: number;
    slope: number;
    courseRating: number;
    holes?: CourseLookupHole[];
  }>;
};

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    state: "IL",
    tokens: DEFAULT_TOKENS,
    limit: Number.POSITIVE_INFINITY,
    maxResultsPerToken: 250
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--state" && args[index + 1]) {
      parsed.state = args[index + 1].toUpperCase();
      index += 1;
    } else if (arg === "--tokens" && args[index + 1]) {
      parsed.tokens = args[index + 1]
        .split(",")
        .map((token) => token.trim())
        .filter(Boolean);
      index += 1;
    } else if (arg === "--limit" && args[index + 1]) {
      parsed.limit = Number(args[index + 1]);
      index += 1;
    } else if (arg === "--max-results" && args[index + 1]) {
      parsed.maxResultsPerToken = Number(args[index + 1]);
      index += 1;
    }
  }

  return parsed;
}

function decimal(value: number) {
  return new Prisma.Decimal(value.toFixed(1));
}

function normalizeProviderKey(provider: string, externalId: string) {
  return `${provider}:${externalId}`;
}

async function discoverUsgaIllinoisCourseNames(token: string, state: string, maxResultsPerToken: number) {
  const scriptPath = getUsgaLookupScriptPath();

  const { stdout } = await execFileAsync(
    "python3",
    [scriptPath, "--name", token, "--state", state, "--max-results", String(maxResultsPerToken)],
    {
      cwd: dirname(scriptPath),
      env: {
        ...process.env,
        DISABLED_UNLICENSED_SOURCES: process.env.DISABLED_UNLICENSED_SOURCES ?? "false"
      },
      maxBuffer: 1024 * 1024 * 10
    }
  );

  const payload = JSON.parse(stdout) as {
    courses?: Array<{
      name?: string;
      location?: {
        state?: string | null;
      };
    }>;
  };

  return (payload.courses ?? [])
    .filter((course) => (course.location?.state ?? "").toUpperCase() === state)
    .map((course) => String(course.name ?? "").trim())
    .filter(Boolean);
}

type GolfCourseApiHole = {
  par?: number;
  yardage?: number;
  handicap?: number;
};

type GolfCourseApiTee = {
  tee_name?: string;
  course_rating?: number;
  slope_rating?: number;
  par_total?: number;
  holes?: GolfCourseApiHole[];
};

type GolfCourseApiCourse = {
  id?: number;
  club_name?: string;
  course_name?: string;
  location?: {
    city?: string;
    state?: string;
  };
  tees?: {
    female?: GolfCourseApiTee[];
    male?: GolfCourseApiTee[];
  };
};

type GolfCourseApiSearchResponse = {
  courses?: GolfCourseApiCourse[];
};

function normalizeTees(
  tees: GolfCourseApiTee[] | undefined,
  gender: string,
  courseId: number
) {
  return (tees ?? []).map((tee, index) => ({
    externalTeeId: `${courseId}-${gender}-${index + 1}`,
    name: String(tee.tee_name ?? `Tee ${index + 1}`),
    gender,
    par: Number(tee.par_total ?? 72),
    slope: Number(tee.slope_rating ?? 113),
    courseRating: Number(tee.course_rating ?? 72),
    holes: Array.isArray(tee.holes) && tee.holes.length === 18
      ? tee.holes.map((hole, holeIndex) => ({
          holeNumber: holeIndex + 1,
          par: Number(hole.par ?? 0),
          strokeIndex: Number(hole.handicap ?? 0),
          yardage: hole.yardage != null ? Number(hole.yardage) : undefined
        }))
      : undefined
  }));
}

function normalizeGolfCourseApiCourse(course: GolfCourseApiCourse): CourseLookupResult | null {
  const courseId = Number(course.id ?? 0);

  if (!courseId) {
    return null;
  }

  const nameParts = [course.club_name, course.course_name]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  const uniqueNameParts = nameParts.filter((part, index) => nameParts.indexOf(part) === index);

  return {
    externalCourseId: String(courseId),
    provider: "golf-course-api",
    name: uniqueNameParts.join(" - ") || `Course ${courseId}`,
    city: course.location?.city ?? null,
    state: course.location?.state ?? null,
    tees: [
      ...normalizeTees(course.tees?.male, "MEN", courseId),
      ...normalizeTees(course.tees?.female, "WOMEN", courseId)
    ]
  };
}

async function searchGolfCourseApi(name: string, state: string) {
  const apiKey = process.env.GOLF_COURSE_API_KEY;

  if (!apiKey) {
    throw new Error("GOLF_COURSE_API_KEY is not configured.");
  }

  const response = await fetch(
    `https://api.golfcourseapi.com/v1/search?${new URLSearchParams({
      search_query: `${name} ${state}`
    }).toString()}`,
    {
      headers: {
        Authorization: `Key ${apiKey}`
      },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(`GolfCourseAPI search failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as GolfCourseApiSearchResponse;

  return (payload.courses ?? [])
    .map((course) => normalizeGolfCourseApiCourse(course))
    .filter((course): course is CourseLookupResult => Boolean(course))
    .filter((course) => (course.state ?? "").toUpperCase() === state);
}

async function upsertCourseLookupResult(result: CourseLookupResult) {
  const providerKey = normalizeProviderKey(result.provider, result.externalCourseId);
  const existingCourse = await db.course.findUnique({
    where: {
      providerKey
    },
    select: {
      id: true
    }
  });
  const courseId = existingCourse?.id ?? nanoid();

  await db.course.upsert({
    where: {
      providerKey
    },
    update: {
      name: result.name,
      city: result.city ?? null,
      state: result.state ?? null
    },
    create: {
      id: courseId,
      providerKey,
      name: result.name,
      city: result.city ?? null,
      state: result.state ?? null
    }
  });

  for (const tee of result.tees) {
    const teeId = `${courseId}-${tee.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

    await db.courseTee.upsert({
      where: {
        courseId_name: {
          courseId,
          name: tee.name
        }
      },
      update: {
        providerKey: normalizeProviderKey(result.provider, tee.externalTeeId),
        gender: tee.gender,
        par: tee.par,
        slope: tee.slope,
        courseRating: decimal(tee.courseRating)
      },
      create: {
        id: teeId,
        courseId,
        providerKey: normalizeProviderKey(result.provider, tee.externalTeeId),
        name: tee.name,
        gender: tee.gender,
        par: tee.par,
        slope: tee.slope,
        courseRating: decimal(tee.courseRating)
      }
    });

    if (Array.isArray(tee.holes) && tee.holes.length === 18) {
      for (const hole of tee.holes) {
        await db.courseHole.upsert({
          where: {
            courseTeeId_holeNumber: {
              courseTeeId: teeId,
              holeNumber: hole.holeNumber
            }
          },
          update: {
            par: hole.par,
            strokeIndex: hole.strokeIndex,
            yardage: hole.yardage ?? null
          },
          create: {
            id: `${teeId}-hole-${hole.holeNumber}`,
            courseTeeId: teeId,
            holeNumber: hole.holeNumber,
            par: hole.par,
            strokeIndex: hole.strokeIndex,
            yardage: hole.yardage ?? null
          }
        });
      }
    }
  }
}

async function main() {
  const options = parseArgs();
  const discoveredNames = new Set<string>();

  for (const token of options.tokens) {
    const names = await discoverUsgaIllinoisCourseNames(token, options.state, options.maxResultsPerToken);
    names.forEach((name) => discoveredNames.add(name));
    console.log(`discovery ${token}: ${names.length} results`);
  }

  const discovered = Array.from(discoveredNames).sort().slice(0, options.limit);
  let hydratedCount = 0;

  for (const courseName of discovered) {
    const results = await searchGolfCourseApi(courseName, options.state);

    if (results.length === 0) {
      console.log(`missed: ${courseName}`);
      continue;
    }

    for (const result of results) {
      await upsertCourseLookupResult(result);
    }

    hydratedCount += results.length;
    console.log(`hydrated: ${courseName} (${results.length})`);
  }

  const totalCourses = await db.course.count({
    where: {
      state: options.state
    }
  });

  console.log(
    JSON.stringify(
      {
        state: options.state,
        discoveredCount: discovered.length,
        hydratedCount,
        storedCoursesInState: totalCourses
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
