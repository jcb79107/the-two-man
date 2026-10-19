"use client";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { bracketMatches, teamPath, type BracketMatch } from "./bracket-model";
import type { HistoricalGame } from "./history-data";
import { Icon } from "./ui";
import { dateLabel } from "./data";
const roundLabels = {
  overview: "Overview",
  all: "Full bracket",
  quarters: "Quarterfinals",
  semis: "Semifinals",
  final: "Final",
};
export function ConnectedBracket({
  seedIds = [],
  games = [],
  baseHref = "/bracket",
  label = "Current season",
}: {
  seedIds?: string[];
  games?: HistoricalGame[];
  baseHref?: string;
  label?: string;
}) {
  const params = useSearchParams();
  const selected = params.get("round") ?? "quarters";
  const round = Object.hasOwn(roundLabels, selected)
    ? (selected as keyof typeof roundLabels)
    : "overview";
  const nodes = bracketMatches(seedIds, games);
  const router = useRouter();
  const selectedTeam = params.get("team") ?? "";
  const route = teamPath(nodes, selectedTeam);
  const field = nodes
    .filter((n) => n.round === "quarters")
    .flatMap((n) => n.slots)
    .filter((s) => s.id);
  const focusRound = nodes.find((n) => !n.winner)?.round ?? "final";
  const href = (r: string, id?: string, team = selectedTeam) => {
    const [pathname, search] = baseHref.split("?");
    const query = new URLSearchParams(search);
    query.set("round", r);
    if (team) query.set("team", team);
    return `${pathname}?${query}${id ? `#bracket-${id}` : ""}`;
  };
  const card = (m: BracketMatch, mobile = false) => (
    <article
      id={`${mobile ? "mobile-" : ""}bracket-${m.id}`}
      key={m.id}
      className={`tournament-match match-${m.id}${m.winner ? " decided" : ""}${route.includes(m.id) ? " on-path" : ""}${selectedTeam && !route.includes(m.id) ? " off-path" : ""}`}
      aria-label={`${m.label} ${m.winner ? "completed" : "awaiting result"}`}
    >
      <div className="tournament-match-meta">
        <strong>{m.label}</strong>
        <span>
          {m.winner
            ? `${m.score} · Final`
            : m.round === "quarters"
              ? "Awaiting result"
              : "Awaiting winners"}
        </span>
      </div>
      {m.slots.map((s, i) => (
        <div
          key={i}
          className={`tournament-team${m.winner === s.id && s.id ? " winner" : ""}${m.winner && m.winner !== s.id ? " eliminated" : ""}`}
        >
          <span
            className="tournament-seed"
            aria-label={s.seed ? `Seed ${s.seed}` : undefined}
          >
            {s.seed ?? "—"}
          </span>
          <span>{s.label}</span>
          {m.winner === s.id && s.id && (
            <span className="winner-mark">
              <Icon name="check" size={14} />
              <span className="sr-only">Winner</span>
            </span>
          )}
        </div>
      ))}
      {m.date && <p className="bracket-date">{dateLabel(m.date)}</p>}
      <div className="tournament-match-footer">
        {m.href ? (
          <Link href={m.href} aria-label={`Open ${m.label} result`}>
            View result <Icon name="arrow" size={13} />
          </Link>
        ) : (
          <span>No result yet</span>
        )}
        {m.next ? (
          <Link
            href={href(m.round === "quarters" ? "semis" : "final", m.next)}
            aria-label={`${m.label} winner advances to ${m.next === "final" ? "Final" : nodes.find((node) => node.id === m.next)!.label}`}
          >
            To{" "}
            {m.next === "final"
              ? "Final"
              : nodes.find((node) => node.id === m.next)!.label}{" "}
            →
          </Link>
        ) : (
          <span>{m.winner ? "Champion" : "For the title"}</span>
        )}
      </div>
    </article>
  );
  return (
    <section
      className="connected-bracket"
      aria-label={`${label} playoff bracket`}
    >
      <nav className="tabs bracket-view-tabs" aria-label="Bracket view">
        {Object.entries(roundLabels).map(([r, title]) => (
          <Link
            key={r}
            href={href(r)}
            aria-current={r === round ? "page" : undefined}
          >
            {title}
          </Link>
        ))}
      </nav>
      {field.length > 0 && (
        <label className="bracket-team-filter">
          Follow a team
          <select
            value={field.some((s) => s.id === selectedTeam) ? selectedTeam : ""}
            onChange={(e) =>
              router.replace(href(round, undefined, e.target.value), {
                scroll: false,
              })
            }
          >
            <option value="">All teams</option>
            {field.map((s) => (
              <option key={s.id} value={s.id!}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {route.length > 0 && (
        <p className="path-summary" role="status">
          {field.find((s) => s.id === selectedTeam)?.label}:{" "}
          {route.map((id) => nodes.find((n) => n.id === id)!.label).join(" → ")}
        </p>
      )}
      {round === "all" || round === "overview" ? (
        <>
          <div
            className={`tournament-scroll${round === "overview" ? " responsive-board" : ""}`}
            role="region"
            aria-label="Full connected bracket, horizontally scrollable"
            tabIndex={0}
          >
            <div className="tournament-board">
              <div className="tournament-heading heading-qleft">
                Quarterfinals
              </div>
              <div className="tournament-heading heading-sleft">Semifinals</div>
              <div className="tournament-heading heading-final">
                <Icon name="cup" size={22} /> Championship
              </div>
              <div className="tournament-heading heading-sright">
                Semifinals
              </div>
              <div className="tournament-heading heading-qright">
                Quarterfinals
              </div>
              <svg
                className="tournament-lines"
                viewBox="0 0 1200 600"
                aria-hidden="true"
              >
                <path d="M220 168 H232.5 V318 H245 M220 468 H232.5 V318" />
                <path d="M980 168 H967.5 V318 H955 M980 468 H967.5 V318" />
                <path d="M465 318 H490 M735 318 H710" />
              </svg>
              {nodes.map((m) => card(m))}
              <p className="tournament-path-note">
                QF1 + QF2 → SF1 → FINAL ← SF2 ← QF3 + QF4
              </p>
            </div>
          </div>
          {round === "overview" && (
            <div className="mobile-bracket-overview">
              <h3>{roundLabels[focusRound]}</h3>
              <p>Current round · choose Full bracket for the complete tree.</p>
              <div className="tournament-round-list">
                {nodes
                  .filter((m) => m.round === focusRound)
                  .map((m) => card(m, true))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="tournament-round-list">
          {nodes.filter((m) => m.round === round).map((m) => card(m))}
        </div>
      )}
    </section>
  );
}
