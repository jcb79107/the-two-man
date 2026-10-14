"use client";
import Link from "next/link";
import { useState } from "react";
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
const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);
const players = (m: Match) => [
  ...teams.find((t) => t.id === m.a)!.names,
  ...teams.find((t) => t.id === m.b)!.names,
];
export function MatchDetail({ id }: { id: string }) {
  const { matches } = usePreview();
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
      <Link href="/matches" className="back-link">
        <Icon name="back" size={16} />
        All matches
      </Link>
      <div className="match-detail-kicker">
        <span className="eyebrow">REGULAR SEASON · POD {m.pod}</span>
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
              <small>
                {m.status === "review"
                  ? "Awaiting result"
                  : dateLabel(m.date, true)}
              </small>
            </>
          )}
        </div>
        <div>
          <TeamAvatar id={m.b} size="large" />
          <h2>{nameOf(m.b)}</h2>
        </div>
      </section>
      <div className="match-location">
        <span>
          <Icon name="flag" size={17} />
          {m.course} · {m.tees}
        </span>
        <span>
          <Icon name="calendar" size={17} />
          {dateLabel(m.date, true)} CT
        </span>
      </div>
      {m.status !== "official" ? (
        <div className="notice">
          <Icon name="clock" />
          <div>
            <strong>Awaiting result</strong>
            <p>
              The commissioner will publish the score after receiving the card
              and GHIN screenshots. Arrange your match directly with your
              opponents.
            </p>
          </div>
        </div>
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
        <p>
          All golfers are fictional. Strokes are supplied fixture values, not
          fetched from GHIN. Regular-season play covers all 18 holes for
          seeding.
        </p>
      </section>
    </>
  );
}
function StrokeSummary({ match: m }: { match: Match }) {
  return (
    <section className="stroke-summary">
      <div>
        <Icon name="lock" size={28} />
        <h2>
          {m.lockedAt
            ? "Agreed before the first tee."
            : "Strokes need agreement."}
        </h2>
        <p>
          {m.lockedAt
            ? `Locked ${dateLabel(m.lockedAt, true)} CT · ${m.course}`
            : "Players must agree on GHIN-based strokes at least 24 hours before tee time."}
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
              Holes{" "}
              {m.strokes[i]
                .map((s, h) => (s ? h + 1 : null))
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
  const [nine, setNine] = useState(0);
  const [mode, setMode] = useState<"gross" | "net">("gross");
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
          <h2>{editable ? "Check the draft." : "The card."}</h2>
        </div>
        <div className="scorecard-controls">
          <div className="segmented" role="group" aria-label="Score type">
            <button
              aria-pressed={mode === "gross"}
              onClick={() => setMode("gross")}
            >
              Gross
            </button>
            <button
              disabled={!complete}
              aria-pressed={mode === "net"}
              onClick={() => setMode("net")}
            >
              Net
            </button>
          </div>
          <div className="segmented" role="group" aria-label="Scorecard nine">
            <button aria-pressed={nine === 0} onClick={() => setNine(0)}>
              Front 9
            </button>
            <button aria-pressed={nine === 1} onClick={() => setNine(1)}>
              Back 9
            </button>
          </div>
        </div>
      </div>
      {editable && (
        <p className="field-help">
          Edit gross scores to correct the draft. Net values use the externally
          agreed strokes. Results and totals appear once all scores and strokes
          are valid.
        </p>
      )}
      <div
        className="score-scroll"
        role="region"
        aria-label="Hole-by-hole scores, horizontally scrollable"
        tabIndex={0}
      >
        <table className="score-table">
          <caption className="sr-only">
            {teamLabels[0]} versus {teamLabels[1]} · {mode} scores ·{" "}
            {nine === 0 ? "Front" : "Back"} nine
          </caption>
          <thead>
            <tr>
              <th scope="col">HOLE</th>
              {holes.map((h) => (
                <th key={h} scope="col">
                  {h + 1}
                </th>
              ))}
              <th scope="col">{nine === 0 ? "OUT" : "IN"}</th>
              <th scope="col">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <tr className="par-row">
              <th scope="row">PAR</th>
              {holes.map((h) => (
                <td key={h}>{pars[h]}</td>
              ))}
              <td>{sum(holes.map((h) => pars[h]))}</td>
              <td>{sum(pars)}</td>
            </tr>
            <tr className="index-row">
              <th scope="row">STROKE INDEX</th>
              {holes.map((h) => (
                <td key={h}>{strokeIndex[h]}</td>
              ))}
              <td>—</td>
              <td>—</td>
            </tr>
            {playerLabels.map((name, p) => (
              <tr className={p === 2 ? "team-break" : ""} key={name}>
                <th scope="row">
                  <span>{name}</span>
                  <small>
                    {p < 2 ? "TEAM A" : "TEAM B"} · {sum(m.strokes[p])} strokes
                  </small>
                </th>
                {holes.map((h) => (
                  <td key={h}>
                    {editable && mode === "gross" ? (
                      <input
                        aria-label={`${name} hole ${h + 1} gross score`}
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="20"
                        value={m.scores[p][h] || ""}
                        onChange={(e) => {
                          const rows = m.scores.map((r) => [...r]);
                          rows[p][h] = Number(e.target.value);
                          onChange?.(rows);
                        }}
                      />
                    ) : (
                      <span
                        className={`score-number ${(mode === "gross" ? m.scores[p][h] : r.net[p][h]) < pars[h] ? "birdie" : (mode === "gross" ? m.scores[p][h] : r.net[p][h]) > pars[h] ? "bogey" : ""}`}
                      >
                        {mode === "gross" ? m.scores[p][h] : r.net[p][h]}
                      </span>
                    )}
                    {m.strokes[p][h] > 0 && (
                      <span
                        className="stroke-dot"
                        aria-label={`${m.strokes[p][h]} agreed stroke`}
                      >
                        •
                      </span>
                    )}
                  </td>
                ))}
                <td className="score-total">
                  {!complete
                    ? "—"
                    : sum(
                        holes.map((h) =>
                          mode === "gross" ? m.scores[p][h] : r.net[p][h],
                        ),
                      )}
                </td>
                <td className="score-total">
                  {complete
                    ? sum(mode === "gross" ? m.scores[p] : r.net[p])
                    : "—"}
                </td>
              </tr>
            ))}
            {complete && (
              <>
                {[r.a, r.b].map((row, i) => (
                  <tr className="net-row" key={i}>
                    <th scope="row">TEAM {i === 0 ? "A" : "B"} · BEST NET</th>
                    {holes.map((h) => (
                      <td key={h}>{row[h]}</td>
                    ))}
                    <td>{sum(holes.map((h) => row[h]))}</td>
                    <td>{sum(row)}</td>
                  </tr>
                ))}
                <tr className="hole-result">
                  <th scope="row">HOLE POINT</th>
                  {holes.map((h) => (
                    <td key={h}>
                      <span
                        className={r.holes[h]}
                        title={
                          r.holes[h] === "tie"
                            ? "Half a point each"
                            : `${r.holes[h] === "a" ? teamLabels[0] : teamLabels[1]} wins hole`
                        }
                      >
                        {r.holes[h] === "tie" ? "½" : r.holes[h].toUpperCase()}
                      </span>
                    </td>
                  ))}
                  <td colSpan={2}>
                    A {r.aPoints} : {r.bPoints} B
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
      <div className="scorecard-legend">
        <span>
          <i className="legend-circle" /> Birdie or better
        </span>
        <span>
          <i className="legend-square" /> Bogey or worse
        </span>
        <span>• Agreed stroke</span>
        <span>
          A = {teamLabels[0]} · B = {teamLabels[1]}
        </span>
      </div>
    </section>
  );
}
