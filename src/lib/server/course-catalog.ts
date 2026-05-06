import "server-only";

import { nanoid } from "nanoid";
import { Prisma } from "@prisma/client";
import type { CourseLookupResult } from "@/lib/providers/types";
import { golfCourseApiCourseDirectoryProvider } from "@/lib/providers/golf-course-api-provider";
import { openGolfApiCourseDirectoryProvider } from "@/lib/providers/opengolfapi-provider";
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

function getLookupScorecardHoles(result: CourseLookupResult) {
  const fullTee = result.tees.find((tee) => (tee.holes ?? []).length === 18);

  if (fullTee?.holes?.length === 18) {
    return fullTee.holes;
  }

  const rawScorecard = result.raw?.normalizedScorecard;

  if (Array.isArray(rawScorecard) && rawScorecard.length === 18) {
    return rawScorecard as TeeHoleLike[];
  }

  return null;
}

function courseSimilarityScore(left: CourseLookupResult, right: CourseLookupResult) {
  const leftState = left.state?.toUpperCase() ?? "";
  const rightState = right.state?.toUpperCase() ?? "";

  if (leftState && rightState && leftState !== rightState) {
    return 0;
  }

  const leftText = normalizeText([left.name, left.city].filter(Boolean).join(" "));
  const rightText = normalizeText([right.name, right.city].filter(Boolean).join(" "));

  if (!leftText || !rightText) {
    return 0;
  }

  if (leftText.includes(rightText) || rightText.includes(leftText)) {
    return 8;
  }

  const leftTokens = new Set(leftText.split(" ").filter((token) => token.length >= 4));
  const rightTokens = new Set(rightText.split(" ").filter((token) => token.length >= 4));
  const sharedTokenCount = Array.from(leftTokens).filter((token) => rightTokens.has(token)).length;

  return sharedTokenCount >= 2 ? sharedTokenCount : 0;
}

function mergeLookupResultGroup(group: CourseLookupResult[]) {
  const base = group
    .slice()
    .sort((left, right) => {
      const rightFullTees = right.tees.filter((tee) => (tee.holes ?? []).length === 18).length;
      const leftFullTees = left.tees.filter((tee) => (tee.holes ?? []).length === 18).length;

      if (rightFullTees !== leftFullTees) {
        return rightFullTees - leftFullTees;
      }

      if (right.tees.length !== left.tees.length) {
        return right.tees.length - left.tees.length;
      }

      return left.name.localeCompare(right.name);
    })[0];
  const scorecardHoles =
    group.map(getLookupScorecardHoles).find((holes): holes is TeeHoleLike[] => Boolean(holes)) ?? null;
  const teeByName = new Map<string, CourseLookupResult["tees"][number]>();

  for (const result of group) {
    for (const tee of result.tees) {
      const key = `${normalizeText(tee.name)}:${tee.gender}`;
      const hydratedHoles =
        (tee.holes ?? []).length === 18
          ? tee.holes
          : scorecardHoles
            ? scorecardHoles.map((hole) => ({
                holeNumber: hole.holeNumber,
                par: hole.par,
                strokeIndex: hole.strokeIndex,
                yardage: tee.holes?.find((teeHole) => teeHole.holeNumber === hole.holeNumber)?.yardage
              }))
            : tee.holes;
      const hydratedTee = {
        ...tee,
        holes: hydratedHoles
      };
      const existing = teeByName.get(key);

      if (!existing || (existing.holes ?? []).length < (hydratedTee.holes ?? []).length) {
        teeByName.set(key, hydratedTee);
      }
    }
  }

  return {
    ...base,
    tees: Array.from(teeByName.values()).sort((left, right) => right.courseRating - left.courseRating),
    raw: {
      ...(base.raw ?? {}),
      mergedProviders: group.map((result) => result.provider)
    }
  };
}

function mergeLookupResults(results: CourseLookupResult[]) {
  const groups: CourseLookupResult[][] = [];

  for (const result of results) {
    const compatibleGroup = groups.find((group) =>
      group.some((candidate) => courseSimilarityScore(candidate, result) > 0)
    );

    if (compatibleGroup) {
      compatibleGroup.push(result);
    } else {
      groups.push([result]);
    }
  }

  return groups.map(mergeLookupResultGroup).sort((left, right) => {
    const rightFullTees = right.tees.filter((tee) => (tee.holes ?? []).length === 18).length;
    const leftFullTees = left.tees.filter((tee) => (tee.holes ?? []).length === 18).length;

    if (rightFullTees !== leftFullTees) {
      return rightFullTees - leftFullTees;
    }

    if (right.tees.length !== left.tees.length) {
      return right.tees.length - left.tees.length;
    }

    return left.name.localeCompare(right.name);
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

  await db.courseTee.deleteMany({
    where: {
      courseId,
      name: {
        notIn: result.tees.map((tee) => tee.name)
      },
      matchSelections: {
        none: {}
      }
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
  const results: CourseLookupResult[] = [];

  try {
    results.push(...(await golfCourseApiCourseDirectoryProvider.searchCourses(query)));
  } catch {
    // Keep moving through the fallback providers.
  }

  const needsFallbackData =
    results.length === 0 ||
    results.some((course) => course.tees.length === 0 || course.tees.some((tee) => (tee.holes ?? []).length !== 18));

  if (needsFallbackData) {
    try {
      results.push(...(await usgaCourseDirectoryProvider.searchCourses(query)));
    } catch {
      // USGA is a fallback source; do not fail the whole course search when it is unavailable.
    }

    try {
      results.push(...(await openGolfApiCourseDirectoryProvider.searchCourses(query)));
    } catch {
      // OpenGolfAPI is used for scorecard enrichment and can be skipped if it is unavailable.
    }
  }

  return mergeLookupResults(results);
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
