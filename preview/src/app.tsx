"use client";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePreview } from "./store";
import { teams, pods, nameOf, money, season, dateLabel } from "./data";
import { standings, podWinner, qualified, result } from "./domain";
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
import { archive2026 } from "./history-data";
import {
  HistoryHome,
  SeasonArchive,
  RecordBook,
  CareerProfile,
  ArchivedMatch,
} from "./history";
import { StandingsTable } from "./standings-table";
import { PlayoffPicture } from "./playoff-picture";
import { RULES_JUDGE_URL } from "./rules-judge";
const nav = [
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
  const title = path === "/" ? "Clubhouse" : path.split("/")[1];
  useEffect(() => {
    document.title = `${title.charAt(0).toUpperCase() + title.slice(1)} • The Two-Man preview`;
  }, [title]);
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
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
                (href === "/" ? path === "/" : path.startsWith(href))
                  ? "page"
                  : undefined
              }
            >
              {label}
            </Link>
          ))}
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
            ["/earnings", "The purse"],
            ["/rules", "Format & rules"],
          ].map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setMenu(false)}>
              {label}
              <Icon name="arrow" />
            </Link>
          ))}
        </nav>
      )}
      <main id="main" className="main" tabIndex={-1}>
        {!store.ready ? (
          <div className="loading" role="status">
            Loading your sample season…
          </div>
        ) : path === "/" ? (
          <Home />
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
        ) : path.startsWith("/matches/") ? (
          <MatchDetail id={path.split("/")[2]} />
        ) : path.startsWith("/teams/") ? (
          <TeamDetail id={path.split("/")[2]} />
        ) : path === "/bracket" ? (
          <Bracket />
        ) : path === "/earnings" ? (
          <Earnings />
        ) : path === "/rules" ? (
          <Rules />
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
          <Commissioner />
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
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {nav.map(([href, label, icon]) => (
          <Link
            key={href}
            href={href}
            aria-current={
              (href === "/" ? path === "/" : path.startsWith(href))
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
  const official = matches
    .filter((m) => m.status === "official")
    .sort(
      (a, b) =>
        Date.parse(b.date) - Date.parse(a.date) || a.id.localeCompare(b.id),
    );
  return (
    <div className="feed-home">
      <header className="clubhouse-heading">
        <div>
          <p className="feed-season">
            Season 02 / {season.year} / Sample season
          </p>
          <h1>The Two-Man</h1>
        </div>
        <div className="clubhouse-mark" aria-hidden="true">
          <Mark />
        </div>
      </header>
      <div className="clubhouse-progress">
        <p>
          <strong>
            {official.length} of {matches.length}
          </strong>{" "}
          matches final
        </p>
        <progress
          value={official.length}
          max={matches.length || 1}
          aria-label="Regular-season matches completed"
        />
        <Link href="/standings?view=qualification">
          Playoff picture <Icon name="arrow" size={16} />
        </Link>
      </div>
      <nav className="feed-shortcuts" aria-label="Season shortcuts">
        <Link href="/standings">
          Standings <Icon name="arrow" size={14} />
        </Link>
        <Link href="/bracket">
          Bracket <Icon name="arrow" size={14} />
        </Link>
        <Link href="/matches?filter=upcoming">
          Upcoming matches <Icon name="arrow" size={14} />
        </Link>
      </nav>
      <div className="clubhouse-columns">
        <section className="clubhouse-results" aria-label="Recent results">
          <SectionTitle
            title="Recent results"
            href="/matches?filter=official"
            label="All results"
          />
          <ol className="activity-timeline">
            {official.slice(0, limit).map((m) => {
              const r = result(m);
              return (
                <li key={m.id}>
                  <div className="feed-meta">
                    <time dateTime={m.date}>{dateLabel(m.date)}</time>
                    <span>Final</span>
                  </div>
                  <div className="feed-scoreboard">
                    <div className="feed-score-label">
                      <span>Pod {m.pod}</span>
                      <span>Hole points</span>
                    </div>
                    <Link className="feed-result" href={`/matches/${m.id}`}>
                      {[
                        { id: m.a, points: r.aPoints },
                        { id: m.b, points: r.bPoints },
                      ].map(({ id, points }) => (
                        <span
                          key={id}
                          className={
                            r.winner === id ? "feed-winner" : undefined
                          }
                        >
                          <span className="feed-team">
                            {nameOf(id)}
                            {r.winner === id && <small>Won</small>}
                          </span>
                          <b>
                            <span className="sr-only">Hole points: </span>
                            {points}
                          </b>
                        </span>
                      ))}
                    </Link>
                  </div>
                  <p className="feed-detail">{m.course}</p>
                  <Link className="text-link" href={`/matches/${m.id}`}>
                    Scorecard <Icon name="arrow" size={14} />
                  </Link>
                </li>
              );
            })}
          </ol>
          {!official.length && (
            <Empty title="No results yet">
              Results appear after the commissioner posts them.
            </Empty>
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
          <section aria-label="Matches still to play">
            <SectionTitle
              title="Still to play"
              href="/matches?filter=upcoming"
              label="Fixtures"
            />
            <p className="clubhouse-note">
              {pending.length
                ? `${pending.length} matches awaiting a final result.`
                : "Every regular-season result is in."}
            </p>
            <div className="clubhouse-fixtures">
              {pending.slice(0, 3).map((m) => (
                <MatchRow key={m.id} match={m} />
              ))}
            </div>
            {pending.length > 3 && (
              <Link className="text-link" href="/matches?filter=upcoming">
                View all {pending.length} remaining matches{" "}
                <Icon name="arrow" size={16} />
              </Link>
            )}
          </section>
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
  const router = useRouter();
  const requestedFilter = query.get("filter");
  const filter =
    requestedFilter === "review" ? "upcoming" : (requestedFilter ?? "all");
  const search = query.get("q") ?? "";
  const filtered = matches.filter(
    (m) =>
      (filter === "all" ||
        (filter === "upcoming" && m.status !== "official") ||
        (filter === "official" && m.status === "official")) &&
      `${nameOf(m.a)} ${nameOf(m.b)} ${m.course}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const update = (key: string, value: string) => {
    const p = new URLSearchParams(query);
    if (value) p.set(key, value);
    else p.delete(key);
    router.replace(`/matches?${p}`, { scroll: false });
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
        {filtered.length} of {matches.length} matches · Regular season
      </p>
      <div className="match-grid">
        {filtered.map((m) => (
          <MatchRow key={m.id} match={m} />
        ))}
      </div>
      {filtered.length === 0 && (
        <Empty title="No matches found">
          Try a different team name or clear the filter.
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
  const won = podWinner(matches, t.pod) === id;
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
            {money(won ? season.podAward : 0)}
            <Icon name="arrow" />
          </strong>
        </Link>
      </div>
      <section className="section">
        <SectionTitle title="The matches" />
        <div className="match-grid">
          {matches
            .filter((m) => m.a === id || m.b === id)
            .map((m) => (
              <MatchRow key={m.id} match={m} />
            ))}
        </div>
      </section>
      {won && (
        <div className="notice">
          <Icon name="cup" />
          <div>
            <strong>
              Pod {t.pod} winner · {money(season.podAward)} earned
            </strong>
            <p>
              This is an earned award in the sample season, not a payment
              confirmation.
            </p>
          </div>
        </div>
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
        seedIds={seeds.map((r) => r.team.id)}
        games={scenario ? archive2026.games : []}
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
  const earned = earnedCount * season.podAward;
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
            <span>Official pod outcomes only</span>
          </dd>
        </div>
      </dl>
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
                <span>Not yet earned</span>
              </dd>
            </div>
            <div>
              <dt>
                Runners-up <span>Second place · Additional award</span>
              </dt>
              <dd>
                {money(season.runnerUpAward)}
                <span>Not yet earned</span>
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
              body: "Every player must have an active GHIN number and an accurate, up-to-date Handicap Index. At least one person in each group must have the GHIN app. Before teeing off, select the correct course and tees for every player and use the four-ball match-play setup with a 90% handicap allowance. Everyone must play the strokes GHIN assigns—no negotiated adjustments. Review the allocation together and save a screenshot for the commissioner.",
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
              body: "For a medical emergency or another serious reason, contact the commissioner before the next match. With approval, the remaining player may play two separately marked balls on six holes in that match: three on the front nine and three on the back nine, declared to the opponents before tee-off.\n\nPlay each ball independently from tee to hole and count the better net score, using the remaining player’s GHIN-assigned strokes for both. This is not a scramble: do not switch balls or replay a shot. Play one ball on the other 12 holes and on every extra playoff hole. The allowance applies only to the next match; any later participation needs a new commissioner decision.\n\nThis is a tournament-specific emergency exception, not standard four-ball play. Ask the handicap committee whether the modified round is eligible for handicap posting. If a regular-season card is required, report the exception and both scores on the six nominated holes directly to the commissioner.",
            },
          ].map((r) => (
            <section key={r.title}>
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
