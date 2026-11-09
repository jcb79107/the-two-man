import type { Metadata } from "next";
import { matches, nameOf, teams } from "./data";
import { archive2026, entries, entryName, players } from "./history-data";
import { offseason } from "./site-mode";

export function routeMetadata(path: string[]): Metadata {
  const route = "/" + path.join("/");
  const seasonLabel = offseason ? "2026 Season 1" : "Season 2 sample";
  const pages: Record<string, [string, string]> = {
    "/": [
      "Clubhouse",
      offseason
        ? "The Two-Man golf tournament: revisit the 2026 champions, results and playoff bracket. Season 2 details coming this winter."
        : "Explore the Two-Man Season 2 sample clubhouse, recent results and remaining matches.",
    ],
    "/rules": [
      "Rules & format",
      `${seasonLabel} rules for two-man net better-ball, GHIN strokes, pod scoring and playoffs.`,
    ],
    "/history": [
      "Season history",
      "Explore the official Two-Man Season 1 archive, including results, standings and playoff history.",
    ],
    "/champions": [
      "Champions",
      "Meet the Two-Man champions and revisit their championship results in the official archive.",
    ],
    "/records": [
      "Record book",
      "Explore official Two-Man player and team records. Sample seasons are excluded from all-time records.",
    ],
    "/review": [
      "Graphic desk",
      offseason
        ? "Create local graphics from official 2026 Two-Man results."
        : "Fictional Season 2 graphic desk and result-entry rehearsal. No authentication or private storage.",
    ],
    "/standings": [
      "Standings",
      "Explore sample Season 2 pod standings and playoff qualification scenarios.",
    ],
    "/matches": [
      "Matches",
      "Browse sample Season 2 pre-match fixtures and completed results.",
    ],
    "/bracket": [
      "Playoff bracket",
      "Explore the sample Season 2 playoff bracket, rounds and qualification placeholders.",
    ],
    "/earnings": [
      "The purse",
      "View proposed sample Season 2 awards and earned versus pending amounts.",
    ],
    "/submit": [
      "Result evidence",
      "Learn how match evidence is shared with the commissioner outside the Two-Man website.",
    ],
  };
  let [title, description] = pages[route] ?? [
    "The Two-Man",
    "Two-Man golf tournament results and history.",
  ];
  if (path[0] === "history" && path.length === 2) {
    title = `${path[1]} season archive`;
    description =
      path[1] === "2026"
        ? "Official 2026 Two-Man results, final standings and championship bracket from the preserved Season 1 archive."
        : "Sample 2027 Two-Man season results, standings and playoff history.";
  } else if (path[0] === "history" && path[2] === "matches") {
    const game = archive2026.games.find((g) => g.id === path[3]);
    if (game) {
      const pairing = `${entryName(archive2026, game.a)} vs ${entryName(archive2026, game.b)}`;
      title = `2026 ${game.round}: ${pairing}`;
      description = `Official 2026 ${game.round} result: ${pairing}, ${game.score}. View the preserved match record and available scorecard.`;
    }
  } else if (path[0] === "players") {
    const player = players.find((p) => p.id === path[1]);
    if (player) {
      title = `${player.name} · Player record`;
      description = `${player.name}'s Two-Man player record, season results and partnerships${player.id.startsWith("s1-") ? " from the official archive" : " in the sample season"}.`;
    }
  } else if (path[0] === "records" && path[1] === "teams") {
    const team = [...archive2026.entries, ...entries].find(
      (e) => e.teamId === path[2],
    );
    if (team) {
      title = `${team.name} · Team record`;
      description = `${team.name}'s Two-Man partnership record, match history and season results${team.teamId.startsWith("s1-") ? " from the official archive" : " in the sample season"}.`;
    }
  } else if (path[0] === "teams") {
    const team = teams.find((t) => t.id === path[1]);
    if (team) {
      title = `${nameOf(team.id)} · Season 2`;
      description = `Sample Season 2 team profile for ${nameOf(team.id)}, including fixtures and published results.`;
    }
  } else if (path[0] === "matches") {
    const match = matches.find((m) => m.id === path[1]);
    if (match) {
      title = `${nameOf(match.a)} vs ${nameOf(match.b)}`;
      description = `Sample Season 2 match between ${nameOf(match.a)} and ${nameOf(match.b)}. View match details and published scorecard availability.`;
    }
  } else if (path[0] === "playoffs") {
    const rounds: Record<string, string> = {
      q1: "Quarterfinal 1",
      q2: "Quarterfinal 2",
      q3: "Quarterfinal 3",
      q4: "Quarterfinal 4",
      s1: "Semifinal 1",
      s2: "Semifinal 2",
      final: "Final",
    };
    title = `${rounds[path[1]] ?? "Playoff match"} · Season 2`;
    description = `Sample Season 2 ${rounds[path[1]] ?? "playoff match"}: view the bracket matchup and published result availability.`;
  }
  const socialTitle = `${title} • The Two-Man`;
  return {
    title,
    description,
    ...(offseason ? { alternates: { canonical: route } } : {}),
    ...(!offseason || path[0] === "review"
      ? { robots: { index: false, follow: false } }
      : {}),
    openGraph: {
      title: socialTitle,
      description,
      type: "website",
      siteName: "The Two-Man",
      ...(offseason ? { url: route } : {}),
      images: [
        { url: "/two-man-mark.png", alt: "The Two-Man golf tournament mascot" },
      ],
    },
    twitter: {
      card: "summary",
      title: socialTitle,
      description,
      images: [
        { url: "/two-man-mark.png", alt: "The Two-Man golf tournament mascot" },
      ],
    },
  };
}
