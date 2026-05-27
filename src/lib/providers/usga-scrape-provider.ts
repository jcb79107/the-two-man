import "server-only";

import type {
  CourseDirectoryProvider,
  CourseLookupQuery,
  CourseLookupResult,
  HandicapLookupResult,
  HandicapProvider
} from "@/lib/providers/types";
import { searchUsgaNcrdbCourses } from "@/lib/providers/usga-ncrdb-client";

// TODO: Replace this scrape-backed implementation with an official provider if/when available.
// Assumption: the user has permission to use the existing USGA NCRDB course lookup workflow.

export class UsgaScrapeCourseDirectoryProvider implements CourseDirectoryProvider {
  async searchCourses(query: CourseLookupQuery): Promise<CourseLookupResult[]> {
    return searchUsgaNcrdbCourses(query);
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
