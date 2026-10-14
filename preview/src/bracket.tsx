"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { bracketMatches, type BracketMatch } from "./bracket-model";
import type { HistoricalGame } from "./history-data";
import { Icon } from "./ui";
const roundLabels = {
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
  const selected = params.get("round") ?? "all";
  const round = Object.hasOwn(roundLabels, selected)
    ? (selected as keyof typeof roundLabels)
    : "all";
  const nodes = bracketMatches(seedIds, games);
  const href = (r: string, id?: string) =>
    `${baseHref}${baseHref.includes("?") ? "&" : "?"}round=${r}${id ? `#bracket-${id}` : ""}`;
  const card = (m: BracketMatch) => (
    <article
      id={`bracket-${m.id}`}
      key={m.id}
      className={`tournament-match match-${m.id}${m.winner ? " decided" : ""}`}
      aria-label={`${m.label} ${m.winner ? "completed" : "awaiting result"}`}
    >
      <div className="tournament-match-meta">
        <strong>{m.label}</strong>
        <span>
          {m.winner
            ? m.score
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
      <p className="bracket-help">
        {round === "all"
          ? "Follow the lines toward the final. Scroll sideways on a small screen, or choose a round above."
          : "Round view. Choose Full bracket to see every connection."}{" "}
        A check marks the winner; unplayed rounds name their feeder matches.
      </p>
      {round === "all" ? (
        <div
          className="tournament-scroll"
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
            <div className="tournament-heading heading-sright">Semifinals</div>
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
            {nodes.map(card)}
            <p className="tournament-path-note">
              QF1 + QF2 → SF1 → FINAL ← SF2 ← QF3 + QF4
            </p>
          </div>
        </div>
      ) : (
        <div className="tournament-round-list">
          {nodes.filter((m) => m.round === round).map(card)}
        </div>
      )}
    </section>
  );
}
