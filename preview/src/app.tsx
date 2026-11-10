"use client";
import { offseason } from "./site-mode";
import { OffseasonHome, OffseasonRules } from "./offseason";
import { ArchiveGraphics } from "./archive-graphics";
import { publication } from "./publication";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePreview } from "./store";
import { teams, pods, nameOf, money, season, dateLabel } from "./data";
import { standings, podWinner, qualified } from "./domain";
import {
  Icon,
  Mark,
  Badge,
  TeamAvatar,
  TeamName,
  PageHeading,
  SectionTitle,
  MatchRow,
  Empty,
} from "./ui";
import { MatchDetail } from "./workflows";
import { Commissioner } from "./commissioner";
import { ConnectedBracket } from "./bracket";
import {
  archive2026,
  currentSeason,
  compareHistoricalGames,
  careerRows,
} from "./history-data";
import {
  HistoryHome,
  SeasonArchive,
  RecordBook,
  CareerProfile,
  ArchivedMatch,
  GameList,
} from "./history";
import { StandingsTable } from "./standings-table";
import { PlayoffPicture } from "./playoff-picture";
import { matchReturn } from "./match-return";
import { bracketMatches, type BracketMatch } from "./bracket-model";
import { RULES_JUDGE_URL } from "./rules-judge";
const nav = offseason
  ? [
      ["/", "Home", "home"],
      ["/history/2026", "Season 1", "cup"],
      ["/history", "History", "calendar"],
    ]
  : [
      ["/", "Home", "home"],
      ["/matches", "Matches", "calendar"],
      ["/standings", "Standings", "table"],
      ["/bracket", "Bracket", "cup"],
    ];
export function PreviewApp() {
  return (
    <Suspense fallback={<div className="loading">Opening the clubhouse…</div>}>
      <App />
    </Suspense>
  );
}
function App() {
  const path = usePathname();
  const store = usePreview();
  const router = useRouter();
  const [resetOpen, setResetOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menu) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [menu]);
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {!offseason && (
        <div className="preview-strip">
          <span>
            <span className="preview-dot" /> Season 2 preview{" "}
            <span className="strip-detail">· Sample current season</span>
          </span>
          <div>
            <button
              onClick={() => setResetOpen(!resetOpen)}
              aria-expanded={resetOpen}
            >
              Reset demo
            </button>
          </div>
        </div>
      )}
      {resetOpen && (
        <div className="reset-panel">
          <p>
            Restore the sample season? This clears your local preview edits.
          </p>
          <button
            className="button small"
            onClick={() => {
              store.reset();
              router.push("/");
              setResetOpen(false);
            }}
          >
            Restore sample
          </button>
          <button className="text-link" onClick={() => setResetOpen(false)}>
            Keep edits
          </button>
        </div>
      )}
      <header className="site-header">
        <Link className="brand" href="/" aria-label="The Two-Man clubhouse">
          <Mark />
          <span className="wordmark">
            THE
            <br />
            <b>TWO-MAN</b>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {nav.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={
                (
                  href === "/"
                    ? path === "/"
                    : href === "/history" && offseason
                      ? path === "/history" ||
                        path.startsWith("/records") ||
                        path.startsWith("/players") ||
                        path === "/champions"
                      : path.startsWith(href)
                )
                  ? "page"
                  : undefined
              }
            >
              {label}
            </Link>
          ))}
          {!offseason && (
            <>
              <Link
                href="/earnings"
                aria-current={path === "/earnings" ? "page" : undefined}
              >
                The purse
              </Link>
              <Link
                href="/history"
                aria-current={
                  path.startsWith("/history") ||
                  path.startsWith("/records") ||
                  path.startsWith("/players") ||
                  path === "/champions"
                    ? "page"
                    : undefined
                }
              >
                History
              </Link>
            </>
          )}
        </nav>
        <div className="header-end">
          <Link className="text-link header-rules" href="/rules">
            <Icon name="book" size={18} /> <span>Rules</span>
          </Link>
          <a
            className="text-link header-ai"
            href={RULES_JUDGE_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="AI rules judge (opens in a new tab)"
          >
            <Icon name="ai" size={18} />
            <span>AI rules judge</span>
          </a>
          <a
            className="text-link header-instagram"
            href="https://www.instagram.com/twomantournament/"
            target="_blank"
            rel="noreferrer"
            aria-label="The Two-Man on Instagram"
          >
            <Icon name="instagram" size={18} /> Instagram
          </a>
          <button
            ref={menuButton}
            className="menu-button"
            aria-controls="more-navigation"
            aria-label="More navigation"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            <Icon name={menu ? "close" : "menu"} />
          </button>
        </div>
      </header>
      {menu && (
        <nav
          id="more-navigation"
          className="more-nav"
          aria-label="More navigation"
        >
          {[
            ["/history", "Season history"],
            ...(offseason ? [] : [["/earnings", "The purse"]]),
            ["/rules", "Format & rules"],
          ].map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setMenu(false)}>
              {label}
              <Icon name="arrow" />
            </Link>
          ))}
        </nav>
      )}
      <main
        id="main"
        className={path === "/review" ? "main commissioner-main" : "main"}
        tabIndex={-1}
      >
        {!store.ready ? (
          <div className="loading" role="status">
            Loading your sample season…
          </div>
        ) : path === "/" ? (
          offseason ? (
            <OffseasonHome />
          ) : (
            <Home />
          )
        ) : path === "/history" || path === "/champions" ? (
          <HistoryHome champions={path === "/champions"} />
        ) : path.startsWith("/history/") && path.includes("/matches/") ? (
          <ArchivedMatch
            year={Number(path.split("/")[2])}
            id={path.split("/")[4]}
          />
        ) : path.startsWith("/history/") ? (
          <SeasonArchive year={Number(path.split("/")[2])} />
        ) : path === "/records" ? (
          <RecordBook />
        ) : path.startsWith("/records/teams/") ? (
          <CareerProfile kind="teams" id={path.split("/")[3]} />
        ) : path.startsWith("/players/") ? (
          <CareerProfile kind="players" id={path.split("/")[2]} />
        ) : path === "/standings" ? (
          <Standings />
        ) : path === "/matches" ? (
          <Matches />
        ) : path.startsWith("/playoffs/") ? (
          <PlayoffDetail id={path.split("/")[2]} />
        ) : path.startsWith("/matches/") ? (
          <MatchDetail id={path.split("/")[2]} />
        ) : path.startsWith("/teams/") ? (
          <TeamDetail id={path.split("/")[2]} />
        ) : path === "/bracket" ? (
          <Bracket />
        ) : path === "/earnings" ? (
          <Earnings />
        ) : path === "/rules" ? (
          offseason ? (
            <OffseasonRules />
          ) : (
            <Rules />
          )
        ) : path === "/submit" ? (
          <Empty title="Send your card to the commissioner.">
            <p>
              Text or email your completed scorecard and GHIN screenshots
              showing all four players, course and tees. There is no website
              submission.
            </p>
            <Link href="/rules">Read the checklist</Link>
          </Empty>
        ) : path === "/review" ? (
          offseason ? (
            <ArchiveGraphics />
          ) : (
            <Commissioner />
          )
        ) : (
          <Empty title="Page not found">
            <Link href="/">Return to the clubhouse</Link>
          </Empty>
        )}
      </main>
      <footer className="footer">
        <Link className="footer-brand" href="/">
          THE TWO-MAN
        </Link>
        <nav aria-label="Footer">
          <Link href="/rules">Format & rules</Link>
          <a
            href="https://www.instagram.com/twomantournament/"
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="instagram" size={18} /> Instagram
          </a>
        </nav>
      </footer>
      <nav
        className={offseason ? "mobile-nav offseason-nav" : "mobile-nav"}
        aria-label="Mobile navigation"
      >
        {nav.map(([href, label, icon]) => (
          <Link
            key={href}
            href={href}
            aria-current={
              (
                href === "/"
                  ? path === "/"
                  : href === "/history" && offseason
                    ? path === "/history" ||
                      path.startsWith("/records") ||
                      path.startsWith("/players") ||
                      path === "/champions"
                    : path.startsWith(href)
              )
                ? "page"
                : undefined
            }
          >
            <Icon name={icon} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="status-message" role="status" key={store.notice}>
        {store.notice}
      </div>
    </>
  );
}
function Home() {
  const { matches } = usePreview();
  const [limit, setLimit] = useState(4);
  const pending = matches.filter((m) => m.status !== "official");
  const record = currentSeason(matches);
  const official = [...record.games].sort(compareHistoricalGames);
  const regularCount = matches.length - pending.length;
  const playoffNodes = bracketMatches(publication.seeds, publication.games);
  const upcomingPlayoffs = playoffNodes.filter(
    (n) => !n.winner && n.slots.every((s) => s.id),
  );
  const nextRound = upcomingPlayoffs[0]?.round;
  return (
    <div className="feed-home">
      <header className="clubhouse-heading">
        <div>
          <h1>The Two-Man</h1>
        </div>
        <div className="clubhouse-mark" aria-hidden="true">
          <Mark />
        </div>
      </header>
      <div className="clubhouse-progress">
        <p>
          <strong>
            {regularCount} of {matches.length}
          </strong>{" "}
          regular-season matches final
        </p>
        <progress
          value={regularCount}
          max={matches.length || 1}
          aria-label="Regular-season matches completed"
        />
        <Link href="/standings?view=qualification">
          Playoff picture <Icon name="arrow" size={16} />
        </Link>
      </div>
      <label className="team-finder">
        Find your team
        <select
          defaultValue=""
          onChange={(e) => {
            if (e.target.value)
              window.location.assign(`/teams/${e.target.value}`);
          }}
        >
          <option value="" disabled>
            Select your partnership
          </option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {nameOf(t.id)}
            </option>
          ))}
        </select>
      </label>
      {record.champion ? (
        <section className="notice season-moment">
          <Icon name="cup" />
          <div>
            <h2>{nameOf(record.champion)} · Season 2 champions</h2>
            <p>{record.games.find((g) => g.id === "final")?.score} · Final</p>
            <Link href="/playoffs/final">View championship result</Link> ·{" "}
            <Link href="/earnings">Final awards</Link>
          </div>
        </section>
      ) : nextRound ? (
        <section className="notice season-moment">
          <Icon name="cup" />
          <div>
            <h2>
              {nextRound === "final"
                ? "Championship"
                : nextRound === "semis"
                  ? "Semifinals"
                  : "Quarterfinals"}{" "}
              · Next up
            </h2>
            <Link href={`/bracket?round=${nextRound}`}>See the pairings</Link>
          </div>
        </section>
      ) : !regularCount ? (
        <section className="notice season-moment">
          <Icon name="calendar" />
          <div>
            <h2>Ready for the first round</h2>
            <p>
              Coordinate with your opponents in the group text. Season 2 dates
              and format are not yet confirmed.
            </p>
            <Link href="/matches?filter=upcoming">Find your fixtures</Link> ·{" "}
            <Link href="/rules#strokes">Before you tee off</Link>
          </div>
        </section>
      ) : null}
      <nav className="feed-shortcuts" aria-label="Season shortcuts">
        <Link href="/standings">
          Standings <Icon name="arrow" size={14} />
        </Link>
        <Link href="/bracket">
          Bracket <Icon name="arrow" size={14} />
        </Link>
        <Link href={record.complete ? "/earnings" : "/matches?filter=upcoming"}>
          {record.complete ? "Final awards" : "Upcoming matches"}{" "}
          <Icon name="arrow" size={14} />
        </Link>
      </nav>
      <div
        className={`clubhouse-columns${!regularCount ? " before-first-result" : ""}`}
      >
        <section className="clubhouse-results" aria-label="Recent results">
          <SectionTitle
            title="Recent results"
            href="/matches?filter=official"
            label="All results"
          />
          <ol className="activity-timeline">
            {official.slice(0, limit).map((m) => {
              return (
                <li key={m.id}>
                  <div className="feed-meta">
                    <time dateTime={m.date}>{dateLabel(m.date)}</time>
                    <span>Final</span>
                  </div>
                  <div className="feed-scoreboard">
                    <div className="feed-score-label">
                      <span>{m.round}</span>
                      <span>
                        {m.phase === "regular" ? "Hole points" : "Match play"}
                      </span>
                    </div>
                    <Link
                      className={`feed-result${m.phase === "playoffs" ? " playoff-feed-result" : ""}`}
                      href={m.href}
                    >
                      {[
                        { id: m.a, points: m.points?.[0] },
                        { id: m.b, points: m.points?.[1] },
                      ].map(({ id, points }) => (
                        <span
                          key={id}
                          className={
                            m.winner === id ? "feed-winner" : undefined
                          }
                        >
                          <span className="feed-team">
                            {nameOf(id)}
                            {m.winner === id && <small>Won</small>}
                          </span>
                          <b>
                            <span className="sr-only">
                              {m.phase === "regular"
                                ? "Hole points: "
                                : "Match result: "}
                            </span>
                            {points ?? (m.winner === id ? m.score : "—")}
                          </b>
                        </span>
                      ))}
                    </Link>
                  </div>
                  <p className="feed-detail">{m.course}</p>
                  <Link className="text-link" href={m.href}>
                    {m.phase === "regular" ? "Scorecard" : "View result"}{" "}
                    <Icon name="arrow" size={14} />
                  </Link>
                </li>
              );
            })}
          </ol>
          {!official.length && (
            <p className="clubhouse-note">
              Results appear here after the commissioner posts the first match.
            </p>
          )}
          {official.length > limit && (
            <button
              className="button outline"
              onClick={() => setLimit(limit + 4)}
            >
              Earlier results
            </button>
          )}
        </section>
        <aside className="clubhouse-aside" aria-label="Around the tournament">
          {(pending.length > 0 || upcomingPlayoffs.length > 0) && (
            <section aria-label="Matches still to play">
              <SectionTitle
                title="Still to play"
                href="/matches?filter=upcoming"
                label="Fixtures"
              />
              <p className="clubhouse-note">
                {pending.length
                  ? `${pending.length} matches awaiting a final result.`
                  : `${upcomingPlayoffs.length} playoff matches ready to play.`}
              </p>
              <div className="clubhouse-fixtures">
                {pending.slice(0, 3).map((m) => (
                  <MatchRow key={m.id} match={m} />
                ))}
                {upcomingPlayoffs.map((m) => (
                  <PlayoffPairing key={m.id} match={m} />
                ))}
              </div>
              {pending.length > 3 && (
                <Link className="text-link" href="/matches?filter=upcoming">
                  View all {pending.length} remaining matches{" "}
                  <Icon name="arrow" size={16} />
                </Link>
              )}
            </section>
          )}
          <section className="clubhouse-rules">
            <h2>On the course</h2>
            <Link className="text-link" href="/rules">
              Tournament format & rules <Icon name="arrow" size={16} />
            </Link>
            <a
              className="text-link"
              href={RULES_JUDGE_URL}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="ai" size={18} /> AI rules judge
            </a>
          </section>
        </aside>
      </div>
    </div>
  );
}
function Matches() {
  const { matches } = usePreview();
  const query = useSearchParams();
  const requestedFilter = query.get("filter");
  const filter =
    requestedFilter === "review"
      ? "upcoming"
      : ["all", "upcoming", "official"].includes(requestedFilter ?? "")
        ? requestedFilter!
        : "all";
  const search = query.get("q") ?? "";
  const record = currentSeason(matches);
  const matchesSearch = (a: string, b: string, course = "") =>
    `${nameOf(a)} ${nameOf(b)} ${course}`
      .toLowerCase()
      .includes(search.trim().toLowerCase());
  const games =
    filter === "upcoming"
      ? []
      : record.games
          .filter((g) => matchesSearch(g.a, g.b, g.course))
          .sort(compareHistoricalGames);
  const pending =
    filter === "official"
      ? []
      : matches.filter(
          (m) => m.status !== "official" && matchesSearch(m.a, m.b),
        );
  const playoffFixtures = bracketMatches(
    publication.seeds,
    publication.games,
  ).filter((n) => !n.winner && n.slots.every((s) => s.id));
  const upcoming =
    filter === "official"
      ? []
      : playoffFixtures.filter((n) =>
          matchesSearch(n.slots[0].id!, n.slots[1].id!),
        );
  const count = games.length + pending.length + upcoming.length;
  const returnQuery = new URLSearchParams(query.toString());
  returnQuery.set("from", "matches");
  const update = (key: string, value: string) => {
    const p = new URLSearchParams(window.location.search);
    if (value) p.set(key, value);
    else p.delete(key);
    window.history.replaceState(null, "", `/matches?${p}`);
  };
  return (
    <>
      <PageHeading eyebrow="The fixtures" title="Matches & results" />
      <div className="toolbar">
        <nav className="tabs" aria-label="Match status">
          {[
            ["all", "All matches"],
            ["upcoming", "Pre-match"],
            ["official", "Completed"],
          ].map(([v, l]) => (
            <Link
              key={v}
              href={`/matches?filter=${v}${search ? `&q=${encodeURIComponent(search)}` : ""}`}
              aria-current={filter === v ? "page" : undefined}
            >
              {l}
            </Link>
          ))}
        </nav>
        <div className="search">
          <Icon name="search" size={18} />
          <label className="sr-only" htmlFor="match-search">
            Find a team or course
          </label>
          <input
            id="match-search"
            value={search}
            onChange={(e) => update("q", e.target.value)}
            placeholder="Find a team or course"
          />
          {search && (
            <button
              aria-label="Clear search"
              onClick={() => {
                update("q", "");
                document.getElementById("match-search")?.focus();
              }}
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </div>
      </div>
      <p className="result-count">
        {count} of{" "}
        {matches.length + publication.games.length + playoffFixtures.length}{" "}
        matches · Regular season & playoffs
      </p>
      {games.length > 0 && (
        <GameList season={record} games={games} from="matches" />
      )}
      <div className="match-grid">
        {pending.map((m) => (
          <MatchRow
            key={m.id}
            match={m}
            href={`/matches/${m.id}?${returnQuery}`}
          />
        ))}
        {upcoming.map((m) => (
          <PlayoffPairing key={m.id} match={m} />
        ))}
      </div>
      {count === 0 && (
        <Empty title="No matches found">
          <p>Try a different team name or clear the filter.</p>
          <button
            className="button outline"
            onClick={() => {
              window.history.pushState(null, "", "/matches");
              document.getElementById("match-search")?.focus();
            }}
          >
            Show all matches
          </button>
        </Empty>
      )}
    </>
  );
}
function Standings() {
  const { matches } = usePreview();
  const query = useSearchParams();
  const view = query.get("view") ?? "pods";
  const rows = standings(matches);
  return (
    <>
      <PageHeading eyebrow="The regular season" title="Standings" />
      <div className="toolbar">
        <nav className="tabs" aria-label="Standings views">
          {[
            ["pods", "By pod"],
            ["field", "Full field"],
            ["qualification", "Playoff picture"],
          ].map(([v, l]) => (
            <Link
              key={v}
              href={`/standings?view=${v}`}
              aria-current={view === v ? "page" : undefined}
            >
              {l}
            </Link>
          ))}
        </nav>
        <span className="muted">
          {matches.filter((m) => m.status === "official").length} / 18 matches
          official
        </span>
      </div>
      {view === "qualification" ? (
        <PlayoffPicture matches={matches} />
      ) : view === "field" ? (
        <StandingsTable rows={rows} label="Full field" />
      ) : (
        <div className="pods-grid">
          {pods.map((pod) => {
            const winner = podWinner(matches, pod);
            return (
              <section className="pod-panel" key={pod}>
                <div className="pod-heading">
                  <h2>
                    <span>Regular season</span>Pod {pod}
                  </h2>
                  {winner ? (
                    <Badge status="Complete" />
                  ) : (
                    <span className="muted">In play</span>
                  )}
                </div>
                <StandingsTable
                  rows={rows.filter((r) => r.team.pod === pod)}
                  label={`Pod ${pod}`}
                />
                <div className="pod-foot">
                  {winner ? (
                    <>
                      <Icon name="cup" size={15} />
                      {nameOf(winner)} · {money(season.podAward)} earned
                    </>
                  ) : (
                    <>Winner earns a playoff place + {money(season.podAward)}</>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
      <div className="fine-note">
        <strong>How teams are ranked</strong>
        <p>
          Match record → hole points → holes won → cumulative net better-ball.
          Any remaining tie needs a recorded commissioner decision. Award
          amounts are illustrative.
        </p>
      </div>
    </>
  );
}
function TeamDetail({ id }: { id: string }) {
  const { matches } = usePreview();
  const t = teams.find((t) => t.id === id);
  if (!t)
    return (
      <Empty title="Team not found">
        <Link href="/standings">View the field</Link>
      </Empty>
    );
  const row = standings(matches).find((r) => r.team.id === id)!;
  const record = currentSeason(matches);
  const awards = record.awards.filter((a) => a.teamId === id);
  const earned = awards.reduce((total, a) => total + (a.amount ?? 0), 0);
  const games = record.games
    .filter((g) => g.a === id || g.b === id)
    .sort(compareHistoricalGames);
  const upcoming = bracketMatches(publication.seeds, publication.games).filter(
    (n) => !n.winner && n.slots.some((s) => s.id === id),
  );
  const lastPlayoff = games.find((g) => g.phase === "playoffs");
  const finish =
    record.champion === id
      ? "Season 2 champions"
      : record.runnerUp === id
        ? "Season 2 runners-up"
        : lastPlayoff && lastPlayoff.winner !== id
          ? `Finished in the ${lastPlayoff.round.toLowerCase()}`
          : upcoming.length
            ? "Still in the playoffs"
            : publication.seeds.length && !publication.seeds.includes(id)
              ? "Regular season complete · Did not qualify"
              : null;
  return (
    <>
      <Link href="/standings" className="back-link">
        <Icon name="back" size={16} />
        The field
      </Link>
      <section className="team-hero">
        <TeamAvatar id={id} size="large" />
        <div>
          <p className="eyebrow">Pod {t.pod} · Season 02</p>
          <h1>
            {t.names[0]}
            <br />
            <span>& {t.names[1]}</span>
          </h1>

          <Link className="text-link" href={`/records/teams/${id}`}>
            View career & past seasons <Icon name="arrow" size={16} />
          </Link>
        </div>
        <div className="team-record">
          <strong>
            {row.won}–{row.lost}–{row.tied}
          </strong>
          <span>Regular-season record</span>
        </div>
      </section>
      <div className="season-stats">
        <div>
          <span className="eyebrow">Hole points</span>
          <strong>{row.points}</strong>
        </div>
        <div>
          <span className="eyebrow">Holes won</span>
          <strong>{row.holesWon}</strong>
        </div>
        <div>
          <span className="eyebrow">Cards official</span>
          <strong>
            {row.played}
            <small> / 2</small>
          </strong>
        </div>
        <Link href="/earnings">
          <span className="eyebrow">Earned · sample awards</span>
          <strong>
            {money(earned)}
            <Icon name="arrow" />
          </strong>
        </Link>
      </div>
      {finish && (
        <div className="notice">
          <Icon name="cup" />
          <div>
            <strong>{finish}</strong>
            <p>
              <Link href={`/bracket?team=${id}`}>Follow the playoff path</Link>
            </p>
          </div>
        </div>
      )}
      <section className="section">
        <SectionTitle title="The matches" />
        {upcoming.map((m) => (
          <PlayoffPairing key={m.id} match={m} />
        ))}
        <div className="match-grid">
          {matches
            .filter(
              (m) => m.status !== "official" && (m.a === id || m.b === id),
            )
            .map((m) => (
              <MatchRow
                key={m.id}
                match={m}
                href={`/matches/${m.id}?from=team&team=${id}`}
              />
            ))}
        </div>
        <GameList season={record} games={games} from="team" team={id} />
      </section>
      {awards.length > 0 && (
        <section className="notice">
          <Icon name="cup" />
          <div>
            <strong>
              {money(earned)} team total · {money(earned / 2)} per player
            </strong>
            <p>
              {awards.map((a) => `${a.label}: ${money(a.amount)}`).join(" · ")}
            </p>
            <p>
              Proposed sample awards with an illustrative equal split. Earned
              does not mean paid.
            </p>
          </div>
        </section>
      )}
    </>
  );
}
function Bracket() {
  const { matches } = usePreview();
  const params = useSearchParams();
  const scenario = params.get("scenario") === "final";
  const seeds = qualified(matches);
  return (
    <>
      <PageHeading eyebrow="The knockout rounds" title="Bracket" />
      {scenario ? (
        <div className="notice">
          <Icon name="image" />
          <div>
            <strong>Official 2026 archive</strong>
            <p>
              Preserved Season 1 results, separate from the sample current
              season.
            </p>
          </div>
        </div>
      ) : (
        !publication.seeds.length &&
        !seeds.length && (
          <p className="bracket-intro">
            Seeds are confirmed after regular-season play.{" "}
            <Link href="/standings?view=qualification">
              See the playoff picture <Icon name="arrow" size={16} />
            </Link>
          </p>
        )
      )}
      <ConnectedBracket
        seedIds={
          publication.seeds.length
            ? publication.seeds
            : seeds.map((r) => r.team.id)
        }
        games={scenario ? archive2026.games : publication.games}
        baseHref={scenario ? "/bracket?scenario=final" : "/bracket"}
        label={scenario ? "2026 sample archive" : "Current season"}
      />
    </>
  );
}
function Earnings() {
  const { matches } = usePreview();
  const winners = pods.map((p) => ({ pod: p, team: podWinner(matches, p) }));
  const earnedCount = winners.filter((w) => w.team).length;
  const final = publication.games.find((g) => g.id === "final");
  const record = currentSeason(matches);
  const earned = record.awards.reduce((total, a) => total + (a.amount ?? 0), 0);
  const recipients = careerRows([record], "teams")
    .filter((r) => (r.earned ?? 0) > 0)
    .sort((a, b) => (b.earned ?? 0) - (a.earned ?? 0));
  return (
    <div className="earnings-page">
      <PageHeading eyebrow="2027 season" title="Prize money" />
      <div className="earnings-disclosure">
        <strong>Proposed amounts for this preview</strong>
        <p>
          Illustrative amounts, per team. Awards stack; payment status is not
          tracked.
        </p>
      </div>
      <dl className="earnings-summary">
        <div>
          <dt>Total sample purse</dt>
          <dd>
            {money(season.prizePool)}
            <span>18 teams × {money(season.buyIn)} per team</span>
          </dd>
        </div>
        <div>
          <dt>Earned so far</dt>
          <dd>
            {money(earned)}
            <span>Published outcomes only</span>
          </dd>
        </div>
      </dl>
      {recipients.length > 0 && (
        <section className="section" aria-label="Combined awards">
          <SectionTitle title="Team totals & player shares" />
          <p className="muted">
            Proposed sample amounts · Illustrative equal split · Earned, not
            paid
          </p>
          <ul className="awards-ledger">
            {recipients.map((r) => (
              <li key={r.id}>
                <div className="ledger-team">
                  <TeamName id={r.id} />
                  <span>
                    {record.awards
                      .filter((a) => a.teamId === r.id)
                      .map((a) => `${a.label} ${money(a.amount)}`)
                      .join(" + ")}
                  </span>
                </div>
                <strong className="ledger-amount">
                  {money(r.earned)}
                  <small>{money((r.earned ?? 0) / 2)} / player</small>
                </strong>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="earnings-columns">
        <section aria-labelledby="earned-awards-heading">
          <div className="earnings-section-heading">
            <h2 id="earned-awards-heading">Earned awards</h2>
            <span>{earnedCount} of 6 pods decided</span>
          </div>
          <ul className="awards-ledger">
            {winners.map((w) => (
              <li key={w.pod}>
                <span className="ledger-pod">
                  Pod <b>{w.pod}</b>
                </span>
                <div className="ledger-team">
                  {w.team ? (
                    <TeamName id={w.team} />
                  ) : (
                    <strong>Still in play</strong>
                  )}
                  <span>
                    {w.team
                      ? "Pod winner · Earned"
                      : "Awaiting official outcome"}
                  </span>
                </div>
                <strong className="ledger-amount">
                  {w.team ? (
                    money(season.podAward)
                  ) : (
                    <>
                      <span aria-hidden="true">—</span>
                      <span className="sr-only">Not yet earned</span>
                    </>
                  )}
                </strong>
              </li>
            ))}
          </ul>
        </section>
        <section
          className="award-breakdown"
          aria-labelledby="award-breakdown-heading"
        >
          <div className="earnings-section-heading">
            <h2 id="award-breakdown-heading">Award breakdown</h2>
            <span>Per team</span>
          </div>
          <dl className="award-schedule">
            <div>
              <dt>
                Champions <span>First place · Additional award</span>
              </dt>
              <dd>
                {money(season.championAward)}
                <span>{final ? nameOf(final.winner!) : "Not yet earned"}</span>
              </dd>
            </div>
            <div>
              <dt>
                Runners-up <span>Second place · Additional award</span>
              </dt>
              <dd>
                {money(season.runnerUpAward)}
                <span>
                  {final
                    ? nameOf(final.a === final.winner ? final.b : final.a)
                    : "Not yet earned"}
                </span>
              </dd>
            </div>
            <div>
              <dt>
                Pod winners <span>One award for each of 6 pods</span>
              </dt>
              <dd>
                {money(season.podAward)}
                <span>{earnedCount} of 6 earned</span>
              </dd>
            </div>
          </dl>
          <p className="award-explainer">
            Pod awards are added to any first- or second-place award.
          </p>
        </section>
      </div>
    </div>
  );
}
function Rules() {
  return (
    <>
      <PageHeading
        eyebrow="The way we play"
        title="Rules"
        description="Season 2 tournament rules. Format to be confirmed."
        action={
          <a
            className="text-link"
            href={RULES_JUDGE_URL}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="ai" size={20} /> AI rules judge
          </a>
        }
      />
      <div className="rules-layout">
        <div className="rules-list">
          {[
            {
              title: "Format",
              body: "Format TBD. The final field, regular-season structure and playoff qualification will be announced before Season 2 begins.",
            },
            {
              title: "Set strokes in GHIN before you tee off",
              body: "Every player must have an active GHIN number and an accurate, up-to-date Handicap Index. At least one person in each group must have the GHIN app. Before teeing off, select the correct course and tees for every player and use the four-ball match-play setup with a 90% handicap allowance. Use the strokes GHIN assigns, capped at one stroke per hole under our tournament rules. No other negotiated adjustments. Review the allocation together and save a screenshot for the commissioner.",
            },
            {
              title: "Regular season: turn in the full card",
              body: "Play and record all 18 holes. Turn in gross scores for all four players, with each player’s strokes clearly labeled and the best ball used by each team clearly marked on every hole. Include names, date, course, tees and GHIN evidence. These full cards determine hole points and tiebreakers, including cumulative net better-ball. Text or email the card to the commissioner.",
            },
            {
              title: "Playoffs: report the winner and result",
              body: "Report which team won and the match-play result, such as 2 & 1 or 1 up. No scorecard or hole-by-hole scores are required for the bracket. Playoff matches cannot finish tied; settle the winner on the course and report the final result.",
            },
            {
              title: "Scheduling",
              body: "Optional April early play. May and June for regular-season matches. Contact opponents early. Request any extension before the deadline with a new date both sides accept.",
            },
            {
              title: "Scoring & seeding",
              body: "Scoring and seeding will be confirmed with the Season 2 format. The current preview demonstrates net better-ball, hole points and standings tiebreakers; these sample calculations do not set the final tournament rules.",
            },
            {
              title: "Prize money",
              body: "Pod winners, champions and runners-up have their awards displayed. Earned money and paid money are different. Sample amounts shown in this preview are per team and stack.",
            },
            {
              title: "If a partner must withdraw",
              body: "For a medical emergency or another serious reason, contact the commissioner before the next match. With approval, the remaining player may play two separately marked balls on six holes in that match: three on the front nine and three on the back nine, declared to the opponents before tee-off.\n\nPlay each ball independently from tee to hole and count the better net score, using the remaining player’s GHIN-assigned strokes, capped at one stroke per hole, for both. This is not a scramble: do not switch balls or replay a shot. Play one ball on the other 12 holes and on every extra playoff hole. The allowance applies only to the next match; any later participation needs a new commissioner decision.\n\nThis is a tournament-specific emergency exception, not standard four-ball play. Ask the handicap committee whether the modified round is eligible for handicap posting. If a regular-season card is required, report the exception and both scores on the six nominated holes directly to the commissioner.",
            },
          ].map((r, i) => (
            <section
              key={r.title}
              id={
                [
                  "format",
                  "strokes",
                  "regular-card",
                  "playoff-result",
                  "scheduling",
                  "seeding",
                  "prizes",
                  "withdrawal",
                ][i]
              }
            >
              <div>
                <h2>{r.title}</h2>
                {r.body.split("\n\n").map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}

function PlayoffPairing({ match: m }: { match: BracketMatch }) {
  return (
    <Link
      className="match-row pending-match"
      href={`/bracket?round=${m.round}#bracket-${m.id}`}
    >
      <span className="eyebrow">
        {m.label} · {m.slots.every((s) => s.id) ? "Pre-match" : "Opponent TBD"}
      </span>
      <span className="pending-pair">
        <strong>{m.slots[0].label}</strong>
        <span>vs</span>
        <strong>{m.slots[1].label}</strong>
      </span>
      <Icon name="arrow" size={16} />
    </Link>
  );
}
function PlayoffDetail({ id }: { id: string }) {
  const params = useSearchParams();
  const back = matchReturn(new URLSearchParams(params.toString()));
  const game = publication.games.find((g) => g.id === id);
  if (!game)
    return (
      <Empty title="Result not published">
        <Link href="/bracket">View bracket</Link>
      </Empty>
    );
  const nodes = bracketMatches(publication.seeds, publication.games);
  const next = nodes.find((n) => n.id === game.next);
  const opponent = next?.slots.find((s) => s.id !== game.winner);
  return (
    <>
      <Link
        className="back-link"
        href={params.has("from") ? back.href : "/bracket"}
      >
        <Icon name="back" size={16} />
        {params.has("from") ? back.label : "Back to bracket"}
      </Link>
      <div className="match-detail-kicker">
        <span className="eyebrow">{game.round}</span>
        <Badge status="official" />
      </div>
      <section className="match-hero playoff-result">
        <div>
          <TeamAvatar id={game.a} size="large" />
          <h1>{nameOf(game.a)}</h1>
        </div>
        <div className="big-score">
          <strong>{game.score}</strong>
          <small>{nameOf(game.winner!)} win</small>
        </div>
        <div>
          <TeamAvatar id={game.b} size="large" />
          <h2>{nameOf(game.b)}</h2>
        </div>
      </section>
      <div className="match-location">
        <span>
          <Icon name="flag" />
          {game.course}
        </span>
        <span>
          <Icon name="calendar" />
          {dateLabel(game.date)}
        </span>
      </div>
      <section className="notice">
        <Icon name="cup" />
        <div>
          <h2>
            {game.next
              ? `${nameOf(game.winner!)} advance`
              : `${nameOf(game.winner!)} · Season 2 champions`}
          </h2>
          {next ? (
            <>
              <p>
                Next: {next.label} · vs {opponent?.label}
              </p>
              <Link
                href={`/bracket?round=${next.round}&team=${game.winner}#bracket-${next.id}`}
              >
                View next round
              </Link>
            </>
          ) : (
            <>
              <p>Final match-play result · {game.score}</p>
              <Link href="/earnings">View final awards</Link>
            </>
          )}
        </div>
      </section>
      <p className="fine-note">
        Playoffs use the final match-play result.{" "}
        <Link href="/rules#playoff-result">Playoff reporting rules</Link>
      </p>
    </>
  );
}
