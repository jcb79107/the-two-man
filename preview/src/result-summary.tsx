import { type Match, nameOf } from "./data";
import { result } from "./domain";
export function ResultSummary({ match }: { match: Match }) {
  const r = result(match);
  const a = r.holes.filter((h) => h === "a").length;
  const b = r.holes.filter((h) => h === "b").length;
  const tied = 18 - a - b;
  return (
    <section className="result-summary" aria-label="How the result was decided">
      <div>
        <p className="eyebrow">18-HOLE RESULT</p>
        <h2>
          {a} holes won · {tied} halved · {b} holes won
        </h2>
        <p>
          {nameOf(match.a)} vs {nameOf(match.b)}
        </p>
      </div>
      <div className="result-hole-strip" aria-label="Hole outcomes">
        {r.holes.map((winner, h) => (
          <span
            key={h}
            className={winner}
            title={`Hole ${h + 1}: ${winner === "tie" ? "halved" : `${nameOf(winner === "a" ? match.a : match.b)} won`}`}
          >
            <small>{h + 1}</small>
            <b>{winner === "tie" ? "½" : winner.toUpperCase()}</b>
            <span className="sr-only">
              {winner === "tie"
                ? "Halved"
                : `${nameOf(winner === "a" ? match.a : match.b)} won`}
            </span>
          </span>
        ))}
      </div>
      <p className="field-help">
        A = {nameOf(match.a)} · B = {nameOf(match.b)} · All 18 holes count
        toward regular-season seeding.
      </p>
    </section>
  );
}
