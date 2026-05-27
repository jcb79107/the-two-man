import "server-only";

import type { CourseLookupResult } from "@/lib/providers/types";
import usgaNcrdbChicagolandExpansionEnrichment from "../../../data/course-catalog/usga-ncrdb-chicagoland-expansion-enrichment.json";
import usgaNcrdbLakeCookEnrichment from "../../../data/course-catalog/usga-ncrdb-lake-cook-enrichment.json";
import usgaNcrdbNorthwestIndianaEnrichment from "../../../data/course-catalog/usga-ncrdb-northwest-indiana-enrichment.json";
import usgaNcrdbPriorityEnrichment from "../../../data/course-catalog/usga-ncrdb-priority-enrichment.json";
import usgaNcrdbTargetedIllinoisEnrichment from "../../../data/course-catalog/usga-ncrdb-targeted-illinois-enrichment.json";
import usgaNcrdbWisconsinDriveEnrichment from "../../../data/course-catalog/usga-ncrdb-wisconsin-drive-enrichment.json";

const BRYN_MAWR_HOLES = [
  { holeNumber: 1, par: 5, strokeIndex: 15, yardage: 476 },
  { holeNumber: 2, par: 4, strokeIndex: 5, yardage: 427 },
  { holeNumber: 3, par: 4, strokeIndex: 11, yardage: 315 },
  { holeNumber: 4, par: 4, strokeIndex: 1, yardage: 452 },
  { holeNumber: 5, par: 5, strokeIndex: 7, yardage: 550 },
  { holeNumber: 6, par: 3, strokeIndex: 9, yardage: 200 },
  { holeNumber: 7, par: 4, strokeIndex: 17, yardage: 331 },
  { holeNumber: 8, par: 3, strokeIndex: 13, yardage: 177 },
  { holeNumber: 9, par: 4, strokeIndex: 3, yardage: 430 },
  { holeNumber: 10, par: 3, strokeIndex: 8, yardage: 237 },
  { holeNumber: 11, par: 4, strokeIndex: 16, yardage: 275 },
  { holeNumber: 12, par: 4, strokeIndex: 4, yardage: 400 },
  { holeNumber: 13, par: 5, strokeIndex: 6, yardage: 554 },
  { holeNumber: 14, par: 3, strokeIndex: 14, yardage: 176 },
  { holeNumber: 15, par: 5, strokeIndex: 10, yardage: 505 },
  { holeNumber: 16, par: 3, strokeIndex: 18, yardage: 148 },
  { holeNumber: 17, par: 4, strokeIndex: 2, yardage: 455 },
  { holeNumber: 18, par: 5, strokeIndex: 12, yardage: 530 }
];

const SUNSET_VALLEY_HOLES = [
  { holeNumber: 1, par: 4, strokeIndex: 7, yardage: 339 },
  { holeNumber: 2, par: 5, strokeIndex: 5, yardage: 497 },
  { holeNumber: 3, par: 4, strokeIndex: 9, yardage: 369 },
  { holeNumber: 4, par: 3, strokeIndex: 13, yardage: 145 },
  { holeNumber: 5, par: 4, strokeIndex: 3, yardage: 415 },
  { holeNumber: 6, par: 3, strokeIndex: 15, yardage: 140 },
  { holeNumber: 7, par: 5, strokeIndex: 1, yardage: 538 },
  { holeNumber: 8, par: 4, strokeIndex: 17, yardage: 346 },
  { holeNumber: 9, par: 4, strokeIndex: 11, yardage: 363 },
  { holeNumber: 10, par: 4, strokeIndex: 14, yardage: 336 },
  { holeNumber: 11, par: 3, strokeIndex: 16, yardage: 161 },
  { holeNumber: 12, par: 5, strokeIndex: 4, yardage: 488 },
  { holeNumber: 13, par: 4, strokeIndex: 2, yardage: 407 },
  { holeNumber: 14, par: 3, strokeIndex: 12, yardage: 190 },
  { holeNumber: 15, par: 4, strokeIndex: 6, yardage: 396 },
  { holeNumber: 16, par: 4, strokeIndex: 8, yardage: 393 },
  { holeNumber: 17, par: 5, strokeIndex: 10, yardage: 483 },
  { holeNumber: 18, par: 4, strokeIndex: 18, yardage: 344 }
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
  { color: "blue", externalKey: "black-blue-men", name: "Black/Blue", gender: "MEN" },
  { color: "blue", externalKey: "blue-men", name: "Blue", gender: "MEN" },
  { color: "white", externalKey: "blue-white-men", name: "Blue/White", gender: "MEN" },
  { color: "white", externalKey: "white-men", name: "White (Men)", gender: "MEN" },
  { color: "gold", externalKey: "white-yellow-men", name: "White/Yellow (Men)", gender: "MEN" },
  { color: "gold", externalKey: "yellow-men", name: "Yellow (Men)", gender: "MEN" },
  { color: "white", externalKey: "white-women", name: "White (Women)", gender: "WOMEN" },
  { color: "gold", externalKey: "white-yellow-women", name: "White/Yellow (Women)", gender: "WOMEN" },
  { color: "gold", externalKey: "yellow-women", name: "Yellow (Women)", gender: "WOMEN" }
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
  ratings: Record<string, { courseRating: number; slope: number; par?: number }>
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
      par: ratings[tee.externalKey].par ?? par,
      slope: ratings[tee.externalKey].slope,
      courseRating: ratings[tee.externalKey].courseRating,
      holes: buildNorthmoorHoles(frontNine, backNine, tee.color)
    })),
    raw: {
      source: "USGA course rating table and Northmoor official scorecard"
    }
  };
}

type UsgaCuratedCourse = {
  externalCourseId: string;
  name: string;
  city: string;
  state: string;
  sourceUrl: string;
  tees: Array<{
    externalTeeId: string;
    name: string;
    gender: "MEN" | "WOMEN" | "OPEN";
    par: number;
    slope: number;
    courseRating: number;
  }>;
};

function buildUsgaCuratedCourse(course: UsgaCuratedCourse): CourseLookupResult {
  return {
    externalCourseId: course.externalCourseId,
    provider: "usga-ncrdb-curated",
    name: course.name,
    city: course.city,
    state: course.state,
    tees: course.tees,
    raw: {
      source: "USGA NCRDB course tee info",
      sourceUrl: course.sourceUrl
    }
  };
}

function normalizeGeneratedGender(gender: string): "MEN" | "WOMEN" | "OPEN" {
  return gender === "MEN" || gender === "WOMEN" || gender === "OPEN" ? gender : "OPEN";
}

function normalizeGeneratedUsgaCourse(course: (typeof usgaNcrdbPriorityEnrichment.courses)[number]): UsgaCuratedCourse {
  return {
    externalCourseId: course.externalCourseId,
    name: course.name,
    city: course.city ?? "",
    state: course.state ?? "",
    sourceUrl: course.sourceUrl,
    tees: course.tees.map((tee) => ({
      externalTeeId: tee.externalTeeId,
      name: tee.name,
      gender: normalizeGeneratedGender(tee.gender),
      par: tee.par,
      slope: tee.slope,
      courseRating: tee.courseRating
    }))
  };
}

const USGA_NCRDB_GENERATED_COURSES = [
  ...usgaNcrdbPriorityEnrichment.courses,
  ...usgaNcrdbLakeCookEnrichment.courses,
  ...usgaNcrdbChicagolandExpansionEnrichment.courses,
  ...usgaNcrdbNorthwestIndianaEnrichment.courses,
  ...usgaNcrdbWisconsinDriveEnrichment.courses,
  ...usgaNcrdbTargetedIllinoisEnrichment.courses
].map(normalizeGeneratedUsgaCourse);

const USGA_NCRDB_CURATED_COURSES: UsgaCuratedCourse[] = [
  {
    externalCourseId: "usga-ncrdb-7619",
    name: "Beverly Country Club",
    city: "Chicago",
    state: "IL",
    sourceUrl: "https://ncrdb.usga.org/courseTeeInfo?CourseID=7619",
    tees: [
      { externalTeeId: "usga-7619-635667", name: "Championship", gender: "MEN", par: 71, slope: 141, courseRating: 74.4 },
      { externalTeeId: "usga-7619-211864", name: "Blue", gender: "MEN", par: 71, slope: 138, courseRating: 73.3 },
      { externalTeeId: "usga-7619-492234", name: "Combo", gender: "MEN", par: 71, slope: 137, courseRating: 72.8 },
      { externalTeeId: "usga-7619-178111", name: "White", gender: "MEN", par: 71, slope: 135, courseRating: 71.9 },
      { externalTeeId: "usga-7619-635548", name: "Green", gender: "MEN", par: 71, slope: 131, courseRating: 70.3 },
      { externalTeeId: "usga-7619-635551", name: "Gold", gender: "MEN", par: 71, slope: 125, courseRating: 67.7 },
      { externalTeeId: "usga-7619-675233", name: "Blue (Women)", gender: "WOMEN", par: 72, slope: 144, courseRating: 79.7 },
      { externalTeeId: "usga-7619-676907", name: "Combo (Women)", gender: "WOMEN", par: 71, slope: 143, courseRating: 79.1 },
      { externalTeeId: "usga-7619-676909", name: "White (Women)", gender: "WOMEN", par: 71, slope: 141, courseRating: 78.1 },
      { externalTeeId: "usga-7619-492231", name: "Green (Women)", gender: "WOMEN", par: 72, slope: 137, courseRating: 76.1 },
      { externalTeeId: "usga-7619-635778", name: "Gold (Women)", gender: "WOMEN", par: 72, slope: 130, courseRating: 73 }
    ]
  },
  {
    externalCourseId: "usga-ncrdb-7303",
    name: "Harborside International - Port",
    city: "Chicago",
    state: "IL",
    sourceUrl: "https://ncrdb.usga.org/courseTeeInfo?CourseID=7303",
    tees: [
      { externalTeeId: "usga-7303-177362", name: "Tournament", gender: "MEN", par: 72, slope: 137, courseRating: 74.6 },
      { externalTeeId: "usga-7303-177360", name: "Championship", gender: "MEN", par: 72, slope: 131, courseRating: 72.1 },
      { externalTeeId: "usga-7303-269886", name: "Combo", gender: "MEN", par: 72, slope: 128, courseRating: 70.5 },
      { externalTeeId: "usga-7303-177361", name: "Regular", gender: "MEN", par: 72, slope: 125, courseRating: 69.2 },
      { externalTeeId: "usga-7303-708438", name: "Forward", gender: "MEN", par: 72, slope: 116, courseRating: 65.5 },
      { externalTeeId: "usga-7303-840714", name: "Tournament (Women)", gender: "WOMEN", par: 72, slope: 148, courseRating: 81.2 },
      { externalTeeId: "usga-7303-840711", name: "Championship (Women)", gender: "WOMEN", par: 72, slope: 142, courseRating: 78.2 },
      { externalTeeId: "usga-7303-840708", name: "Combo (Women)", gender: "WOMEN", par: 72, slope: 138, courseRating: 76.4 },
      { externalTeeId: "usga-7303-499874", name: "Regular (Women)", gender: "WOMEN", par: 72, slope: 135, courseRating: 74.8 },
      { externalTeeId: "usga-7303-177363", name: "Forward (Women)", gender: "WOMEN", par: 72, slope: 125, courseRating: 70.3 }
    ]
  },
  {
    externalCourseId: "usga-ncrdb-7302",
    name: "Harborside International - Starboard",
    city: "Chicago",
    state: "IL",
    sourceUrl: "https://ncrdb.usga.org/courseTeeInfo?CourseID=7302",
    tees: [
      { externalTeeId: "usga-7302-177357", name: "Tournament", gender: "MEN", par: 72, slope: 134, courseRating: 74.5 },
      { externalTeeId: "usga-7302-177355", name: "Championship", gender: "MEN", par: 72, slope: 128, courseRating: 72.2 },
      { externalTeeId: "usga-7302-269887", name: "Combo", gender: "MEN", par: 72, slope: 124, courseRating: 70.4 },
      { externalTeeId: "usga-7302-359591", name: "Regular", gender: "MEN", par: 72, slope: 120, courseRating: 68.9 },
      { externalTeeId: "usga-7302-708433", name: "Forward", gender: "MEN", par: 72, slope: 111, courseRating: 65.2 },
      { externalTeeId: "usga-7302-896971", name: "Championship (Women)", gender: "WOMEN", par: 72, slope: 140, courseRating: 78.8 },
      { externalTeeId: "usga-7302-499872", name: "Regular (Women)", gender: "WOMEN", par: 73, slope: 132, courseRating: 74.8 },
      { externalTeeId: "usga-7302-177358", name: "Forward (Women)", gender: "WOMEN", par: 73, slope: 122, courseRating: 70.3 }
    ]
  },
  {
    externalCourseId: "usga-ncrdb-7281",
    name: "Jackson Park",
    city: "Chicago",
    state: "IL",
    sourceUrl: "https://ncrdb.usga.org/courseTeeInfo?CourseID=7281",
    tees: [
      { externalTeeId: "usga-7281-753649", name: "Blue", gender: "MEN", par: 70, slope: 106, courseRating: 65.7 },
      { externalTeeId: "usga-7281-544516", name: "White", gender: "MEN", par: 70, slope: 104, courseRating: 64.9 },
      { externalTeeId: "usga-7281-753655", name: "Red", gender: "MEN", par: 70, slope: 98, courseRating: 62.9 },
      { externalTeeId: "usga-7281-544517", name: "Blue (Women)", gender: "WOMEN", par: 70, slope: 114, courseRating: 70.6 },
      { externalTeeId: "usga-7281-544518", name: "White (Women)", gender: "WOMEN", par: 70, slope: 112, courseRating: 69.8 },
      { externalTeeId: "usga-7281-544519", name: "Red (Women)", gender: "WOMEN", par: 70, slope: 107, courseRating: 67.4 }
    ]
  },
  {
    externalCourseId: "usga-ncrdb-7739",
    name: "Briarwood Country Club",
    city: "Deerfield",
    state: "IL",
    sourceUrl: "https://ncrdb.usga.org/courseTeeInfo?CourseID=7739",
    tees: [
      { externalTeeId: "usga-7739-723082", name: "I", gender: "MEN", par: 71, slope: 136, courseRating: 73.8 },
      { externalTeeId: "usga-7739-723090", name: "I / II", gender: "MEN", par: 71, slope: 134, courseRating: 72.8 },
      { externalTeeId: "usga-7739-723083", name: "II", gender: "MEN", par: 71, slope: 132, courseRating: 72 },
      { externalTeeId: "usga-7739-724839", name: "II / III", gender: "MEN", par: 71, slope: 129, courseRating: 70.6 },
      { externalTeeId: "usga-7739-723084", name: "III", gender: "MEN", par: 71, slope: 126, courseRating: 69.2 },
      { externalTeeId: "usga-7739-723092", name: "IV", gender: "MEN", par: 71, slope: 122, courseRating: 67.5 },
      { externalTeeId: "usga-7739-775425", name: "IV / V", gender: "MEN", par: 71, slope: 120, courseRating: 66.7 },
      { externalTeeId: "usga-7739-723086", name: "V", gender: "MEN", par: 71, slope: 117, courseRating: 65.5 },
      { externalTeeId: "usga-7739-913374", name: "II (Women)", gender: "WOMEN", par: 72, slope: 142, courseRating: 78.2 },
      { externalTeeId: "usga-7739-723089", name: "II / III (Women)", gender: "WOMEN", par: 72, slope: 138, courseRating: 76.7 },
      { externalTeeId: "usga-7739-723093", name: "III (Women)", gender: "WOMEN", par: 72, slope: 134, courseRating: 75 },
      { externalTeeId: "usga-7739-723088", name: "IV (Women)", gender: "WOMEN", par: 72, slope: 130, courseRating: 72.9 },
      { externalTeeId: "usga-7739-724857", name: "IV / V (Women)", gender: "WOMEN", par: 72, slope: 128, courseRating: 71.9 },
      { externalTeeId: "usga-7739-723087", name: "V (Women)", gender: "WOMEN", par: 72, slope: 125, courseRating: 70.4 }
    ]
  },
  {
    externalCourseId: "usga-ncrdb-7412",
    name: "Deerfield Golf Club",
    city: "Deerfield",
    state: "IL",
    sourceUrl: "https://ncrdb.usga.org/courseTeeInfo?CourseID=7412",
    tees: [
      { externalTeeId: "usga-7412-267313", name: "Black", gender: "MEN", par: 72, slope: 131, courseRating: 72.7 },
      { externalTeeId: "usga-7412-832905", name: "Gold", gender: "MEN", par: 72, slope: 128, courseRating: 71.5 },
      { externalTeeId: "usga-7412-267314", name: "Blue", gender: "MEN", par: 72, slope: 123, courseRating: 69.3 },
      { externalTeeId: "usga-7412-499223", name: "Silver", gender: "MEN", par: 72, slope: 118, courseRating: 67.3 },
      { externalTeeId: "usga-7412-710797", name: "Green", gender: "MEN", par: 72, slope: 114, courseRating: 65.5 },
      { externalTeeId: "usga-7412-527971", name: "Bronze", gender: "MEN", par: 72, slope: 111, courseRating: 64.2 },
      { externalTeeId: "usga-7412-832948", name: "Gold (Women)", gender: "WOMEN", par: 72, slope: 138, courseRating: 78 },
      { externalTeeId: "usga-7412-546573", name: "Blue (Women)", gender: "WOMEN", par: 72, slope: 132, courseRating: 75.3 },
      { externalTeeId: "usga-7412-546572", name: "Silver (Women)", gender: "WOMEN", par: 72, slope: 127, courseRating: 72.9 },
      { externalTeeId: "usga-7412-710799", name: "Green (Women)", gender: "WOMEN", par: 72, slope: 122, courseRating: 70.7 },
      { externalTeeId: "usga-7412-546571", name: "Bronze (Women)", gender: "WOMEN", par: 72, slope: 119, courseRating: 69.1 }
    ]
  },
  {
    externalCourseId: "usga-ncrdb-7344",
    name: "Glencoe Golf Club",
    city: "Glencoe",
    state: "IL",
    sourceUrl: "https://ncrdb.usga.org/courseTeeInfo?CourseID=7344",
    tees: [
      { externalTeeId: "usga-7344-276882", name: "Blue", gender: "MEN", par: 72, slope: 133, courseRating: 72.3 },
      { externalTeeId: "usga-7344-177526", name: "White", gender: "MEN", par: 72, slope: 129, courseRating: 70.7 },
      { externalTeeId: "usga-7344-276883", name: "Silver", gender: "MEN", par: 72, slope: 127, courseRating: 69.7 },
      { externalTeeId: "usga-7344-499794", name: "Red", gender: "MEN", par: 72, slope: 124, courseRating: 68.3 },
      { externalTeeId: "usga-7344-499789", name: "White (Women)", gender: "WOMEN", par: 73, slope: 137, courseRating: 76.2 },
      { externalTeeId: "usga-7344-276884", name: "Silver (Women)", gender: "WOMEN", par: 73, slope: 135, courseRating: 75 },
      { externalTeeId: "usga-7344-177527", name: "Red (Women)", gender: "WOMEN", par: 73, slope: 131, courseRating: 73.2 }
    ]
  },
  {
    externalCourseId: "usga-ncrdb-7623",
    name: "Lake Shore Country Club",
    city: "Glencoe",
    state: "IL",
    sourceUrl: "https://ncrdb.usga.org/courseTeeInfo?CourseID=7623",
    tees: [
      { externalTeeId: "usga-7623-547732", name: "Yellow", gender: "MEN", par: 71, slope: 139, courseRating: 74 },
      { externalTeeId: "usga-7623-954132", name: "Yellow/Black", gender: "MEN", par: 71, slope: 137, courseRating: 73.2 },
      { externalTeeId: "usga-7623-500551", name: "Black", gender: "MEN", par: 71, slope: 135, courseRating: 72.4 },
      { externalTeeId: "usga-7623-548356", name: "Black/Blue", gender: "MEN", par: 71, slope: 132, courseRating: 71.2 },
      { externalTeeId: "usga-7623-281584", name: "Blue", gender: "MEN", par: 71, slope: 130, courseRating: 70.4 },
      { externalTeeId: "usga-7623-548357", name: "Blue/White", gender: "MEN", par: 71, slope: 125, courseRating: 68.6 },
      { externalTeeId: "usga-7623-281583", name: "White", gender: "MEN", par: 71, slope: 122, courseRating: 67.4 },
      { externalTeeId: "usga-7623-741786", name: "Green", gender: "MEN", par: 71, slope: 112, courseRating: 63.4 },
      { externalTeeId: "usga-7623-918603", name: "Black (Women)", gender: "WOMEN", par: 72, slope: 141, courseRating: 78.3 },
      { externalTeeId: "usga-7623-743163", name: "Blue (Women)", gender: "WOMEN", par: 74, slope: 138, courseRating: 76.1 },
      { externalTeeId: "usga-7623-548368", name: "Blue/White (Women)", gender: "WOMEN", par: 74, slope: 133, courseRating: 74 },
      { externalTeeId: "usga-7623-281581", name: "White (Women)", gender: "WOMEN", par: 74, slope: 130, courseRating: 72.5 },
      { externalTeeId: "usga-7623-548367", name: "White/Green (Women)", gender: "WOMEN", par: 74, slope: 125, courseRating: 69.9 },
      { externalTeeId: "usga-7623-705694", name: "Green (Women)", gender: "WOMEN", par: 74, slope: 120, courseRating: 67.6 }
    ]
  },
  {
    externalCourseId: "usga-ncrdb-7409",
    name: "Cog Hill Golf & Country Club - 1",
    city: "Lemont",
    state: "IL",
    sourceUrl: "https://ncrdb.usga.org/courseTeeInfo?CourseID=7409",
    tees: [
      { externalTeeId: "usga-7409-527310", name: "Black", gender: "MEN", par: 71, slope: 120, courseRating: 69.8 },
      { externalTeeId: "usga-7409-527312", name: "Blue", gender: "MEN", par: 71, slope: 118, courseRating: 68.8 },
      { externalTeeId: "usga-7409-527313", name: "White", gender: "MEN", par: 71, slope: 115, courseRating: 67.6 },
      { externalTeeId: "usga-7409-527315", name: "Green", gender: "MEN", par: 71, slope: 110, courseRating: 65.7 },
      { externalTeeId: "usga-7409-644119", name: "Forward", gender: "MEN", par: 71, slope: 100, courseRating: 61.6 },
      { externalTeeId: "usga-7409-595691", name: "Black (Women)", gender: "WOMEN", par: 71, slope: 133, courseRating: 75.8 },
      { externalTeeId: "usga-7409-595688", name: "Blue (Women)", gender: "WOMEN", par: 71, slope: 130, courseRating: 74.2 },
      { externalTeeId: "usga-7409-595687", name: "White (Women)", gender: "WOMEN", par: 71, slope: 127, courseRating: 72.8 },
      { externalTeeId: "usga-7409-595685", name: "Green (Women)", gender: "WOMEN", par: 71, slope: 122, courseRating: 70.5 },
      { externalTeeId: "usga-7409-644098", name: "Forward (Women)", gender: "WOMEN", par: 71, slope: 111, courseRating: 65.5 }
    ]
  },
  {
    externalCourseId: "usga-ncrdb-7641",
    name: "Cog Hill Golf & Country Club - 2",
    city: "Lemont",
    state: "IL",
    sourceUrl: "https://ncrdb.usga.org/courseTeeInfo?CourseID=7641",
    tees: [
      { externalTeeId: "usga-7641-606333", name: "Black", gender: "MEN", par: 72, slope: 127, courseRating: 72.7 },
      { externalTeeId: "usga-7641-606332", name: "Blue", gender: "MEN", par: 72, slope: 124, courseRating: 71.3 },
      { externalTeeId: "usga-7641-178160", name: "White", gender: "MEN", par: 72, slope: 121, courseRating: 70 },
      { externalTeeId: "usga-7641-792883", name: "Green", gender: "MEN", par: 72, slope: 115, courseRating: 67.6 },
      { externalTeeId: "usga-7641-651259", name: "Forward", gender: "MEN", par: 72, slope: 109, courseRating: 65.1 },
      { externalTeeId: "usga-7641-606364", name: "Blue (Women)", gender: "WOMEN", par: 73, slope: 135, courseRating: 77.5 },
      { externalTeeId: "usga-7641-606359", name: "White (Women)", gender: "WOMEN", par: 73, slope: 131, courseRating: 75.9 },
      { externalTeeId: "usga-7641-792880", name: "Green (Women)", gender: "WOMEN", par: 72, slope: 125, courseRating: 73 },
      { externalTeeId: "usga-7641-805056", name: "Green/Forward (Women)", gender: "WOMEN", par: 72, slope: 121, courseRating: 71.4 },
      { externalTeeId: "usga-7641-651258", name: "Forward (Women)", gender: "WOMEN", par: 72, slope: 118, courseRating: 69.9 }
    ]
  },
  {
    externalCourseId: "usga-ncrdb-7410",
    name: "Cog Hill Golf & Country Club - 3",
    city: "Lemont",
    state: "IL",
    sourceUrl: "https://ncrdb.usga.org/courseTeeInfo?CourseID=7410",
    tees: [
      { externalTeeId: "usga-7410-527336", name: "Black", gender: "MEN", par: 72, slope: 122, courseRating: 70.1 },
      { externalTeeId: "usga-7410-527337", name: "Blue", gender: "MEN", par: 72, slope: 119, courseRating: 69 },
      { externalTeeId: "usga-7410-527338", name: "White", gender: "MEN", par: 72, slope: 116, courseRating: 67.8 },
      { externalTeeId: "usga-7410-527340", name: "Green", gender: "MEN", par: 72, slope: 109, courseRating: 64.8 },
      { externalTeeId: "usga-7410-527330", name: "Forward", gender: "MEN", par: 72, slope: 102, courseRating: 61.7 },
      { externalTeeId: "usga-7410-527344", name: "Black (Women)", gender: "WOMEN", par: 72, slope: 129, courseRating: 76.2 },
      { externalTeeId: "usga-7410-527345", name: "Blue (Women)", gender: "WOMEN", par: 72, slope: 126, courseRating: 74.9 },
      { externalTeeId: "usga-7410-527346", name: "White (Women)", gender: "WOMEN", par: 72, slope: 123, courseRating: 73.4 },
      { externalTeeId: "usga-7410-527347", name: "Green (Women)", gender: "WOMEN", par: 72, slope: 115, courseRating: 69.5 },
      { externalTeeId: "usga-7410-527335", name: "Forward (Women)", gender: "WOMEN", par: 72, slope: 107, courseRating: 65.7 }
    ]
  },
  {
    externalCourseId: "usga-ncrdb-7343",
    name: "Cog Hill Golf & Country Club - 4",
    city: "Lemont",
    state: "IL",
    sourceUrl: "https://ncrdb.usga.org/courseTeeInfo?CourseID=7343",
    tees: [
      { externalTeeId: "usga-7343-498186", name: "Black", gender: "MEN", par: 72, slope: 153, courseRating: 78 },
      { externalTeeId: "usga-7343-277973", name: "Gold", gender: "MEN", par: 72, slope: 146, courseRating: 76 },
      { externalTeeId: "usga-7343-177524", name: "Blue", gender: "MEN", par: 72, slope: 140, courseRating: 74.2 },
      { externalTeeId: "usga-7343-498209", name: "Combo", gender: "MEN", par: 72, slope: 138, courseRating: 73.2 },
      { externalTeeId: "usga-7343-277974", name: "White", gender: "MEN", par: 72, slope: 136, courseRating: 72.2 },
      { externalTeeId: "usga-7343-277975", name: "Green", gender: "MEN", par: 72, slope: 132, courseRating: 70.6 },
      { externalTeeId: "usga-7343-498198", name: "Forward", gender: "MEN", par: 72, slope: 124, courseRating: 67.4 },
      { externalTeeId: "usga-7343-597386", name: "Blue (Women)", gender: "WOMEN", par: 72, slope: 150, courseRating: 80.6 },
      { externalTeeId: "usga-7343-597383", name: "Combo (Women)", gender: "WOMEN", par: 72, slope: 148, courseRating: 79.6 },
      { externalTeeId: "usga-7343-277979", name: "White (Women)", gender: "WOMEN", par: 72, slope: 146, courseRating: 78.6 },
      { externalTeeId: "usga-7343-277978", name: "Green (Women)", gender: "WOMEN", par: 72, slope: 142, courseRating: 76.6 },
      { externalTeeId: "usga-7343-177525", name: "Forward (Women)", gender: "WOMEN", par: 72, slope: 134, courseRating: 72.6 }
    ]
  },
  {
    externalCourseId: "usga-ncrdb-7680",
    name: "Medinah Country Club - #1",
    city: "Medinah",
    state: "IL",
    sourceUrl: "https://ncrdb.usga.org/courseTeeInfo?CourseID=7680",
    tees: [
      { externalTeeId: "usga-7680-253222", name: "Gold", gender: "MEN", par: 71, slope: 138, courseRating: 73.5 },
      { externalTeeId: "usga-7680-825088", name: "Silver", gender: "MEN", par: 71, slope: 136, courseRating: 72.5 },
      { externalTeeId: "usga-7680-825103", name: "Silver/White", gender: "MEN", par: 71, slope: 133, courseRating: 71.1 },
      { externalTeeId: "usga-7680-825096", name: "White", gender: "MEN", par: 71, slope: 131, courseRating: 70.4 },
      { externalTeeId: "usga-7680-254623", name: "Green", gender: "MEN", par: 71, slope: 123, courseRating: 67.1 },
      { externalTeeId: "usga-7680-868355", name: "Gold (Women)", gender: "WOMEN", par: 72, slope: 148, courseRating: 80.4 },
      { externalTeeId: "usga-7680-825121", name: "Silver (Women)", gender: "WOMEN", par: 72, slope: 145, courseRating: 79.1 },
      { externalTeeId: "usga-7680-825105", name: "Silver/White (Women)", gender: "WOMEN", par: 72, slope: 141, courseRating: 77.4 },
      { externalTeeId: "usga-7680-825102", name: "White (Women)", gender: "WOMEN", par: 72, slope: 139, courseRating: 76.6 },
      { externalTeeId: "usga-7680-253224", name: "Green (Women)", gender: "WOMEN", par: 72, slope: 131, courseRating: 72.6 }
    ]
  },
  {
    externalCourseId: "usga-ncrdb-7595",
    name: "Medinah Country Club - #2",
    city: "Medinah",
    state: "IL",
    sourceUrl: "https://ncrdb.usga.org/courseTeeInfo?CourseID=7595",
    tees: [
      { externalTeeId: "usga-7595-295919", name: "Gold", gender: "MEN", par: 72, slope: 126, courseRating: 70.6 },
      { externalTeeId: "usga-7595-209822", name: "Silver", gender: "MEN", par: 72, slope: 124, courseRating: 69.8 },
      { externalTeeId: "usga-7595-295924", name: "White", gender: "MEN", par: 72, slope: 120, courseRating: 68.2 },
      { externalTeeId: "usga-7595-868694", name: "Green/White Combo", gender: "MEN", par: 72, slope: 116, courseRating: 66.7 },
      { externalTeeId: "usga-7595-501599", name: "Green", gender: "MEN", par: 72, slope: 113, courseRating: 65.3 },
      { externalTeeId: "usga-7595-868396", name: "Gold (Women)", gender: "WOMEN", par: 72, slope: 134, courseRating: 76.4 },
      { externalTeeId: "usga-7595-620305", name: "Silver (Women)", gender: "WOMEN", par: 72, slope: 132, courseRating: 75.4 },
      { externalTeeId: "usga-7595-299364", name: "White (Women)", gender: "WOMEN", par: 72, slope: 128, courseRating: 73.4 },
      { externalTeeId: "usga-7595-621343", name: "Green/White Combo (Women)", gender: "WOMEN", par: 72, slope: 123, courseRating: 71.4 },
      { externalTeeId: "usga-7595-209823", name: "Green (Women)", gender: "WOMEN", par: 72, slope: 120, courseRating: 69.8 }
    ]
  },
  {
    externalCourseId: "usga-ncrdb-7677",
    name: "Medinah Country Club - #3",
    city: "Medinah",
    state: "IL",
    sourceUrl: "https://ncrdb.usga.org/courseTeeInfo?CourseID=7677",
    tees: [
      { externalTeeId: "usga-7677-184350", name: "Gold", gender: "MEN", par: 72, slope: 143, courseRating: 76.8 },
      { externalTeeId: "usga-7677-810935", name: "Silver", gender: "MEN", par: 72, slope: 138, courseRating: 74.6 },
      { externalTeeId: "usga-7677-826225", name: "Silver/White", gender: "MEN", par: 72, slope: 134, courseRating: 73 },
      { externalTeeId: "usga-7677-810934", name: "White", gender: "MEN", par: 72, slope: 132, courseRating: 72.3 },
      { externalTeeId: "usga-7677-810938", name: "White/Green", gender: "MEN", par: 72, slope: 126, courseRating: 69.8 },
      { externalTeeId: "usga-7677-501617", name: "Green", gender: "MEN", par: 72, slope: 119, courseRating: 67 },
      { externalTeeId: "usga-7677-868364", name: "Silver (Women)", gender: "WOMEN", par: 72, slope: 154, courseRating: 80.6 },
      { externalTeeId: "usga-7677-868369", name: "Silver/White (Women)", gender: "WOMEN", par: 72, slope: 150, courseRating: 78.7 },
      { externalTeeId: "usga-7677-811003", name: "White (Women)", gender: "WOMEN", par: 72, slope: 148, courseRating: 77.8 },
      { externalTeeId: "usga-7677-811002", name: "White/Green (Women)", gender: "WOMEN", par: 72, slope: 141, courseRating: 74.7 },
      { externalTeeId: "usga-7677-810980", name: "Green (Women)", gender: "WOMEN", par: 72, slope: 134, courseRating: 71.4 }
    ]
  },
  {
    externalCourseId: "usga-ncrdb-7509",
    name: "Traditions at Chevy Chase",
    city: "Wheeling",
    state: "IL",
    sourceUrl: "https://ncrdb.usga.org/courseTeeInfo?CourseID=7509",
    tees: [
      { externalTeeId: "usga-7509-247847", name: "Midnight", gender: "MEN", par: 72, slope: 132, courseRating: 72.1 },
      { externalTeeId: "usga-7509-177898", name: "Burnt Red", gender: "MEN", par: 72, slope: 126, courseRating: 69.4 },
      { externalTeeId: "usga-7509-665248", name: "Hunter Green", gender: "MEN", par: 72, slope: 121, courseRating: 67.4 },
      { externalTeeId: "usga-7509-710508", name: "Natural", gender: "MEN", par: 72, slope: 115, courseRating: 64.8 },
      { externalTeeId: "usga-7509-915559", name: "Midnight (Women)", gender: "WOMEN", par: 72, slope: 140, courseRating: 78.1 },
      { externalTeeId: "usga-7509-752564", name: "Burnt Red (Women)", gender: "WOMEN", par: 72, slope: 132, courseRating: 74.9 },
      { externalTeeId: "usga-7509-247848", name: "Hunter Green (Women)", gender: "WOMEN", par: 72, slope: 127, courseRating: 72.4 },
      { externalTeeId: "usga-7509-177899", name: "Natural (Women)", gender: "WOMEN", par: 72, slope: 120, courseRating: 69.3 }
    ]
  },
  {
    externalCourseId: "usga-ncrdb-7447",
    name: "Arboretum Club",
    city: "Buffalo Grove",
    state: "IL",
    sourceUrl: "https://ncrdb.usga.org/courseTeeInfo?CourseID=7447",
    tees: [
      { externalTeeId: "usga-7447-258170", name: "Champ", gender: "MEN", par: 72, slope: 138, courseRating: 71.6 },
      { externalTeeId: "usga-7447-177762", name: "Blue", gender: "MEN", par: 72, slope: 134, courseRating: 69.9 },
      { externalTeeId: "usga-7447-604143", name: "Silver", gender: "MEN", par: 72, slope: 127, courseRating: 67.1 },
      { externalTeeId: "usga-7447-707616", name: "Red", gender: "MEN", par: 72, slope: 121, courseRating: 64.5 },
      { externalTeeId: "usga-7447-888701", name: "Champ (Women)", gender: "WOMEN", par: 72, slope: 144, courseRating: 78.6 },
      { externalTeeId: "usga-7447-490819", name: "Blue (Women)", gender: "WOMEN", par: 72, slope: 140, courseRating: 76.6 },
      { externalTeeId: "usga-7447-604145", name: "Silver (Women)", gender: "WOMEN", par: 72, slope: 133, courseRating: 73.2 },
      { externalTeeId: "usga-7447-177763", name: "Red (Women)", gender: "WOMEN", par: 72, slope: 126, courseRating: 70.1 }
    ]
  }
];

function dedupeCourseResults(courses: CourseLookupResult[]) {
  const seenExternalIds = new Set<string>();
  const seenPlaces = new Set<string>();

  return courses.filter((course) => {
    const externalId = normalize(course.externalCourseId);
    const place = normalize([course.name, course.city, course.state].filter(Boolean).join(" "));

    if (seenExternalIds.has(externalId) || seenPlaces.has(place)) {
      return false;
    }

    seenExternalIds.add(externalId);
    seenPlaces.add(place);
    return true;
  });
}

const CURATED_COURSES: CourseLookupResult[] = dedupeCourseResults([
  {
    externalCourseId: "bryn-mawr-country-club-il",
    provider: "curated-chicagoland",
    name: "Bryn Mawr Country Club",
    city: "Lincolnwood",
    state: "IL",
    tees: [
      { externalTeeId: "bryn-mawr-langford-men", name: "Langford", gender: "MEN", par: 72, slope: 130, courseRating: 72.4, holes: BRYN_MAWR_HOLES },
      { externalTeeId: "bryn-mawr-i-men", name: "I", gender: "MEN", par: 72, slope: 125, courseRating: 70.5, holes: BRYN_MAWR_HOLES },
      { externalTeeId: "bryn-mawr-ii-men", name: "II", gender: "MEN", par: 72, slope: 119, courseRating: 67.9, holes: BRYN_MAWR_HOLES },
      { externalTeeId: "bryn-mawr-iii-men", name: "III", gender: "MEN", par: 72, slope: 112, courseRating: 65.1, holes: BRYN_MAWR_HOLES },
      { externalTeeId: "bryn-mawr-iv-men", name: "IV", gender: "MEN", par: 72, slope: 103, courseRating: 61.4, holes: BRYN_MAWR_HOLES },
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
  {
    externalCourseId: "sunset-valley-golf-club-highland-park-il",
    provider: "curated-chicagoland",
    name: "Sunset Valley Golf Club",
    city: "Highland Park",
    state: "IL",
    tees: [
      { externalTeeId: "sunset-valley-black-men", name: "Black", gender: "MEN", par: 72, slope: 134, courseRating: 72.2, holes: SUNSET_VALLEY_HOLES },
      { externalTeeId: "sunset-valley-gray-men", name: "Gray", gender: "MEN", par: 72, slope: 132, courseRating: 71.5, holes: SUNSET_VALLEY_HOLES },
      { externalTeeId: "sunset-valley-blue-men", name: "Blue", gender: "MEN", par: 72, slope: 130, courseRating: 70.7, holes: SUNSET_VALLEY_HOLES },
      { externalTeeId: "sunset-valley-teal-men", name: "Teal", gender: "MEN", par: 72, slope: 128, courseRating: 69.7, holes: SUNSET_VALLEY_HOLES },
      { externalTeeId: "sunset-valley-white-men", name: "White", gender: "MEN", par: 72, slope: 126, courseRating: 68.9, holes: SUNSET_VALLEY_HOLES },
      { externalTeeId: "sunset-valley-coral-men", name: "Coral", gender: "MEN", par: 72, slope: 121, courseRating: 67.5, holes: SUNSET_VALLEY_HOLES },
      { externalTeeId: "sunset-valley-red-men", name: "Red", gender: "MEN", par: 72, slope: 120, courseRating: 66.3, holes: SUNSET_VALLEY_HOLES },
      { externalTeeId: "sunset-valley-orange-men", name: "Orange", gender: "MEN", par: 72, slope: 115, courseRating: 65.1, holes: SUNSET_VALLEY_HOLES },
      { externalTeeId: "sunset-valley-gray-women", name: "Gray (Women)", gender: "WOMEN", par: 72, slope: 141, courseRating: 77.8, holes: SUNSET_VALLEY_HOLES },
      { externalTeeId: "sunset-valley-blue-women", name: "Blue (Women)", gender: "WOMEN", par: 72, slope: 139, courseRating: 76.8, holes: SUNSET_VALLEY_HOLES },
      { externalTeeId: "sunset-valley-teal-women", name: "Teal (Women)", gender: "WOMEN", par: 72, slope: 137, courseRating: 75.7, holes: SUNSET_VALLEY_HOLES },
      { externalTeeId: "sunset-valley-white-women", name: "White (Women)", gender: "WOMEN", par: 72, slope: 135, courseRating: 74.6, holes: SUNSET_VALLEY_HOLES },
      { externalTeeId: "sunset-valley-coral-women", name: "Coral (Women)", gender: "WOMEN", par: 72, slope: 131, courseRating: 72.8, holes: SUNSET_VALLEY_HOLES },
      { externalTeeId: "sunset-valley-red-women", name: "Red (Women)", gender: "WOMEN", par: 72, slope: 128, courseRating: 71.4, holes: SUNSET_VALLEY_HOLES },
      { externalTeeId: "sunset-valley-orange-women", name: "Orange (Women)", gender: "WOMEN", par: 72, slope: 125, courseRating: 70, holes: SUNSET_VALLEY_HOLES },
      { externalTeeId: "sunset-valley-gold-women", name: "Gold", gender: "WOMEN", par: 72, slope: 122, courseRating: 68.7, holes: SUNSET_VALLEY_HOLES }
    ],
    raw: {
      source: "USGA course rating table"
    }
  },
  buildNorthmoorCourse("northmoor-country-club-blue-red-il", "Blue/Red", "blue", "red", {
    "black-men": { courseRating: 73.6, slope: 132 },
    "black-blue-men": { courseRating: 72.5, slope: 129 },
    "blue-men": { courseRating: 71.6, slope: 127 },
    "blue-white-men": { courseRating: 70.1, slope: 123 },
    "white-men": { courseRating: 68.6, slope: 119 },
    "white-yellow-men": { courseRating: 66.8, slope: 115 },
    "yellow-men": { courseRating: 65.5, slope: 112 },
    "white-women": { courseRating: 73.3, slope: 133 },
    "white-yellow-women": { courseRating: 71, slope: 128 },
    "yellow-women": { courseRating: 69.4, slope: 124 }
  }),
  buildNorthmoorCourse("northmoor-country-club-red-white-il", "Red/White", "red", "white", {
    "black-men": { courseRating: 74, slope: 136 },
    "black-blue-men": { courseRating: 72.8, slope: 133 },
    "blue-men": { courseRating: 72.1, slope: 132 },
    "blue-white-men": { courseRating: 70.6, slope: 129 },
    "white-men": { courseRating: 69.2, slope: 126 },
    "white-yellow-men": { courseRating: 67.5, slope: 122, par: 71 },
    "yellow-men": { courseRating: 65.8, slope: 118 },
    "white-women": { courseRating: 74.9, slope: 137 },
    "white-yellow-women": { courseRating: 72.7, slope: 132 },
    "yellow-women": { courseRating: 70.5, slope: 127 }
  }),
  buildNorthmoorCourse("northmoor-country-club-white-blue-il", "White/Blue", "white", "blue", {
    "black-men": { courseRating: 72.6, slope: 135 },
    "black-blue-men": { courseRating: 71.9, slope: 134 },
    "blue-men": { courseRating: 71.3, slope: 133 },
    "blue-white-men": { courseRating: 70.1, slope: 129 },
    "white-men": { courseRating: 68.4, slope: 126 },
    "white-yellow-men": { courseRating: 66.7, slope: 122 },
    "yellow-men": { courseRating: 65.1, slope: 118 },
    "white-women": { courseRating: 73.4, slope: 135 },
    "white-yellow-women": { courseRating: 71.3, slope: 133 },
    "yellow-women": { courseRating: 69.3, slope: 128 }
  }),
  ...USGA_NCRDB_CURATED_COURSES.map(buildUsgaCuratedCourse),
  ...USGA_NCRDB_GENERATED_COURSES.map(buildUsgaCuratedCourse)
]);

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
