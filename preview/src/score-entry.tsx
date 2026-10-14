"use client";
import { useRef, useState } from "react";
import { type Match, nameOf, teams } from "./data";
import { parseScoreRow } from "./score-entry-model";

export function FastScoreEntry({
  match,
  onChange,
}: {
  match: Match;
  onChange: (scores: number[][]) => void;
}) {
  const [hole, setHole] = useState(0);
  const [player, setPlayer] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const paste = useRef<HTMLTextAreaElement>(null);
  const first = useRef<HTMLInputElement>(null);
  const names = [
    ...teams.find((t) => t.id === match.a)!.names,
    ...teams.find((t) => t.id === match.b)!.names,
  ];
  const valid = (n: number) => Number.isInteger(n) && n >= 1 && n <= 20;
  const completed = match.scores.flat().filter(valid).length;
  function move(next: number) {
    setHole(next);
    first.current?.focus();
  }
  return (
    <section className="fast-entry form-panel" aria-label="Fast score entry">
      <div className="entry-heading">
        <div>
          <p className="eyebrow">GROSS SCORES</p>
          <h3>One hole. Four players.</h3>
        </div>
        <span role="status">{completed} / 72 entered</span>
      </div>
      <progress value={completed} max={72} aria-label="Gross scores entered" />
      <div className="hole-picker" aria-label="Choose hole">
        {Array.from({ length: 18 }, (_, h) => (
          <button
            key={h}
            aria-pressed={hole === h}
            aria-label={`Hole ${h + 1}${match.scores.every((row) => valid(row[h])) ? ", complete" : ", incomplete"}`}
            className={
              match.scores.every((row) => valid(row[h])) ? "complete" : ""
            }
            onClick={() => move(h)}
          >
            {h + 1}
          </button>
        ))}
      </div>
      <div className="entry-heading">
        <h3>Hole {hole + 1}</h3>
        <span>Enter gross scores from the card</span>
      </div>
      <div className="hole-inputs">
        {names.map((name, p) => (
          <label key={name}>
            <span>
              {name}
              <small>{nameOf(p < 2 ? match.a : match.b)}</small>
            </span>
            <input
              ref={p === 0 ? first : undefined}
              aria-label={`${name} hole ${hole + 1} quick score`}
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              value={match.scores[p][hole] || ""}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => {
                const rows = match.scores.map((row) => [...row]);
                rows[p][hole] = Number(e.target.value);
                onChange(rows);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (p === 3 && hole < 17) move(hole + 1);
                  else if (p < 3)
                    (
                      e.currentTarget
                        .closest(".hole-inputs")
                        ?.querySelectorAll("input")[p + 1] as HTMLInputElement
                    )?.focus();
                }
              }}
            />
          </label>
        ))}
      </div>
      <div className="entry-heading">
        <button
          className="button outline small"
          disabled={hole === 0}
          onClick={() => move(hole - 1)}
        >
          Previous hole
        </button>
        <span className="field-help">Enter moves to the next player.</span>
        <button
          className="button primary small"
          disabled={hole === 17}
          onClick={() => move(hole + 1)}
        >
          Next hole
        </button>
      </div>
      <details className="paste-entry">
        <summary>Have a typed row? Paste 18 scores</summary>
        <p id="paste-help">
          One player, holes 1–18. Separate scores with spaces, commas or tabs.
          Leave out totals. Applying replaces only this player’s draft scores.
        </p>
        <label>
          Player
          <select
            value={player}
            onChange={(e) => {
              setPlayer(Number(e.target.value));
              setNotice("");
            }}
          >
            {names.map((name, p) => (
              <option value={p} key={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="paste-scores">
          18 gross scores for {names[player]}
        </label>
        <textarea
          className="resize-none"
          id="paste-scores"
          ref={paste}
          rows={3}
          value={text}
          aria-invalid={!!error}
          aria-describedby={error ? "paste-help paste-error" : "paste-help"}
          onChange={(e) => {
            setText(e.target.value);
            setError("");
            setNotice("");
          }}
          placeholder="4 5 3 6 4 5 3 5 4 5 3 6 4 5 3 4 6 4"
        />
        {error && (
          <p id="paste-error" className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="button outline"
          onClick={() => {
            try {
              const row = parseScoreRow(text);
              const rows = match.scores.map((r) => [...r]);
              rows[player] = row;
              onChange(rows);
              setText("");
              setError("");
              setNotice(
                `18 draft scores applied for ${names[player]}. Check them against the card before publishing.`,
              );
            } catch (e) {
              setError((e as Error).message);
              paste.current?.focus();
            }
          }}
        >
          Apply row to draft
        </button>
        <p role="status">{notice}</p>
      </details>
    </section>
  );
}
