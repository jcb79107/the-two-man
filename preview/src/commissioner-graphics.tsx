"use client";
import { useEffect, useState } from "react";
import NextImage from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { type Match, nameOf } from "./data";
import { graphicSvg, type GraphicKind } from "./commissioner-graphic-model";
export function CommissionerGraphics({ matches }: { matches: Match[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const requestedKind = params.get("graphic");
  const kind: GraphicKind =
    requestedKind === "standings" || requestedKind === "bracket"
      ? requestedKind
      : "result";
  const published = matches
    .filter((m) => m.status === "official")
    .sort((a, b) => b.date.localeCompare(a.date));
  const matchId =
    published.find((m) => m.id === params.get("result"))?.id ??
    published[0]?.id ??
    "";
  const [retry, setRetry] = useState(0);
  const [rendered, setRendered] = useState({ key: "", url: "", error: "" });
  const key = JSON.stringify([kind, matchId, matches]);
  const current = rendered.key === key;
  function select(nextKind: GraphicKind, id = matchId) {
    const query = new URLSearchParams({ tab: "graphics", graphic: nextKind });
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
          if (!cancelled) setRendered({ key, url, error: "" });
        } finally {
          URL.revokeObjectURL(svgUrl);
        }
      } catch (e) {
        if (!cancelled)
          setRendered({
            key,
            url: "",
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
  const empty = kind === "result" && !published.length;
  return (
    <section
      className="graphics-workspace"
      aria-label="Instagram graphic generator"
    >
      <div className="graphics-controls">
        <h2>Instagram graphics</h2>
        <label>
          Graphic
          <select
            aria-label="Graphic"
            value={kind}
            onChange={(e) => select(e.target.value as GraphicKind)}
          >
            <option value="result">Match result</option>
            <option value="standings">Standings</option>
            <option value="bracket">Bracket</option>
          </select>
        </label>
        {kind === "result" && published.length > 0 && (
          <label>
            Published result
            <select
              aria-label="Published result"
              value={matchId}
              onChange={(e) => select(kind, e.target.value)}
            >
              {published.map((m) => (
                <option key={m.id} value={m.id}>
                  {nameOf(m.a)} vs {nameOf(m.b)}
                </option>
              ))}
            </select>
          </label>
        )}
        <p className="field-help">Portrait PNG · 1080 × 1350</p>
        <p className="field-help">
          Uses published results. Drafts and calculator scenarios are excluded.
          Download the image to post on Instagram.
        </p>
        {current && rendered.url && (
          <a
            className="button primary"
            href={rendered.url}
            download={`two-man-${kind}${kind === "result" ? "-" + matchId : ""}.png`}
          >
            Download PNG
          </a>
        )}
        <p role="status">
          {empty
            ? "Publish a result to make a match graphic. Standings and bracket graphics are available now."
            : !current
              ? "Generating preview…"
              : rendered.url
                ? "Ready to download."
                : ""}
        </p>
        {!empty && current && rendered.error && (
          <div role="alert">
            <p>{rendered.error}</p>
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
        {current && rendered.url ? (
          <NextImage
            unoptimized
            src={rendered.url}
            width={1080}
            height={1350}
            alt={`${kind === "result" ? "Match result" : kind === "standings" ? "Standings" : "Bracket"} Instagram graphic preview. Sample season data.`}
          />
        ) : (
          <p>
            {empty
              ? "No published match to preview."
              : current && rendered.error
                ? "Preview unavailable."
                : "Preparing graphic…"}
          </p>
        )}
      </div>
    </section>
  );
}
