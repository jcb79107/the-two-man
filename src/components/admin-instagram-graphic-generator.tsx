"use client";

import { useRef, useState } from "react";
import type { AdminGraphicRecap } from "@/lib/server/admin-graphics";

interface AdminInstagramGraphicGeneratorProps {
  recaps: AdminGraphicRecap[];
}

const PAPER = "#f7f0df";
const CARD = "#fffaf0";
const GOLD = "#c6a35a";
const INK = "#102017";
const HOME_ROW = "#edf6f0";
const AWAY_ROW = "#f4effb";
const PAR_ROW = "#f4de88";

function formatPoints(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatStage(stage: string) {
  return stage === "POD_PLAY" ? "Pod Play" : stage.replaceAll("_", " ");
}

function cleanFilePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function roundRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function fillRoundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string
) {
  roundRectPath(context, x, y, width, height, radius);
  context.fillStyle = fill;
  context.fill();
}

function strokeRoundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  stroke: string,
  lineWidth = 2
) {
  roundRectPath(context, x, y, width, height, radius);
  context.strokeStyle = stroke;
  context.lineWidth = lineWidth;
  context.stroke();
}

function drawScoreBox(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  highlighted: boolean
) {
  if (!highlighted) return;

  context.strokeStyle = INK;
  context.lineWidth = 6;
  context.strokeRect(x - size / 2, y - size / 2, size, size);
}

function drawGridText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: string,
  color = INK,
  align: CanvasTextAlign = "center"
) {
  context.font = font;
  context.fillStyle = color;
  context.textAlign = align;
  context.fillText(text, x, y, maxWidth);
}

function drawGraphic(context: CanvasRenderingContext2D, recap: AdminGraphicRecap) {
  const width = 1080;
  const height = 1080;
  const holes = recap.holes.slice(0, 18);

  context.clearRect(0, 0, width, height);
  context.fillStyle = PAPER;
  context.fillRect(0, 0, width, height);

  fillRoundRect(context, 54, 54, 972, 972, 42, CARD);
  strokeRoundRect(context, 54, 54, 972, 972, 42, "rgba(198, 163, 90, 0.55)", 3);

  drawGridText(context, "THE TWO MAN", width / 2, 108, 480, "800 27px Avenir Next, Helvetica Neue, Arial, sans-serif", GOLD);
  drawGridText(
    context,
    `${recap.homeTeam.name} vs ${recap.awayTeam.name}`,
    width / 2,
    146,
    840,
    "800 34px Avenir Next, Helvetica Neue, Arial, sans-serif"
  );
  drawGridText(
    context,
    [formatStage(recap.stage), recap.podName, recap.courseName].filter(Boolean).join(" / "),
    width / 2,
    174,
    840,
    "650 19px Avenir Next, Helvetica Neue, Arial, sans-serif",
    "rgba(16,32,23,0.58)"
  );

  function drawSegment(segmentHoles: typeof holes, tableY: number, label: string) {
    const labelWidth = 192;
    const colWidth = 76;
    const tableWidth = labelWidth + segmentHoles.length * colWidth;
    const tableX = (width - tableWidth) / 2;
    const rowHeights = [58, 42, 48, 42, 64, 64];
    const tableHeight = rowHeights.reduce((total, value) => total + value, 0);
    const rowFills = [CARD, CARD, CARD, PAR_ROW, HOME_ROW, AWAY_ROW];
    let y = tableY;

    drawGridText(context, label, tableX, tableY - 12, 180, "800 17px Avenir Next, Helvetica Neue, Arial, sans-serif", GOLD, "left");

    for (let rowIndex = 0; rowIndex < rowHeights.length; rowIndex += 1) {
      context.fillStyle = rowFills[rowIndex] ?? CARD;
      context.fillRect(tableX, y, tableWidth, rowHeights[rowIndex]);
      y += rowHeights[rowIndex];
    }

    context.strokeStyle = GOLD;
    context.lineWidth = 2;
    context.strokeRect(tableX, tableY, tableWidth, tableHeight);
    let lineY = tableY;
    for (const rowHeight of rowHeights) {
      lineY += rowHeight;
      context.beginPath();
      context.moveTo(tableX, lineY);
      context.lineTo(tableX + tableWidth, lineY);
      context.stroke();
    }

    context.beginPath();
    context.moveTo(tableX + labelWidth, tableY);
    context.lineTo(tableX + labelWidth, tableY + tableHeight);
    context.stroke();
    for (let index = 0; index <= segmentHoles.length; index += 1) {
      const x = tableX + labelWidth + index * colWidth;
      context.beginPath();
      context.moveTo(x, tableY);
      context.lineTo(x, tableY + tableHeight);
      context.stroke();
    }

    const labels = [
      { label: "Hole", y: tableY + 39, font: "800 22px Avenir Next, Helvetica Neue, Arial, sans-serif" },
      { label: "HCP", y: tableY + 84, font: "800 18px Avenir Next, Helvetica Neue, Arial, sans-serif" },
      { label: "Yards", y: tableY + 130, font: "800 17px Avenir Next, Helvetica Neue, Arial, sans-serif" },
      { label: "Par", y: tableY + 174, font: "800 17px Avenir Next, Helvetica Neue, Arial, sans-serif" },
      { label: `${recap.homeTeam.name} best ball`, y: tableY + 222, font: "800 16px Avenir Next, Helvetica Neue, Arial, sans-serif" },
      { label: `${recap.awayTeam.name} best ball`, y: tableY + 286, font: "800 16px Avenir Next, Helvetica Neue, Arial, sans-serif" }
    ];

    for (const item of labels) {
      drawGridText(context, item.label, tableX + 18, item.y, labelWidth - 28, item.font, INK, "left");
    }
    drawGridText(context, "TEAM NET USED", tableX + 18, tableY + 243, labelWidth - 28, "800 10px Avenir Next, Helvetica Neue, Arial, sans-serif", INK, "left");
    drawGridText(context, "TEAM NET USED", tableX + 18, tableY + 307, labelWidth - 28, "800 10px Avenir Next, Helvetica Neue, Arial, sans-serif", INK, "left");

    segmentHoles.forEach((hole, index) => {
      const centerX = tableX + labelWidth + index * colWidth + colWidth / 2;
      fillRoundRect(context, centerX - 18, tableY + 11, 36, 36, 18, "#ded9c7");
      drawGridText(context, String(hole.holeNumber), centerX, tableY + 37, 34, "800 19px Avenir Next, Helvetica Neue, Arial, sans-serif");
      drawGridText(context, String(hole.strokeIndex || "-"), centerX, tableY + 84, 38, "800 17px Avenir Next, Helvetica Neue, Arial, sans-serif");
      drawGridText(context, String(hole.yardage ?? "-"), centerX, tableY + 130, 58, "800 16px Avenir Next, Helvetica Neue, Arial, sans-serif");
      drawGridText(context, String(hole.par || "-"), centerX, tableY + 174, 38, "800 17px Avenir Next, Helvetica Neue, Arial, sans-serif");

      const homeY = tableY + 230;
      const awayY = tableY + 294;
      drawScoreBox(context, centerX, homeY - 7, 34, hole.winningTeamId === recap.homeTeam.id);
      drawScoreBox(context, centerX, awayY - 7, 34, hole.winningTeamId === recap.awayTeam.id);
      drawGridText(context, String(hole.homeNet ?? "-"), centerX, homeY, 38, "800 20px Avenir Next, Helvetica Neue, Arial, sans-serif");
      drawGridText(context, String(hole.awayNet ?? "-"), centerX, awayY, 38, "800 20px Avenir Next, Helvetica Neue, Arial, sans-serif");
    });
  }

  drawSegment(holes.slice(0, 9), 206, "Front 9");
  drawSegment(holes.slice(9, 18), 556, "Back 9");

  const statsY = 908;
  const stats = [
    { team: recap.homeTeam.name, label: "Points", value: formatPoints(recap.homeTeam.totalPoints) },
    { team: recap.awayTeam.name, label: "Points", value: formatPoints(recap.awayTeam.totalPoints) },
    { team: recap.homeTeam.name, label: "Holes won", value: String(recap.homeTeam.holesWon) },
    { team: recap.awayTeam.name, label: "Holes won", value: String(recap.awayTeam.holesWon) },
    { team: recap.homeTeam.name, label: "Net BB", value: String(recap.homeTeam.betterBallNetTotal ?? "-") },
    { team: recap.awayTeam.name, label: "Net BB", value: String(recap.awayTeam.betterBallNetTotal ?? "-") }
  ];

  drawGridText(context, "Playoff metrics", width / 2, statsY - 14, 460, "800 22px Avenir Next, Helvetica Neue, Arial, sans-serif");
  stats.forEach((stat, index) => {
    const statWidth = 144;
    const gap = 10;
    const x = (width - (stats.length * statWidth + (stats.length - 1) * gap)) / 2 + index * (statWidth + gap);
    fillRoundRect(context, x, statsY, statWidth, 86, 16, "#fbf7ec");
    drawGridText(context, stat.label.toUpperCase(), x + statWidth / 2, statsY + 25, statWidth - 12, "800 12px Avenir Next, Helvetica Neue, Arial, sans-serif", GOLD);
    drawGridText(context, stat.value, x + statWidth / 2, statsY + 62, statWidth - 12, "800 28px Avenir Next, Helvetica Neue, Arial, sans-serif");
  });

  drawGridText(
    context,
    [recap.playedOn, recap.courseMeta].filter(Boolean).join(" / ") || "Official match recap",
    width / 2,
    1012,
    760,
    "700 18px Avenir Next, Helvetica Neue, Arial, sans-serif",
    "rgba(16,32,23,0.52)"
  );
}

function HighlightedScore({
  value,
  highlighted
}: {
  value: number | null;
  highlighted: boolean;
}) {
  return (
    <span
      className={
        highlighted
          ? "mx-auto grid h-8 w-8 place-items-center border-[3px] border-ink text-base font-extrabold leading-none text-ink"
          : "mx-auto grid h-8 w-8 place-items-center text-base font-extrabold leading-none text-ink"
      }
    >
      {value ?? "-"}
    </span>
  );
}

function ScorecardSegmentPreview({
  title,
  holes,
  recap
}: {
  title: string;
  holes: AdminGraphicRecap["holes"];
  recap: AdminGraphicRecap;
}) {
  return (
    <div>
      <p className="mb-1 text-left text-[0.58rem] font-extrabold uppercase tracking-[0.16em] text-[#c6a35a]">
        {title}
      </p>
      <div className="overflow-hidden rounded-[14px] border border-[#c6a35a] text-left">
        <div
          className="grid"
          style={{ gridTemplateColumns: `minmax(5.75rem, 1.55fr) repeat(${holes.length}, minmax(0, 1fr))` }}
        >
          <div className="border-b border-r border-[#c6a35a] px-2 py-2 text-sm font-extrabold text-ink">Hole</div>
          {holes.map((hole) => (
            <div key={`hole-${title}-${hole.holeNumber}`} className="grid place-items-center border-b border-r border-[#c6a35a] px-0.5 py-1.5 last:border-r-0">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-[#ded9c7] text-xs font-extrabold text-ink">
                {hole.holeNumber}
              </span>
            </div>
          ))}

          <div className="border-b border-r border-[#c6a35a] px-2 py-1.5 text-xs font-extrabold text-ink">HCP</div>
          {holes.map((hole) => (
            <div key={`hcp-${title}-${hole.holeNumber}`} className="grid place-items-center border-b border-r border-[#c6a35a] px-0.5 py-1.5 text-xs font-extrabold text-ink last:border-r-0">
              {hole.strokeIndex || "-"}
            </div>
          ))}

          <div className="border-b border-r border-[#c6a35a] px-2 py-1.5 text-xs font-extrabold text-ink">Yards</div>
          {holes.map((hole) => (
            <div key={`yards-${title}-${hole.holeNumber}`} className="grid place-items-center border-b border-r border-[#c6a35a] px-0.5 py-1.5 text-[0.62rem] font-extrabold text-ink last:border-r-0">
              {hole.yardage ?? "-"}
            </div>
          ))}

          <div className="border-b border-r border-[#c6a35a] bg-[#f4de88] px-2 py-1.5 text-xs font-extrabold text-ink">Par</div>
          {holes.map((hole) => (
            <div key={`par-${title}-${hole.holeNumber}`} className="grid place-items-center border-b border-r border-[#c6a35a] bg-[#f4de88] px-0.5 py-1.5 text-xs font-extrabold text-ink last:border-r-0">
              {hole.par || "-"}
            </div>
          ))}

          <div className="border-b border-r border-[#c6a35a] bg-[#edf6f0] px-2 py-2 text-[0.48rem] font-extrabold uppercase tracking-[0.08em] text-ink">
            <span className="block truncate normal-case tracking-normal text-xs">{recap.homeTeam.name} best ball</span>
            Team net used
          </div>
          {holes.map((hole) => (
            <div key={`home-${title}-${hole.holeNumber}`} className="grid place-items-center border-b border-r border-[#c6a35a] bg-[#edf6f0] px-0.5 py-2 last:border-r-0">
              <HighlightedScore value={hole.homeNet} highlighted={hole.winningTeamId === recap.homeTeam.id} />
            </div>
          ))}

          <div className="border-r border-[#c6a35a] bg-[#f4effb] px-2 py-2 text-[0.48rem] font-extrabold uppercase tracking-[0.08em] text-ink">
            <span className="block truncate normal-case tracking-normal text-xs">{recap.awayTeam.name} best ball</span>
            Team net used
          </div>
          {holes.map((hole) => (
            <div key={`away-${title}-${hole.holeNumber}`} className="grid place-items-center border-r border-[#c6a35a] bg-[#f4effb] px-0.5 py-2 last:border-r-0">
              <HighlightedScore value={hole.awayNet} highlighted={hole.winningTeamId === recap.awayTeam.id} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScorecardGraphicPreview({ recap }: { recap: AdminGraphicRecap }) {
  const holes = recap.holes.slice(0, 18);
  const statItems = [
    { team: recap.homeTeam.name, label: "Points", value: formatPoints(recap.homeTeam.totalPoints) },
    { team: recap.awayTeam.name, label: "Points", value: formatPoints(recap.awayTeam.totalPoints) },
    { team: recap.homeTeam.name, label: "Holes won", value: String(recap.homeTeam.holesWon) },
    { team: recap.awayTeam.name, label: "Holes won", value: String(recap.awayTeam.holesWon) },
    { team: recap.homeTeam.name, label: "Net BB", value: String(recap.homeTeam.betterBallNetTotal ?? "-") },
    { team: recap.awayTeam.name, label: "Net BB", value: String(recap.awayTeam.betterBallNetTotal ?? "-") }
  ];

  return (
    <div className="mx-auto aspect-square w-full max-w-[620px] overflow-hidden rounded-[30px] border border-[#c6a35a]/55 bg-[#f7f0df] p-[4.6%] shadow-[0_18px_48px_rgba(17,32,23,0.12)]">
      <div className="flex h-full flex-col rounded-[24px] border border-[#c6a35a]/55 bg-[#fffaf0] p-[3.2%] text-center">
        <p className="text-[clamp(0.62rem,1.8vw,0.82rem)] font-extrabold uppercase tracking-[0.2em] text-[#c6a35a]">
          The Two Man
        </p>
        <h3 className="mt-1 truncate text-[clamp(1.02rem,3.8vw,1.55rem)] font-extrabold leading-tight text-ink">
          {recap.homeTeam.name} vs {recap.awayTeam.name}
        </h3>
        <p className="truncate text-[clamp(0.55rem,1.8vw,0.82rem)] font-semibold text-ink/58">
          {[formatStage(recap.stage), recap.podName, recap.courseName].filter(Boolean).join(" / ")}
        </p>

        <div className="mt-[2.8%] grid gap-2">
          <ScorecardSegmentPreview title="Front 9" holes={holes.slice(0, 9)} recap={recap} />
          <ScorecardSegmentPreview title="Back 9" holes={holes.slice(9, 18)} recap={recap} />
        </div>

        <div className="mt-auto pt-[3%]">
          <p className="text-[clamp(0.62rem,1.8vw,0.82rem)] font-extrabold text-ink">Playoff metrics</p>
          <div className="mt-1.5 grid grid-cols-6 gap-1.5">
            {statItems.map((item, index) => (
              <div key={`${item.team}-${item.label}-${index}`} className="min-w-0 rounded-[10px] bg-[#fbf7ec] px-1.5 py-1.5">
                <p className="truncate text-[0.42rem] font-extrabold uppercase tracking-[0.08em] text-[#c6a35a]">
                  {item.label}
                </p>
                <p className="truncate text-sm font-extrabold leading-tight text-ink">{item.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 truncate text-[clamp(0.52rem,1.6vw,0.7rem)] font-bold text-ink/50">
            {[recap.playedOn, recap.courseMeta].filter(Boolean).join(" / ") || "Official match recap"}
          </p>
        </div>
      </div>
    </div>
  );
}

export function AdminInstagramGraphicGenerator({ recaps }: AdminInstagramGraphicGeneratorProps) {
  const [selectedId, setSelectedId] = useState(recaps[0]?.id ?? "");
  const selectedRecap = recaps.find((recap) => recap.id === selectedId) ?? recaps[0] ?? null;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  async function exportPng() {
    if (!selectedRecap) return;

    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    drawGraphic(context, selectedRecap);
    canvas.toBlob((blob) => {
      if (!blob) return;

      downloadBlob(
        blob,
        `two-man-scorecard-recap-${cleanFilePart(selectedRecap.homeTeam.name)}-${cleanFilePart(selectedRecap.awayTeam.name)}.png`
      );
    }, "image/png");
  }

  if (!selectedRecap) {
    return (
      <div className="rounded-[24px] border border-dashed border-mist bg-sand px-4 py-6 text-sm leading-6 text-ink/72">
        Finalize a scorecard and it will appear here for recap graphic generation.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-fairway/72">
        Match
        <select
          value={selectedRecap.id}
          onChange={(event) => setSelectedId(event.target.value)}
          className="rounded-2xl border border-mist bg-white px-4 py-3 text-base font-semibold normal-case tracking-normal text-ink"
        >
          {recaps.map((recap) => (
            <option key={recap.id} value={recap.id}>
              {recap.homeTeam.name} vs {recap.awayTeam.name} / {recap.roundLabel}
            </option>
          ))}
        </select>
      </label>

      <ScorecardGraphicPreview recap={selectedRecap} />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={exportPng}
          className="rounded-full bg-pine px-4 py-2.5 text-sm font-semibold text-white"
        >
          Download PNG
        </button>
        <p className="text-xs leading-5 text-ink/58">
          Exports a 1080 x 1080 square scorecard-style recap.
        </p>
      </div>
      <canvas ref={canvasRef} width={1080} height={1080} className="hidden" />
    </div>
  );
}
