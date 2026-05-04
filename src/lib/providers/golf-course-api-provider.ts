import "server-only";

import type { CourseDirectoryProvider, CourseLookupQuery, CourseLookupResult, CourseLookupTee } from "@/lib/providers/types";

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

const API_BASE_URL = "https://api.golfcourseapi.com";

function getGolfCourseApiKey() {
  const apiKey = process.env.GOLF_COURSE_API_KEY;

  if (!apiKey) {
    throw new Error("GOLF_COURSE_API_KEY is not configured.");
  }

  return apiKey;
}

function dedupeTeeHoles(holes: GolfCourseApiHole[] | undefined) {
  if (!Array.isArray(holes)) {
    return undefined;
  }

  const normalized = holes
    .slice(0, 18)
    .map((hole, index) => ({
      holeNumber: index + 1,
      par: Number(hole.par ?? 0),
      strokeIndex: Number(hole.handicap ?? 0),
      yardage: hole.yardage != null ? Number(hole.yardage) : undefined
    }))
    .filter((hole) => hole.par > 0 && hole.strokeIndex > 0);

  if (normalized.length !== 18) {
    return undefined;
  }

  return normalized;
}

function normalizeTees(
  tees: GolfCourseApiTee[] | undefined,
  gender: CourseLookupTee["gender"],
  courseId: number
) {
  return (tees ?? []).map((tee, index) => ({
    externalTeeId: `${courseId}-${gender}-${index + 1}`,
    name: String(tee.tee_name ?? `Tee ${index + 1}`),
    gender,
    par: Number(tee.par_total ?? 72),
    slope: Number(tee.slope_rating ?? 113),
    courseRating: Number(tee.course_rating ?? 72),
    holes: dedupeTeeHoles(tee.holes)
  }));
}

function normalizeCourse(course: GolfCourseApiCourse): CourseLookupResult | null {
  const courseId = Number(course.id ?? 0);

  if (!courseId) {
    return null;
  }

  const nameParts = [course.club_name, course.course_name]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  const uniqueNameParts = nameParts.filter((part, index) => nameParts.indexOf(part) === index);
  const tees = [
    ...normalizeTees(course.tees?.male, "MEN", courseId),
    ...normalizeTees(course.tees?.female, "WOMEN", courseId)
  ];
  const duplicateTeeNames = new Set(
    tees
      .map((tee) => tee.name.trim().toLowerCase())
      .filter((name, index, names) => names.indexOf(name) !== index)
  );

  return {
    externalCourseId: String(courseId),
    provider: "golf-course-api",
    name: uniqueNameParts.join(" - ") || `Course ${courseId}`,
    city: course.location?.city ?? null,
    state: course.location?.state ?? null,
    tees: tees.map((tee) => ({
      ...tee,
      name: duplicateTeeNames.has(tee.name.trim().toLowerCase())
        ? `${tee.name} (${tee.gender === "MEN" ? "Men" : "Women"})`
        : tee.name
    })),
    raw: course as Record<string, unknown>
  };
}

function normalizeSearchText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .map((part) => (part ? `${part[0]?.toUpperCase()}${part.slice(1)}` : part))
    .join(" ");
}

function buildPossessiveVariants(name: string) {
  const normalized = normalizeSearchText(name);
  const words = normalized.split(" ").filter(Boolean);
  const variants: string[] = [];

  if (words.length < 2) {
    return variants;
  }

  for (let index = 0; index < words.length; index += 1) {
    const cleanWord = words[index]?.replace(/[^A-Za-z0-9]/g, "") ?? "";

    if (cleanWord.length <= 3 || !/s$/i.test(cleanWord) || /'s$/i.test(words[index] ?? "")) {
      continue;
    }

    const possessiveWords = [...words];
    possessiveWords[index] = `${cleanWord.slice(0, -1)}'s`;
    variants.push(possessiveWords.join(" "));

    const singularWords = [...words];
    singularWords[index] = cleanWord.slice(0, -1);
    variants.push(singularWords.join(" "));
  }

  return variants;
}

function buildSearchVariants(name: string, state?: string) {
  const normalized = normalizeSearchText(name);
  const baseVariants = Array.from(
    new Map(
      [normalized, ...buildPossessiveVariants(normalized), titleCase(normalized)].map((variant) => [
        variant.toLowerCase(),
        variant
      ])
    ).values()
  );

  const expandedVariants = baseVariants.flatMap((variant) => {
    const variants = [variant];

    if (!/\b(golf|club|course|country|cc|gc)\b/i.test(variant)) {
      variants.push(`${variant} Golf Club`);
      variants.push(`${variant} Country Club`);
      variants.push(`${variant} Golf Course`);
      variants.push(`${variant} GC`);
    } else if (!/\b(golf|club|course)\b/i.test(variant)) {
      variants.push(`${variant} Golf Club`);
    }

    return variants;
  });

  const stateCode = state?.trim().toUpperCase();
  const exactVariants = baseVariants;
  const expandedOnlyVariants = expandedVariants.filter(
    (variant) => !exactVariants.some((exactVariant) => exactVariant.toLowerCase() === variant.toLowerCase())
  );
  const withState = stateCode ? expandedVariants.map((variant) => `${variant} ${stateCode}`) : [];
  const variants = [...exactVariants, ...expandedOnlyVariants, ...withState];

  return Array.from(new Map(variants.map((variant) => [variant.toLowerCase(), variant])).values())
    .slice(0, 12);
}

async function fetchSearchResults(searchQuery: string): Promise<CourseLookupResult[]> {
  const response = await fetch(
    `${API_BASE_URL}/v1/search?${new URLSearchParams({ search_query: searchQuery }).toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Key ${getGolfCourseApiKey()}`
      },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(`GolfCourseAPI search failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as GolfCourseApiSearchResponse;

  return (payload.courses ?? [])
    .map((course) => normalizeCourse(course))
    .filter((course): course is CourseLookupResult => Boolean(course));
}

function filterByState(results: CourseLookupResult[], state?: string) {
  if (!state) {
    return results;
  }

  return results.filter((course) => (course.state ?? "").toUpperCase() === state.toUpperCase());
}

function dedupeCourses(results: CourseLookupResult[]) {
  const deduped = new Map<string, CourseLookupResult>();

  for (const result of results) {
    deduped.set(`${result.provider}:${result.externalCourseId}`, result);
  }

  return Array.from(deduped.values()).sort((left, right) => {
    const rightFullTees = right.tees.filter((tee) => (tee.holes ?? []).length === 18).length;
    const leftFullTees = left.tees.filter((tee) => (tee.holes ?? []).length === 18).length;

    if (rightFullTees !== leftFullTees) {
      return rightFullTees - leftFullTees;
    }

    return left.name.localeCompare(right.name);
  });
}

export class GolfCourseApiCourseDirectoryProvider implements CourseDirectoryProvider {
  async searchCourses(query: CourseLookupQuery): Promise<CourseLookupResult[]> {
    const results: CourseLookupResult[] = [];
    let lastError: unknown = null;

    for (const searchQuery of buildSearchVariants(query.name, query.state)) {
      try {
        const matches = filterByState(await fetchSearchResults(searchQuery), query.state);
        results.push(...matches);

        if (matches.some((course) => course.tees.some((tee) => (tee.holes ?? []).length === 18))) {
          break;
        }

        if (results.length >= 8) {
          break;
        }
      } catch (error) {
        lastError = error;
      }
    }

    if (results.length > 0) {
      return dedupeCourses(results);
    }

    if (lastError instanceof Error) {
      throw lastError;
    }

    return [];
  }
}

export const golfCourseApiCourseDirectoryProvider = new GolfCourseApiCourseDirectoryProvider();
