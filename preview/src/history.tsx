"use client";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { usePreview } from "./store";
import { money, dateLabel } from "./data";
import {
  seasons,
  entryName,
  careerRows,
  careerGames,
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
function SampleHistory() {
  return (
    <p className="archive-disclosure">
      <strong>Sample archive.</strong> Fictional winners, results and awards.
      Season 1 data has not been imported.
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
        eyebrow="THE TWO-MAN / LEAGUE HISTORY"
        title={champions ? "Champions" : "Season history"}
      />
      <ArchiveNav active={champions ? "champions" : "seasons"} />
      <SampleHistory />
      {champions ? (
        <div className="champions-roll">
          {completed.map((s) => (
            <Champion key={s.year} season={s} />
          ))}
        </div>
      ) : (
        <>
          <div className="archive-season-list">
            {records.map((s) => (
              <Link
                key={s.year}
                href={`/history/${s.year}`}
                className="archive-season-row"
              >
                <span className="archive-year">{s.year}</span>
                <div>
                  <p className="eyebrow">
                    SEASON {String(s.number).padStart(2, "0")} ·{" "}
                    {s.complete ? "COMPLETE" : "IN PROGRESS"}
                  </p>
                  <h2>
                    {s.champion ? entryName(s, s.champion) : "Current season"}
                  </h2>
                  <p>
                    {s.champion ? "Champions" : "In progress"} ·{" "}
                    {s.entries.length} teams · {s.games.length} official matches
                  </p>
                </div>
                <span className="archive-row-cta">
                  View season <Icon name="arrow" />
                </span>
              </Link>
            ))}
          </div>
          <section className="section">
            <SectionTitle title="Champions" href="/champions" />
            {completed.slice(0, 1).map((s) => (
              <Champion key={s.year} season={s} />
            ))}
          </section>
        </>
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
        <span>CHAMPIONS</span>
        <strong>{s.year}</strong>
        <Icon name="cup" size={36} />
      </div>
      <div className="champion-copy">
        <p className="eyebrow">
          SEASON {String(s.number).padStart(2, "0")} / THE TWO-MAN
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
  const regularRows = careerRows([s], "teams", "regular").sort(
    (a, b) =>
      b.won - a.won || b.points - a.points || a.name.localeCompare(b.name),
  );
  return (
    <>
      <Link href="/history" className="back-link">
        <Icon name="back" size={16} />
        All seasons
      </Link>
      <PageHeading
        eyebrow={`SEASON ${String(s.number).padStart(2, "0")} · ${s.complete ? "FINAL ARCHIVE" : "IN PROGRESS"}`}
        title={`${year}`}
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
              <option value="2027">2027 · In progress</option>
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
      <SampleHistory />
      {view === "overview" && (
        <>
          {s.champion ? (
            <Champion season={s} />
          ) : (
            <div className="archive-live">
              <p className="eyebrow">CURRENT SEASON</p>
              <h2>Season in progress</h2>
              <p>
                {s.games.length} regular-season results are official. Pending
                cards do not count toward career stats.
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
              <span className="eyebrow">Sample prize pool</span>
              <strong>{money(s.prizePool)}</strong>
            </div>
            <div>
              <span className="eyebrow">Format</span>
              <strong className="archive-small-stat">2 guaranteed</strong>
            </div>
          </div>
          <section className="section">
            <SectionTitle title="Season honors" />
            <div className="archive-honors">
              {s.awards.map((a) => (
                <div key={`${a.teamId}-${a.kind}`}>
                  <span className="eyebrow">{a.label}</span>
                  <Link href={`/records/teams/${a.teamId}`}>
                    {entryName(s, a.teamId)}
                  </Link>
                  <span>{money(a.amount)} earned</span>
                </div>
              ))}
            </div>
            <p className="field-help">
              Awards belong to teams. Earned does not mean paid; individual
              splits are not recorded.
            </p>
          </section>
          <div className="fine-note">
            <strong>Season record</strong>
            <p>Three-team pods · Two matches per team · Eight-team playoffs.</p>
          </div>
        </>
      )}
      {view === "standings" && (
        <>
          <p className="muted">
            Regular season only · W–L–T and hole points. Playoff results are
            separate.
          </p>
          <div className="archive-pods">
            {[...new Set(s.entries.map((e) => e.pod))].map((pod) => (
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
      {view === "results" && (
        <>
          <h2 className="archive-section-heading">
            All {s.games.length} official results
          </h2>
          <GameList
            season={s}
            games={[...s.games].sort((a, b) => b.date.localeCompare(a.date))}
          />
        </>
      )}
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
function GameList({
  season: s,
  games,
  compact = false,
}: {
  season: SeasonRecord;
  games: HistoricalGame[];
  compact?: boolean;
}) {
  return (
    <div className={`archive-games ${compact ? "compact" : ""}`}>
      {games.map((g) => (
        <Link className="archive-game" href={g.href} key={g.id}>
          <span className="eyebrow">
            {g.round} · {dateLabel(g.date)}
          </span>
          <div>
            <span className={g.winner === g.a ? "winner" : ""}>
              {entryName(s, g.a)}
              {g.winner === g.a && <span className="winner-tag">W</span>}
            </span>
            <span className={g.winner === g.b ? "winner" : ""}>
              {entryName(s, g.b)}
              {g.winner === g.b && <span className="winner-tag">W</span>}
            </span>
          </div>
          <strong>{g.score}</strong>
          <span className="field-help">
            {g.phase === "regular" ? "Hole points · A–B" : "Match-play result"}
          </span>
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
  const params = useSearchParams(),
    router = useRouter();
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
  const year = ["2026", "2027"].includes(params.get("season") ?? "")
    ? params.get("season")!
    : "all";
  const q = params.get("q") ?? "";
  const records = seasons(matches).filter(
    (s) => year === "all" || String(s.year) === year,
  );
  const metric = (r: CareerRow) =>
    sort === "titles"
      ? r.titles
      : sort === "rate"
        ? r.played
          ? r.won / r.played
          : -1
        : r.won;
  const all = careerRows(records, kind, phase).sort(
    (a, b) => metric(b) - metric(a) || a.name.localeCompare(b.name),
  );
  const ranked = all.map((r, i) => ({
    row: r,
    rank: all.findIndex((x) => metric(x) === metric(r)) + 1,
    i,
  }));
  const rows = ranked.filter(({ row }) =>
    row.name.toLowerCase().includes(q.trim().toLowerCase()),
  );
  function change(key: string, value: string) {
    const next = new URLSearchParams(params);
    next.set(key, value);
    router.replace(`/records?${next}`, { scroll: false });
  }
  return (
    <>
      <PageHeading eyebrow="THE RECORD BOOK" title="All-time records" />
      <ArchiveNav active="records" />
      <SampleHistory />
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
            <option value="2027">2027 · In progress</option>
            <option value="2026">2026 · Complete</option>
          </select>
        </label>
        <label>
          Match scope
          <select
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
            type="search"
            value={q}
            onChange={(e) => change("q", e.target.value)}
            placeholder={
              kind === "teams" ? "Search partnerships" : "Search players"
            }
          />
        </label>
      </div>
      <p className="field-help">
        {rows.length} of {all.length} {kind} ·{" "}
        {year === "all" ? "2026–2027; current season included" : year} ·{" "}
        {phase === "all"
          ? "Regular season + playoffs"
          : phase === "regular"
            ? "Regular season only"
            : "Playoffs only"}
      </p>
      <p className="table-hint">Swipe the table to see every statistic.</p>
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
                {kind === "teams" && <th scope="col">Earned</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ row: r, rank }) => (
                <tr key={r.id}>
                  <td>{rank}</td>
                  <th scope="row">
                    <Link
                      href={
                        kind === "teams"
                          ? `/records/teams/${r.id}`
                          : `/players/${r.id}`
                      }
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
                  {kind === "teams" && <td>{money(r.earned)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No matching records.">
          <button className="button outline" onClick={() => change("q", "")}>
            Clear search
          </button>
        </Empty>
      )}
      <details className="fine-note">
        <summary>Statistics definitions</summary>
        <p>
          Win percentage = wins ÷ official matches; ties are not wins. No
          minimum appearances. Equal values share a rank. Match scope changes
          W–L–T and win percentage; seasons, titles and team awards cover the
          selected seasons. Titles require a completed season. Player records
          reflect their team’s match outcomes, not individual stroke-play wins.
          No prize split is assumed.
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
      <Link href={`/records?kind=${kind}`} className="back-link">
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
      <SampleHistory />
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
      {kind === "teams" && (
        <section className="section">
          <SectionTitle title="Head-to-head" />
          <p className="field-help">All seasons · Official matches</p>
          <div className="rivalry-list">
            {headToHead(records, id).map((opponent) => (
              <details key={opponent.id}>
                <summary>
                  <span>{opponent.name}</span>
                  <strong>
                    {opponent.won}–{opponent.lost}–{opponent.tied}{" "}
                    <small>W–L–T</small>
                  </strong>
                  <span>{opponent.games.length} matches</span>
                </summary>
                <div className="rivalry-results">
                  {opponent.games
                    .slice()
                    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
                    .map((g) => (
                      <Link key={`${g.year}-${g.id}`} href={g.href}>
                        <span>
                          {g.year} · {g.round}
                        </span>
                        <strong>
                          {g.winner === id ? "Win" : g.winner ? "Loss" : "Tie"}{" "}
                          · {g.score}
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
          Regular season: hole points · Playoffs: match-play margin
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
                {g.score}
                <small>
                  {g.phase === "regular"
                    ? `A–B · ${entryName(s, g.a)} first`
                    : "Match play"}
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
  const s = seasons(matches).find((s) => s.year === year);
  const g = s?.games.find((g) => g.id === id);
  if (!s || !g)
    return (
      <Empty title="Archived match not found">
        <Link href="/history">Browse seasons</Link>
      </Empty>
    );
  return (
    <>
      <Link
        href={`/history/${year}?view=${g.phase === "playoffs" ? "playoffs" : "results"}`}
        className="back-link"
      >
        <Icon name="back" size={16} />
        {year} season archive
      </Link>
      <PageHeading
        eyebrow={`${year} / ${g.round.toUpperCase()} / FINAL RESULT`}
        title={`${entryName(s, g.a)}<br/>vs ${entryName(s, g.b)}`}
        description={`${dateLabel(g.date)} · ${g.course}`}
      />
      <SampleHistory />
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
      {g.card ? (
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
          <p>No scorecard is available for this sample match.</p>
        </div>
      )}
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
