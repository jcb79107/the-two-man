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

export function Commissioner() {
  const store = usePreview();
  const params = useSearchParams();
  const id = params.get("match");
  const match = store.matches.find((m) => m.id === id);
  return (
    <>
      <PageHeading
        eyebrow="COMMISSIONER WORKSPACE · DEMO"
        title="Commissioner desk"
      />
      <p className="notice">
        Public demo · Saved in this browser only. No login or privacy
        protection. Use fictional data only; do not enter real cards, GHIN
        evidence or personal information.
      </p>
      {id && !match ? (
        <p>
          Match not found. <Link href="/review">Choose a match</Link>
        </p>
      ) : match ? (
        <Entry key={match.id} match={match} />
      ) : (
        <>
          <p className="fine-note">Regular-season entry only.</p>
          <div className="queue-nav" aria-label="Choose a match">
            {store.matches.map((m) => (
              <Link href={`/review?match=${m.id}`} key={m.id}>
                <span>
                  {nameOf(m.a)} vs {nameOf(m.b)}
                </span>
                <span>
                  {store.drafts[m.id] ? "Draft saved · " : ""}
                  {m.status === "official"
                    ? "Correct published result"
                    : "Enter result"}
                </span>
              </Link>
            ))}
          </div>
        </>
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
      store.save(
        next,
        correcting
          ? "Correction published. Current standings and records recalculated."
          : "Result published. Current standings and records updated.",
      );
      store.setDraft(original.id, null);
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
          <h2>Result published.</h2>
          <p>Saved to this browser’s sample season.</p>
          <Link className="button primary" href={`/matches/${draft.id}`}>
            View published scorecard
          </Link>{" "}
          <Link className="button outline" href="/review">
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
      <Link className="back-link" href="/review">
        All matches · draft retained
      </Link>
      <div className="review-top">
        <div>
          <p className="eyebrow">
            POD {draft.pod} ·{" "}
            {correcting ? "CORRECTION" : "REGULAR-SEASON ENTRY"}
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
            <p>
              Copy the agreed match details. Times are Chicago daylight time;
              this form does not schedule or lock matches.
            </p>
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
                Tee time (CDT)
                <input
                  type="datetime-local"
                  value={draft.date.slice(0, 16)}
                  onInput={(e) =>
                    update({
                      ...draft,
                      date: e.currentTarget.value
                        ? `${e.currentTarget.value}:00-05:00`
                        : "",
                    })
                  }
                  onChange={(e) =>
                    update({
                      ...draft,
                      date: e.target.value ? `${e.target.value}:00-05:00` : "",
                    })
                  }
                />
              </label>
              <label>
                Strokes agreed at (CDT)
                <input
                  type="datetime-local"
                  value={draft.lockedAt?.slice(0, 16) ?? ""}
                  onInput={(e) =>
                    update({
                      ...draft,
                      lockedAt: e.currentTarget.value
                        ? `${e.currentTarget.value}:00-05:00`
                        : null,
                    })
                  }
                  onChange={(e) =>
                    update({
                      ...draft,
                      lockedAt: e.target.value
                        ? `${e.target.value}:00-05:00`
                        : null,
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
              showing course and tees.
            </label>
            <p className="field-help">
              Keep evidence outside this demo. No uploads or GHIN connection.
            </p>
          </section>
          <details className="agreed-details">
            <summary>Enter agreed strokes by hole</summary>
            <p>
              Copy the agreed allocation; no handicap calculation is performed
              here.
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
                              max={3}
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
          <p className="eyebrow">REVIEW BEFORE PUBLISHING</p>
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
