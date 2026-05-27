import { describe, expect, it, vi } from "vitest";
import { searchCuratedChicagolandCourses } from "@/lib/server/chicagoland-course-fallbacks";

vi.mock("server-only", () => ({}));

function summarizeNorthmoor(label: string) {
  const course = searchCuratedChicagolandCourses({ name: `Northmoor ${label}`, state: "IL" }).find(
    (candidate) => candidate.name === `Northmoor Country Club - ${label}`
  );

  if (!course) {
    throw new Error(`Missing Northmoor ${label}`);
  }

  return {
    tees: course.tees.map((tee) => ({
      name: tee.name,
      gender: tee.gender,
      par: tee.par,
      courseRating: tee.courseRating,
      slope: tee.slope,
      holeCount: tee.holes?.length ?? 0
    }))
  };
}

function findCourse(name: string, queryName = name, state = "IL") {
  const course = searchCuratedChicagolandCourses({ name: queryName, state }).find(
    (candidate) => candidate.name === name
  );

  if (!course) {
    throw new Error(`Missing ${name}`);
  }

  return course;
}

function summarizeTee(
  courseName: string,
  teeName: string,
  gender: "MEN" | "WOMEN",
  queryName = courseName,
  state = "IL"
) {
  const course = findCourse(courseName, queryName, state);
  const tee = course.tees.find((candidate) => candidate.name === teeName && candidate.gender === gender);

  if (!tee) {
    throw new Error(`Missing ${courseName} ${teeName} ${gender}`);
  }

  return {
    par: tee.par,
    courseRating: tee.courseRating,
    slope: tee.slope,
    holeCount: tee.holes?.length ?? 0
  };
}

describe("curated course fallbacks", () => {
  it("stores all verified Northmoor Blue/Red tees", () => {
    const course = summarizeNorthmoor("Blue/Red");

    expect(course.tees).toEqual([
      { name: "Black", gender: "MEN", par: 71, courseRating: 73.6, slope: 132, holeCount: 18 },
      { name: "Black/Blue", gender: "MEN", par: 71, courseRating: 72.5, slope: 129, holeCount: 18 },
      { name: "Blue", gender: "MEN", par: 71, courseRating: 71.6, slope: 127, holeCount: 18 },
      { name: "Blue/White", gender: "MEN", par: 71, courseRating: 70.1, slope: 123, holeCount: 18 },
      { name: "White (Men)", gender: "MEN", par: 71, courseRating: 68.6, slope: 119, holeCount: 18 },
      { name: "White/Yellow (Men)", gender: "MEN", par: 71, courseRating: 66.8, slope: 115, holeCount: 18 },
      { name: "Yellow (Men)", gender: "MEN", par: 71, courseRating: 65.5, slope: 112, holeCount: 18 },
      { name: "White (Women)", gender: "WOMEN", par: 71, courseRating: 73.3, slope: 133, holeCount: 18 },
      { name: "White/Yellow (Women)", gender: "WOMEN", par: 71, courseRating: 71, slope: 128, holeCount: 18 },
      { name: "Yellow (Women)", gender: "WOMEN", par: 71, courseRating: 69.4, slope: 124, holeCount: 18 }
    ]);
  });

  it("stores all verified Northmoor Red/White tees", () => {
    const course = summarizeNorthmoor("Red/White");

    expect(course.tees).toEqual([
      { name: "Black", gender: "MEN", par: 72, courseRating: 74, slope: 136, holeCount: 18 },
      { name: "Black/Blue", gender: "MEN", par: 72, courseRating: 72.8, slope: 133, holeCount: 18 },
      { name: "Blue", gender: "MEN", par: 72, courseRating: 72.1, slope: 132, holeCount: 18 },
      { name: "Blue/White", gender: "MEN", par: 72, courseRating: 70.6, slope: 129, holeCount: 18 },
      { name: "White (Men)", gender: "MEN", par: 72, courseRating: 69.2, slope: 126, holeCount: 18 },
      { name: "White/Yellow (Men)", gender: "MEN", par: 71, courseRating: 67.5, slope: 122, holeCount: 18 },
      { name: "Yellow (Men)", gender: "MEN", par: 72, courseRating: 65.8, slope: 118, holeCount: 18 },
      { name: "White (Women)", gender: "WOMEN", par: 72, courseRating: 74.9, slope: 137, holeCount: 18 },
      { name: "White/Yellow (Women)", gender: "WOMEN", par: 72, courseRating: 72.7, slope: 132, holeCount: 18 },
      { name: "Yellow (Women)", gender: "WOMEN", par: 72, courseRating: 70.5, slope: 127, holeCount: 18 }
    ]);
  });

  it("stores all verified Northmoor White/Blue tees", () => {
    const course = summarizeNorthmoor("White/Blue");

    expect(course.tees).toEqual([
      { name: "Black", gender: "MEN", par: 71, courseRating: 72.6, slope: 135, holeCount: 18 },
      { name: "Black/Blue", gender: "MEN", par: 71, courseRating: 71.9, slope: 134, holeCount: 18 },
      { name: "Blue", gender: "MEN", par: 71, courseRating: 71.3, slope: 133, holeCount: 18 },
      { name: "Blue/White", gender: "MEN", par: 71, courseRating: 70.1, slope: 129, holeCount: 18 },
      { name: "White (Men)", gender: "MEN", par: 71, courseRating: 68.4, slope: 126, holeCount: 18 },
      { name: "White/Yellow (Men)", gender: "MEN", par: 71, courseRating: 66.7, slope: 122, holeCount: 18 },
      { name: "Yellow (Men)", gender: "MEN", par: 71, courseRating: 65.1, slope: 118, holeCount: 18 },
      { name: "White (Women)", gender: "WOMEN", par: 71, courseRating: 73.4, slope: 135, holeCount: 18 },
      { name: "White/Yellow (Women)", gender: "WOMEN", par: 71, courseRating: 71.3, slope: 133, holeCount: 18 },
      { name: "Yellow (Women)", gender: "WOMEN", par: 71, courseRating: 69.3, slope: 128, holeCount: 18 }
    ]);
  });

  it("stores the added USGA NCRDB course tee rating rows", () => {
    expect(summarizeTee("Beverly Country Club", "Championship", "MEN")).toEqual({
      par: 71,
      courseRating: 74.4,
      slope: 141,
      holeCount: 0
    });
    expect(summarizeTee("Harborside International - Port", "Championship", "MEN", "Harborside Port")).toEqual({
      par: 72,
      courseRating: 72.1,
      slope: 131,
      holeCount: 0
    });
    expect(findCourse("Harborside International - Port", "Harborside Port").city).toBe("Chicago");
    expect(summarizeTee("Harborside International - Starboard", "Tournament", "MEN", "Harborside Starboard")).toEqual({
      par: 72,
      courseRating: 74.5,
      slope: 134,
      holeCount: 0
    });
    expect(summarizeTee("Cog Hill Golf & Country Club - 4", "Black", "MEN", "Cog Hill 4")).toEqual({
      par: 72,
      courseRating: 78,
      slope: 153,
      holeCount: 0
    });
    expect(summarizeTee("Medinah Country Club - #3", "Gold", "MEN", "Medinah 3")).toEqual({
      par: 72,
      courseRating: 76.8,
      slope: 143,
      holeCount: 0
    });
  });

  it("stores one Jackson Park fallback even though the source list contained a duplicate URL", () => {
    const results = searchCuratedChicagolandCourses({ name: "Jackson Park", state: "IL" }).filter(
      (candidate) => candidate.name === "Jackson Park"
    );

    expect(results).toHaveLength(1);
    expect(summarizeTee("Jackson Park", "Blue", "MEN")).toEqual({
      par: 70,
      courseRating: 65.7,
      slope: 106,
      holeCount: 0
    });
  });

  it("stores the remaining Chicagoland USGA course fallbacks", () => {
    expect(findCourse("Briarwood Country Club").tees).toHaveLength(14);
    expect(findCourse("Deerfield Golf Club").tees).toHaveLength(11);
    expect(findCourse("Glencoe Golf Club").tees).toHaveLength(7);
    expect(findCourse("Lake Shore Country Club").tees).toHaveLength(14);
    expect(findCourse("Cog Hill Golf & Country Club - 1", "Cog Hill 1").tees).toHaveLength(10);
    expect(findCourse("Cog Hill Golf & Country Club - 2", "Cog Hill 2").tees).toHaveLength(10);
    expect(findCourse("Cog Hill Golf & Country Club - 3", "Cog Hill 3").tees).toHaveLength(10);
    expect(findCourse("Medinah Country Club - #1", "Medinah 1").tees).toHaveLength(10);
    expect(findCourse("Medinah Country Club - #2", "Medinah 2").tees).toHaveLength(10);
    expect(findCourse("Traditions at Chevy Chase").tees).toHaveLength(8);
    expect(findCourse("Arboretum Club").tees).toHaveLength(8);
  });

  it("loads the generated NCRListing priority enrichment file", () => {
    expect(summarizeTee("Skokie Country Club", "Black", "MEN")).toEqual({
      par: 71,
      courseRating: 74.4,
      slope: 141,
      holeCount: 0
    });
    expect(summarizeTee("The Glen Club", "Gold", "MEN")).toEqual({
      par: 72,
      courseRating: 75.1,
      slope: 143,
      holeCount: 0
    });
    expect(summarizeTee("Schaumburg Golf Club - Tournament/Players", "Black", "MEN", "Schaumburg")).toEqual({
      par: 71,
      courseRating: 70.3,
      slope: 128,
      holeCount: 0
    });
  });

  it("loads the generated Lake and Cook county NCRListing enrichment file", () => {
    expect(summarizeTee("Coyote Run Golf Club", "Blue", "MEN")).toEqual({
      par: 71,
      courseRating: 69.6,
      slope: 124,
      holeCount: 0
    });
    expect(summarizeTee("Thunderhawk Golf Club", "Black", "MEN")).toEqual({
      par: 72,
      courseRating: 74.6,
      slope: 143,
      holeCount: 0
    });
    expect(summarizeTee("George Dunne National", "Gold", "MEN")).toEqual({
      par: 72,
      courseRating: 75.9,
      slope: 144,
      holeCount: 0
    });
    expect(summarizeTee("Shepherd's Crook Golf Course", "Silver", "MEN")).toEqual({
      par: 71,
      courseRating: 72.3,
      slope: 133,
      holeCount: 0
    });
  });

  it("loads the expanded Chicagoland collar county NCRListing enrichment file", () => {
    expect(summarizeTee("Mistwood Golf Club", "Silver", "MEN")).toEqual({
      par: 72,
      courseRating: 74.8,
      slope: 147,
      holeCount: 0
    });
    expect(summarizeTee("Prairie Landing Golf Club", "Black", "MEN")).toEqual({
      par: 72,
      courseRating: 74.1,
      slope: 139,
      holeCount: 0
    });
    expect(summarizeTee("Preserve at Oak Meadows", "Tournament", "MEN")).toEqual({
      par: 72,
      courseRating: 74.1,
      slope: 142,
      holeCount: 0
    });
    expect(summarizeTee("Cantigny Golf - Lakeside/Hillside", "Champ", "MEN", "Cantigny")).toEqual({
      par: 72,
      courseRating: 72.6,
      slope: 138,
      holeCount: 0
    });
    expect(summarizeTee("Village Links of Glen Ellyn - 18 Hole", "Black", "MEN", "Village Links")).toEqual({
      par: 72,
      courseRating: 74.8,
      slope: 138,
      holeCount: 0
    });
  });

  it("keeps the manually verified local course fallbacks ahead of generated duplicates", () => {
    const sunsetResults = searchCuratedChicagolandCourses({ name: "Sunset Valley", state: "IL" }).filter(
      (candidate) => candidate.name === "Sunset Valley Golf Club"
    );
    const brynMawrResults = searchCuratedChicagolandCourses({ name: "Bryn Mawr", state: "IL" }).filter(
      (candidate) => candidate.name === "Bryn Mawr Country Club"
    );

    expect(sunsetResults).toHaveLength(1);
    expect(brynMawrResults).toHaveLength(1);
    expect(sunsetResults[0].tees.every((tee) => tee.holes?.length === 18)).toBe(true);
    expect(brynMawrResults[0].tees.every((tee) => tee.holes?.length === 18)).toBe(true);
  });

  it("loads northwest Indiana NCRListing enrichment", () => {
    expect(summarizeTee("Lost Marsh", "Black", "MEN", "Lost Marsh", "IN")).toEqual({
      par: 72,
      courseRating: 73.4,
      slope: 132,
      holeCount: 0
    });
    expect(
      summarizeTee("White Hawk Country Club - Blackhawk/Greyhawk", "Green", "MEN", "White Hawk", "IN")
    ).toEqual({
      par: 72,
      courseRating: 74.7,
      slope: 148,
      holeCount: 0
    });
    expect(summarizeTee("The Course at Aberdeen", "Black", "MEN", "Aberdeen", "IN")).toEqual({
      par: 72,
      courseRating: 73.3,
      slope: 138,
      holeCount: 0
    });
    expect(searchCuratedChicagolandCourses({ name: "Hammond", state: "IN" }).map((course) => course.name)).toContain(
      "Lost Marsh"
    );
  });

  it("loads Wisconsin drive-range NCRListing enrichment", () => {
    expect(summarizeTee("Geneva National Golf Club - Palmer", "Black", "MEN", "Geneva National", "WI")).toEqual({
      par: 72,
      courseRating: 74.5,
      slope: 134,
      holeCount: 0
    });
    expect(
      summarizeTee("Grand Geneva Resort & Spa - The Brute", "Blue", "MEN", "Grand Geneva Brute", "WI")
    ).toEqual({
      par: 72,
      courseRating: 74.3,
      slope: 141,
      holeCount: 0
    });
    expect(
      summarizeTee("Hawk's View Golf Club - Como Crossings at Hawk's View", "Black", "MEN", "Hawk's View", "WI")
    ).toEqual({
      par: 72,
      courseRating: 73.9,
      slope: 136,
      holeCount: 0
    });
    expect(summarizeTee("The Bog", "Black", "MEN", "The Bog", "WI")).toEqual({
      par: 72,
      courseRating: 75.1,
      slope: 142,
      holeCount: 0
    });
  });

  it("loads targeted direct-name NCRListing enrichment", () => {
    expect(summarizeTee("Randall Oaks Golf Club", "Gold", "MEN", "Randall Oaks")).toEqual({
      par: 71,
      courseRating: 71.5,
      slope: 132,
      holeCount: 0
    });
  });
});
