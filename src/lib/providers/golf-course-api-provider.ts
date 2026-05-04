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

  return {
    externalCourseId: String(courseId),
    provider: "golf-course-api",
    name: uniqueNameParts.join(" - ") || `Course ${courseId}`,
    city: course.location?.city ?? null,
    state: course.location?.state ?? null,
    tees: [
      ...normalizeTees(course.tees?.male, "MEN", courseId),
      ...normalizeTees(course.tees?.female, "WOMEN", courseId)
    ],
    raw: course as Record<string, unknown>
  };
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

  return Array.from(deduped.values()).sort((left, right) => left.name.localeCompare(right.name));
}

export class GolfCourseApiCourseDirectoryProvider implements CourseDirectoryProvider {
  async searchCourses(query: CourseLookupQuery): Promise<CourseLookupResult[]> {
    const scopedQuery = query.state ? `${query.name} ${query.state}` : query.name;
    const scopedResults = filterByState(await fetchSearchResults(scopedQuery), query.state);

    if (scopedResults.length > 0 || !query.state) {
      return dedupeCourses(scopedResults);
    }

    return dedupeCourses(filterByState(await fetchSearchResults(query.name), query.state));
  }
}

export const golfCourseApiCourseDirectoryProvider = new GolfCourseApiCourseDirectoryProvider();
