"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect, type FormEvent } from "react";
import { usePreview } from "./store";
import {
  teams,
  matches as originalMatches,
  nameOf,
  dateLabel,
  pars,
  strokeIndex,
  PREVIEW_NOW,
  type Match,
} from "./data";
import {
  result,
  validateCard,
  lockAllowed,
  approveMatch,
  approvalError,
} from "./domain";
import { Icon, Badge, TeamAvatar, PageHeading, Empty } from "./ui";
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
                  ? "Awaiting human review"
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
      {["unbooked", "scheduled"].includes(m.status) ? (
        <ScheduleForm key={m.id} match={m} />
      ) : (
        <>
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
            {m.status === "review" && (
              <Link
                href={`/review?match=${m.id}`}
                className="button outline small"
              >
                Review sample card
                <Icon name="arrow" size={17} />
              </Link>
            )}
          </div>
          {m.status !== "official" && (
            <div className="notice">
              <Icon name="clock" />
              <div>
                <strong>This card isn’t official yet.</strong>
                <p>
                  Draft scores don’t count toward standings or awards until
                  approved.
                </p>
              </div>
            </div>
          )}
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
          agreed strokes.
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
                  {sum(
                    holes.map((h) =>
                      mode === "gross" ? m.scores[p][h] : r.net[p][h],
                    ),
                  )}
                </td>
                <td className="score-total">
                  {sum(mode === "gross" ? m.scores[p] : r.net[p])}
                </td>
              </tr>
            ))}
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
function ScheduleForm({ match: m }: { match: Match }) {
  const { matches, save } = usePreview();
  const [date, setDate] = useState(m.date.slice(0, 10));
  const [time, setTime] = useState(m.date.slice(11, 16) || "09:00");
  const [course, setCourse] = useState(m.course);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  function schedule(e: FormEvent) {
    e.preventDefault();
    const fields = new FormData(e.currentTarget as HTMLFormElement);
    const date = String(fields.get("date") || "");
    const time = String(fields.get("time") || "");
    const course = String(fields.get("course") || "");
    setDate(date);
    setTime(time);
    setCourse(course);
    const dt = `${date}T${time}:00-05:00`;
    if (!date || !time || !course.trim() || !Number.isFinite(Date.parse(dt))) {
      setError("Choose a valid date, time and course.");
      document.getElementById("match-date")?.focus();
      return;
    }
    if (Date.parse(dt) < Date.parse(PREVIEW_NOW)) {
      setError("Choose a date after June 24 in this sample season.");
      return;
    }
    if (date < "2027-04-01" || date > "2027-06-30") {
      setError(
        "This preview accepts regular-season dates through June 30. Later dates need a commissioner-approved extension.",
      );
      return;
    }
    save(
      matches.map((x) =>
        x.id === m.id
          ? {
              ...x,
              date: dt,
              course: course.trim(),
              status: "scheduled",
              lockedAt: null,
            }
          : x,
      ),
      "Match date saved. Stroke agreement needs confirmation.",
    );
    setError("");
    setSaved(true);
    setAgreed(false);
  }
  function lock() {
    if (!agreed) {
      setError("Confirm all four players agreed to the sample strokes.");
      return;
    }
    if (!lockAllowed(m.date, PREVIEW_NOW)) {
      setError(
        "The 24-hour cutoff has passed. Ask the commissioner; strokes were not locked.",
      );
      return;
    }
    save(
      matches.map((x) => (x.id === m.id ? { ...x, lockedAt: PREVIEW_NOW } : x)),
      "Sample strokes locked.",
    );
    setError("");
  }
  return (
    <div className="schedule-layout">
      <section className="form-panel">
        <p className="eyebrow">BEFORE THE FIRST TEE</p>
        <h2>Get a date agreed.</h2>
        <p className="muted">
          Coordinate with your opponents, then record it here. Nothing is sent
          to other players in this preview.
        </p>
        <form noValidate onSubmit={schedule}>
          <div className="field-row">
            <label>
              Match date
              <input
                id="match-date"
                name="date"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setSaved(false);
                }}
                min="2027-04-01"
                max="2027-06-30"
              />
            </label>
            <label>
              Tee time · Central
              <input
                type="time"
                name="time"
                value={time}
                onChange={(e) => {
                  setTime(e.target.value);
                  setSaved(false);
                }}
              />
            </label>
          </div>
          <label>
            Course
            <input
              name="course"
              value={course}
              maxLength={100}
              onChange={(e) => {
                setCourse(e.target.value);
                setSaved(false);
              }}
            />
          </label>
          <p className="field-help">
            Tees and strokes come from GHIN, not a course calculator here.
            Sample dates use Central daylight time.
          </p>
          <button className="button primary" type="submit">
            {saved ? "Date saved" : "Save match date"}
            <Icon name="calendar" size={17} />
          </button>
        </form>
      </section>
      <section className="form-panel">
        <Icon name="lock" size={28} />
        <h2>Lock it before you play.</h2>
        <p>Strokes must be agreed at least 24 hours before tee time.</p>
        <StrokeSummary match={m} />
        {m.lockedAt && (
          <p role="status">
            Strokes locked {dateLabel(m.lockedAt, true)} CT. Changing the date
            or course requires a new agreement.
          </p>
        )}
        {!m.lockedAt && (
          <>
            <label className="check-field">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              All four players agree to these sample strokes.
            </label>
            <button
              className="button primary"
              disabled={!m.date}
              onClick={lock}
            >
              Lock sample strokes
              <Icon name="lock" size={17} />
            </button>
            <p className="field-help">
              Preview clock: June 24, 2027, 12:00 PM CT.
            </p>
          </>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
export function Submission() {
  const store = usePreview();
  const router = useRouter();
  const candidates = store.matches.filter((m) => m.status !== "official");
  const [id, setId] = useState(candidates[0]?.id ?? "m1");
  const m = store.matches.find((m) => m.id === id)!;
  const [useSample, setUseSample] = useState(true);
  const [filename, setFilename] = useState("");
  const [fileError, setFileError] = useState("");
  const [checked, setChecked] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [simulate, setSimulate] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  function file(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFileError(
        "Choose a JPG, PNG or WebP image. HEIC needs to be exported first.",
      );
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setFileError("Choose an image smaller than 8 MB.");
      return;
    }
    const url = URL.createObjectURL(file);
    if (store.photo?.startsWith("blob:")) URL.revokeObjectURL(store.photo);
    store.setPhoto(url, id);
    setFilename(file.name);
    setUseSample(false);
    setFileError("");
    setError("");
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!m.date || Date.parse(m.date) > Date.parse(PREVIEW_NOW)) {
      setError(
        "This match has not been played yet. Use the completed sample match to try submission.",
      );
      return;
    }
    if (!checked) {
      setError("Confirm the players agreed to the strokes shown on the card.");
      document.getElementById("submission-confirm")?.focus();
      return;
    }
    if (!useSample && !store.photo) {
      setError("Choose a scorecard photo or use the sample.");
      fileRef.current?.focus();
      return;
    }
    if (simulate) {
      setError(
        "Demo failure: the submission was not saved. Your photo is still here. Turn off the failure test and try again.",
      );
      return;
    }
    store.save(
      store.matches.map((x) =>
        x.id === id
          ? {
              ...x,
              status: "review",
              evidence: true,
              note: useSample
                ? "Sample card submitted."
                : "Local photo attached for this visit. AI transcription is not connected; enter scores manually.",
            }
          : x,
      ),
      "Sample card received for review.",
    );
    if (useSample && store.photoMatch === id) store.setPhoto(null);
    store.setDraft(id, null);
    setDone(true);
  }
  if (done)
    return (
      <section className="success-page">
        <span className="success-icon">
          <Icon name="check" size={40} />
        </span>
        <p className="eyebrow">CARD RECEIVED</p>
        <h1>We’ve got the card.</h1>
        <p>
          {nameOf(m.a)} vs {nameOf(m.b)}
        </p>
        <p className="muted">
          Your sample result is awaiting human review.
          <br />
          It won’t affect standings until approved.
        </p>
        <div className="button-row">
          <button
            className="button primary"
            onClick={() => {
              store.setRole("commissioner");
              router.push(`/review?match=${id}`);
            }}
          >
            Try the commissioner review
            <Icon name="arrow" />
          </button>
          <Link className="button outline" href={`/matches/${id}`}>
            View match
          </Link>
        </div>
        <p className="field-help">
          Preview only. No image was uploaded and no AI service was called.
        </p>
      </section>
    );
  return (
    <>
      <PageHeading
        eyebrow="AFTER THE ROUND"
        title="Send the card.<br/>We’ll take it from here."
        description="A photo, the agreed strokes, and a human check. Keep the post-round admin short."
      />
      <div className="submission-layout">
        <form className="form-panel upload-form" noValidate onSubmit={submit}>
          <label htmlFor="submit-match">Your match</label>
          <select
            id="submit-match"
            value={id}
            onChange={(e) => {
              setId(e.target.value);
              setChecked(false);
            }}
          >
            {candidates.map((m) => (
              <option key={m.id} value={m.id}>
                {nameOf(m.a)} vs {nameOf(m.b)} · Pod {m.pod}
              </option>
            ))}
          </select>
          {!candidates.length && (
            <p>
              All sample matches are official. Reset the demo to try a
              submission.
            </p>
          )}
          <div
            className="upload-zone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              file(e.dataTransfer.files[0]);
            }}
          >
            <Icon name="upload" size={35} />
            <h2>A clear shot of all 18.</h2>
            <p>Include player names and agreed stroke marks.</p>
            <label
              className="button outline upload-label"
              htmlFor="scorecard-file"
            >
              Choose a photo
              <Icon name="image" size={17} />
            </label>
            <input
              ref={fileRef}
              className="file-input"
              id="scorecard-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => file(e.target.files?.[0])}
            />
            <span>JPG, PNG or WebP · Up to 8 MB</span>
          </div>
          {fileError && (
            <p className="form-error" role="alert">
              {fileError}
            </p>
          )}
          <button
            type="button"
            className={`sample-choice ${useSample ? "selected" : ""}`}
            onClick={() => {
              setUseSample(true);
              setFileError("");
            }}
          >
            <Icon name={useSample ? "check" : "image"} />
            <span>
              <strong>Use the staged scorecard</strong>
              <small>Try the whole flow without a real photo.</small>
            </span>
          </button>
          {!useSample && filename && (
            <div className="file-selected">
              <Icon name="image" />
              <span>
                {filename}
                <small>Stays in this browser · not uploaded</small>
              </span>
              <button
                type="button"
                aria-label="Remove selected photo"
                onClick={() => {
                  if (store.photo) URL.revokeObjectURL(store.photo);
                  store.setPhoto(null);
                  setFilename("");
                  setUseSample(true);
                  if (fileRef.current) fileRef.current.value = "";
                }}
              >
                <Icon name="close" />
              </button>
            </div>
          )}
          <label className="check-field">
            <input
              id="submission-confirm"
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              aria-invalid={!!error}
              aria-describedby={error ? "submit-error" : undefined}
            />
            The card reflects the strokes agreed at least 24 hours before tee
            time.
          </label>
          {error && (
            <p id="submit-error" className="form-error" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="button primary full"
            disabled={!candidates.length}
          >
            Send for human review
            <Icon name="arrow" />
          </button>
          <details className="demo-details">
            <summary>Preview controls</summary>
            <label className="check-field">
              <input
                type="checkbox"
                checked={simulate}
                onChange={(e) => setSimulate(e.target.checked)}
              />
              Simulate a failed submission
            </label>
            <p>
              No OCR or upload backend is connected. The sample has a prepared
              editable transcription. For your own photo, the reviewer enters
              scores manually.
            </p>
          </details>
        </form>
        <aside className="submission-aside">
          <div className="sample-paper">
            <p className="eyebrow">THE TWO-MAN · REGULAR SEASON</p>
            <h3>{m.course}</h3>
            <span>
              {nameOf(m.a)}
              <br />
              vs {nameOf(m.b)}
            </span>
            <div className="paper-lines">
              {players(m).map((n, i) => (
                <div key={n}>
                  <b>{n}</b>
                  {m.scores[i].slice(0, 6).map((s, h) => (
                    <span key={h}>
                      {s}
                      {m.strokes[i][h] ? "•" : ""}
                    </span>
                  ))}
                </div>
              ))}
            </div>
            <p>STROKES AGREED BEFORE PLAY ✓</p>
            <small>Illustrative card · full 18 holes in review</small>
          </div>
          <div className="how-it-works">
            <h2>One card. One clear result.</h2>
            <ol>
              <li>
                <strong>Capture</strong>
                <span>Photograph the card after the round.</span>
              </li>
              <li>
                <strong>Check</strong>
                <span>Review the draft against the original.</span>
              </li>
              <li>
                <strong>Make it official</strong>
                <span>Approved results update the standings.</span>
              </li>
            </ol>
          </div>
        </aside>
      </div>
    </>
  );
}
export function Review() {
  const store = usePreview();
  const params = useSearchParams();
  const queue = store.matches.filter(
    (m) => m.status === "review" || m.status === "correction",
  );
  const m = queue.find((m) => m.id === params.get("match")) ?? queue[0];
  return (
    <>
      <PageHeading
        eyebrow="COMMISSIONER DESK · DEMO ACCESS"
        title="A second set of eyes."
        description="Check the card. Resolve the unclear bits. Then make it official."
      />
      <div className="review-stats">
        <span>
          <strong>{queue.filter((m) => m.status === "review").length}</strong>{" "}
          awaiting review
        </span>
        <span>
          <strong>
            {queue.filter((m) => m.status === "correction").length}
          </strong>{" "}
          need correction
        </span>
        <span>
          <strong>
            {store.matches.filter((m) => m.status === "official").length}
          </strong>{" "}
          official
        </span>
      </div>
      <p className="fine-note compact">
        Demo access only. Production will require authorization. Photo
        extraction and GHIN retrieval are not connected.
      </p>
      {!m ? (
        <Empty title="All caught up.">
          No cards need review.{" "}
          <Link href="/submit">Submit another sample card</Link> or reset the
          demo.
        </Empty>
      ) : (
        <>
          <nav className="queue-nav" aria-label="Cards to review">
            {queue.map((x) => (
              <Link
                key={x.id}
                href={`/review?match=${x.id}`}
                aria-current={m.id === x.id ? "page" : undefined}
              >
                {nameOf(x.a)} vs {nameOf(x.b)}
                <Badge status={x.status} />
              </Link>
            ))}
          </nav>
          <ReviewCard key={`${m.id}-${m.status}`} match={m} />
        </>
      )}
    </>
  );
}
function ReviewCard({ match: m }: { match: Match }) {
  const store = usePreview();
  const [draft, setDraft] = useState<Match>(store.drafts[m.id]?.match ?? m);
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState(store.drafts[m.id]?.note ?? m.note);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [source, setSource] = useState<"sample" | "photo">("sample");
  const localPhoto = store.photoMatch === m.id ? store.photo : null;
  const retainDraft = store.setDraft;
  const dirty =
    JSON.stringify(draft.scores) !== JSON.stringify(m.scores) ||
    note !== m.note;
  useEffect(() => {
    retainDraft(m.id, { match: draft, note });
  }, [draft, note, m.id, retainDraft]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const r = result(draft);
  function saveDraft() {
    const e = validateCard(draft.scores, draft.strokes);
    if (e) {
      setError(e);
      return;
    }
    store.save(
      store.matches.map((x) => (x.id === m.id ? { ...draft, note } : x)),
      "Review draft saved.",
    );
    setError("");
    setSaved(true);
  }
  function approve() {
    const e = approvalError(draft);
    if (e) {
      setError(e);
      return;
    }
    if (!confirmed) {
      setError(
        "Check the scores and agreed strokes against the original before approving.",
      );
      document.getElementById("review-confirm")?.focus();
      return;
    }
    store.save(
      approveMatch(
        store.matches.map((x) =>
          x.id === m.id ? { ...draft, note, status: "review" } : x,
        ),
        m.id,
      ),
      "Result approved. Standings and earned awards updated.",
    );
  }
  function correction() {
    if (!note.trim()) {
      setError("Add a correction note so players know what to fix.");
      document.getElementById("review-note")?.focus();
      return;
    }
    store.save(
      store.matches.map((x) =>
        x.id === m.id ? { ...draft, status: "correction", note } : x,
      ),
      "Correction recorded. No message was sent.",
    );
    setError("");
  }
  return (
    <>
      <div className="review-top">
        <div>
          <p className="eyebrow">
            POD {m.pod} · {dateLabel(m.date)}
          </p>
          <h2>
            {nameOf(m.a)} <span>vs</span> {nameOf(m.b)}
          </h2>
          <p className="muted">
            {m.course} · {m.tees}
          </p>
        </div>
        <Badge status={m.status} />
      </div>
      <div className="review-source">
        <div>
          <Icon name="image" />
          <h3>Original evidence</h3>
          <p>
            {localPhoto
              ? "Your selected photo is available for this visit only."
              : "Staged card and stroke record. Local photos are not retained after refresh."}
          </p>
          <div className="segmented" role="group" aria-label="Evidence view">
            <button
              aria-pressed={source === "sample"}
              onClick={() => setSource("sample")}
            >
              Sample source
            </button>
            <button
              disabled={!localPhoto}
              aria-pressed={source === "photo"}
              onClick={() => setSource("photo")}
            >
              Local photo
            </button>
          </div>
        </div>
        {source === "photo" && localPhoto ? (
          <a href={localPhoto} target="_blank" rel="noreferrer">
            <Image
              unoptimized
              width={800}
              height={500}
              className="review-photo"
              src={localPhoto}
              alt="Locally selected scorecard, open full size"
            />
          </a>
        ) : (
          <div className="source-card">
            <span className="eyebrow">STAGED SOURCE · ALL 18 HOLES</span>
            <div
              className="source-scroll"
              tabIndex={0}
              role="region"
              aria-label="Original sample scores"
            >
              <table>
                <caption className="sr-only">Original sample scores</caption>
                <thead>
                  <tr>
                    <th>Player</th>
                    {Array.from({ length: 18 }, (_, i) => (
                      <th key={i}>{i + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {players(m).map((n, p) => (
                    <tr key={n}>
                      <th>{n}</th>
                      {originalMatches
                        .find((x) => x.id === m.id)!
                        .scores[p].map((s, h) => (
                          <td key={h}>
                            {s}
                            {m.strokes[p][h] ? "•" : ""}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <div className="notice">
        <Icon name="image" />
        <div>
          <strong>Prepared transcription · Human review required</strong>
          <p>
            Sample values are supplied, not extracted by AI. Correct unclear
            real handwriting manually before approval.
          </p>
        </div>
      </div>
      <Scorecard
        match={draft}
        editable
        onChange={(scores) => {
          setDraft({ ...draft, scores });
          setSaved(false);
          setConfirmed(false);
        }}
      />
      <details className="agreed-details">
        <summary>Review the externally agreed strokes</summary>
        <StrokeSummary match={m} />
      </details>
      <section className="review-actions">
        <div>
          <p className="eyebrow">RESULT AFTER REVIEW</p>
          <h2>
            {r.winner ? `${nameOf(r.winner)} win` : "Match tied"}{" "}
            <span>
              {r.aPoints} – {r.bPoints}
            </span>
          </h2>
          <label htmlFor="review-note">Review or correction note</label>
          <textarea
            className="resize-none"
            id="review-note"
            rows={3}
            maxLength={1000}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setSaved(false);
            }}
            placeholder="Record a correction or anything the players need to check."
          />
          <label className="check-field">
            <input
              id="review-confirm"
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            I checked all 18 holes and the agreed strokes against the source.
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="review-buttons">
          <button className="button primary" onClick={approve}>
            Approve result
            <Icon name="check" />
          </button>
          <button className="button outline" onClick={saveDraft}>
            {saved ? "Draft saved" : "Save review draft"}
          </button>
          <button className="button quiet" onClick={correction}>
            Mark needs correction
          </button>
          <p>
            Updates this browser’s sample season only. No messages or payments
            are sent.
          </p>
        </div>
      </section>
    </>
  );
}
