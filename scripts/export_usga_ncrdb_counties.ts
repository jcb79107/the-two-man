import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { CourseLookupResult } from "@/lib/providers/types";
import {
  createUsgaNcrdbSession,
  hydrateUsgaNcrdbCourse,
  loadUsgaNcrdbCourseRows,
  USGA_TEE_INFO_URL,
  type UsgaCourseRow
} from "@/lib/providers/usga-ncrdb-client";

const LAKE_COUNTY_IL_CITIES = [
  "Antioch",
  "Bannockburn",
  "Barrington",
  "Barrington Hills",
  "Beach Park",
  "Buffalo Grove",
  "Deer Park",
  "Deerfield",
  "Diamond Lake",
  "Fort Sheridan",
  "Fox Lake",
  "Gages Lake",
  "Grayslake",
  "Great Lakes",
  "Green Oaks",
  "Gurnee",
  "Hainesville",
  "Hawthorn Woods",
  "Highland Park",
  "Highwood",
  "Indian Creek",
  "Ingleside",
  "Island Lake",
  "Kildeer",
  "Lake Barrington",
  "Lake Bluff",
  "Lake Forest",
  "Lake Villa",
  "Lake Zurich",
  "Lakemoor",
  "Libertyville",
  "Lincolnshire",
  "Lindenhurst",
  "Long Grove",
  "Long Lake",
  "Mettawa",
  "Mundelein",
  "North Barrington",
  "Old Mill Creek",
  "Park City",
  "Port Barrington",
  "Prairie View",
  "Riverwoods",
  "Round Lake",
  "Round Lake Beach",
  "Round Lake Heights",
  "Round Lake Park",
  "Third Lake",
  "Tower Lakes",
  "Vernon Hills",
  "Volo",
  "Wadsworth",
  "Wauconda",
  "Waukegan",
  "Winthrop Harbor",
  "Zion"
];

const COOK_COUNTY_IL_CITIES = [
  "Alsip",
  "Arlington Heights",
  "Barrington",
  "Barrington Hills",
  "Bartlett",
  "Bedford Park",
  "Bellwood",
  "Berkeley",
  "Berwyn",
  "Blue Island",
  "Bridgeview",
  "Broadview",
  "Brookfield",
  "Buffalo Grove",
  "Burbank",
  "Burnham",
  "Calumet City",
  "Chicago",
  "Chicago Heights",
  "Chicago Ridge",
  "Cicero",
  "Country Club Hills",
  "Countryside",
  "Crestwood",
  "Des Plaines",
  "Dixmoor",
  "Dolton",
  "East Dundee",
  "East Hazel Crest",
  "Elgin",
  "Elk Grove Village",
  "Elmwood Park",
  "Evanston",
  "Evergreen Park",
  "Flossmoor",
  "Ford Heights",
  "Forest Park",
  "Forest View",
  "Franklin Park",
  "Glencoe",
  "Glenview",
  "Glenwood",
  "Golf",
  "Hanover Park",
  "Harvey",
  "Harwood Heights",
  "Hazel Crest",
  "Hickory Hills",
  "Hillside",
  "Hines",
  "Hodgkins",
  "Hoffman Estates",
  "Hometown",
  "Homewood",
  "Indian Head Park",
  "Inverness",
  "Justice",
  "Kenilworth",
  "La Grange",
  "La Grange Park",
  "Lansing",
  "Lemont",
  "Lincolnwood",
  "Lynwood",
  "Lyons",
  "Markham",
  "Matteson",
  "Maywood",
  "McCook",
  "Melrose Park",
  "Merrionette Park",
  "Midlothian",
  "Morton Grove",
  "Mount Prospect",
  "Mt Prospect",
  "Mt. Prospect",
  "Niles",
  "Norridge",
  "North Riverside",
  "Northbrook",
  "Northfield",
  "Northlake",
  "Oak Forest",
  "Oak Lawn",
  "Oak Park",
  "Olympia Fields",
  "Orland Hills",
  "Orland Park",
  "Palatine",
  "Palos Heights",
  "Palos Hills",
  "Palos Park",
  "Park Forest",
  "Park Ridge",
  "Phoenix",
  "Posen",
  "Prospect Heights",
  "Richton Park",
  "River Forest",
  "River Grove",
  "Riverdale",
  "Riverside",
  "Robbins",
  "Rolling Meadows",
  "Roselle",
  "Rosemont",
  "Sauk Village",
  "Schaumburg",
  "Schiller Park",
  "Skokie",
  "South Barrington",
  "South Chicago Heights",
  "South Holland",
  "Steger",
  "Stickney",
  "Stone Park",
  "Streamwood",
  "Summit",
  "Thornton",
  "Tinley Park",
  "University Park",
  "Westchester",
  "Western Springs",
  "Wheeling",
  "Willow Springs",
  "Wilmette",
  "Winnetka",
  "Worth"
];

const DUPAGE_COUNTY_IL_CITIES = [
  "Addison",
  "Aurora",
  "Bartlett",
  "Bensenville",
  "Bloomingdale",
  "Bolingbrook",
  "Burr Ridge",
  "Carol Stream",
  "Clarendon Hills",
  "Darien",
  "Downers Grove",
  "Elmhurst",
  "Glen Ellyn",
  "Glendale Heights",
  "Hanover Park",
  "Hinsdale",
  "Itasca",
  "Lemont",
  "Lisle",
  "Lombard",
  "Naperville",
  "Oak Brook",
  "Oakbrook Terrace",
  "Roselle",
  "St. Charles",
  "Villa Park",
  "Warrenville",
  "Wayne",
  "West Chicago",
  "Westmont",
  "Wheaton",
  "Willowbrook",
  "Winfield",
  "Wood Dale",
  "Woodridge"
];

const WILL_COUNTY_IL_CITIES = [
  "Beecher",
  "Bolingbrook",
  "Braceville",
  "Braidwood",
  "Channahon",
  "Coal City",
  "Crest Hill",
  "Crete",
  "Diamond",
  "Elwood",
  "Fairmont",
  "Frankfort",
  "Godley",
  "Homer Glen",
  "Joliet",
  "Lockport",
  "Manhattan",
  "Mokena",
  "Monee",
  "Naperville",
  "New Lenox",
  "Orland Park",
  "Park Forest",
  "Peotone",
  "Plainfield",
  "Rockdale",
  "Romeoville",
  "Shorewood",
  "Steger",
  "Symerton",
  "Tinley Park",
  "University Park",
  "Wilmington",
  "Woodridge"
];

const KANE_COUNTY_IL_CITIES = [
  "Algonquin",
  "Aurora",
  "Barrington Hills",
  "Bartlett",
  "Batavia",
  "Big Rock",
  "Burlington",
  "Campton Hills",
  "Carpentersville",
  "East Dundee",
  "Elburn",
  "Elgin",
  "Geneva",
  "Gilberts",
  "Hampshire",
  "Hoffman Estates",
  "Huntley",
  "Kaneville",
  "Lily Lake",
  "Maple Park",
  "Montgomery",
  "North Aurora",
  "Pingree Grove",
  "Sleepy Hollow",
  "South Elgin",
  "St. Charles",
  "Sugar Grove",
  "Virgil",
  "Wayne",
  "West Dundee"
];

const MCHENRY_COUNTY_IL_CITIES = [
  "Algonquin",
  "Barrington Hills",
  "Bull Valley",
  "Cary",
  "Crystal Lake",
  "Fox Lake",
  "Fox River Grove",
  "Greenwood",
  "Harvard",
  "Hebron",
  "Holiday Hills",
  "Huntley",
  "Johnsburg",
  "Lake in the Hills",
  "Lakewood",
  "Lakemoor",
  "Marengo",
  "McHenry",
  "Oakwood Hills",
  "Port Barrington",
  "Prairie Grove",
  "Richmond",
  "Ringwood",
  "Spring Grove",
  "Trout Valley",
  "Union",
  "Wonder Lake",
  "Woodstock"
];

const NORTHWEST_INDIANA_CITIES = [
  "Cedar Lake",
  "Chesterton",
  "Crown Point",
  "Dyer",
  "East Chicago",
  "Gary",
  "Griffith",
  "Hammond",
  "Highland",
  "Hobart",
  "La Porte",
  "Long Beach",
  "Lowell",
  "Merrillville",
  "Michigan City",
  "Munster",
  "Portage",
  "Schererville",
  "St. John",
  "Valparaiso",
  "Westville",
  "Whiting",
  "Winfield"
];

const WISCONSIN_DRIVE_CITIES = [
  "Bristol",
  "Brookfield",
  "Burlington",
  "Delavan",
  "Elkhorn",
  "Erin",
  "Fontana",
  "Franklin",
  "Genoa City",
  "Hartford",
  "Kenosha",
  "Lake Geneva",
  "Milwaukee",
  "Morningstar",
  "Mukwonago",
  "Pewaukee",
  "Pleasant Prairie",
  "Racine",
  "River Hills",
  "Saukville",
  "Sussex",
  "Twin Lakes",
  "Wales",
  "Waterford",
  "Waukesha",
  "West Bend",
  "Williams Bay"
];

type ExportedUsgaCourse = {
  sourceQuery: string;
  sourceCities: string[];
  externalCourseId: string;
  name: string;
  city: string | null;
  state: string | null;
  sourceUrl: string;
  tees: CourseLookupResult["tees"];
};

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    state: "IL",
    output: "",
    counties: new Set<string>(),
    cities: [] as string[],
    cityGroups: new Set<string>()
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--state" && args[index + 1]) {
      parsed.state = args[index + 1].toUpperCase();
      index += 1;
    } else if ((arg === "--out" || arg === "--output") && args[index + 1]) {
      parsed.output = args[index + 1];
      index += 1;
    } else if (arg === "--county" && args[index + 1]) {
      parsed.counties.add(args[index + 1].toLowerCase());
      index += 1;
    } else if (arg === "--city" && args[index + 1]) {
      parsed.cities.push(args[index + 1]);
      index += 1;
    } else if (arg === "--lake-cook" || arg === "--lake-cook-counties") {
      parsed.counties.add("lake");
      parsed.counties.add("cook");
      parsed.cityGroups.add("lake-cook");
    } else if (arg === "--chicagoland-expansion" || arg === "--west-suburbs") {
      parsed.counties.add("dupage");
      parsed.counties.add("will");
      parsed.counties.add("kane");
      parsed.counties.add("mchenry");
      parsed.cityGroups.add("chicagoland-expansion");
    } else if (arg === "--northwest-indiana" || arg === "--nwi") {
      parsed.state = "IN";
      parsed.cities.push(...NORTHWEST_INDIANA_CITIES);
      parsed.cityGroups.add("northwest-indiana");
    } else if (arg === "--wisconsin-drive" || arg === "--wi-drive") {
      parsed.state = "WI";
      parsed.cities.push(...WISCONSIN_DRIVE_CITIES);
      parsed.cityGroups.add("wisconsin-drive");
    }
  }

  if (parsed.counties.size === 0 && parsed.cities.length === 0) {
    parsed.counties.add("lake");
    parsed.counties.add("cook");
  }

  if (!parsed.output) {
    const citySlug = parsed.cities.map(normalize).filter(Boolean).join("-");
    const countySlug = Array.from(parsed.counties).sort().join("-");
    parsed.output =
      parsed.cityGroups.has("chicagoland-expansion")
        ? "data/course-catalog/usga-ncrdb-chicagoland-expansion-enrichment.json"
        : parsed.cityGroups.has("northwest-indiana")
          ? "data/course-catalog/usga-ncrdb-northwest-indiana-enrichment.json"
          : parsed.cityGroups.has("wisconsin-drive")
            ? "data/course-catalog/usga-ncrdb-wisconsin-drive-enrichment.json"
            : parsed.cityGroups.has("lake-cook")
              ? "data/course-catalog/usga-ncrdb-lake-cook-enrichment.json"
              : parsed.counties.size > 0
                ? `data/course-catalog/usga-ncrdb-${countySlug}-${parsed.state.toLowerCase()}-enrichment.json`
                : `data/course-catalog/usga-ncrdb-${citySlug || "cities"}-${parsed.state.toLowerCase()}-enrichment.json`;
  }

  return parsed;
}

function cityListFor(counties: Set<string>) {
  const cities = [
    ...(counties.has("lake") ? LAKE_COUNTY_IL_CITIES : []),
    ...(counties.has("cook") ? COOK_COUNTY_IL_CITIES : []),
    ...(counties.has("dupage") ? DUPAGE_COUNTY_IL_CITIES : []),
    ...(counties.has("will") ? WILL_COUNTY_IL_CITIES : []),
    ...(counties.has("kane") ? KANE_COUNTY_IL_CITIES : []),
    ...(counties.has("mchenry") ? MCHENRY_COUNTY_IL_CITIES : [])
  ];

  return Array.from(new Map(cities.map((city) => [normalize(city), city])).values()).sort((left, right) =>
    left.localeCompare(right)
  );
}

function requestedCityListFor(counties: Set<string>, cities: string[]) {
  return Array.from(
    new Map([...cityListFor(counties), ...cities].map((city) => [normalize(city), city.trim()])).values()
  )
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
}

function normalize(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sourceUrlFor(course: CourseLookupResult) {
  return `${USGA_TEE_INFO_URL}?CourseID=${encodeURIComponent(course.externalCourseId)}`;
}

function exportCourse(sourceCities: string[], course: CourseLookupResult): ExportedUsgaCourse {
  return {
    sourceQuery: sourceCities.map((city) => `city:${city}`).join(", "),
    sourceCities,
    externalCourseId: `usga-ncrdb-${course.externalCourseId}`,
    name: course.name,
    city: course.city ?? null,
    state: course.state ?? null,
    sourceUrl: sourceUrlFor(course),
    tees: course.tees.map((tee) => ({
      externalTeeId: `usga-${course.externalCourseId}-${tee.externalTeeId}`,
      name: tee.name,
      gender: tee.gender,
      par: tee.par,
      slope: tee.slope,
      courseRating: tee.courseRating
    }))
  };
}

async function main() {
  const options = parseArgs();
  const cities = requestedCityListFor(options.counties, options.cities);
  const allowedCities = new Set(cities.map(normalize));
  const rowsByCourseId = new Map<number, { row: UsgaCourseRow; cities: Set<string> }>();
  const misses: string[] = [];
  const session = await createUsgaNcrdbSession();

  for (const city of cities) {
    const rows = await loadUsgaNcrdbCourseRows({ clubCity: city, state: options.state }, session);
    const inCountyRows = rows.filter((row) => allowedCities.has(normalize(row.city)));

    if (inCountyRows.length === 0) {
      misses.push(city);
    }

    for (const row of inCountyRows) {
      const courseId = Number(row.courseID ?? 0);

      if (courseId <= 0) {
        continue;
      }

      const existing = rowsByCourseId.get(courseId);

      if (existing) {
        existing.cities.add(city);
      } else {
        rowsByCourseId.set(courseId, { row, cities: new Set([city]) });
      }
    }

    console.error(`${city}: ${inCountyRows.length} courses`);
  }

  const exported: ExportedUsgaCourse[] = [];
  const rows = Array.from(rowsByCourseId.values()).sort((left, right) => {
    const leftCity = String(left.row.city ?? "");
    const rightCity = String(right.row.city ?? "");
    return leftCity.localeCompare(rightCity) || String(left.row.fullName ?? "").localeCompare(String(right.row.fullName ?? ""));
  });

  for (const row of rows) {
    const course = await hydrateUsgaNcrdbCourse(row.row, session);

    if (course.tees.length > 0) {
      exported.push(exportCourse(Array.from(row.cities).sort(), course));
    }

    console.error(`hydrated ${course.name} (${course.city ?? "unknown"}) with ${course.tees.length} tees`);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    state: options.state,
    source: "USGA NCRListing",
    counties: Array.from(options.counties).sort(),
    cityGroups: Array.from(options.cityGroups).sort(),
    requestedCities: options.cities,
    searchedCities: cities,
    courses: exported,
    misses
  };
  const json = `${JSON.stringify(payload, null, 2)}\n`;

  if (options.output) {
    const outputPath = resolve(process.cwd(), options.output);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, json);
    console.log(`Wrote ${exported.length} courses to ${outputPath}`);
  } else {
    console.log(json);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
