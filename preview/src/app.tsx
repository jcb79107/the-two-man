"use client";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
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
  const archiveYear = path.startsWith("/history/") ? path.split("/")[2] : "";
  const [resetOpen, setResetOpen] = useState(false);
  const [menu, setMenu] = useState(false);
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
          <span className="preview-dot" /> PREVIEW · SAMPLE DATA{" "}
          <span className="strip-detail">· Fictional data · June 24, 2027</span>
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
          <Link className="button small outline" href="/rules">
            Rules
          </Link>
          <a
            className="text-link"
            href="https://www.instagram.com/twomantournament/"
            target="_blank"
            rel="noreferrer"
            aria-label="The Two-Man on Instagram"
          >
            Instagram ↗
          </a>
          <button
            className="menu-button"
            aria-label="More navigation"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            <Icon name={menu ? "close" : "menu"} />
          </button>
        </div>
      </header>
      {menu && (
        <nav className="more-nav" aria-label="More navigation">
          {[
            ["/history", "Season history"],
            ["/records", "All-time records"],
            ["/champions", "Champions"],
            ["/earnings", "The purse"],
            ["/rules", "Format & rules"],
            ["/review", "Commissioner demo"],
          ].map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setMenu(false)}>
              {label}
              <Icon name="arrow" />
            </Link>
          ))}
        </nav>
      )}
      <div className="season-line">
        <span>
          CHICAGOLAND <i /> EST. 2026
        </span>
        <Link href="/rules">
          Regular season · 2027
          <Icon name="arrow" size={14} />
        </Link>
        <label className="season-jump">
          <span className="sr-only">Browse season</span>
          <select
            value={archiveYear}
            onChange={(e) => router.push(`/history/${e.target.value}`)}
          >
            <option value="" disabled>
              Browse seasons
            </option>
            <option value="2027">2027 · Current season</option>
            <option value="2026">2026 · Season archive</option>
          </select>
        </label>
      </div>
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
          <Link href="/history">Season history</Link>
          <Link href="/champions">Champions</Link>
          <Link href="/rules">Format & rules</Link>
          <a
            href="https://www.instagram.com/twomantournament/"
            target="_blank"
            rel="noreferrer"
          >
            Instagram ↗
          </a>
          <Link href="/review">Commissioner demo</Link>
        </nav>
        <p>
          Season 02 preview · Local sample data only.
          <br />
          No real scores, payments or messages are sent.
        </p>
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
  const [limit, setLimit] = useState(8);
  const official = matches
    .filter((m) => m.status === "official")
    .sort(
      (a, b) =>
        Date.parse(b.date) - Date.parse(a.date) || a.id.localeCompare(b.id),
    );
  return (
    <div className="feed-home">
      <div className="feed-heading">
        <div>
          <p className="eyebrow">2027 · REGULAR SEASON</p>
          <h1>Live feed</h1>
          <p>{official.length} of 18 matches final</p>
        </div>
        <a
          className="button outline"
          href={RULES_JUDGE_URL}
          target="_blank"
          rel="noreferrer"
        >
          AI rules judge <Icon name="arrow" size={16} />
        </a>
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
      <ol className="activity-timeline">
        {official.slice(0, limit).map((m) => {
          const r = result(m);
          return (
            <li key={m.id}>
              <div className="feed-meta">
                <span>FINAL · HOLE PTS</span>
                <time dateTime={m.date}>{dateLabel(m.date)}</time>
              </div>
              <Link className="feed-result" href={`/matches/${m.id}`}>
                <span>
                  {nameOf(m.a)} <b>{r.aPoints}</b>
                </span>
                <span>
                  {nameOf(m.b)} <b>{r.bPoints}</b>
                </span>
              </Link>
              <p className="feed-detail">
                Pod {m.pod} · {m.course}
              </p>
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
        <button className="button outline" onClick={() => setLimit(limit + 8)}>
          Earlier results
        </button>
      )}
    </div>
  );
}
function Matches() {
  const { matches } = usePreview();
  const query = useSearchParams();
  const router = useRouter();
  const filter = query.get("filter") ?? "all";
  const search = query.get("q") ?? "";
  const filtered = matches.filter(
    (m) =>
      (filter === "all" ||
        (filter === "upcoming" &&
          ["scheduled", "unbooked"].includes(m.status)) ||
        (filter === "official" && m.status === "official") ||
        (filter === "review" && ["review", "correction"].includes(m.status))) &&
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
            ["upcoming", "Upcoming"],
            ["review", "Awaiting result"],
            ["official", "Official"],
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
  const seeds = qualified(matches);
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
        <>
          <div className="notice">
            <Icon name="lock" />
            <div>
              <strong>
                {seeds.length
                  ? "The field is set."
                  : "The field is still open."}
              </strong>
              <p>
                {seeds.length
                  ? "All regular-season cards are official and qualifying ties are resolved."
                  : "Seeds stay provisional until every regular-season result is official and qualifying ties are resolved."}
              </p>
            </div>
          </div>
          <StandingsTable
            rows={seeds.length ? seeds : rows}
            label={
              seeds.length
                ? "Official playoff seeds"
                : "Current records — not locked seeds"
            }
          />
        </>
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
                    <span>THE PODS</span>Pod {pod}
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
function StandingsTable({
  rows,
  label,
}: {
  rows: ReturnType<typeof standings>;
  label: string;
}) {
  return (
    <div
      className="table-scroll"
      tabIndex={0}
      role="region"
      aria-label={`${label}, scroll for all columns`}
    >
      <table className="standings-table">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            <th scope="col">Team</th>
            <th scope="col">W–L–T</th>
            <th scope="col">Hole pts</th>
            <th scope="col">Won</th>
            <th scope="col">Net BB</th>
            <th scope="col">Played</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.team.id}>
              <th scope="row">
                <span className="rank">{i + 1}</span>
                <TeamAvatar id={r.team.id} />
                <TeamName id={r.team.id} />
              </th>
              <td>
                {r.won}–{r.lost}–{r.tied}
              </td>
              <td>
                <strong>{r.points.toFixed(1)}</strong>
              </td>
              <td>{r.holesWon}</td>
              <td>{r.net}</td>
              <td>{r.played}/2</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
          <p className="eyebrow">POD {t.pod} · SEASON 02</p>
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
          <span>REGULAR-SEASON RECORD</span>
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
      <PageHeading
        eyebrow="The knockout rounds"
        title="Bracket"
        action={
          <Link
            className="button outline"
            href={scenario ? "/bracket" : "/history/2026?view=playoffs"}
          >
            {scenario ? "Back to current season" : "2026 bracket"}
            <Icon name="arrow" />
          </Link>
        }
      />
      {scenario ? (
        <div className="notice">
          <Icon name="image" />
          <div>
            <strong>Completed 2026 sample archive</strong>
            <p>
              This is the existing fictional archive, separate from the active
              season. No current-season champion is implied.
            </p>
          </div>
        </div>
      ) : (
        !seeds.length && (
          <div className="notice">
            <Icon name="lock" />
            <div>
              <strong>Waiting for the regular season.</strong>
              <p>
                Seeds lock once all results and qualifying ties are settled.
              </p>
            </div>
          </div>
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
  const earned = winners.filter((w) => w.team).length * season.podAward;
  return (
    <>
      <PageHeading eyebrow="2027" title="Prize money" />
      <div className="prize-hero">
        <div>
          <span className="eyebrow">TOTAL SAMPLE PURSE</span>
          <h2>{money(season.prizePool)}</h2>
          <p>18 teams × {money(season.buyIn)} per team</p>
        </div>
        <div>
          <span className="eyebrow">EARNED SO FAR</span>
          <strong>{money(earned)}</strong>
          <p>Official pod outcomes only</p>
        </div>
      </div>
      <div className="notice">
        <Icon name="flag" />
        <div>
          <strong>Proposed amounts for this preview</strong>
          <p>
            Illustrative amounts, per team. Awards stack; payment status is not
            tracked.
          </p>
        </div>
      </div>
      <div className="award-grid">
        <section>
          <Icon name="cup" size={34} />
          <p className="eyebrow">THE CHAMPIONS</p>
          <h2>{money(season.championAward)}</h2>
          <p>First place · Additional award</p>
          <Badge status="Not yet earned" />
        </section>
        <section>
          <Icon name="flag" size={34} />
          <p className="eyebrow">THE RUNNERS-UP</p>
          <h2>{money(season.runnerUpAward)}</h2>
          <p>Second place · Additional award</p>
          <Badge status="Not yet earned" />
        </section>
        <section>
          <Icon name="users" size={34} />
          <p className="eyebrow">THE POD WINNERS</p>
          <h2>
            {money(season.podAward)} <small>× 6</small>
          </h2>
          <p>Per pod winner</p>
          <Badge
            status={`${winners.filter((w) => w.team).length} of 6 earned`}
          />
        </section>
      </div>
      <section className="section">
        <SectionTitle title="Earned awards" />
        <div className="earnings-list">
          {winners.map((w) => (
            <div key={w.pod}>
              <span className="pod-letter">{w.pod}</span>
              <div>
                <strong>
                  {w.team ? (
                    <TeamName id={w.team} />
                  ) : (
                    <>Pod {w.pod} · Still in play</>
                  )}
                </strong>
                <span>
                  {w.team
                    ? "Pod winner · Earned"
                    : "Awaiting official pod outcome"}
                </span>
              </div>
              <strong>{w.team ? money(season.podAward) : "—"}</strong>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
function Rules() {
  return (
    <>
      <PageHeading
        eyebrow="The way we play"
        title="Rules"
        description="Season 2 · Proposals labeled below."
        action={
          <a
            className="button outline"
            href={RULES_JUDGE_URL}
            target="_blank"
            rel="noreferrer"
          >
            AI rules judge <Icon name="arrow" size={16} />
          </a>
        }
      />
      <div className="rules-layout">
        <div className="rules-list">
          {[
            {
              n: "01",
              title: "Format",
              tag: "Confirmed direction",
              body: "Three teams per pod in this sample format. Play both opponents before elimination. Six pod winners and two wild cards move on; expanded field details are still to be decided.",
            },
            {
              n: "02",
              title: "Lock strokes at least 24 hours before tee time",
              tag: "Confirmed rule",
              body: "Use GHIN for the correct course and tees. All four players agree on strokes no later than 24 hours before tee time. Preserve those values for the match, even if an index changes later. Course, tee or date changes after locking need commissioner guidance.",
            },
            {
              n: "03",
              title: "After your match",
              tag: "Confirmed workflow",
              body: "Text or email the commissioner your completed 18-hole card with names, date and agreed strokes, plus GHIN screenshots for all four players showing course and tees. The commissioner posts the result. Playoff card requirements are still to be confirmed.",
            },
            {
              n: "04",
              title: "Scheduling",
              tag: "Proposed scheduling policy",
              body: "Optional April early play. May and June for regular-season matches. Contact opponents early. Request any extension before the deadline with a new date both sides accept. Penalties and exception rules are not finalized.",
            },
            {
              n: "05",
              title: "Scoring & seeding",
              tag: "Sample competition format",
              body: "Net better-ball on each hole. Win a hole for one point; halve it for half a point each. Regular-season ranking uses match record, hole points, holes won and cumulative net better-ball. Remaining ties need a recorded decision.",
            },
            {
              n: "06",
              title: "Prize money",
              tag: "Amounts still to be decided",
              body: "Pod winners, champions and runners-up have their awards displayed. Earned money and paid money are different. Sample amounts shown in this preview are per team and stack.",
            },
          ].map((r) => (
            <section key={r.n}>
              <span className="rule-number">{r.n}</span>
              <div>
                <p className="eyebrow">{r.tag}</p>
                <h2>{r.title}</h2>
                <p>{r.body}</p>
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
