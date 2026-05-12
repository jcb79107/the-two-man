import "server-only";

import type { CourseLookupResult } from "@/lib/providers/types";

const BRYN_MAWR_HOLES = [
  { holeNumber: 1, par: 5, strokeIndex: 17 },
  { holeNumber: 2, par: 4, strokeIndex: 5 },
  { holeNumber: 3, par: 4, strokeIndex: 13 },
  { holeNumber: 4, par: 4, strokeIndex: 1 },
  { holeNumber: 5, par: 5, strokeIndex: 9 },
  { holeNumber: 6, par: 3, strokeIndex: 7 },
  { holeNumber: 7, par: 4, strokeIndex: 15 },
  { holeNumber: 8, par: 3, strokeIndex: 11 },
  { holeNumber: 9, par: 4, strokeIndex: 3 },
  { holeNumber: 10, par: 3, strokeIndex: 8 },
  { holeNumber: 11, par: 4, strokeIndex: 18 },
  { holeNumber: 12, par: 4, strokeIndex: 6 },
  { holeNumber: 13, par: 5, strokeIndex: 4 },
  { holeNumber: 14, par: 3, strokeIndex: 10 },
  { holeNumber: 15, par: 5, strokeIndex: 12 },
  { holeNumber: 16, par: 3, strokeIndex: 16 },
  { holeNumber: 17, par: 4, strokeIndex: 2 },
  { holeNumber: 18, par: 5, strokeIndex: 14 }
];

type NorthmoorTeeColor = "black" | "blue" | "white" | "gold";
type NorthmoorNineKey = "blue" | "red" | "white";

const NORTHMOOR_NINES: Record<
  NorthmoorNineKey,
  {
    par: number[];
    yardage: Record<NorthmoorTeeColor, number[]>;
    hcpFront: Record<NorthmoorTeeColor, number[]>;
    hcpBack: Record<NorthmoorTeeColor, number[]>;
  }
> = {
  blue: {
    par: [4, 4, 4, 3, 4, 4, 5, 3, 4],
    yardage: {
      black: [412, 381, 402, 223, 386, 340, 542, 190, 437],
      blue: [390, 360, 398, 213, 380, 310, 521, 182, 422],
      white: [358, 311, 347, 180, 338, 294, 491, 153, 314],
      gold: [310, 256, 318, 134, 309, 239, 469, 125, 289]
    },
    hcpFront: {
      black: [7, 11, 5, 13, 9, 15, 1, 17, 3],
      blue: [9, 11, 5, 15, 7, 13, 1, 17, 3],
      white: [5, 11, 3, 15, 7, 13, 1, 17, 9],
      gold: [7, 11, 3, 15, 5, 13, 1, 17, 9]
    },
    hcpBack: {
      black: [8, 12, 6, 14, 10, 16, 2, 18, 4],
      blue: [10, 12, 6, 16, 8, 14, 2, 18, 4],
      white: [6, 12, 4, 16, 8, 14, 2, 18, 10],
      gold: [8, 12, 4, 16, 6, 14, 2, 18, 10]
    }
  },
  red: {
    par: [4, 5, 4, 3, 4, 4, 3, 5, 4],
    yardage: {
      black: [394, 504, 424, 179, 431, 422, 207, 613, 427],
      blue: [370, 492, 390, 159, 387, 409, 169, 569, 400],
      white: [329, 480, 369, 138, 341, 340, 155, 510, 369],
      gold: [290, 406, 344, 129, 312, 318, 125, 464, 283]
    },
    hcpFront: {
      black: [15, 11, 9, 17, 3, 7, 13, 1, 5],
      blue: [15, 9, 11, 17, 7, 3, 13, 1, 5],
      white: [15, 5, 7, 17, 11, 3, 13, 1, 9],
      gold: [11, 3, 5, 17, 9, 7, 15, 1, 13]
    },
    hcpBack: {
      black: [16, 12, 10, 18, 4, 8, 14, 2, 6],
      blue: [16, 10, 12, 18, 8, 4, 14, 2, 6],
      white: [16, 6, 8, 18, 12, 4, 14, 2, 10],
      gold: [12, 4, 6, 18, 10, 8, 16, 2, 14]
    }
  },
  white: {
    par: [4, 4, 3, 5, 4, 4, 4, 3, 5],
    yardage: {
      black: [402, 400, 204, 517, 351, 457, 300, 233, 560],
      blue: [390, 392, 196, 502, 341, 418, 291, 203, 548],
      white: [343, 350, 178, 466, 320, 383, 262, 184, 506],
      gold: [301, 279, 151, 411, 292, 351, 252, 144, 409]
    },
    hcpFront: {
      black: [9, 5, 13, 7, 11, 1, 17, 15, 3],
      blue: [9, 5, 13, 7, 11, 1, 17, 15, 3],
      white: [9, 5, 13, 7, 11, 1, 17, 15, 3],
      gold: [11, 7, 15, 5, 9, 1, 13, 17, 3]
    },
    hcpBack: {
      black: [10, 6, 14, 8, 12, 2, 18, 16, 4],
      blue: [10, 6, 14, 8, 12, 2, 18, 16, 4],
      white: [10, 6, 14, 8, 12, 2, 18, 16, 4],
      gold: [12, 8, 16, 6, 10, 2, 14, 18, 4]
    }
  }
};

const NORTHMOOR_TEE_LABELS: Array<{
  color: NorthmoorTeeColor;
  externalKey: string;
  name: string;
  gender: "MEN" | "WOMEN";
}> = [
  { color: "black", externalKey: "black-men", name: "Black", gender: "MEN" },
  { color: "blue", externalKey: "blue-men", name: "Blue", gender: "MEN" },
  { color: "white", externalKey: "white-men", name: "White (Men)", gender: "MEN" },
  { color: "white", externalKey: "white-women", name: "White (Women)", gender: "WOMEN" },
  { color: "gold", externalKey: "gold-men", name: "Gold (Men)", gender: "MEN" },
  { color: "gold", externalKey: "gold-women", name: "Gold (Women)", gender: "WOMEN" }
];

function buildNorthmoorHoles(frontNine: NorthmoorNineKey, backNine: NorthmoorNineKey, color: NorthmoorTeeColor) {
  return [
    ...NORTHMOOR_NINES[frontNine].par.map((par, index) => ({
      holeNumber: index + 1,
      par,
      strokeIndex: NORTHMOOR_NINES[frontNine].hcpFront[color][index],
      yardage: NORTHMOOR_NINES[frontNine].yardage[color][index]
    })),
    ...NORTHMOOR_NINES[backNine].par.map((par, index) => ({
      holeNumber: index + 10,
      par,
      strokeIndex: NORTHMOOR_NINES[backNine].hcpBack[color][index],
      yardage: NORTHMOOR_NINES[backNine].yardage[color][index]
    }))
  ];
}

function buildNorthmoorCourse(
  externalCourseId: string,
  label: string,
  frontNine: NorthmoorNineKey,
  backNine: NorthmoorNineKey,
  ratings: Record<string, { courseRating: number; slope: number }>
): CourseLookupResult {
  const par = [...NORTHMOOR_NINES[frontNine].par, ...NORTHMOOR_NINES[backNine].par].reduce(
    (sum, value) => sum + value,
    0
  );

  return {
    externalCourseId,
    provider: "curated-chicagoland",
    name: `Northmoor Country Club - ${label}`,
    city: "Highland Park",
    state: "IL",
    tees: NORTHMOOR_TEE_LABELS.map((tee) => ({
      externalTeeId: `${externalCourseId}-${tee.externalKey}`,
      name: tee.name,
      gender: tee.gender,
      par,
      slope: ratings[tee.externalKey].slope,
      courseRating: ratings[tee.externalKey].courseRating,
      holes: buildNorthmoorHoles(frontNine, backNine, tee.color)
    })),
    raw: {
      source: "Northmoor official scorecard"
    }
  };
}

const CURATED_COURSES: CourseLookupResult[] = [
  {
    externalCourseId: "bryn-mawr-country-club-il",
    provider: "curated-chicagoland",
    name: "Bryn Mawr Country Club",
    city: "Lincolnwood",
    state: "IL",
    tees: [
      { externalTeeId: "bryn-mawr-langford-men", name: "Langford (Men)", gender: "MEN", par: 72, slope: 130, courseRating: 72.4, holes: BRYN_MAWR_HOLES },
      { externalTeeId: "bryn-mawr-i-men", name: "I (Men)", gender: "MEN", par: 72, slope: 125, courseRating: 70.5, holes: BRYN_MAWR_HOLES },
      { externalTeeId: "bryn-mawr-ii-men", name: "II (Men)", gender: "MEN", par: 72, slope: 119, courseRating: 67.9, holes: BRYN_MAWR_HOLES },
      { externalTeeId: "bryn-mawr-iii-men", name: "III (Men)", gender: "MEN", par: 72, slope: 112, courseRating: 65.1, holes: BRYN_MAWR_HOLES },
      { externalTeeId: "bryn-mawr-iv-men", name: "IV (Men)", gender: "MEN", par: 72, slope: 103, courseRating: 61.4, holes: BRYN_MAWR_HOLES },
      { externalTeeId: "bryn-mawr-langford-women", name: "Langford (Women)", gender: "WOMEN", par: 72, slope: 140, courseRating: 78.6, holes: BRYN_MAWR_HOLES },
      { externalTeeId: "bryn-mawr-i-women", name: "I (Women)", gender: "WOMEN", par: 72, slope: 135, courseRating: 76.2, holes: BRYN_MAWR_HOLES },
      { externalTeeId: "bryn-mawr-ii-women", name: "II (Women)", gender: "WOMEN", par: 72, slope: 128, courseRating: 73, holes: BRYN_MAWR_HOLES },
      { externalTeeId: "bryn-mawr-iii-women", name: "III (Women)", gender: "WOMEN", par: 72, slope: 121, courseRating: 69.6, holes: BRYN_MAWR_HOLES },
      { externalTeeId: "bryn-mawr-iv-women", name: "IV (Women)", gender: "WOMEN", par: 72, slope: 111, courseRating: 65, holes: BRYN_MAWR_HOLES }
    ],
    raw: {
      source: "local verified course directory"
    }
  },
  buildNorthmoorCourse("northmoor-country-club-blue-red-il", "Blue/Red", "blue", "red", {
    "black-men": { courseRating: 73.6, slope: 132 },
    "blue-men": { courseRating: 71.6, slope: 128 },
    "white-men": { courseRating: 68.6, slope: 119 },
    "white-women": { courseRating: 73.3, slope: 133 },
    "gold-men": { courseRating: 65.5, slope: 112 },
    "gold-women": { courseRating: 69.4, slope: 124 }
  }),
  buildNorthmoorCourse("northmoor-country-club-red-white-il", "Red/White", "red", "white", {
    "black-men": { courseRating: 74, slope: 137 },
    "blue-men": { courseRating: 72.1, slope: 132 },
    "white-men": { courseRating: 69.2, slope: 126 },
    "white-women": { courseRating: 74.9, slope: 137 },
    "gold-men": { courseRating: 65.8, slope: 118 },
    "gold-women": { courseRating: 70.5, slope: 127 }
  }),
  buildNorthmoorCourse("northmoor-country-club-white-blue-il", "White/Blue", "white", "blue", {
    "black-men": { courseRating: 72.6, slope: 136 },
    "blue-men": { courseRating: 71.3, slope: 134 },
    "white-men": { courseRating: 68.4, slope: 126 },
    "white-women": { courseRating: 73.2, slope: 137 },
    "gold-men": { courseRating: 65.1, slope: 118 },
    "gold-women": { courseRating: 69.3, slope: 128 }
  })
];

function normalize(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(golf|club|country|course|and|the)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function searchCuratedChicagolandCourses(query: { name: string; state?: string }) {
  const queryText = normalize(query.name);

  if (!queryText) {
    return [];
  }

  return CURATED_COURSES.filter((course) => {
    if (query.state && course.state?.toUpperCase() !== query.state.toUpperCase()) {
      return false;
    }

    const courseText = normalize([course.name, course.city].filter(Boolean).join(" "));
    const queryTokens = queryText.split(" ").filter((token) => token.length >= 3);

    return courseText.includes(queryText) || queryTokens.every((token) => courseText.includes(token));
  });
}
