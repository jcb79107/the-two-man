export const ROUTES = {
  home: "/",
  admin: "/admin",
  tournamentHome: (slug: string) => `/tournament/${slug}`,
  tournamentRules: (slug: string) => `/tournament/${slug}/rules`,
  tournamentStandings: (slug: string) => `/tournament/${slug}/standings`,
  tournamentBracket: (slug: string) => `/tournament/${slug}/bracket`,
  publicMatch: (slug: string, matchId: string) => `/tournament/${slug}/matches/${matchId}`,
  privateMatch: (token: string) => `/match/${token}`,
  publicStandingsApi: (slug: string) => `/api/public/tournament/${slug}/standings`,
  publicBracketApi: (slug: string) => `/api/public/tournament/${slug}/bracket`,
  privateScorecardApi: (token: string) => `/api/matches/${token}/scorecard`,
  courseSearchApi: (query: string, state?: string) =>
    `/api/courses/search?name=${encodeURIComponent(query)}${state ? `&state=${encodeURIComponent(state)}` : ""}`
} as const;
