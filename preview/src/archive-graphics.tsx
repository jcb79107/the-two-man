"use client";
import type { GraphicResult } from "./graphic-state";
import NextImage from "next/image";
import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { archive2026, entryName } from "./history-data";
import { PageHeading } from "./ui";
import { dateLabel } from "./data";

export function ArchiveGraphics() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("result") ?? "final";
  const game = archive2026.games.find((g) => g.id === id);
  const [image, setImage] = useState<GraphicResult | null>(null);
  const [retry, setRetry] = useState(0);
  const key = JSON.stringify([id, retry]);
  const current = image?.key === key ? image : null;
  const download = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (retry > 0 && current?.status === "ready")
      download.current?.focus({ preventScroll: true });
  }, [current, retry]);
  useEffect(() => {
    if (!game) return;
    let cancelled = false;
    async function render() {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 1080;
        canvas.height = 1350;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Your browser cannot export this graphic.");
        const text = (
          value: string,
          x: number,
          y: number,
          size: number,
          color = "#182d26",
          bold = false,
        ) => {
          ctx.fillStyle = color;
          ctx.font = `${bold ? "700" : "400"} ${size}px Arial`;
          ctx.fillText(value, x, y, 952);
        };
        ctx.fillStyle = "#f6f4eb";
        ctx.fillRect(0, 0, 1080, 1350);
        text("THE TWO-MAN", 64, 110, 52, "#073e2f", true);
        text("SEASON 1 / 2026", 64, 164, 24);
        text(
          game!.round === "Final" ? "CHAMPIONS" : "MATCH RESULT",
          64,
          282,
          64,
          "#073e2f",
          true,
        );
        text(game!.round, 64, 330, 28);
        ctx.fillStyle = "#073e2f";
        ctx.fillRect(0, 380, 1080, 570);
        const first = game!.points ? game!.a : (game!.winner ?? game!.a);
        const second = first === game!.a ? game!.b : game!.a;
        text(entryName(archive2026, first), 64, 490, 52, "#f6f4eb", true);
        text(game!.score, 64, 650, 110, "#dce8b3", true);
        text(
          game!.points
            ? "Hole points · 18 holes"
            : game!.winner
              ? "defeated"
              : "tied with",
          64,
          745,
          28,
          "#f6f4eb",
        );
        text(entryName(archive2026, second), 64, 825, 46, "#f6f4eb", true);
        text(game!.course, 64, 1050, 32);
        text(dateLabel(game!.date), 64, 1110, 28);
        text("THE TWO-MAN · OFFICIAL 2026 RESULT", 64, 1290, 24);
        const mark = new Image();
        mark.src = "/two-man-mark.png";
        await mark.decode();
        ctx.drawImage(mark, 820, 45, 196, (196 * mark.height) / mark.width);
        if (!cancelled)
          setImage({
            key,
            status: "ready",
            url: canvas.toDataURL("image/png"),
          });
      } catch (e) {
        if (!cancelled)
          setImage({
            key,
            status: "failed",
            error:
              e instanceof Error ? e.message : "Unable to generate graphic.",
          });
      }
    }
    void render();
    return () => {
      cancelled = true;
    };
  }, [game, key]);
  return (
    <>
      <PageHeading eyebrow="Season 1" title="Result graphics" />
      <section className="archive-graphics">
        <div>
          <label>
            Published result
            <select
              value={id}
              onChange={(e) =>
                router.replace(`/review?result=${e.target.value}`)
              }
            >
              {!game && <option value={id}>Result unavailable</option>}
              {[...archive2026.games].reverse().map((g) => (
                <option key={g.id} value={g.id}>
                  {g.round} · {entryName(archive2026, g.a)} vs{" "}
                  {entryName(archive2026, g.b)}
                </option>
              ))}
            </select>
          </label>
          {!game ? (
            <p role="alert">
              This result is not in the official archive. Choose a recorded
              match.
            </p>
          ) : !current ? (
            <p role="status">Preparing graphic…</p>
          ) : current.status === "failed" ? (
            <div role="alert">
              <p>{current.error}</p>
              <button className="button" onClick={() => setRetry(retry + 1)}>
                Try again
              </button>
            </div>
          ) : (
            <a
              ref={download}
              className="button"
              download={`two-man-2026-${id}.png`}
              href={current.url}
            >
              Download Instagram graphic
            </a>
          )}
          <p className="field-help">
            Official Season 1 results. Downloads do not change the archive.
          </p>
        </div>
        {game && current?.status === "ready" && (
          <NextImage
            unoptimized
            className="archive-graphic-image"
            src={current.url}
            width={1080}
            height={1350}
            alt={`2026 ${game.round}: ${entryName(archive2026, game.a)} vs ${entryName(archive2026, game.b)}, ${game.score}`}
          />
        )}
      </section>
    </>
  );
}
