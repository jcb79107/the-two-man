"use client";
import { useEffect, useRef, useState } from "react";
import type { GraphicResult } from "./graphic-state";
import NextImage from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { publication } from "./publication";
import { type Match, nameOf } from "./data";
import { graphicSvg, type GraphicKind } from "./commissioner-graphic-model";
export function CommissionerGraphics({ matches }: { matches: Match[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const requestedKind = params.get("graphic");
  const kind: GraphicKind =
    requestedKind === "standings" ||
    requestedKind === "bracket" ||
    requestedKind === "scorecard"
      ? requestedKind
      : "result";
  const published = [
    ...matches
      .filter((m) => m.status === "official")
      .map((m) => ({ id: m.id, a: m.a, b: m.b, date: m.date, playoff: false })),
    ...publication.games.map((g) => ({ ...g, playoff: true })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const requestedId = params.get("result");
  const matchId = requestedId ?? published[0]?.id ?? "";
  const selected = published.find((m) => m.id === matchId);
  const needsResult = kind === "result" || kind === "scorecard";
  const invalid = needsResult && !!requestedId && !selected;
  const [retry, setRetry] = useState(0);
  const [rendered, setRendered] = useState<GraphicResult | null>(null);
  const key = JSON.stringify([kind, matchId, matches, retry]);
  const current = rendered?.key === key ? rendered : null;
  const download = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (retry > 0 && current?.status === "ready")
      download.current?.focus({ preventScroll: true });
  }, [current, retry]);
  const url = current?.status === "ready" ? current.url : "";
  const error = current?.status === "failed" ? current.error : "";
  function select(nextKind: GraphicKind, id = matchId) {
    const query = new URLSearchParams({ graphic: nextKind });
    if (id) query.set("result", id);
    router.replace(`/review?${query}`, { scroll: false });
  }
  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        const svg = graphicSvg(matches, kind, matchId);
        const svgUrl = URL.createObjectURL(
          new Blob([svg], { type: "image/svg+xml" }),
        );
        try {
          const artwork = new Image();
          artwork.src = svgUrl;
          await artwork.decode();
          const mascot = new Image();
          mascot.src = "/two-man-mark.png";
          await mascot.decode();
          const canvas = document.createElement("canvas");
          canvas.width = 1080;
          canvas.height = 1350;
          const ctx = canvas.getContext("2d");
          if (!ctx)
            throw new Error("Image export is unavailable in this browser.");
          ctx.drawImage(artwork, 0, 0);
          const scale = Math.min(220 / mascot.width, 140 / mascot.height);
          ctx.drawImage(
            mascot,
            1016 - mascot.width * scale,
            38,
            mascot.width * scale,
            mascot.height * scale,
          );
          const url = canvas.toDataURL("image/png");
          if (!cancelled) setRendered({ key, status: "ready", url });
        } finally {
          URL.revokeObjectURL(svgUrl);
        }
      } catch (e) {
        if (!cancelled)
          setRendered({
            key,
            status: "failed",
            error:
              e instanceof Error
                ? e.message
                : "Could not generate the image. Try again.",
          });
      }
    }
    void render();
    return () => {
      cancelled = true;
    };
  }, [key, kind, matchId, matches, retry]);
  const empty = needsResult && !published.length;
  return (
    <section
      className="graphics-workspace"
      aria-label="Instagram graphic generator"
    >
      <div className="graphics-controls">
        <label>
          Graphic
          <select
            aria-label="Graphic"
            value={kind}
            onChange={(e) => select(e.target.value as GraphicKind)}
          >
            <option value="result">Match result</option>
            <option value="scorecard">Full scorecard</option>
            <option value="standings">Standings</option>
            <option value="bracket">Bracket</option>
          </select>
        </label>
        {needsResult && published.length > 0 && (
          <label>
            Published result
            <select
              aria-label="Published result"
              value={matchId}
              onChange={(e) => select(kind, e.target.value)}
            >
              {invalid && <option value={matchId}>Result unavailable</option>}
              {published.map((m) => (
                <option key={m.id} value={m.id}>
                  {nameOf(m.a)} vs {nameOf(m.b)}
                  {m.playoff ? " · Playoffs" : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        {invalid && (
          <p role="alert">
            This match has no published result. Choose a completed match above.
          </p>
        )}
        {selected && needsResult && (
          <Link
            className="text-link"
            href={
              selected.playoff
                ? `/playoffs/${selected.id}`
                : `/matches/${selected.id}`
            }
          >
            View published result →
          </Link>
        )}
        {!invalid && current && url && (
          <a
            ref={download}
            className="button primary"
            href={url}
            download={`two-man-${kind}${needsResult && selected ? "-" + nameOf(selected.a).replaceAll(" & ", "-").toLowerCase() + "-vs-" + nameOf(selected.b).replaceAll(" & ", "-").toLowerCase() + "-" + selected.date.slice(0, 10) : ""}.png`}
          >
            Download PNG
          </a>
        )}
        <p role="status">
          {invalid
            ? ""
            : empty
              ? "Publish a result to make a match graphic. Standings and bracket graphics are available now."
              : !current
                ? "Generating preview…"
                : url
                  ? "Ready to download."
                  : ""}
        </p>
        {!invalid && !empty && current && error && (
          <div role="alert">
            <p>{error}</p>
            <button
              className="button outline"
              onClick={() => setRetry((n) => n + 1)}
            >
              Try again
            </button>
          </div>
        )}
      </div>
      <div className="graphic-preview">
        {!invalid && current && url ? (
          <NextImage
            unoptimized
            src={url}
            width={1080}
            height={1350}
            alt={`${kind === "result" ? "Match result" : kind === "scorecard" ? "Scorecard" : kind === "standings" ? "Standings" : "Bracket"} Instagram graphic preview. Sample season data.`}
          />
        ) : (
          <p>
            {invalid
              ? "No graphic for this match."
              : empty
                ? "No published match to preview."
                : current && error
                  ? "Preview unavailable."
                  : "Preparing graphic…"}
          </p>
        )}
      </div>
    </section>
  );
}
