import { teams } from "./data";

// Only known local destinations are accepted; query data is never a return URL.
export function matchReturn(params: URLSearchParams) {
  const query = new URLSearchParams(params);
  const from = query.get("from");
  query.delete("from");
  if (from === "team" && teams.some((t) => t.id === query.get("team")))
    return { href: `/teams/${query.get("team")}`, label: "Back to team" };
  if (from === "bracket") {
    const round = query.get("round") ?? "all";
    const back = new URLSearchParams();
    if (["all", "overview", "quarters", "semis", "final"].includes(round))
      back.set("round", round);
    if (teams.some((t) => t.id === query.get("team")))
      back.set("team", query.get("team")!);
    return { href: `/bracket?${back}`, label: "Back to bracket" };
  }
  if (from === "results")
    return { href: `/history/2027?${query}`, label: "Back to season results" };
  return {
    href: from === "matches" ? `/matches?${query}` : "/matches",
    label: "All matches",
  };
}
