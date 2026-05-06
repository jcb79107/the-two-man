import "server-only";

import type { CourseDirectoryProvider, CourseLookupQuery, CourseLookupResult, CourseLookupHole } from "@/lib/providers/types";

type OpenGolfCourseSummary = {
  id?: string;
  club_name?: string;
  course_name?: string;
  city?: string;
  state?: string;
};

type OpenGolfCourseDetail = OpenGolfCourseSummary & {
  scorecard?: Array<{
    hole_number?: number;
    par?: number;
    handicap_index?: number;
  }>;
};

type OpenGolfSearchResponse = {
  courses?: OpenGolfCourseSummary[];
};

const OPEN_GOLF_API_BASE_URL = "https://api.opengolfapi.org/v1";

function normalizeCourseName(course: OpenGolfCourseSummary) {
  const names = [course.club_name, course.course_name]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  const uniqueNames = names.filter((name, index) => names.indexOf(name) === index);

  return uniqueNames.join(" - ") || "Unknown Course";
}

function normalizeScorecard(scorecard: OpenGolfCourseDetail["scorecard"]): CourseLookupHole[] | undefined {
  if (!Array.isArray(scorecard)) {
    return undefined;
  }

  const holes = scorecard
    .slice(0, 18)
    .map((hole) => ({
      holeNumber: Number(hole.hole_number ?? 0),
      par: Number(hole.par ?? 0),
      strokeIndex: Number(hole.handicap_index ?? 0)
    }))
    .filter((hole) => hole.holeNumber > 0 && hole.par > 0 && hole.strokeIndex > 0)
    .sort((left, right) => left.holeNumber - right.holeNumber);

  if (holes.length !== 18 || new Set(holes.map((hole) => hole.strokeIndex)).size !== 18) {
    return undefined;
  }

  return holes;
}

async function fetchOpenGolfJson<T>(path: string) {
  const response = await fetch(`${OPEN_GOLF_API_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`OpenGolfAPI lookup failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

function normalizeCourseResult(course: OpenGolfCourseDetail): CourseLookupResult | null {
  if (!course.id) {
    return null;
  }

  return {
    externalCourseId: course.id,
    provider: "opengolfapi",
    name: normalizeCourseName(course),
    city: course.city ?? null,
    state: course.state ?? null,
    tees: [],
    raw: {
      ...course,
      normalizedScorecard: normalizeScorecard(course.scorecard)
    } as Record<string, unknown>
  };
}

export class OpenGolfApiCourseDirectoryProvider implements CourseDirectoryProvider {
  async searchCourses(query: CourseLookupQuery): Promise<CourseLookupResult[]> {
    const searchParams = new URLSearchParams({
      q: query.name
    });

    if (query.state) {
      searchParams.set("state", query.state);
    }

    const payload = await fetchOpenGolfJson<OpenGolfSearchResponse>(
      `/courses/search?${searchParams.toString()}`
    );
    const summaries = (payload.courses ?? []).slice(0, 8);
    const results: CourseLookupResult[] = [];

    for (const summary of summaries) {
      if (!summary.id) {
        continue;
      }

      try {
        const detail = await fetchOpenGolfJson<OpenGolfCourseDetail>(
          `/courses/${encodeURIComponent(summary.id)}`
        );
        const normalized = normalizeCourseResult(detail);

        if (normalized) {
          results.push(normalized);
        }
      } catch {
        const normalized = normalizeCourseResult(summary);

        if (normalized) {
          results.push(normalized);
        }
      }
    }

    return results;
  }
}

export const openGolfApiCourseDirectoryProvider = new OpenGolfApiCourseDirectoryProvider();
