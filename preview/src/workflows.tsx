"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { matchReturn } from "./match-return";
import { useRef, useState } from "react";
import { usePreview } from "./store";
import {
  teams,
  nameOf,
  dateLabel,
  pars,
  strokeIndex,
  type Match,
} from "./data";
import { ResultSummary } from "./result-summary";
import { result, validateCard } from "./domain";
import { Icon, Badge, TeamAvatar, Empty } from "./ui";
const courseLocations: Record<string, string> = {
  "The Glen Club": "The Glen Club, 2901 West Lake Ave, Glenview, IL 60026",
  "Harborside International":
    "Harborside International Golf Center, 11001 S Doty Ave East, Chicago, IL 60628",
  "Stonewall Orchard": "Stonewall Orchard Golf Club, Grayslake, IL",
};
const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);
const players = (m: Match) => [
  ...teams.find((t) => t.id === m.a)!.names,
  ...teams.find((t) => t.id === m.b)!.names,
];
export function MatchDetail({ id }: { id: string }) {
  const { matches } = usePreview();
  const params = useSearchParams();
  const back = matchReturn(new URLSearchParams(params.toString()));
  const m = matches.find((m) => m.id === id);
  const [section, setSection] = useState("card");
  if (!m)
    return (
      <Empty title="Match not found">
        <Link href="/matches">View all matches</Link>
      </Empty>
    );
  const r = result(m);
  return (
    <>
      <Link href={back.href} className="back-link">
        <Icon name="back" size={16} />
        {back.label}
      </Link>
      <div className="match-detail-kicker">
        <span className="eyebrow">Regular season · Pod {m.pod}</span>
        <Badge status={m.status} />
      </div>
      <section className="match-hero">
        <div>
          <TeamAvatar id={m.a} size="large" />
          <h1>{nameOf(m.a)}</h1>
        </div>
        <div className="big-score">
          {m.status === "official" ? (
            <>
              <strong>
                {r.aPoints}
                <span>–</span>
                {r.bPoints}
              </strong>
              <small>
                {r.winner ? `${nameOf(r.winner)} win` : "Match tied"}
              </small>
            </>
          ) : (
            <>
              <strong>vs</strong>
              <small>Coordinate in your group text</small>
            </>
          )}
        </div>
        <div>
          <TeamAvatar id={m.b} size="large" />
          <h2>{nameOf(m.b)}</h2>
        </div>
      </section>
      {m.status === "official" && (
        <div className="match-location">
          <span>
            <Icon name="flag" size={17} />
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(courseLocations[m.course] ?? m.course)}`}
              target="_blank"
              rel="noreferrer"
              aria-label={`${m.course} on Google Maps (opens in a new tab)`}
            >
              {m.course}
            </a>{" "}
            · {m.tees}
          </span>
          <span>
            <Icon name="calendar" size={17} />
            {dateLabel(m.date, true)}
            {m.date.includes("T") ? " CT" : ""}
          </span>
        </div>
      )}
      {m.status !== "official" ? (
        <section className="prematch-checklist">
          <h2>Before you tee off</h2>
          <p>
            <strong>Season 2 deadline: not yet confirmed.</strong> The current
            fixtures are fictional.
          </p>
          <ol>
            <li>
              Coordinate the course, tees and time with your opponents in the
              group text.{" "}
              <Link href="/rules#scheduling">Scheduling guidance</Link>
            </li>
            <li>
              Use GHIN’s four-ball match-play setup with a 90% allowance; review
              the correct course, tees and strokes together. One stroke per hole
              maximum. Save the allocation screenshot.{" "}
              <Link href="/rules#strokes">Stroke rules</Link>
            </li>
            <li>
              Play all 18 holes. Record all four gross scores, each player’s
              strokes and each team’s best ball. Include names, date, course and
              tees.
            </li>
            <li>
              Text or email the full card and GHIN evidence to the commissioner
              after the match.{" "}
              <Link href="/rules#regular-card">Full card requirements</Link>
            </li>
          </ol>
        </section>
      ) : (
        <>
          <ResultSummary match={m} />
          <div className="toolbar">
            <div className="tabs" role="group" aria-label="Match details">
              <button
                aria-pressed={section === "card"}
                onClick={() => setSection("card")}
              >
                Scorecard
              </button>
              <button
                aria-pressed={section === "strokes"}
                onClick={() => setSection("strokes")}
              >
                Agreed strokes
              </button>
            </div>
          </div>
          {section === "card" ? (
            <Scorecard match={m} />
          ) : (
            <StrokeSummary match={m} />
          )}
        </>
      )}
      <section className="fine-note">
        <strong>
          {m.status === "official"
            ? "Verified sample result"
            : "Regular-season match"}
        </strong>
        <p>Sample scores and strokes; no GHIN connection.</p>
      </section>
    </>
  );
}
function StrokeSummary({ match: m }: { match: Match }) {
  return (
    <section className="stroke-summary">
      <div>
        <Icon name="lock" size={28} />
        <h2>{"GHIN strokes"}</h2>
        <p>
          Confirm the GHIN match-play strokes together before the first tee
          shot. Use the 90% allowance, playing off the lowest player.
        </p>
      </div>
      <div className="stroke-players">
        {players(m).map((name, i) => (
          <div key={name}>
            <span>{name}</span>
            <strong>
              {sum(m.strokes[i])}
              <small> strokes</small>
            </strong>
            <span>
              {sum(m.strokes[i]) === 0 ? "No strokes" : "Holes "}
              {m.strokes[i]
                .map((s, h) =>
                  s ? `${h + 1}${s > 1 ? ` (${s} strokes)` : ""}` : null,
                )
                .filter(Boolean)
                .join(", ")}
            </span>
          </div>
        ))}
      </div>
      <p className="muted">
        Sample externally agreed values. No Handicap Index or Course Handicap
        calculation.
      </p>
    </section>
  );
}
export function Scorecard({
  match: m,
  editable = false,
  onChange,
  labels,
}: {
  match: Match;
  labels?: {
    teams: [string, string];
    players: [string, string, string, string];
  };
  editable?: boolean;
  onChange?: (scores: number[][]) => void;
}) {
  const cardPars = m.pars ?? pars;
  const cardIndexes = m.strokeIndexes ?? strokeIndex;
  const [nine, setNine] = useState(0);
  const scroll = useRef<HTMLDivElement>(null);
  function changeNine(value: number) {
    setNine(value);
    if (scroll.current) scroll.current.scrollLeft = 0;
  }
  const r = result(m);
  const complete = validateCard(m.scores, m.strokes) === null;
  const teamLabels = labels?.teams ?? [nameOf(m.a), nameOf(m.b)];
  const playerLabels = labels?.players ?? players(m);
  const holes = Array.from({ length: 9 }, (_, i) => i + nine * 9);
  return (
    <section className="scorecard">
      <div className="scorecard-title">
        <div>
          <p className="eyebrow">{m.course}</p>
          <h2>{editable ? "Draft scorecard" : "Scorecard"}</h2>
        </div>
        <div className="scorecard-controls">
          <div className="segmented" role="group" aria-label="Scorecard nine">
            <button aria-pressed={nine === 0} onClick={() => changeNine(0)}>
              Front 9
            </button>
            <button aria-pressed={nine === 1} onClick={() => changeNine(1)}>
              Back 9
            </button>
          </div>
        </div>
      </div>
      {editable && (
        <p className="field-help">
          Edit gross scores. Net totals appear when all scores and agreed
          strokes are valid.
        </p>
      )}
      <p className="scorecard-mode-note">
        Player scores: actual strokes
        {editable && <span>• Handicap stroke</span>}
        <span className="scorecard-swipe">Swipe for more holes →</span>
      </p>
      <div
        ref={scroll}
        className="score-scroll"
        role="region"
        aria-label="Hole-by-hole scores, horizontally scrollable"
        tabIndex={0}
      >
        <table className="score-table">
          <caption className="sr-only">
            {teamLabels[0]} versus {teamLabels[1]} · Gross scores ·{" "}
            {nine === 0 ? "Front" : "Back"} nine
          </caption>
          <thead>
            <tr>
              <th scope="col">Hole</th>
              {holes.map((h) => (
                <th key={h} scope="col">
                  {h + 1}
                </th>
              ))}
              <th scope="col">{nine === 0 ? "Front 9" : "Back 9"}</th>
              <th scope="col">18 holes</th>
            </tr>
          </thead>
          <tbody>
            <tr className="par-row">
              <th scope="row">Par</th>
              {holes.map((h) => (
                <td key={h}>{cardPars[h]}</td>
              ))}
              <td>{sum(holes.map((h) => cardPars[h]))}</td>
              <td>{sum(cardPars)}</td>
            </tr>
            <tr className="index-row">
              <th scope="row">Stroke index</th>
              {holes.map((h) => (
                <td key={h}>{cardIndexes[h]}</td>
              ))}
              <td>—</td>
              <td>—</td>
            </tr>
          </tbody>
          {[0, 1].map((side) => (
            <tbody
              className={`score-team score-team-${side === 0 ? "a" : "b"}`}
              key={side}
            >
              <tr className="score-team-heading">
                <th scope="rowgroup" colSpan={12}>
                  <span className="score-team-letter">
                    {side === 0 ? "A" : "B"}
                  </span>
                  {teamLabels[side]}
                </th>
              </tr>
              {[side * 2, side * 2 + 1].map((p) => (
                <tr className="score-player" key={p}>
                  <th scope="row">
                    <span>{playerLabels[p]}</span>
                    <small>{sum(m.strokes[p])} handicap strokes</small>
                  </th>
                  {holes.map((h) => {
                    const score = m.scores[p][h];
                    const difference = score - cardPars[h];
                    const hasScore = m.scores[p][h] > 0;
                    const mark = !hasScore
                      ? ""
                      : difference <= -2
                        ? "eagle"
                        : difference === -1
                          ? "birdie"
                          : difference === 1
                            ? "bogey"
                            : difference >= 2
                              ? "double-bogey"
                              : "par";
                    const description =
                      mark === "eagle"
                        ? "eagle or better"
                        : mark === "double-bogey"
                          ? "double bogey or worse"
                          : mark;
                    return (
                      <td key={h}>
                        <span className="score-entry">
                          {editable ? (
                            <input
                              aria-label={`${playerLabels[p]} hole ${h + 1} gross score`}
                              type="number"
                              inputMode="numeric"
                              min="1"
                              max="20"
                              value={m.scores[p][h] || ""}
                              onChange={(e) => {
                                const rows = m.scores.map((row) => [...row]);
                                rows[p][h] = Number(e.target.value);
                                onChange?.(rows);
                              }}
                            />
                          ) : (
                            <span
                              className={`score-number ${mark}`}
                              role="img"
                              aria-label={`${hasScore ? score : "Not entered"}${description ? `, ${description}` : ""}`}
                            >
                              {hasScore ? score : "—"}
                            </span>
                          )}
                          {editable && m.strokes[p][h] > 0 && (
                            <span
                              className="stroke-dot"
                              aria-label={`${m.strokes[p][h]} agreed strokes`}
                            >
                              {m.strokes[p][h] === 1 ? "•" : m.strokes[p][h]}
                            </span>
                          )}
                        </span>
                      </td>
                    );
                  })}
                  <td className="score-total">
                    {complete ? sum(holes.map((h) => m.scores[p][h])) : "—"}
                  </td>
                  <td className="score-total">
                    {complete ? sum(m.scores[p]) : "—"}
                  </td>
                </tr>
              ))}
              {complete && (
                <tr className="net-row">
                  <th scope="row">
                    Net better ball <small>Team {side === 0 ? "A" : "B"}</small>
                  </th>
                  {holes.map((h) => (
                    <td key={h}>{side === 0 ? r.a[h] : r.b[h]}</td>
                  ))}
                  <td className="score-total">
                    {sum(holes.map((h) => (side === 0 ? r.a[h] : r.b[h])))}
                  </td>
                  <td className="score-total">{sum(side === 0 ? r.a : r.b)}</td>
                </tr>
              )}
            </tbody>
          ))}
          {complete && (
            <tfoot>
              <tr className="hole-result">
                <th scope="row">Hole point</th>
                {holes.map((h) => (
                  <td key={h}>
                    <span
                      className={r.holes[h]}
                      aria-label={
                        r.holes[h] === "tie"
                          ? "Half a point each"
                          : `${r.holes[h] === "a" ? teamLabels[0] : teamLabels[1]} wins hole`
                      }
                    >
                      {r.holes[h] === "tie" ? "½" : r.holes[h].toUpperCase()}
                    </span>
                  </td>
                ))}
                <td>
                  A{" "}
                  {sum(
                    holes.map((h) =>
                      r.holes[h] === "a" ? 1 : r.holes[h] === "tie" ? 0.5 : 0,
                    ),
                  )}{" "}
                  :{" "}
                  {sum(
                    holes.map((h) =>
                      r.holes[h] === "b" ? 1 : r.holes[h] === "tie" ? 0.5 : 0,
                    ),
                  )}{" "}
                  B
                </td>
                <td>
                  A {r.aPoints} : {r.bPoints} B
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="scorecard-legend" aria-label="Score symbols">
        {[
          ["eagle", "Eagle or better", "−2"],
          ["birdie", "Birdie", "−1"],
          ["par", "Par", "E"],
          ["bogey", "Bogey", "+1"],
          ["double-bogey", "Double or worse", "+2"],
        ].map(([mark, label, value]) => (
          <span key={mark}>
            <i className={`score-number ${mark}`} aria-hidden="true">
              {value}
            </i>
            {label}
          </span>
        ))}
      </div>
      <p className="scorecard-footnote">
        Better ball = the lower net score of the partners. Hole point: A or B
        wins 1; ½ each when tied.
      </p>
    </section>
  );
}
