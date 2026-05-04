import "server-only";

import type {
  CourseDirectoryProvider,
  CourseLookupQuery,
  CourseLookupResult,
  HandicapLookupResult,
  HandicapProvider
} from "@/lib/providers/types";

const USGA_SEARCH_URL = "https://ncrdb.usga.org/courseSearch.aspx";
const USGA_LOAD_COURSES_URL = "https://ncrdb.usga.org/NCRListing?handler=LoadCourses";
const USGA_TEE_INFO_URL = "https://ncrdb.usga.org/courseTeeInfo";

// TODO: Replace this scrape-backed implementation with an official provider if/when available.
// Assumption: the user has permission to use the existing USGA NCRDB course lookup workflow.

type UsgaCourseRow = {
  courseID?: number;
  courseName?: string;
  facilityName?: string;
  fullName?: string;
  city?: string;
  stateDisplay?: string;
  country?: string;
};

type UsgaSession = {
  cookie: string;
  token: string;
};

function getSetCookieHeaders(headers: Headers) {
  const withGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  const cookies = withGetSetCookie.getSetCookie?.();

  if (cookies?.length) {
    return cookies;
  }

  const cookie = headers.get("set-cookie");
  return cookie ? [cookie] : [];
}

function buildCookieHeader(headers: Headers) {
  return getSetCookieHeaders(headers)
    .map((cookie) => cookie.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value: string) {
  return decodeHtml(value.replace(/<[^>]*>/g, " "));
}

function parseNumber(value: string) {
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function parseVerificationToken(html: string) {
  const direct = html.match(/name=["']__RequestVerificationToken["'][^>]*value=["']([^"']+)["']/i);

  if (direct?.[1]) {
    return direct[1];
  }

  const reversed = html.match(/value=["']([^"']+)["'][^>]*name=["']__RequestVerificationToken["']/i);
  return reversed?.[1] ?? "";
}

async function createUsgaSession(): Promise<UsgaSession> {
  const response = await fetch(USGA_SEARCH_URL, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`USGA course lookup failed with status ${response.status}.`);
  }

  const html = await response.text();
  const token = parseVerificationToken(html);

  if (!token) {
    throw new Error("USGA course lookup did not return a verification token.");
  }

  return {
    cookie: buildCookieHeader(response.headers),
    token
  };
}

function normalizeGender(value: string) {
  const gender = value.toUpperCase();

  if (gender === "M") {
    return "MEN" as const;
  }

  if (gender === "F") {
    return "WOMEN" as const;
  }

  return "OPEN" as const;
}

function normalizeTeeName(name: string, gender: string) {
  const genderLabel = gender === "M" ? "Men" : gender === "F" ? "Women" : "";

  if (!genderLabel) {
    return name || "Tee";
  }

  return name ? `${name} (${genderLabel})` : genderLabel;
}

function parseTeeRows(html: string, courseId: number): CourseLookupResult["tees"] {
  const tableMatch = html.match(/<table[^>]*id=["']gvTee["'][\s\S]*?<\/table>/i);

  if (!tableMatch) {
    return [];
  }

  const rows = tableMatch[0].match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
  const tees: CourseLookupResult["tees"] = [];

  for (const row of rows) {
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) =>
      stripTags(match[1] ?? "")
    );

    if (cells.length < 16) {
      continue;
    }

    const teeName = cells[0] ?? "";
    const gender = cells[1] ?? "";
    const par = parseNumber(cells[2] ?? "");
    const courseRating = parseNumber(cells[3] ?? "");
    const slope = parseNumber(cells[5] ?? "");
    const teeId = cells[14] ?? "";

    if (!teeName || !par || !courseRating || !slope) {
      continue;
    }

    tees.push({
      externalTeeId: teeId || `${courseId}-${tees.length + 1}`,
      name: normalizeTeeName(teeName, gender),
      gender: normalizeGender(gender),
      par,
      slope,
      courseRating
    });
  }

  return tees.sort((left, right) => right.courseRating - left.courseRating);
}

async function fetchUsgaTees(courseId: number, session: UsgaSession) {
  const url = new URL(USGA_TEE_INFO_URL);
  url.searchParams.set("CourseID", String(courseId));

  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Cookie: session.cookie,
      Referer: USGA_SEARCH_URL
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return [];
  }

  return parseTeeRows(await response.text(), courseId);
}

function buildUsgaSearchVariants(name: string) {
  const normalized = name.trim().replace(/\s+/g, " ");
  const lower = normalized.toLowerCase();
  const withoutPossessive = normalized.replace(/\b([A-Za-z]+)'s\b/g, "$1").replace(/\s+/g, " ").trim();
  const significantTokens = normalized
    .split(" ")
    .map((token) => token.replace(/[^A-Za-z0-9]/g, ""))
    .filter((token) => token.length >= 4 && !/^(golf|club|course|country)$/i.test(token));
  const variants = [normalized];

  if (withoutPossessive && withoutPossessive.toLowerCase() !== lower) {
    variants.push(withoutPossessive);
  }

  const lastSignificantToken = significantTokens.at(-1);
  if (lastSignificantToken && lastSignificantToken.toLowerCase() !== lower) {
    variants.push(lastSignificantToken);
  }

  if (!/\b(golf|club|course|country)\b/i.test(normalized)) {
    variants.push(`${normalized} Golf Club`);
    variants.push(`${normalized} Country Club`);
    variants.push(`${normalized} Golf Course`);
    variants.push(`${normalized} Club`);
    variants.push(`${normalized} GC`);
  } else if (!lower.includes("club")) {
    variants.push(`${normalized} Club`);
  }

  return Array.from(new Map(variants.map((variant) => [variant.toLowerCase(), variant])).values()).slice(0, 10);
}

function normalizeUsgaStateParam(state: string | undefined) {
  const normalized = state?.trim().toUpperCase();

  if (!normalized) {
    return "(Select)";
  }

  if (/^[A-Z]{2}$/.test(normalized)) {
    return `US-${normalized}`;
  }

  return normalized;
}

function normalizeStateDisplay(state: string | undefined) {
  const normalized = state?.trim().toUpperCase();

  if (!normalized) {
    return "";
  }

  return normalized.replace(/^US-/, "");
}

function buildCourseResult(row: UsgaCourseRow, tees: CourseLookupResult["tees"]): CourseLookupResult {
  const courseId = Number(row.courseID ?? 0);
  const name =
    String(row.fullName ?? "").trim() ||
    [row.facilityName, row.courseName].map((value) => String(value ?? "").trim()).filter(Boolean).join(" - ") ||
    "Unknown Course";

  return {
    externalCourseId: String(courseId),
    provider: "usga-ncrdb",
    name,
    city: row.city ?? null,
    state: row.stateDisplay ?? null,
    tees,
    raw: row as Record<string, unknown>
  };
}

export class UsgaScrapeCourseDirectoryProvider implements CourseDirectoryProvider {
  async searchCourses(query: CourseLookupQuery): Promise<CourseLookupResult[]> {
    const session = await createUsgaSession();
    const state = normalizeStateDisplay(query.state);
    const usgaState = normalizeUsgaStateParam(query.state);
    const rowsByCourseId = new Map<number, UsgaCourseRow>();
    const searchRequests = [
      ...buildUsgaSearchVariants(query.name).map((searchName) => ({
        clubName: searchName,
        clubCity: ""
      })),
      {
        clubName: "",
        clubCity: query.name.trim().replace(/\s+/g, " ")
      }
    ];

    for (const searchRequest of searchRequests) {
      const response = await fetch(USGA_LOAD_COURSES_URL, {
        method: "POST",
        headers: {
          Accept: "application/json, text/javascript, */*; q=0.01",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Cookie: session.cookie,
          Origin: "https://ncrdb.usga.org",
          Referer: USGA_SEARCH_URL,
          RequestVerificationToken: session.token,
          "X-Requested-With": "XMLHttpRequest"
        },
        body: new URLSearchParams({
          clubName: searchRequest.clubName.slice(0, 80),
          clubCity: searchRequest.clubCity.slice(0, 80),
          clubState: usgaState,
          clubCountry: "USA"
        }),
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`USGA course search failed with status ${response.status}.`);
      }

      const rows = (await response.json()) as UsgaCourseRow[];
      const filteredRows = (Array.isArray(rows) ? rows : []).filter(
        (row) => !state || normalizeStateDisplay(String(row.stateDisplay ?? "")) === state
      );

      for (const row of filteredRows) {
        const courseId = Number(row.courseID ?? 0);

        if (courseId > 0) {
          rowsByCourseId.set(courseId, row);
        }
      }

      if (rowsByCourseId.size >= 12) {
        break;
      }
    }

    const filteredRows = Array.from(rowsByCourseId.values()).slice(0, 12);
    const results: CourseLookupResult[] = [];

    for (const row of filteredRows) {
      const courseId = Number(row.courseID ?? 0);
      const tees = courseId > 0 ? await fetchUsgaTees(courseId, session) : [];

      results.push(buildCourseResult(row, tees));
    }

    return results;
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
