"use client";
import Link from "next/link";
import { useRef } from "react";
import { offseason } from "./site-mode";
import { useSearchParams, useRouter } from "next/navigation";
import { usePreview } from "./store";
import { money, dateLabel } from "./data";
import {
  seasons,
  entryName,
  careerRows,
  seasonStandings,
  careerGames,
  careerScore,
  compareHistoricalGames,
  headToHead,
  players,
  type SeasonRecord,
  type HistoricalGame,
  type CareerRow,
} from "./history-data";
import { PageHeading, Icon, Empty, SectionTitle } from "./ui";
import { Scorecard } from "./workflows";
import { ConnectedBracket } from "./bracket";

function ArchiveNav({ active }: { active: string }) {
  return (
    <nav className="tabs archive-nav" aria-label="League history">
      <Link
        href="/history"
        aria-current={active === "seasons" ? "page" : undefined}
      >
        Seasons
      </Link>
      <Link
        href="/champions"
        aria-current={active === "champions" ? "page" : undefined}
      >
        Champions
      </Link>
      <Link
        href="/records"
        aria-current={active === "records" ? "page" : undefined}
      >
        All-time records
      </Link>
    </nav>
  );
}
function HistoryDisclosure({ sample = false }: { sample?: boolean }) {
  if (offseason) return null;
  if (sample)
    return (
      <p className="archive-disclosure">
        <strong>Fictional Season 2.</strong> Sample results and proposed awards.
        Player shares illustrate an equal split; Season 2 amounts and split
        policy are unconfirmed. Excluded from official all-time records.
      </p>
    );
  return (
    <p className="archive-disclosure">
      <strong>Season 1 official archive.</strong> Preserved 2026 results. Season
      2 is a separate fictional demo; sample results are excluded from all-time
      records.
    </p>
  );
}
export function HistoryHome({ champions = false }: { champions?: boolean }) {
  const { matches } = usePreview();
  const records = seasons(matches);
  const completed = records.filter((s) => s.complete && s.champion);
  return (
    <>
      <PageHeading
        eyebrow="The Two-Man / League history"
        title={champions ? "Champions" : "Season history"}
      />
      {champions ? (
        <>
          <ArchiveNav active="champions" />
          <div className="champions-roll">
            {completed.map((s) => (
              <Champion key={s.year} season={s} />
            ))}
          </div>
        </>
      ) : (
        <div className="history-library">
          {completed
            .filter((s) => !s.sample)
            .map((s) => {
              const final = s.games.find((g) => g.round === "Final");
              return (
                <article className="history-season" key={s.year}>
                  <header className="history-season-heading">
                    <div>
                      <p className="eyebrow">
                        Season {s.number} · Official archive
                      </p>
                      <h2>{s.year}</h2>
                    </div>
                    <p>
                      {s.entries.length} teams · {s.games.length} matches
                    </p>
                  </header>
                  <div className="history-winner">
                    <p className="eyebrow">Champions</p>
                    <h3>
                      <Link href={`/records/teams/${s.champion}`}>
                        {entryName(s, s.champion!)}
                      </Link>
                    </h3>
                    {final && (
                      <p>
                        Defeated {entryName(s, s.runnerUp!)} · {final.score}
                      </p>
                    )}
                    {final && (
                      <Link className="text-link" href={final.href}>
                        View final result <Icon name="arrow" size={16} />
                      </Link>
                    )}
                  </div>
                  <nav
                    className="history-season-links"
                    aria-label={`${s.year} archive`}
                  >
                    {(
                      [
                        ["results", "Match results"],
                        ["standings", "Final standings"],
                        ["playoffs", "Playoff bracket"],
                      ] as const
                    ).map(([view, label]) => (
                      <Link key={view} href={`/history/${s.year}?view=${view}`}>
                        {label}
                        <Icon name="arrow" size={18} />
                      </Link>
                    ))}
                  </nav>
                </article>
              );
            })}
          <Link className="history-records-link" href="/records">
            <span>
              <strong>All-time records</strong>
              <span>Teams, players and head-to-head results</span>
            </span>
            <Icon name="arrow" />
          </Link>
        </div>
      )}
    </>
  );
}
function Champion({ season: s }: { season: SeasonRecord }) {
  const team = s.entries.find((e) => e.teamId === s.champion)!;
  const final = s.games.find((g) => g.round === "Final");
  const record = careerRows([s], "teams").find((r) => r.id === s.champion)!;
  return (
    <article className="champion-plaque">
      <div className="champion-year">
        <span>Champions</span>
        <strong>{s.year}</strong>
        <Icon name="cup" size={36} />
      </div>
      <div className="champion-copy">
        <p className="eyebrow">
          Season {String(s.number).padStart(2, "0")} / THE TWO-MAN
        </p>
        <h2>
          <Link href={`/records/teams/${team.teamId}`}>{team.name}</Link>
        </h2>
        <p>
          {record.won} wins · {record.lost} losses · {record.tied} ties across
          regular season and playoffs
        </p>
        <div className="champion-players">
          {team.playerIds.map((id) => (
            <Link key={id} href={`/players/${id}`}>
              {players.find((p) => p.id === id)?.name}{" "}
              <Icon name="arrow" size={14} />
            </Link>
          ))}
        </div>
        <Link href={final?.href ?? `/history/${s.year}`} className="text-link">
          {final ? `View final result · ${final.score}` : "View season"}{" "}
          <Icon name="arrow" size={16} />
        </Link>
      </div>
    </article>
  );
}
export function SeasonArchive({ year }: { year: number }) {
  const { matches } = usePreview();
  const s = seasons(matches).find((s) => s.year === year);
  const params = useSearchParams();
  const router = useRouter();
  const view = ["standings", "results", "playoffs"].includes(
    params.get("view") ?? "",
  )
    ? params.get("view")!
    : "overview";
  if (!s)
    return (
      <Empty title="Season not found">
        <Link href="/history">Browse seasons</Link>
      </Empty>
    );
  const regularRows = seasonStandings(s);
  return (
    <>
      <Link href="/history" className="back-link">
        <Icon name="back" size={16} />
        All seasons
      </Link>
      <PageHeading
        eyebrow={`${year} · SEASON ${String(s.number).padStart(2, "0")} · ${s.complete ? "FINAL ARCHIVE" : "IN PROGRESS"}`}
        title={
          view === "results"
            ? "Match results"
            : view === "standings"
              ? s.complete
                ? "Final standings"
                : "Standings"
              : view === "playoffs"
                ? "Playoff bracket"
                : `${year}`
        }
        action={
          <label className="archive-picker">
            Season
            <select
              aria-label="Archive season"
              value={year}
              onChange={(e) =>
                router.push(`/history/${e.target.value}?view=${view}`)
              }
            >
              {!offseason && <option value="2027">2027 · Sample season</option>}
              <option value="2026">2026 · Complete</option>
            </select>
          </label>
        }
      />
      <nav className="tabs" aria-label="Season sections">
        {["overview", "standings", "results", "playoffs"].map((tab) => (
          <Link
            key={tab}
            href={`/history/${year}?view=${tab}`}
            aria-current={view === tab ? "page" : undefined}
          >
            {tab[0].toUpperCase() + tab.slice(1)}
          </Link>
        ))}
      </nav>
      <HistoryDisclosure sample={s.sample} />
      {view === "overview" && (
        <>
          {s.champion ? (
            <Champion season={s} />
          ) : (
            <div className="archive-live">
              <p className="eyebrow">Current season</p>
              <h2>Season in progress</h2>
              <p>
                {s.games.filter((g) => g.phase === "regular").length}{" "}
                regular-season results are official. Pending cards do not count
                toward career stats.
              </p>
              <Link href="/matches" className="text-link">
                Back to current matches <Icon name="arrow" size={16} />
              </Link>
            </div>
          )}
          <div className="season-stats">
            <div>
              <span className="eyebrow">Teams entered</span>
              <strong>{s.entries.length}</strong>
            </div>
            <div>
              <span className="eyebrow">Official matches</span>
              <strong>{s.games.length}</strong>
            </div>
            <div>
              <span className="eyebrow">Prize pool</span>
              <strong>{money(s.prizePool)}</strong>
            </div>
            <div>
              <span className="eyebrow">Format</span>
              <strong className="archive-small-stat">2 guaranteed</strong>
            </div>
          </div>
          <section className="section">
            <SectionTitle title="Season payouts" />
            {s.champion && (
              <p>
                Champion: {entryName(s, s.champion)} · Runner-up:{" "}
                {entryName(s, s.runnerUp!)}
              </p>
            )}
            <div className="archive-honors">
              {s.awards.map((a) => (
                <div key={`${a.teamId}-${a.kind}`}>
                  <span className="eyebrow">{a.label}</span>
                  <Link href={`/records/teams/${a.teamId}`}>
                    {entryName(s, a.teamId)}
                  </Link>
                  <span>
                    {a.amount === null
                      ? "Prize amount not recorded"
                      : `${money(a.amount)} per team`}
                    {a.perPlayer !== undefined &&
                      ` · ${money(a.perPlayer)} per player`}
                  </span>
                </div>
              ))}
            </div>
            <p className="field-help">
              Pod awards are added to playoff prizes. Amounts show awards
              earned, not payment status. Per-player amounts appear only where
              confirmed.
            </p>
          </section>
          {s.prizePool === null && (
            <p className="fine-note">
              Season 1 prize amounts and payment status are not recorded in the
              preserved source.
            </p>
          )}
          <div className="fine-note">
            <strong>Season record</strong>
            <p>Three-team pods · Two matches per team · Eight-team playoffs.</p>
          </div>
        </>
      )}
      {view === "standings" && (
        <>
          <p className="muted">
            Regular season only. Ranked by match record, hole points, holes won,
            then lowest cumulative net better-ball. Playoff results are
            separate.
          </p>
          <div className="archive-pods">
            {[...new Set(s.entries.map((e) => e.pod))]
              .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
              .map((pod) => (
                <section key={pod}>
                  <h2>Pod {pod}</h2>
                  <div
                    className="table-scroll"
                    tabIndex={0}
                    role="region"
                    aria-label={`Season ${year} Pod ${pod} standings`}
                  >
                    <table className="archive-table">
                      <caption className="sr-only">
                        {year} Pod {pod} regular-season standings
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Team</th>
                          <th scope="col">W–L–T</th>
                          <th scope="col">Pts</th>
                          <th scope="col">Holes won</th>
                          <th scope="col">Net BB</th>
                        </tr>
                      </thead>
                      <tbody>
                        {regularRows
                          .filter(
                            (r) =>
                              s.entries.find((e) => e.teamId === r.id)?.pod ===
                              pod,
                          )
                          .map((r) => (
                            <tr key={r.id}>
                              <th scope="row">
                                <Link href={`/records/teams/${r.id}`}>
                                  {r.name}
                                </Link>
                              </th>
                              <td>{recordLabel(r)}</td>
                              <td>{r.points}</td>
                              <td>{r.holesWon}</td>
                              <td>{r.netTotal}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
          </div>
        </>
      )}
      {view === "results" && <ArchiveResults season={s} />}
      {view === "playoffs" &&
        (s.complete ? (
          <>
            <ConnectedBracket
              games={s.games}
              baseHref={`/history/${year}?view=playoffs`}
              label={`${year} archive`}
            />
          </>
        ) : (
          <Empty title="Playoffs not started">
            <p>No playoff result is official yet.</p>
            <Link className="text-link" href="/bracket">
              View the current playoff picture
            </Link>
          </Empty>
        ))}
    </>
  );
}
function ArchiveResults({ season: s }: { season: SeasonRecord }) {
  const params = useSearchParams();
  const searchInput = useRef<HTMLInputElement>(null);
  const scopeInput = useRef<HTMLSelectElement>(null);
  const q = params.get("q") ?? "";
  const phase =
    params.get("phase") === "regular"
      ? "regular"
      : params.get("phase") === "playoffs"
        ? "playoffs"
        : "all";
  const query = q.trim().toLowerCase();
  const games = s.games
    .filter((game) => {
      if (phase !== "all" && game.phase !== phase) return false;
      const names = [game.a, game.b].flatMap((id) => {
        const entry = s.entries.find((team) => team.teamId === id);
        return [entryName(s, id), ...(entry?.playerNames ?? [])];
      });
      return names.some((name) => name.toLowerCase().includes(query));
    })
    .sort(compareHistoricalGames);
  function change(key: "q" | "phase", value: string) {
    const next = new URLSearchParams(window.location.search);
    next.set("view", "results");
    if (!value || (value === "all" && key === "phase")) next.delete(key);
    else next.set(key, value);
    const href = `/history/${s.year}?${next}`;
    if (key === "q") window.history.replaceState(null, "", href);
    else window.history.pushState(null, "", href);
  }
  return (
    <>
      <div className="record-controls archive-result-controls">
        <label>
          Find a player or team
          <input
            ref={searchInput}
            type="search"
            value={q}
            onChange={(event) => change("q", event.target.value)}
            placeholder="Search names"
          />
        </label>
        <label>
          Match scope
          <select
            ref={scopeInput}
            value={phase}
            onChange={(event) => change("phase", event.target.value)}
          >
            <option value="all">All matches</option>
            <option value="regular">Regular season</option>
            <option value="playoffs">Playoffs</option>
          </select>
        </label>
      </div>
      <p className="field-help" role="status">
        {games.length} of {s.games.length} official results
      </p>
      {(query || phase !== "all") && (
        <div className="archive-result-actions">
          {query && (
            <button
              className="button outline"
              onClick={() => {
                change("q", "");
                searchInput.current?.focus();
              }}
            >
              Clear search
            </button>
          )}
          {phase !== "all" && (
            <button
              className="button outline"
              onClick={() => {
                change("phase", "all");
                scopeInput.current?.focus();
              }}
            >
              Show all matches
            </button>
          )}
        </div>
      )}
      {games.length ? (
        <GameList season={s} games={games} />
      ) : (
        <Empty title="No matching results">
          <p>
            Try another name or show all matches to include both the regular
            season and playoffs.
          </p>
        </Empty>
      )}
    </>
  );
}
export function GameList({
  season: s,
  games,
  compact = false,
  from = "results",
  team,
}: {
  from?: "results" | "matches" | "team";
  team?: string;
  season: SeasonRecord;
  games: HistoricalGame[];
  compact?: boolean;
}) {
  const params = useSearchParams();
  const resultQuery = new URLSearchParams(params.toString());
  resultQuery.set("from", from);
  if (team) resultQuery.set("team", team);
  return (
    <div className={`archive-games ${compact ? "compact" : ""}`}>
      {games.map((g) => (
        <Link
          className="archive-game"
          href={`${g.href}?${resultQuery}`}
          key={g.id}
        >
          <span className="eyebrow">
            {g.round} · {dateLabel(g.date)}
          </span>
          <div className="archive-pairings">
            {[g.a, g.b].map((team, index) => (
              <span className={g.winner === team ? "winner" : ""} key={team}>
                <span className="archive-team-name">{entryName(s, team)}</span>
                {g.winner === team && <span className="winner-tag">W</span>}
                {g.points && (
                  <strong className="archive-team-points">
                    {g.points[index]}
                  </strong>
                )}
              </span>
            ))}
          </div>
          <div className="archive-result-footer">
            <span>
              {g.phase === "regular"
                ? "Final · Hole points"
                : "Final · Match play"}
            </span>
            <strong>{g.score}</strong>
            <Icon name="arrow" size={16} />
          </div>
        </Link>
      ))}
    </div>
  );
}
function recordLabel(r: CareerRow) {
  return `${r.won}–${r.lost}–${r.tied}`;
}
export function RecordBook() {
  const { matches } = usePreview();
  const searchInput = useRef<HTMLInputElement>(null);
  const scopeInput = useRef<HTMLSelectElement>(null);
  const params = useSearchParams();
  const kind = params.get("kind") === "players" ? "players" : "teams";
  const phase =
    params.get("phase") === "regular"
      ? "regular"
      : params.get("phase") === "playoffs"
        ? "playoffs"
        : "all";
  const sort = ["titles", "rate"].includes(params.get("sort") ?? "")
    ? params.get("sort")!
    : "wins";
  const year = (offseason ? ["2026"] : ["2026", "2027"]).includes(
    params.get("season") ?? "",
  )
    ? params.get("season")!
    : "all";
  const q = params.get("q") ?? "";
  const records = seasons(matches).filter((s) =>
    year === "all" ? !s.sample : String(s.year) === year,
  );
  const metric = (r: CareerRow) =>
    sort === "titles"
      ? r.titles
      : sort === "rate"
        ? r.played
          ? r.won / r.played
          : -1
        : r.won;
  const all = careerRows(records, kind, phase)
    .filter((r) => phase === "all" || r.played > 0)
    .sort((a, b) => metric(b) - metric(a) || a.name.localeCompare(b.name));
  const ranked = all.map((r, i) => ({
    row: r,
    rank: all.findIndex((x) => metric(x) === metric(r)) + 1,
    i,
  }));
  const profileQuery = new URLSearchParams(params.toString());
  profileQuery.set("from", "records");
  const query = q.trim().toLowerCase();
  const rows = ranked.filter(
    ({ row }) =>
      row.name.toLowerCase().includes(query) ||
      (kind === "teams" &&
        records.some((season) =>
          season.entries.some(
            (entry) =>
              entry.teamId === row.id &&
              entry.playerNames.some((name) =>
                name.toLowerCase().includes(query),
              ),
          ),
        )),
  );
  function change(key: string, value: string) {
    const next = new URLSearchParams(window.location.search);
    next.set(key, value);
    if (key === "q") window.history.replaceState(null, "", `/records?${next}`);
    else window.history.pushState(null, "", `/records?${next}`);
  }
  return (
    <>
      <PageHeading eyebrow="The record book" title="All-time records" />
      <ArchiveNav active="records" />
      <HistoryDisclosure />
      <div className="record-controls">
        <label>
          Records for
          <select value={kind} onChange={(e) => change("kind", e.target.value)}>
            <option value="teams">Teams</option>
            <option value="players">Players</option>
          </select>
        </label>
        <label>
          Season
          <select
            value={year}
            onChange={(e) => change("season", e.target.value)}
          >
            <option value="all">All seasons</option>
            {!offseason && <option value="2027">2027 · Sample season</option>}
            <option value="2026">2026 · Complete</option>
          </select>
        </label>
        <label>
          Match scope
          <select
            ref={scopeInput}
            value={phase}
            onChange={(e) => change("phase", e.target.value)}
          >
            <option value="all">All matches</option>
            <option value="regular">Regular season</option>
            <option value="playoffs">Playoffs</option>
          </select>
        </label>
        <label>
          Rank by
          <select value={sort} onChange={(e) => change("sort", e.target.value)}>
            <option value="wins">Match wins</option>
            <option value="titles">Championships</option>
            <option value="rate">Win percentage</option>
          </select>
        </label>
        <label className="record-search">
          Find a {kind === "teams" ? "team" : "player"}
          <input
            ref={searchInput}
            type="search"
            value={q}
            onChange={(e) => change("q", e.target.value)}
            placeholder={
              kind === "teams"
                ? "Search team or player names"
                : "Search players"
            }
          />
        </label>
      </div>
      <p className="field-help" role="status">
        {rows.length} of {all.length} {kind} ·{" "}
        {year === "all" ? records.map((s) => s.year).join(", ") : year} ·{" "}
        {phase === "all"
          ? "Regular season + playoffs"
          : phase === "regular"
            ? "Regular season only"
            : "Playoffs only"}
      </p>
      {rows.length > 0 && (
        <p className="table-hint">Swipe the table to see every statistic.</p>
      )}
      {rows.length ? (
        <div
          className="table-scroll"
          role="region"
          aria-label="Career records, scroll for all columns"
          tabIndex={0}
        >
          <table className="archive-table record-table">
            <caption className="sr-only">
              {kind} ranked by {sort}, {phase} matches, {year} seasons
            </caption>
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">{kind === "teams" ? "Team" : "Player"}</th>
                <th scope="col">Seasons</th>
                <th scope="col">W–L–T</th>
                <th scope="col">Win %</th>
                <th scope="col">Titles</th>
                <th scope="col">Earned</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ row: r, rank }) => (
                <tr key={r.id}>
                  <td>{rank}</td>
                  <th scope="row">
                    <Link
                      href={`${kind === "teams" ? `/records/teams/${r.id}` : `/players/${r.id}`}?${profileQuery}`}
                    >
                      {r.name}
                    </Link>
                  </th>
                  <td>{r.seasons}</td>
                  <td>{recordLabel(r)}</td>
                  <td>
                    {r.played
                      ? `${((r.won / r.played) * 100).toFixed(1)}%`
                      : "—"}
                  </td>
                  <td>
                    {r.titles ? (
                      <span className="record-title-count">
                        <Icon name="cup" size={14} />
                        {r.titles}
                      </span>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td>{money(r.earned)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title={
            all.length
              ? "No matching records."
              : phase === "playoffs"
                ? "No playoff results yet."
                : phase === "regular"
                  ? "No regular-season results yet."
                  : "No records for this season."
          }
        >
          <p>
            {all.length
              ? "Try another name or a different match scope."
              : "Records appear after an official result is recorded."}
          </p>
          {all.length > 0 && q.trim() && (
            <button
              className="button outline"
              onClick={() => {
                change("q", "");
                searchInput.current?.focus();
              }}
            >
              Clear search
            </button>
          )}
          {phase !== "all" && (
            <button
              className="button outline"
              onClick={() => {
                change("phase", "all");
                scopeInput.current?.focus();
              }}
            >
              Show all matches
            </button>
          )}
        </Empty>
      )}
      <details className="fine-note">
        <summary>Statistics definitions</summary>
        <p>
          Win percentage = wins ÷ official matches; ties are not wins. No
          minimum appearances. Phase-specific rankings include only teams or
          players with an official result in that phase. Equal values share a
          rank. Match scope changes W–L–T and win percentage; seasons, titles
          and awards cover the selected seasons. Titles require a completed
          season. Player records reflect their team’s match outcomes, not
          individual stroke-play wins. Player earnings use confirmed splits
          only. Earned does not mean paid. All seasons excludes the fictional
          Season 2 demo.
        </p>
      </details>
    </>
  );
}
export function CareerProfile({
  id,
  kind,
}: {
  id: string;
  kind: "teams" | "players";
}) {
  const { matches } = usePreview();
  const records = seasons(matches);
  const params = useSearchParams();
  const backQuery = new URLSearchParams(
    params.get("from") === "records" ? params.toString() : "",
  );
  backQuery.delete("from");
  backQuery.set("kind", kind);
  const row = careerRows(records, kind).find((r) => r.id === id);
  if (!row)
    return (
      <Empty title="Record not found">
        <Link href="/records">Back to records</Link>
      </Empty>
    );
  const appearances = records.filter((s) =>
    s.entries.some((e) =>
      kind === "teams" ? e.teamId === id : e.playerIds.includes(id),
    ),
  );
  const games = careerGames(records, kind, id);
  return (
    <>
      <Link href={`/records?${backQuery}`} className="back-link">
        <Icon name="back" size={16} />
        The record book
      </Link>
      <PageHeading
        eyebrow={
          kind === "teams"
            ? "PARTNERSHIP / CAREER RECORD"
            : "PLAYER / CAREER RECORD"
        }
        title={row.name}
        description={
          kind === "teams"
            ? "Every season for this partnership, in one place."
            : "The record follows the player, even when the partner changes."
        }
      />
      {appearances.every((s) => s.sample) ? (
        <p className="archive-disclosure">
          <strong>Fictional Season 2 career.</strong> Sample results and
          proposed awards for this demo only. Player shares illustrate an equal
          split; Season 2 amounts and split policy are unconfirmed. Excluded
          from official all-time records.
        </p>
      ) : (
        <HistoryDisclosure />
      )}
      {row.titles > 0 && (
        <div className="career-honors">
          <Icon name="cup" size={26} />
          <div>
            <strong>{row.titles}-time Two-Man champion</strong>
            <p>
              {appearances
                .filter(
                  (s) =>
                    s.complete &&
                    s.entries.some(
                      (e) =>
                        e.teamId === s.champion &&
                        (kind === "teams"
                          ? e.teamId === id
                          : e.playerIds.includes(id)),
                    ),
                )
                .map((s) => (
                  <Link key={s.year} href={`/history/${s.year}`}>
                    {s.year} champions <Icon name="arrow" size={14} />
                  </Link>
                ))}
            </p>
          </div>
        </div>
      )}
      <div className="season-stats">
        <div>
          <span className="eyebrow">Seasons entered</span>
          <strong>{row.seasons}</strong>
        </div>
        <div>
          <span className="eyebrow">Career W–L–T</span>
          <strong>{recordLabel(row)}</strong>
        </div>
        <div>
          <span className="eyebrow">Official matches</span>
          <strong>{row.played}</strong>
        </div>
        <div>
          <span className="eyebrow">
            {kind === "teams" ? "Team awards earned" : "Win percentage"}
          </span>
          <strong>
            {kind === "teams"
              ? money(row.earned)
              : row.played
                ? `${((row.won / row.played) * 100).toFixed(1)}%`
                : "—"}
          </strong>
        </div>
      </div>
      {kind === "players" && (
        <p className="field-help">
          Awards earned: <strong>{money(row.earned)}</strong> · Confirmed player
          splits; not payment status.
        </p>
      )}
      {kind === "teams" && (
        <section className="section">
          <SectionTitle title="Head-to-head" />
          <p className="field-help">
            All seasons · This team’s hole points first
          </p>
          <div className="rivalry-list">
            {headToHead(records, id).map((opponent) => (
              <details key={opponent.id}>
                <summary>
                  <span>{opponent.name}</span>
                  <strong>
                    {opponent.won}–{opponent.lost}–{opponent.tied}{" "}
                    <small>W–L–T</small>
                  </strong>
                  <span>
                    {opponent.games.length}{" "}
                    {opponent.games.length === 1 ? "match" : "matches"}
                  </span>
                </summary>
                <div className="rivalry-results">
                  {opponent.games
                    .slice()
                    .sort(compareHistoricalGames)
                    .map((g) => (
                      <Link key={`${g.year}-${g.id}`} href={g.href}>
                        <span>
                          {g.year} · {g.round}
                        </span>
                        <strong>
                          {g.winner === id ? "Win" : g.winner ? "Loss" : "Tie"}{" "}
                          · {careerScore(g, id)}
                        </strong>
                        <Icon name="arrow" size={16} />
                      </Link>
                    ))}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}
      <section className="section">
        <SectionTitle title="Season by season" />
        <div
          className="table-scroll"
          role="region"
          aria-label="Career season history"
          tabIndex={0}
        >
          <table className="archive-table career-season-table">
            <thead>
              <tr>
                <th scope="col">Season</th>
                <th scope="col">Partnership</th>
                <th scope="col">W–L–T</th>
                <th scope="col">Finish</th>
              </tr>
            </thead>
            <tbody>
              {appearances.map((s) => {
                const entry = s.entries.find((e) =>
                  kind === "teams" ? e.teamId === id : e.playerIds.includes(id),
                )!;
                const stats = careerRows([s], kind).find((r) => r.id === id)!;
                const stage = s.games
                  .filter(
                    (g) =>
                      g.phase === "playoffs" &&
                      (g.a === entry.teamId || g.b === entry.teamId),
                  )
                  .at(-1);
                return (
                  <tr key={s.year}>
                    <th scope="row">
                      <Link href={`/history/${s.year}`}>{s.year}</Link>
                      <small>{s.complete ? "Complete" : "In progress"}</small>
                    </th>
                    <td>
                      <Link href={`/records/teams/${entry.teamId}`}>
                        {entry.name}
                      </Link>
                      <div className="career-player-links">
                        {entry.playerIds.map((p) => (
                          <Link key={p} href={`/players/${p}`}>
                            {players.find((x) => x.id === p)?.name}
                          </Link>
                        ))}
                      </div>
                    </td>
                    <td>{recordLabel(stats)}</td>
                    <td>
                      {!s.complete
                        ? "In progress"
                        : s.champion === entry.teamId
                          ? "Champion"
                          : s.runnerUp === entry.teamId
                            ? "Runner-up"
                            : (stage?.round ?? "Pod play")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="section">
        <SectionTitle title="Match history" />
        <p className="field-help">
          Regular season: this team’s hole points first · Playoffs: match-play
          margin
        </p>
        <div className="career-match-list">
          {games.map(({ season: s, game: g, teamId }) => (
            <Link key={`${s.year}-${g.id}`} href={g.href}>
              <span
                className={`career-outcome ${g.winner === teamId ? "win" : ""}`}
              >
                {g.winner === null ? "T" : g.winner === teamId ? "W" : "L"}
              </span>
              <div>
                <span className="eyebrow">
                  {s.year} · {g.round} · {dateLabel(g.date)}
                </span>
                <strong>vs {entryName(s, g.a === teamId ? g.b : g.a)}</strong>
              </div>
              <span>
                {careerScore(g, teamId)}
                <small>
                  {g.phase === "regular" ? "Hole points" : "Match play"}
                </small>
              </span>
              <Icon name="arrow" size={16} />
            </Link>
          ))}
        </div>
      </section>
      <details className="fine-note">
        <summary>Data coverage</summary>
        <p>
          Official results only. Missing historical statistics are not counted
          as zero.
        </p>
      </details>
    </>
  );
}
export function ArchivedMatch({ year, id }: { year: number; id: string }) {
  const { matches } = usePreview();
  const params = useSearchParams();
  const s = seasons(matches).find((s) => s.year === year);
  const g = s?.games.find((g) => g.id === id);
  if (!s || !g)
    return (
      <Empty title="Archived match not found">
        <Link href="/history">Browse seasons</Link>
      </Empty>
    );
  const backQuery = new URLSearchParams(
    params.get("from") === "results" ? params.toString() : "",
  );
  backQuery.delete("from");
  backQuery.set(
    "view",
    params.get("from") === "results" || g.phase === "regular"
      ? "results"
      : "playoffs",
  );
  return (
    <>
      <Link href={`/history/${year}?${backQuery}`} className="back-link">
        <Icon name="back" size={16} />
        {year} season archive
      </Link>
      <PageHeading
        eyebrow={`${year} / ${g.round.toUpperCase()} / FINAL RESULT`}
        title={`${entryName(s, g.a)}<br/>vs ${entryName(s, g.b)}`}
        description={`${dateLabel(g.date)} · ${g.course}`}
      />
      <HistoryDisclosure />
      <div className="archived-result">
        <Icon name="cup" size={30} />
        <div>
          <p className="eyebrow">
            {g.round === "Final" ? `${year} CHAMPIONS` : "MATCH RESULT"}
          </p>
          <h2>{g.winner ? entryName(s, g.winner) : "Match tied"}</h2>
        </div>
        <strong>{g.score}</strong>
      </div>
      <p className="muted">
        {g.phase === "regular"
          ? "Regular-season hole points, first-listed team then second-listed team."
          : "Final match-play margin."}
      </p>
      {g.phase === "regular" &&
        (g.card ? (
          <Scorecard
            match={g.card}
            labels={{
              teams: [entryName(s, g.a), entryName(s, g.b)],
              players: [
                ...s.entries.find((e) => e.teamId === g.a)!.playerNames,
                ...s.entries.find((e) => e.teamId === g.b)!.playerNames,
              ],
            }}
          />
        ) : (
          <div className="fine-note">
            <strong>Hole data not recorded</strong>
            <p>
              Individual hole scores were not recorded in this archived result.
            </p>
          </div>
        ))}
      <div className="archive-match-links">
        <Link href={`/records/teams/${g.a}`} className="button outline">
          {entryName(s, g.a)} career <Icon name="arrow" size={16} />
        </Link>
        <Link href={`/records/teams/${g.b}`} className="button outline">
          {entryName(s, g.b)} career <Icon name="arrow" size={16} />
        </Link>
      </div>
    </>
  );
}
