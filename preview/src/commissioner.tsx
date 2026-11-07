"use client";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { usePreview } from "./store";
import { matches as originals, nameOf, teams, type Match } from "./data";
import { approvalError, publishDraft, result } from "./domain";
import { Scorecard } from "./workflows";
import { PageHeading } from "./ui";
import { FastScoreEntry } from "./score-entry";
import { CommissionerGraphics } from "./commissioner-graphics";

export function Commissioner() {
  const store = usePreview();
  const params = useSearchParams();
  const id = params.get("match");
  const match = store.matches.find((m) => m.id === id);
  const graphics = !id && params.get("tab") !== "results";
  const published = store.matches
    .filter((m) => m.status === "official")
    .sort((a, b) => b.date.localeCompare(a.date));
  const pending = store.matches.filter((m) => m.status !== "official");
  function matchRow(m: Match) {
    const score = m.status === "official" ? result(m) : null;
    return (
      <li key={m.id} className="desk-result">
        <div>
          <small>Pod {m.pod}</small>
          <Link href={`/matches/${m.id}`}>
            <strong>
              {nameOf(m.a)} <span>vs</span> {nameOf(m.b)}
            </strong>
          </Link>
          <p>
            {score
              ? `${score.aPoints}–${score.bPoints} · Completed`
              : "Pre-match"}
            {store.drafts[m.id] ? " · Draft saved" : ""}
          </p>
        </div>
        <div className="desk-row-actions">
          {score && (
            <Link
              className="text-link"
              href={`/review?tab=graphics&result=${m.id}`}
            >
              Make graphic
            </Link>
          )}
          <Link className="text-link" href={`/review?match=${m.id}`}>
            {store.drafts[m.id]
              ? "Resume draft"
              : score
                ? "Correct result"
                : "Enter result"}
          </Link>
        </div>
      </li>
    );
  }
  return (
    <>
      <PageHeading
        eyebrow="Commissioner"
        title={graphics ? "Match graphics" : "Results"}
      />
      <p className="fine-note">
        Sample season · Manual edits are browser-only.
      </p>
      <nav className="tabs" aria-label="Commissioner sections">
        <Link href="/review" aria-current={graphics ? "page" : undefined}>
          Graphics
        </Link>
        <Link
          href="/review?tab=results"
          aria-current={!graphics ? "page" : undefined}
        >
          Results & corrections
        </Link>
      </nav>
      {graphics ? (
        <CommissionerGraphics matches={store.matches} />
      ) : id && !match ? (
        <p>
          Match not found.{" "}
          <Link href="/review?tab=results">Back to results</Link>
        </p>
      ) : match ? (
        <Entry key={match.id} match={match} />
      ) : (
        <div className="commissioner-results">
          <section>
            <h2>
              Still to report{" "}
              <span className="desk-count">{pending.length}</span>
            </h2>
            {pending.length ? (
              <ul className="desk-results">{pending.map(matchRow)}</ul>
            ) : (
              <p>All regular-season results are in.</p>
            )}
          </section>
          <section>
            <h2>
              Published results{" "}
              <span className="desk-count">{published.length}</span>
            </h2>
            {published.length ? (
              <ul className="desk-results">{published.map(matchRow)}</ul>
            ) : (
              <p>
                No published results yet. Enter a card when the first match is
                complete.
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function startingDraft(m: Match): Match {
  // A new correction needs its own explanation; a saved draft is restored
  // separately and keeps the reason already entered for that correction.
  if (m.status === "official") return { ...structuredClone(m), note: "" };
  if (m.status === "review" || m.status === "correction")
    return structuredClone(m);
  return {
    ...structuredClone(m),
    scores: Array.from({ length: 4 }, () => Array(18).fill(0)),
    evidence: false,
  };
}
function Entry({ match: original }: { match: Match }) {
  const store = usePreview();
  const router = useRouter();
  const [draft, setDraft] = useState<Match>(
    store.drafts[original.id]?.match ?? startingDraft(original),
  );
  const [step, setStep] = useState<"edit" | "review" | "done">("edit");
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [publicationSaved, setPublicationSaved] = useState(false);
  const [strokeNine, setStrokeNine] = useState(0);
  const correcting = original.status === "official";
  function update(next: Match) {
    setDraft(next);
    setConfirmed(false);
    setSaved(false);
    setError("");
    store.setDraft(original.id, { match: next, note: next.note });
  }
  function review() {
    const e = approvalError(draft);
    if (e) {
      setError(e);
      return;
    }
    if (!draft.course.trim() || !draft.tees.trim()) {
      setError("Enter the course and tees from the agreed record.");
      return;
    }
    if (correcting && !draft.note.trim()) {
      setError("Explain the correction before publishing a revised result.");
      return;
    }
    setError("");
    setStep("review");
    window.scrollTo(0, 0);
  }
  function publish() {
    if (!confirmed) {
      setError("Confirm that you checked the card and GHIN evidence.");
      return;
    }
    try {
      const next = publishDraft(store.matches, draft);
      const persisted = store.save(
        next,
        correcting
          ? "Correction published. Current standings and records recalculated."
          : "Result published. Current standings and records updated.",
      );
      setPublicationSaved(persisted);
      if (persisted) store.setDraft(original.id, null);
      setError("");
      setStep("done");
      window.scrollTo(0, 0);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to publish. Your draft is retained.",
      );
    }
  }
  if (step === "done")
    return (
      <section className="review-actions">
        <div>
          <h2>
            {publicationSaved
              ? "Result published."
              : "Result published for this visit."}
          </h2>
          {publicationSaved ? (
            <p>Saved to this browser’s sample season.</p>
          ) : (
            <div className="notice" role="alert">
              <div>
                <strong>
                  This result could not be saved to browser storage.
                </strong>
                <p>
                  Keep this tab open. Your draft is retained, but this published
                  result will be lost on refresh unless saving succeeds.
                </p>
                <button
                  className="button outline"
                  onClick={() => {
                    if (store.save(store.matches, "Result published.")) {
                      setPublicationSaved(true);
                      store.setDraft(original.id, null);
                    }
                  }}
                >
                  Retry saving
                </button>
              </div>
            </div>
          )}
          <Link className="button primary" href={`/review?result=${draft.id}`}>
            Get Instagram graphic
          </Link>{" "}
          <Link className="button outline" href={`/matches/${draft.id}`}>
            View published scorecard
          </Link>{" "}
          <Link className="button outline" href="/review?tab=results">
            Choose another match
          </Link>
        </div>
      </section>
    );
  const names = [
    ...teams.find((t) => t.id === draft.a)!.names,
    ...teams.find((t) => t.id === draft.b)!.names,
  ];
  const r = result(draft);
  return (
    <>
      <Link className="back-link" href="/review?tab=results">
        All matches · draft retained
      </Link>
      <div className="review-top">
        <div>
          <p className="eyebrow">
            Pod {draft.pod} ·{" "}
            {correcting ? "Correction" : "Regular-season entry"}
          </p>
          <h2>
            {nameOf(draft.a)} vs {nameOf(draft.b)}
          </h2>
          <p>
            {correcting
              ? "The published result stays official until you publish this correction."
              : "Drafts do not count toward standings or awards."}
          </p>
        </div>
      </div>
      {step === "edit" ? (
        <>
          <section className="form-panel">
            <h3>Match record</h3>
            <p>Copy the played date, course and tees from the card.</p>
            <div className="commissioner-fields">
              <label>
                Course
                <input
                  value={draft.course}
                  maxLength={120}
                  onChange={(e) => update({ ...draft, course: e.target.value })}
                />
              </label>
              <label>
                Tees
                <input
                  value={draft.tees}
                  maxLength={120}
                  onChange={(e) => update({ ...draft, tees: e.target.value })}
                />
              </label>
              <label>
                Date played
                <input
                  type="date"
                  value={draft.date.slice(0, 10)}
                  onChange={(e) =>
                    update({
                      ...draft,
                      date: e.target.value
                        ? `${e.target.value}T12:00:00-05:00`
                        : "",
                    })
                  }
                />
              </label>
            </div>
            <label className="check-field">
              <input
                type="checkbox"
                checked={draft.evidence}
                onChange={(e) =>
                  update({ ...draft, evidence: e.target.checked })
                }
              />
              Sample card and GHIN screenshots received for all four players,
              showing course, tees and GHIN strokes. The card includes all four
              players’ scores and marks each team’s best ball.
            </label>
            <p className="field-help">
              Keep evidence outside this demo. No uploads or GHIN connection.
            </p>
          </section>
          <details className="agreed-details">
            <summary>Enter agreed strokes by hole</summary>
            <p>
              Copy the GHIN match-play allocation: 90% allowance, playing off
              the lowest player, maximum one stroke per hole.
            </p>
            <div className="segmented">
              <button
                onClick={() => setStrokeNine(0)}
                aria-pressed={strokeNine === 0}
              >
                Stroke front 9
              </button>
              <button
                onClick={() => setStrokeNine(1)}
                aria-pressed={strokeNine === 1}
              >
                Stroke back 9
              </button>
            </div>
            <div
              className="score-scroll"
              role="region"
              aria-label="Agreed stroke entry"
              tabIndex={0}
            >
              <table className="score-table">
                <thead>
                  <tr>
                    <th>Player</th>
                    {Array.from({ length: 9 }, (_, i) => (
                      <th key={i}>Hole {i + 1 + strokeNine * 9}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {names.map((name, p) => (
                    <tr key={name}>
                      <th>{name}</th>
                      {Array.from({ length: 9 }, (_, i) => {
                        const h = i + strokeNine * 9;
                        return (
                          <td key={h}>
                            <input
                              aria-label={`${name} hole ${h + 1} agreed strokes`}
                              type="number"
                              min={0}
                              max={1}
                              value={draft.strokes[p][h]}
                              onChange={(e) => {
                                const strokes = draft.strokes.map((row) => [
                                  ...row,
                                ]);
                                strokes[p][h] =
                                  e.target.value === ""
                                    ? -1
                                    : Number(e.target.value);
                                update({ ...draft, strokes });
                              }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <FastScoreEntry
            match={draft}
            onChange={(scores) => update({ ...draft, scores })}
          />
          <details className="agreed-details">
            <summary>Full scorecard editor</summary>
            <Scorecard
              match={draft}
              editable
              onChange={(scores) => update({ ...draft, scores })}
            />
          </details>
          <details className="agreed-details">
            <summary>Show fictional source card</summary>
            <p>Original sample card; unaffected by draft edits.</p>
            <Scorecard match={originals.find((m) => m.id === draft.id)!} />
          </details>
          <section className="form-panel">
            <label htmlFor="entry-note">
              {correcting
                ? "Correction reason (required)"
                : "Commissioner note (optional)"}
            </label>
            <textarea
              className="resize-none"
              id="entry-note"
              rows={3}
              maxLength={1000}
              value={draft.note}
              onChange={(e) => update({ ...draft, note: e.target.value })}
            />
            <p className="field-help">
              Demo record only; not displayed on public scorecards.
            </p>
          </section>
        </>
      ) : (
        <>
          <p className="eyebrow">Review before publishing</p>
          <h2>
            {r.winner ? `${nameOf(r.winner)} win` : "Match tied"} · {r.aPoints}{" "}
            – {r.bPoints}
          </h2>
          <p>
            {draft.course} · {draft.tees}
          </p>
          <Scorecard match={draft} />
          {draft.note && <p>Commissioner note: {draft.note}</p>}
          <label className="check-field">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            I checked all 18 holes and the agreed strokes against the card and
            GHIN evidence.
          </label>
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <section className="review-actions">
        <div className="review-buttons">
          {step === "edit" ? (
            <>
              <button className="button primary" onClick={review}>
                Review result
              </button>
              <button
                className="button outline"
                onClick={() => {
                  store.setDraft(draft.id, { match: draft, note: draft.note });
                  setSaved(true);
                }}
              >
                {saved ? "Draft retained" : "Save draft"}
              </button>
              <p>
                Drafts are retained in this browser. Storage failures are
                reported below; no cross-device sync.
              </p>
            </>
          ) : (
            <>
              <button className="button primary" onClick={publish}>
                {correcting ? "Publish correction" : "Publish result"}
              </button>
              <button
                className="button outline"
                onClick={() => {
                  setStep("edit");
                  setConfirmed(false);
                  setError("");
                }}
              >
                Back to editing
              </button>
            </>
          )}
          <button
            className="button quiet"
            aria-expanded={cancelOpen}
            onClick={() => setCancelOpen(!cancelOpen)}
          >
            Discard draft
          </button>
          {cancelOpen && (
            <div className="reset-panel">
              <p>Discard this draft? The published result will not change.</p>
              <button
                className="button outline"
                onClick={() => {
                  store.setDraft(draft.id, null);
                  router.push("/review");
                }}
              >
                Discard and return
              </button>
              <button
                className="text-link"
                onClick={() => setCancelOpen(false)}
              >
                Keep editing
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
