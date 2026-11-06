"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { type Match, nameOf } from "./data";
import { podWinner, qualified, standings } from "./domain";
import {
  projectField,
  simulateMatch,
  type ScenarioScore,
} from "./standings-view";
import { Icon } from "./ui";

export function PlayoffPicture({ matches }: { matches: Match[] }) {
  const pending = matches.filter((m) => m.status !== "official");
  const [matchId, setMatchId] = useState(pending[0]?.id ?? "");
  const [points, setPoints] = useState(9);
  const [holesWon, setHolesWon] = useState(9);
  const [aNet, setANet] = useState("72");
  const [bNet, setBNet] = useState("72");
  const [applied, setApplied] = useState<{
    id: string;
    score: ScenarioScore;
  } | null>(null);
  const [error, setError] = useState("");
  const correctionFields = useRef<HTMLDetailsElement>(null);
  const match = pending.find((m) => m.id === matchId) ?? pending[0];
  const current = projectField(standings(matches));
  // Recompute from published state; never persist a hypothetical score.
  const scenarioRows =
    applied && pending.some((m) => m.id === applied.id)
      ? simulateMatch(matches, applied.id, applied.score)
      : null;
  const picture = scenarioRows ? projectField(scenarioRows) : current;
  const official = qualified(matches);
  const selectedIn = (id: string, field: typeof current.field) =>
    field.find((r) => r.team.id === id);
  function update() {
    setApplied(null);
    setError("");
  }
  function apply() {
    if (!match) return;
    if (!aNet.trim() || !bNet.trim()) {
      if (correctionFields.current) correctionFields.current.open = true;
      setError("Enter both net better-ball totals.");
      setApplied(null);
      return;
    }
    const score = { points, holesWon, aNet: Number(aNet), bNet: Number(bNet) };
    try {
      simulateMatch(matches, match.id, score);
      setApplied({ id: match.id, score });
      setError("");
    } catch (e) {
      if (correctionFields.current) correctionFields.current.open = true;
      setError((e as Error).message);
      setApplied(null);
    }
  }
  return (
    <div className="playoff-picture">
      <div className="picture-heading">
        <div>
          <p className="eyebrow">
            {scenarioRows
              ? "Your scenario"
              : official.length
                ? "Qualified field"
                : "If the season ended today"}
          </p>
          <h2>
            {scenarioRows
              ? "The field after your score"
              : "Six pod winners. Two wild cards."}
          </h2>
          <p>
            {pending.length
              ? pending.length + " matches left in the regular season"
              : "Regular-season results are complete"}
          </p>
        </div>
        <Link href="/bracket" className="text-link">
          View bracket <Icon name="arrow" />
        </Link>
      </div>
      {!current.field.length ? (
        <p className="notice">
          The playoff picture starts with the first completed match.
        </p>
      ) : (
        <>
          <div className="picture-columns" id="projected-eight">
            <section>
              <h3>
                {official.length && !scenarioRows
                  ? "Playoff seeds"
                  : "Projected eight"}
              </h3>
              <ol className="seed-ledger">
                {picture.field.map((row) => {
                  const locked =
                    !scenarioRows &&
                    (row.won === 2 ||
                      podWinner(matches, row.team.pod) === row.team.id);
                  const movedIn =
                    !!scenarioRows && !selectedIn(row.team.id, current.field);
                  return (
                    <li key={row.team.id}>
                      <span className="seed-number">{row.seed}</span>
                      <div>
                        <Link href={"/teams/" + row.team.id}>
                          {nameOf(row.team.id)}
                        </Link>
                        <span>
                          Pod {row.team.pod} ·{" "}
                          {locked
                            ? "Pod winner · Qualified"
                            : row.route === "Pod winner"
                              ? "Pod leader"
                              : row.route}
                          {movedIn ? " · Moves in" : ""}
                        </span>
                      </div>
                      <span className="seed-record">
                        {row.won}–{row.lost}–{row.tied}
                        <small>{row.points} hole pts</small>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
            <section>
              <h3>Next four out</h3>
              <p className="field-help">The wild-card bubble</p>
              <ol className="bubble-ledger">
                {picture.bubble.map((row) => (
                  <li key={row.team.id}>
                    <div>
                      <Link href={"/teams/" + row.team.id}>
                        {nameOf(row.team.id)}
                      </Link>
                      <span>
                        Pod {row.team.pod}
                        {scenarioRows && selectedIn(row.team.id, current.field)
                          ? " · Moves out"
                          : ""}
                      </span>
                    </div>
                    <span className="seed-record">
                      {row.won}–{row.lost}–{row.tied}
                      <small>{row.points} hole pts</small>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="field-help">
                Pod winners take seeds 1–6. The two highest-ranked remaining
                teams take seeds 7–8.
              </p>
            </section>
          </div>
          {picture.ties.length > 0 && (
            <div className="tie-watch">
              <strong>Tiebreak needed</strong>
              {picture.ties.map((group, i) => (
                <p key={i}>{group.map((r) => nameOf(r.team.id)).join(" / ")}</p>
              ))}
              <p>
                These teams are level on all recorded tiebreakers. Their
                displayed order does not decide qualification.
              </p>
            </div>
          )}
        </>
      )}
      {pending.length > 0 && match ? (
        <section className="scenario-panel" aria-label="Playoff calculator">
          <div className="picture-heading">
            <div>
              <p className="eyebrow">What if?</p>
              <h2>Playoff calculator</h2>
              <p>
                Try a score. See who moves into the eight and who drops out.
              </p>
            </div>
            {applied && (
              <button className="button outline small" onClick={update}>
                Reset scenario
              </button>
            )}
          </div>
          <label className="scenario-match">
            Match
            <select
              value={match.id}
              onChange={(e) => {
                setMatchId(e.target.value);
                update();
              }}
            >
              {pending.map((m) => (
                <option key={m.id} value={m.id}>
                  {nameOf(m.a)} vs {nameOf(m.b)}
                </option>
              ))}
            </select>
          </label>
          <div className="scenario-score">
            <span>{nameOf(match.a)}</span>
            <strong>
              {points} <span>–</span> {18 - points}
            </strong>
            <span>{nameOf(match.b)}</span>
          </div>
          <label className="scenario-range">
            {nameOf(match.a)} hole points
            <input
              type="range"
              min="0"
              max="18"
              step=".5"
              value={points}
              onChange={(e) => {
                const n = Number(e.target.value);
                setPoints(n);
                setHolesWon(Math.floor(n));
                update();
              }}
            />
          </label>
          <div className="scenario-presets">
            {[6, 8, 9, 10, 12].map((n) => (
              <button
                key={n}
                className="button outline small"
                aria-pressed={points === n}
                onClick={() => {
                  setPoints(n);
                  setHolesWon(n);
                  update();
                }}
              >
                {n}–{18 - n}
              </button>
            ))}
          </div>
          <details className="scenario-details" ref={correctionFields}>
            <summary>Tiebreak details</summary>
            <p>
              Starting assumptions: all holes decided and net 72 per team.
              Adjust the totals to fit your result; a sweep requires at least an
              18-stroke difference.
            </p>
            <div className="scenario-fields">
              <label>
                {nameOf(match.a)} holes won
                <select
                  value={holesWon}
                  onChange={(e) => {
                    setHolesWon(Number(e.target.value));
                    update();
                  }}
                >
                  {Array.from({ length: 19 }, (_, i) => i)
                    .filter((n) => n <= points && n >= 2 * points - 18)
                    .map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                </select>
              </label>
              <label>
                {nameOf(match.a)} net BB
                <input
                  type="number"
                  min="0"
                  max="360"
                  value={aNet}
                  onChange={(e) => {
                    setANet(e.target.value);
                    update();
                  }}
                />
              </label>
              <label>
                {nameOf(match.b)} net BB
                <input
                  type="number"
                  min="0"
                  max="360"
                  value={bNet}
                  onChange={(e) => {
                    setBNet(e.target.value);
                    update();
                  }}
                />
              </label>
            </div>
          </details>
          <p className="field-help">
            Only this match changes in the projection. Other unplayed matches
            stay unplayed. This is a scenario, not a probability forecast.
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary" onClick={apply}>
            Calculate playoff picture <Icon name="arrow" />
          </button>
          {applied && (
            <div
              className="scenario-comparison"
              aria-label="Scenario comparison"
            >
              {[match.a, match.b].map((id) => {
                const before = selectedIn(id, current.field);
                const after = selectedIn(id, picture.field);
                return (
                  <div key={id}>
                    <strong>{nameOf(id)}</strong>
                    <span>
                      Now:{" "}
                      {before ? "Seed " + before.seed : "Outside the eight"}
                    </span>
                    <span>
                      Scenario:{" "}
                      {after ? "Seed " + after.seed : "Outside the eight"}
                    </span>
                  </div>
                );
              })}
              <a className="text-link" href="#projected-eight">
                See updated field <Icon name="arrow" />
              </a>
            </div>
          )}
          <p className="scenario-status" role="status">
            {applied
              ? "Scenario applied. Projected eight and bubble updated above; published results are unchanged."
              : ""}
          </p>
        </section>
      ) : (
        <p className="fine-note">No regular-season matches left to simulate.</p>
      )}
    </div>
  );
}
