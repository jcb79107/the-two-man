import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import type { AdminGraphicRecap } from "@/lib/server/admin-graphics";
import { getAdminGraphicRecaps } from "@/lib/server/admin-graphics";
import { isAdminAuthConfigured, isAdminAuthenticated } from "@/lib/server/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PAPER = "#f7f0df";
const CARD = "#fffaf0";
const GOLD = "#c6a35a";
const INK = "#102017";
const HOME_ROW = "#edf6f0";
const AWAY_ROW = "#f4effb";
const PAR_ROW = "#f4de88";
const HOME_WIN = "#d6eadc";
const AWAY_WIN = "#e7def5";
const HOME_STROKE = "#17533d";
const AWAY_STROKE = "#6a4d90";

type RecapHole = AdminGraphicRecap["holes"][number];
type SegmentKey = "front" | "back";
type TeamSide = "home" | "away";
type ScoreShape = "none" | "circle" | "double-circle" | "square" | "double-square";
type ScorecardColumn =
  | {
      kind: "hole";
      key: string;
      hole: RecapHole;
      label: string;
    }
  | {
      kind: "summary";
      key: string;
      label: "OUT" | "IN" | "TOTAL";
      yardage: number | null;
      par: number;
      homeNet: number;
      awayNet: number;
    };

function escapeSvg(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function cleanFilePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function clipText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function formatPoints(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function sumNumbers(values: Array<number | null | undefined>) {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

function sumTeamScores(holes: RecapHole[], side: TeamSide) {
  return sumNumbers(holes.map((hole) => (side === "home" ? hole.homeNet : hole.awayNet)));
}

function scoreShape(score: number | null, par: number): ScoreShape {
  if (score == null || !par) {
    return "none";
  }

  const delta = score - par;

  if (delta <= -2) return "double-circle";
  if (delta === -1) return "circle";
  if (delta === 1) return "square";
  if (delta >= 2) return "double-square";
  return "none";
}

function buildSummaryColumn(label: "OUT" | "IN" | "TOTAL", holes: RecapHole[]): ScorecardColumn {
  const yardageValues = holes.map((hole) => hole.yardage);
  const hasYardage = yardageValues.some((value) => value != null);

  return {
    kind: "summary",
    key: label.toLowerCase(),
    label,
    yardage: hasYardage ? sumNumbers(yardageValues) : null,
    par: sumNumbers(holes.map((hole) => hole.par)),
    homeNet: sumTeamScores(holes, "home"),
    awayNet: sumTeamScores(holes, "away")
  };
}

function buildScorecardColumns(recap: AdminGraphicRecap, segment: SegmentKey): ScorecardColumn[] {
  const holes = recap.holes.slice(0, 18);
  const front = holes.slice(0, 9);
  const back = holes.slice(9, 18);
  const segmentHoles = segment === "front" ? front : back;
  const holeColumns = segmentHoles.map((hole) => ({
    kind: "hole" as const,
    key: `hole-${hole.holeNumber}`,
    hole,
    label: String(hole.holeNumber)
  }));

  if (segment === "front") {
    return [...holeColumns, buildSummaryColumn("OUT", front)];
  }

  return [
    ...holeColumns,
    buildSummaryColumn("IN", back),
    buildSummaryColumn("TOTAL", holes)
  ];
}

function holeWinnerSide(hole: RecapHole, recap: AdminGraphicRecap): TeamSide | null {
  if (hole.homeNet != null && hole.awayNet != null) {
    if (hole.homeNet === hole.awayNet) {
      return null;
    }

    return hole.homeNet < hole.awayNet ? "home" : "away";
  }

  if (hole.winningTeamId === recap.homeTeam.id) {
    return "home";
  }

  if (hole.winningTeamId === recap.awayTeam.id) {
    return "away";
  }

  return null;
}

function matchWinnerSide(recap: AdminGraphicRecap): TeamSide | null {
  if (recap.winningTeamId === recap.homeTeam.id) {
    return "home";
  }

  if (recap.winningTeamId === recap.awayTeam.id) {
    return "away";
  }

  if (recap.homeTeam.totalPoints > recap.awayTeam.totalPoints) {
    return "home";
  }

  if (recap.awayTeam.totalPoints > recap.homeTeam.totalPoints) {
    return "away";
  }

  return null;
}

function formatShortDate(value: string | null) {
  if (!value) {
    return null;
  }

  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (isoDate) {
    const date = new Date(Date.UTC(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3])));

    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "long",
      timeZone: "UTC"
    }).format(date);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC"
  }).format(parsed);
}

function matchInfoLine(recap: AdminGraphicRecap) {
  return [formatShortDate(recap.playedOn), recap.courseName, recap.courseMeta].filter(Boolean).join(" / ");
}

function downloadFilename(recap: AdminGraphicRecap) {
  return `two-man-scorecard-recap-${cleanFilePart(recap.homeTeam.name)}-${cleanFilePart(recap.awayTeam.name)}.png`;
}

function rect(
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    fill?: string;
    rx?: number;
    stroke?: string;
    strokeWidth?: number;
  } = {}
) {
  const attrs = [
    `x="${x}"`,
    `y="${y}"`,
    `width="${width}"`,
    `height="${height}"`,
    options.rx != null ? `rx="${options.rx}" ry="${options.rx}"` : "",
    `fill="${options.fill ?? "none"}"`,
    options.stroke ? `stroke="${options.stroke}"` : "",
    options.strokeWidth ? `stroke-width="${options.strokeWidth}"` : ""
  ]
    .filter(Boolean)
    .join(" ");

  return `<rect ${attrs} />`;
}

function text(
  value: string,
  x: number,
  y: number,
  options: {
    anchor?: "start" | "middle" | "end";
    color?: string;
    size: number;
    weight?: number;
    letterSpacing?: number;
  }
) {
  return `<text x="${x}" y="${y}" text-anchor="${options.anchor ?? "middle"}" fill="${options.color ?? INK}" font-size="${options.size}" font-weight="${options.weight ?? 650}" letter-spacing="${options.letterSpacing ?? 0}" font-family="Avenir Next, Helvetica Neue, Arial, sans-serif">${escapeSvg(value)}</text>`;
}

function line(x1: number, y1: number, x2: number, y2: number, stroke = GOLD, strokeWidth = 2) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
}

function estimatedSvgTextWidth(value: string, size: number) {
  return value.length * size * 0.56;
}

function statsCardWidthForSvg(teamName: string, winner: boolean) {
  const headerWidth = estimatedSvgTextWidth(teamName, 20) + (winner ? 84 : 54);

  return Math.ceil(Math.min(360, Math.max(292, headerWidth)));
}

function scoreMark(x: number, y: number, size: number, shape: ScoreShape) {
  if (shape === "none") return "";

  if (shape === "circle" || shape === "double-circle") {
    const strokeWidth = shape === "double-circle" ? 3 : 5;

    return [
      `<circle cx="${x}" cy="${y}" r="${size / 2}" fill="none" stroke="${INK}" stroke-width="${strokeWidth}" />`,
      shape === "double-circle"
        ? `<circle cx="${x}" cy="${y}" r="${size / 2 + 5}" fill="none" stroke="${INK}" stroke-width="2" />`
        : ""
    ].join("");
  }

  return [
    rect(x - size / 2, y - size / 2, size, size, { stroke: INK, strokeWidth: shape === "double-square" ? 3 : 5 }),
    shape === "double-square"
      ? rect(x - size / 2 - 5, y - size / 2 - 5, size + 10, size + 10, { stroke: INK, strokeWidth: 2 })
      : ""
  ].join("");
}

function winningScoreCell(x: number, y: number, width: number, height: number, side: TeamSide) {
  const stroke = side === "home" ? HOME_STROKE : AWAY_STROKE;
  return [
    rect(x + 2, y + 2, width - 4, height - 4, { fill: side === "home" ? HOME_WIN : AWAY_WIN }),
    rect(x + 5, y + 5, width - 10, height - 10, { stroke, strokeWidth: 3 })
  ].join("");
}

function trophyIcon(x: number, y: number, size: number, stroke: string) {
  const scale = size / 40;

  return `<g transform="translate(${x} ${y}) scale(${scale})" stroke="${stroke}" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8h16l-2 14c-.7 4.5-3.5 7-6 7s-5.3-2.5-6-7L12 8Z" fill="${PAR_ROW}" stroke-width="3" /><path d="M12 12H7c-3 0-3 3-2 5 1.3 3.8 4 5 8 5M28 12h5c3 0 3 3 2 5-1.3 3.8-4 5-8 5" fill="none" stroke-width="3" /><path d="M18 29h4v5h-4zM12 34h16v4H12z" fill="${stroke}" stroke="none" /></g>`;
}

async function logoDataUri() {
  try {
    const logo = await readFile(path.join(process.cwd(), "public", "two-man-main-logo.png"));
    return `data:image/png;base64,${logo.toString("base64")}`;
  } catch {
    return null;
  }
}

async function renderGraphicSvg(recap: AdminGraphicRecap) {
  const logo = await logoDataUri();
  const dateCourseLine = matchInfoLine(recap);
  const winnerSide = matchWinnerSide(recap);
  const elements: string[] = [];

  elements.push(rect(0, 0, 1080, 1080, { fill: PAPER }));
  elements.push(rect(54, 54, 972, 972, { fill: CARD, rx: 42, stroke: "rgba(198, 163, 90, 0.55)", strokeWidth: 3 }));

  if (logo) {
    elements.push(`<image href="${logo}" x="900" y="72" width="72" height="72" opacity="0.9" />`);
  }

  elements.push(text(`${recap.homeTeam.name} vs ${recap.awayTeam.name}`, 540, 112, { size: 35, weight: 700 }));
  elements.push(text(dateCourseLine || recap.courseName || "Official match recap", 540, 149, { color: "rgba(16,32,23,0.78)", size: 21, weight: 600 }));

  function drawSegment(segment: SegmentKey, tableY: number, label: string) {
    const columns = buildScorecardColumns(recap, segment);
    const labelWidth = 192;
    const colWidth = segment === "front" ? 67 : 61;
    const tableWidth = labelWidth + columns.length * colWidth;
    const tableX = (1080 - tableWidth) / 2;
    const rowHeights = [58, 42, 48, 42, 64, 64];
    const tableHeight = rowHeights.reduce((total, value) => total + value, 0);
    const rowFills = [CARD, CARD, CARD, PAR_ROW, CARD, CARD];
    let y = tableY;

    elements.push(text(label, tableX, tableY - 12, { anchor: "start", color: GOLD, letterSpacing: 4, size: 17 }));

    rowHeights.forEach((rowHeight, rowIndex) => {
      elements.push(rect(tableX, y, tableWidth, rowHeight, { fill: rowFills[rowIndex] ?? CARD }));
      y += rowHeight;
    });

    elements.push(rect(tableX, tableY, tableWidth, tableHeight, { rx: 16, stroke: GOLD, strokeWidth: 2 }));

    let lineY = tableY;
    rowHeights.forEach((rowHeight) => {
      lineY += rowHeight;
      elements.push(line(tableX, lineY, tableX + tableWidth, lineY));
    });

    elements.push(line(tableX + labelWidth, tableY, tableX + labelWidth, tableY + tableHeight));
    for (let index = 0; index <= columns.length; index += 1) {
      const x = tableX + labelWidth + index * colWidth;
      elements.push(line(x, tableY, x, tableY + tableHeight));
    }

    [
      { label: "Hole", y: tableY + 39, size: 22 },
      { label: "HCP", y: tableY + 84, size: 18 },
      { label: "Yards", y: tableY + 130, size: 17 },
      { label: "Par", y: tableY + 174, size: 17 },
      { label: clipText(recap.homeTeam.name, 18), y: tableY + 230, size: 17 },
      { label: clipText(recap.awayTeam.name, 18), y: tableY + 294, size: 17 }
    ].forEach((item) => {
      elements.push(text(item.label, tableX + 18, item.y, { anchor: "start", size: item.size }));
    });

    columns.forEach((column, index) => {
      const centerX = tableX + labelWidth + index * colWidth + colWidth / 2;
      const cellX = tableX + labelWidth + index * colWidth;

      if (column.kind === "hole") {
        const hole = column.hole;
        const winner = holeWinnerSide(hole, recap);
        const homeY = tableY + 230;
        const awayY = tableY + 294;

        elements.push(rect(centerX - 18, tableY + 11, 36, 36, { fill: "#ded9c7", rx: 18 }));
        elements.push(text(String(hole.holeNumber), centerX, tableY + 37, { size: 19 }));
        elements.push(text(String(hole.strokeIndex || "-"), centerX, tableY + 84, { size: 17 }));
        elements.push(text(String(hole.yardage ?? "-"), centerX, tableY + 130, { size: 16 }));
        elements.push(text(String(hole.par || "-"), centerX, tableY + 174, { size: 17 }));

        if (winner === "home") {
          elements.push(winningScoreCell(cellX, tableY + 190, colWidth, rowHeights[4], "home"));
        } else if (winner === "away") {
          elements.push(winningScoreCell(cellX, tableY + 254, colWidth, rowHeights[5], "away"));
        }

        elements.push(scoreMark(centerX, homeY - 7, 30, scoreShape(hole.homeNet, hole.par)));
        elements.push(scoreMark(centerX, awayY - 7, 30, scoreShape(hole.awayNet, hole.par)));
        elements.push(text(String(hole.homeNet ?? "-"), centerX, homeY, { size: 20 }));
        elements.push(text(String(hole.awayNet ?? "-"), centerX, awayY, { size: 20 }));
        return;
      }

      elements.push(text(column.label, centerX, tableY + 36, { size: 15 }));
      elements.push(text(String(column.yardage ?? "-"), centerX, tableY + 130, { size: 14 }));
      elements.push(text(String(column.par), centerX, tableY + 174, { size: 17 }));
      elements.push(text(String(column.homeNet), centerX, tableY + 230, { size: 20 }));
      elements.push(text(String(column.awayNet), centerX, tableY + 294, { size: 20 }));
    });
  }

  drawSegment("front", 190, "Front 9");
  drawSegment("back", 555, "Back 9");

  const statsGap = 28;
  const statsItems = [
    { side: "home" as const, team: recap.homeTeam, fill: HOME_ROW, stroke: HOME_STROKE },
    { side: "away" as const, team: recap.awayTeam, fill: AWAY_ROW, stroke: AWAY_STROKE }
  ].map(({ side, team, fill, stroke }) => ({
    side,
    team,
    fill,
    stroke,
    width: statsCardWidthForSvg(team.name, winnerSide === side)
  }));
  const statsTotalWidth = statsItems.reduce((total, item) => total + item.width, 0) + statsGap;
  let statsX = (1080 - statsTotalWidth) / 2;

  statsItems.forEach(({ side, team, fill, stroke, width }) => {
    const winner = winnerSide === side;
    const x = statsX;
    const nameX = winner ? x + 58 : x + 24;
    const holesX = x + Math.round(width * 0.52);

    elements.push(rect(x, 908, width, 86, { fill, rx: 18, stroke: winner ? stroke : "rgba(198, 163, 90, 0.35)", strokeWidth: winner ? 3 : 2 }));

    if (winner) {
      elements.push(trophyIcon(x + 23, 918, 28, stroke));
    }

    elements.push(text(clipText(team.name, 24), nameX, 938, { anchor: "start", size: 20, weight: 700 }));
    elements.push(text("POINTS WON", x + 24, 965, { anchor: "start", color: stroke, size: 11, weight: 650, letterSpacing: 2 }));
    elements.push(text(formatPoints(team.totalPoints), x + 24, 988, { anchor: "start", size: 26, weight: 700 }));
    elements.push(text("HOLES WON", holesX, 965, { anchor: "start", color: stroke, size: 11, weight: 650, letterSpacing: 2 }));
    elements.push(text(String(team.holesWon), holesX, 988, { anchor: "start", size: 26, weight: 700 }));

    statsX += width + statsGap;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">${elements.join("")}</svg>`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (isAdminAuthConfigured() && !(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const recaps = await getAdminGraphicRecaps();
  const recap = recaps.find((candidate) => candidate.id === decodeURIComponent(id));

  if (!recap) {
    return NextResponse.json({ error: "Graphic recap not found" }, { status: 404 });
  }

  const svg = await renderGraphicSvg(recap);
  const sharp = (await import("sharp")).default;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const disposition = new URL(request.url).searchParams.get("disposition") === "inline" ? "inline" : "attachment";

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `${disposition}; filename="${downloadFilename(recap)}"`,
      "Content-Type": "image/png"
    }
  });
}
