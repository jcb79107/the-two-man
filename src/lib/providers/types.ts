export interface HandicapLookupResult {
  ghinNumber: string;
  handicapIndex: number;
  effectiveAt: string;
  raw?: Record<string, unknown>;
}

export interface CourseLookupQuery {
  name: string;
  state?: string;
}

export interface CourseLookupHole {
  holeNumber: number;
  par: number;
  strokeIndex: number;
  yardage?: number;
}

export interface CourseLookupTee {
  externalTeeId: string;
  name: string;
  gender: "MEN" | "WOMEN" | "OPEN";
  par: number;
  slope: number;
  courseRating: number;
  holes?: CourseLookupHole[];
}

export interface CourseLookupResult {
  externalCourseId: string;
  provider: string;
  name: string;
  city?: string | null;
  state?: string | null;
  tees: CourseLookupTee[];
  raw?: Record<string, unknown>;
}

export interface HandicapProvider {
  getCurrentHandicapIndex(ghinNumber: string): Promise<HandicapLookupResult>;
}

export interface CourseDirectoryProvider {
  searchCourses(query: CourseLookupQuery): Promise<CourseLookupResult[]>;
}
