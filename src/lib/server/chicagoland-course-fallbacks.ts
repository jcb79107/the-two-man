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
  }
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
