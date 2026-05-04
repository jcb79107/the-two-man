import "server-only";

import { nanoid } from "nanoid";
import { Prisma } from "@prisma/client";
import type { CourseLookupResult } from "@/lib/providers/types";
import { golfCourseApiCourseDirectoryProvider } from "@/lib/providers/golf-course-api-provider";
import { usgaCourseDirectoryProvider } from "@/lib/providers/usga-scrape-provider";
import { db } from "@/lib/server/db";

function decimal(value: number) {
  return new Prisma.Decimal(value.toFixed(1));
}

type TeeHoleLike = {
  holeNumber: number;
  par: number;
  strokeIndex: number;
  yardage?: number | null;
};

type TeeLike<T extends TeeHoleLike = TeeHoleLike> = {
  name: string;
  gender: string;
  holes?: T[];
};

export function hydrateTeeHolesFromSiblings<T extends TeeLike>(tee: T, tees: T[]) {
  const teeHoles = tee.holes ?? [];

  if (teeHoles.length === 18) {
    return teeHoles.slice().sort((left, right) => left.holeNumber - right.holeNumber);
  }

  const fullSiblingTees = tees.filter((candidate) => (candidate.holes ?? []).length === 18);
  const fallbackTee =
    fullSiblingTees.find((candidate) => candidate.gender === tee.gender) ??
    fullSiblingTees[0];

  if (!fallbackTee) {
    return teeHoles.slice().sort((left, right) => left.holeNumber - right.holeNumber);
  }

  const yardageByHoleNumber = new Map(teeHoles.map((hole) => [hole.holeNumber, hole.yardage ?? null]));

  return (fallbackTee.holes ?? []).map((hole) => ({
    holeNumber: hole.holeNumber,
    par: hole.par,
    strokeIndex: hole.strokeIndex,
    yardage: yardageByHoleNumber.get(hole.holeNumber) ?? null
  }));
}

function normalizeProviderKey(provider: string, externalId: string) {
  return `${provider}:${externalId}`;
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(golf|club|country|course|and|the|no)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTeeName(value: string) {
  return normalizeText(value)
    .replace(/\b(men|women|mens|womens|male|female|tees|tee)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractColorTokens(value: string) {
  const tokenSet = new Set(
    normalizeText(value)
      .split(" ")
      .filter((token) =>
        [
          "black",
          "blue",
          "white",
          "gold",
          "red",
          "green",
          "yellow",
          "silver",
          "orange",
          "combo",
          "hybrid"
        ].includes(token)
      )
  );

  return tokenSet;
}

function courseSimilarity(left: CourseLookupResult, right: CourseLookupResult) {
  if (left.state && right.state && left.state !== right.state) {
    return 0;
  }

  const leftName = normalizeText(left.name);
  const rightName = normalizeText(right.name);
  const leftTokens = new Set(leftName.split(" ").filter(Boolean));
  const rightTokens = new Set(rightName.split(" ").filter(Boolean));
  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const cityBonus =
    left.city && right.city && normalizeText(left.city) === normalizeText(right.city) ? 2 : 0;

  return overlap + cityBonus;
}

function teeSimilarity(
  left: CourseLookupResult["tees"][number],
  right: CourseLookupResult["tees"][number]
) {
  let score = 0;

  if (left.gender === right.gender) {
    score += 5;
  } else if (left.gender === "OPEN" || right.gender === "OPEN") {
    score += 2;
  }

  const leftName = normalizeTeeName(left.name);
  const rightName = normalizeTeeName(right.name);

  if (leftName && rightName) {
    if (leftName === rightName) {
      score += 8;
    } else if (leftName.includes(rightName) || rightName.includes(leftName)) {
      score += 5;
    }
  }

  const leftColors = extractColorTokens(left.name);
  const rightColors = extractColorTokens(right.name);
  const sharedColors = [...leftColors].filter((token) => rightColors.has(token)).length;
  score += sharedColors * 2;

  if (left.par === right.par) {
    score += 2;
  }

  const slopeDelta = Math.abs(left.slope - right.slope);
  if (slopeDelta <= 2) {
    score += 4;
  } else if (slopeDelta <= 5) {
    score += 3;
  } else if (slopeDelta <= 10) {
    score += 1;
  }

  const ratingDelta = Math.abs(left.courseRating - right.courseRating);
  if (ratingDelta <= 0.3) {
    score += 4;
  } else if (ratingDelta <= 0.8) {
    score += 3;
  } else if (ratingDelta <= 1.5) {
    score += 2;
  } else if (ratingDelta <= 3) {
    score += 1;
  }

  return score;
}

function mergeUsgaAndGolfCourseApiResults(
  usgaResults: CourseLookupResult[],
  golfCourseApiResults: CourseLookupResult[]
) {
  if (usgaResults.length === 0) {
    return golfCourseApiResults;
  }

  return usgaResults.map((usgaCourse) => {
    const bestGolfCourseMatch = golfCourseApiResults
      .map((candidate) => ({
        candidate,
        score: courseSimilarity(usgaCourse, candidate)
      }))
      .sort((left, right) => right.score - left.score)[0];

    if (!bestGolfCourseMatch || bestGolfCourseMatch.score < 2) {
      return usgaCourse;
    }

    const golfTees = bestGolfCourseMatch.candidate.tees;

    return {
      ...usgaCourse,
      tees: usgaCourse.tees.map((usgaTee) => {
        const bestGolfTeeMatch = golfTees
          .map((golfTee) => ({
            golfTee,
            score: teeSimilarity(usgaTee, golfTee)
          }))
          .sort((left, right) => right.score - left.score)[0];

        if (!bestGolfTeeMatch || bestGolfTeeMatch.score < 6) {
          return usgaTee;
        }

        return {
          ...usgaTee,
          holes: bestGolfTeeMatch.golfTee.holes
        };
      }),
      raw: {
        usga: usgaCourse.raw,
        golfCourseApi: bestGolfCourseMatch.candidate.raw
      }
    };
  });
}

export function serializeCourses(
  courses: Array<{
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    tees: Array<{
      id: string;
      name: string;
      gender: string;
      par: number;
      slope: number;
      courseRating: Prisma.Decimal | number;
      holes: Array<{
        holeNumber: number;
        par: number;
        strokeIndex: number;
        yardage?: number | null;
      }>;
    }>;
  }>
) {
  return courses.map((course) => ({
    id: course.id,
    name: course.name,
    city: course.city,
    state: course.state,
    tees: course.tees.map((tee) => ({
      id: tee.id,
      name: tee.name,
      gender: tee.gender,
      par: tee.par,
      slope: tee.slope,
      courseRating: Number(tee.courseRating),
      holes: hydrateTeeHolesFromSiblings(tee, course.tees).map((hole) => ({
        holeNumber: hole.holeNumber,
        par: hole.par,
        strokeIndex: hole.strokeIndex,
        yardage: hole.yardage ?? undefined
      }))
    }))
  }));
}

const MAX_SEARCH_RESULTS_TO_PERSIST = 12;
const MAX_STORED_SEARCH_RESULTS = 12;

function scoreStoredCourseMatch(
  course: {
    name: string;
    city: string | null;
    state: string | null;
    tees: Array<{ holes: Array<unknown> }>;
  },
  query: { name: string; state?: string }
) {
  const queryText = normalizeText(query.name);
  const queryTokens = queryText.split(" ").filter(Boolean);
  const courseText = normalizeText([course.name, course.city, course.state].filter(Boolean).join(" "));
  const courseTokens = new Set(courseText.split(" ").filter(Boolean));

  let score = 0;

  if (courseText.includes(queryText)) {
    score += 8;
  }

  for (const token of queryTokens) {
    if (courseTokens.has(token)) {
      score += 3;
    } else if (courseText.includes(token)) {
      score += 1;
    }
  }

  if (query.state && course.state?.toUpperCase() === query.state.toUpperCase()) {
    score += 4;
  }

  const fullTeeCount = course.tees.filter((tee) => tee.holes.length === 18).length;
  score += Math.min(fullTeeCount, 3);

  return score;
}

async function searchStoredCourseCatalog(query: { name: string; state?: string }) {
  const normalizedName = normalizeText(query.name);
  const tokens = normalizedName.split(" ").filter((token) => token.length >= 3);
  const primaryToken = tokens[0] ?? normalizedName;

  if (!primaryToken) {
    return [];
  }

  const courses = await db.course.findMany({
    where: {
      AND: [
        query.state
          ? {
              OR: [
                {
                  state: {
                    equals: query.state,
                    mode: "insensitive"
                  }
                },
                {
                  state: null
                }
              ]
            }
          : {},
        {
          OR: [
            {
              name: {
                contains: query.name,
                mode: "insensitive"
              }
            },
            {
              city: {
                contains: query.name,
                mode: "insensitive"
              }
            },
            {
              name: {
                contains: primaryToken,
                mode: "insensitive"
              }
            },
            {
              city: {
                contains: primaryToken,
                mode: "insensitive"
              }
            }
          ]
        }
      ]
    },
    include: {
      tees: {
        orderBy: {
          name: "asc"
        },
        include: {
          holes: {
            orderBy: {
              holeNumber: "asc"
            }
          }
        }
      }
    }
  });

  return courses
    .map((course) => ({
      course,
      score: scoreStoredCourseMatch(course, query)
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      const rightFullTees = right.course.tees.filter((tee) => tee.holes.length === 18).length;
      const leftFullTees = left.course.tees.filter((tee) => tee.holes.length === 18).length;

      if (rightFullTees !== leftFullTees) {
        return rightFullTees - leftFullTees;
      }

      if (right.course.tees.length !== left.course.tees.length) {
        return right.course.tees.length - left.course.tees.length;
      }

      return left.course.name.localeCompare(right.course.name);
    })
    .reduce<typeof courses>((deduped, entry) => {
      const key = [
        normalizeText(entry.course.name),
        normalizeText(entry.course.city),
        entry.course.state?.toUpperCase() ?? ""
      ].join(":");

      if (!deduped.some((course) => {
        const existingKey = [
          normalizeText(course.name),
          normalizeText(course.city),
          course.state?.toUpperCase() ?? ""
        ].join(":");

        return existingKey === key;
      })) {
        deduped.push(entry.course);
      }

      return deduped;
    }, [])
    .slice(0, MAX_STORED_SEARCH_RESULTS);
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
    const hydratedHoles = hydrateTeeHolesFromSiblings(tee, result.tees);

    const persistedTee = await db.courseTee.upsert({
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

    if (hydratedHoles.length === 18) {
      for (const hole of hydratedHoles) {
        await db.courseHole.upsert({
          where: {
            courseTeeId_holeNumber: {
              courseTeeId: persistedTee.id,
              holeNumber: hole.holeNumber
            }
          },
          update: {
            par: hole.par,
            strokeIndex: hole.strokeIndex,
            yardage: hole.yardage ?? null
          },
          create: {
            id: `${persistedTee.id}-hole-${hole.holeNumber}`,
            courseTeeId: persistedTee.id,
            holeNumber: hole.holeNumber,
            par: hole.par,
            strokeIndex: hole.strokeIndex,
            yardage: hole.yardage ?? null
          }
        });
      }
    }
  }

  return db.course.findUnique({
    where: {
      id: courseId
    },
    include: {
      tees: {
        orderBy: {
          name: "asc"
        },
        include: {
          holes: {
            orderBy: {
              holeNumber: "asc"
            }
          }
        }
      }
    }
  });
}

async function lookupCourses(query: { name: string; state?: string }) {
  const [usgaResult, golfResult] = await Promise.allSettled([
    usgaCourseDirectoryProvider.searchCourses(query),
    golfCourseApiCourseDirectoryProvider.searchCourses(query)
  ]);

  const usgaResults = usgaResult.status === "fulfilled" ? usgaResult.value : [];
  const golfCourseApiResults = golfResult.status === "fulfilled" ? golfResult.value : [];

  const merged = mergeUsgaAndGolfCourseApiResults(usgaResults, golfCourseApiResults);

  if (merged.length > 0) {
    return merged;
  }

  if (golfCourseApiResults.length > 0) {
    return golfCourseApiResults;
  }

  return usgaResults;
}

export async function searchCourseCatalog(query: { name: string; state?: string }) {
  const results = (await lookupCourses(query)).slice(0, MAX_SEARCH_RESULTS_TO_PERSIST);
  const persistedCourses = [];

  // Persist search hits in series so broad queries do not exhaust the local Postgres pool.
  for (const result of results) {
    persistedCourses.push(await upsertCourseLookupResult(result));
  }

  if (persistedCourses.length > 0) {
    return serializeCourses(
      persistedCourses.filter(
        (
          course
        ): course is NonNullable<typeof course> => Boolean(course)
      )
    );
  }

  return serializeCourses(await searchStoredCourseCatalog(query));
}

export async function getStoredCourseCatalog() {
  const courses = await db.course.findMany({
    orderBy: {
      name: "asc"
    },
    include: {
      tees: {
        orderBy: {
          name: "asc"
        },
        include: {
          holes: {
            orderBy: {
              holeNumber: "asc"
            }
          }
        }
      }
    }
  });

  return serializeCourses(courses);
}
