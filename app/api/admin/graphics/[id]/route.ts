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
const EXPORT_FONT_FAMILY = "TwoManExport";
const THIN_TEXT_VARIANT_PARAM = "thin-text";

type RecapHole = AdminGraphicRecap["holes"][number];
type SegmentKey = "front" | "back";
type TeamSide = "home" | "away";
type ScoreShape = "none" | "circle" | "double-circle" | "square" | "double-square";
type GraphicTextVariant = "standard" | "thin";
type GraphicMode = "scorecard" | "playoff";
type GraphicTextWeightKey =
  | "title"
  | "subtitle"
  | "sectionLabel"
  | "tableHeader"
  | "tableText"
  | "yardage"
  | "score"
  | "statName"
  | "statLabel"
  | "statValue";
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

const GRAPHIC_TEXT_WEIGHTS: Record<GraphicTextVariant, Record<GraphicTextWeightKey, number>> = {
  standard: {
    title: 700,
    subtitle: 600,
    sectionLabel: 700,
    tableHeader: 700,
    tableText: 650,
    yardage: 600,
    score: 650,
    statName: 700,
    statLabel: 650,
    statValue: 700
  },
  thin: {
    title: 500,
    subtitle: 400,
    sectionLabel: 500,
    tableHeader: 500,
    tableText: 400,
    yardage: 400,
    score: 500,
    statName: 500,
    statLabel: 400,
    statValue: 500
  }
};

function graphicTextWeight(variant: GraphicTextVariant, key: GraphicTextWeightKey) {
  return GRAPHIC_TEXT_WEIGHTS[variant][key];
}

function graphicTextVariantFromUrl(request: Request): GraphicTextVariant {
  return new URL(request.url).searchParams.get("variant") === THIN_TEXT_VARIANT_PARAM ? "thin" : "standard";
}

function graphicModeFromUrl(request: Request, recap: AdminGraphicRecap): GraphicMode {
  const requestedMode = new URL(request.url).searchParams.get("mode");
  const playoff = isPlayoffRecap(recap);

  if (requestedMode === "playoff" && playoff) {
    return "playoff";
  }

  if (requestedMode === "scorecard" && !playoff) {
    return "scorecard";
  }

  return playoff ? "playoff" : "scorecard";
}

function textErodeFill(textVariant: GraphicTextVariant, backgroundFill: string) {
  return textVariant === "thin" ? backgroundFill : undefined;
}

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

function formatFullDate(value: string | null) {
  if (!value) {
    return "DATE TBD";
  }

  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (isoDate) {
    const date = new Date(Date.UTC(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3])));

    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC"
    }).format(date);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value.toUpperCase();
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(parsed);
}

function isPlayoffRecap(recap: AdminGraphicRecap) {
  return recap.stage !== "POD_PLAY";
}

function winningTeam(recap: AdminGraphicRecap) {
  if (recap.winningTeamId === recap.homeTeam.id) {
    return recap.homeTeam;
  }

  if (recap.winningTeamId === recap.awayTeam.id) {
    return recap.awayTeam;
  }

  return matchWinnerSide(recap) === "home" ? recap.homeTeam : recap.awayTeam;
}

function playoffResultPhrase(recap: AdminGraphicRecap) {
  const winner = winningTeam(recap);
  const label = recap.resultLabel ?? `${winner.name} wins`;
  const escapedWinner = winner.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const phrase = label
    .replace(new RegExp(`^${escapedWinner}\\s+wins\\s*`, "i"), "")
    .replace(/^wins\s*/i, "")
    .trim();

  return phrase || "ADVANCES";
}

function playoffResultHeadline(recap: AdminGraphicRecap) {
  const phrase = playoffResultPhrase(recap).toUpperCase();

  if (phrase === "BY FORFEIT") {
    return "WIN BY FORFEIT";
  }

  if (phrase === "ADVANCES") {
    return "ADVANCE";
  }

  return `WIN ${phrase}`;
}

function stageLabel(stage: string) {
  return stage.replaceAll("_", " ");
}

function teamDisplayLines(name: string) {
  const normalized = name.toUpperCase().replace(/\s*&\s*/g, " & ").trim();
  const parts = normalized.split(" & ");

  if (parts.length === 2) {
    return [`${parts[0]} &`, parts[1]];
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length > 2) {
    const midpoint = Math.ceil(words.length / 2);
    return [words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" ")];
  }

  return [normalized];
}

function downloadFilename(recap: AdminGraphicRecap, textVariant: GraphicTextVariant, graphicMode: GraphicMode) {
  const variantSuffix = textVariant === "thin" ? "-thin-text" : "";
  const modePrefix = graphicMode === "playoff" ? "playoff" : "scorecard";

  return `two-man-${modePrefix}-recap-${cleanFilePart(recap.homeTeam.name)}-${cleanFilePart(recap.awayTeam.name)}${variantSuffix}.png`;
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
    erodeFill?: string;
  }
) {
  const escapedValue = escapeSvg(value);
  const commonAttrs = [
    `x="${x}"`,
    `y="${y}"`,
    `text-anchor="${options.anchor ?? "middle"}"`,
    `font-size="${options.size}"`,
    `font-weight="${options.weight ?? 650}"`,
    `letter-spacing="${options.letterSpacing ?? 0}"`,
    `font-family="${EXPORT_FONT_FAMILY}"`
  ].join(" ");
  const filledText = `<text ${commonAttrs} fill="${options.color ?? INK}">${escapedValue}</text>`;

  if (!options.erodeFill) {
    return filledText;
  }

  const erodeWidth = Math.min(0.9, Math.max(0.45, options.size * 0.035));

  return `<g>${filledText}<text ${commonAttrs} fill="none" stroke="${options.erodeFill}" stroke-width="${erodeWidth.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round">${escapedValue}</text></g>`;
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

function locationPinIcon(x: number, y: number, size: number, fill: string) {
  const scale = size / 42;

  return `<g transform="translate(${x} ${y}) scale(${scale})" fill="${fill}"><path d="M21 40C16 32 8 24 8 16 8 7 14 2 21 2s13 5 13 14c0 8-8 16-13 24Z" /><circle cx="21" cy="16" r="6" fill="${CARD}" /></g>`;
}

function calendarIcon(x: number, y: number, size: number, stroke: string) {
  const scale = size / 42;

  return `<g transform="translate(${x} ${y}) scale(${scale})" fill="none" stroke="${stroke}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="9" width="28" height="28" /><path d="M7 17h28M14 5v7M28 5v7" /><g fill="${stroke}" stroke="none"><rect x="13" y="22" width="3" height="3" /><rect x="20" y="22" width="3" height="3" /><rect x="27" y="22" width="3" height="3" /><rect x="13" y="27" width="3" height="3" /><rect x="20" y="27" width="3" height="3" /><rect x="27" y="27" width="3" height="3" /><rect x="13" y="32" width="3" height="3" /><rect x="20" y="32" width="3" height="3" /><rect x="27" y="32" width="3" height="3" /></g></g>`;
}

function goldRays(centerX: number, centerY: number, direction: "left" | "right") {
  const sign = direction === "left" ? -1 : 1;

  return [
    line(centerX + sign * 38, centerY - 34, centerX + sign * 100, centerY - 49, "#a77b28", 5),
    line(centerX + sign * 28, centerY, centerX + sign * 92, centerY, "#a77b28", 5),
    line(centerX + sign * 38, centerY + 34, centerX + sign * 100, centerY + 49, "#a77b28", 5)
  ].join("");
}

async function logoDataUri() {
  try {
    const logo = await readFile(path.join(process.cwd(), "public", "two-man-main-logo.png"));
    return `data:image/png;base64,${logo.toString("base64")}`;
  } catch {
    return null;
  }
}

async function renderScorecardGraphicSvg(recap: AdminGraphicRecap, textVariant: GraphicTextVariant) {
  const logo = await logoDataUri();
  const dateCourseLine = matchInfoLine(recap);
  const winnerSide = matchWinnerSide(recap);
  const elements: string[] = [];

  elements.push(rect(0, 0, 1080, 1080, { fill: PAPER }));
  elements.push(rect(54, 54, 972, 972, { fill: CARD, rx: 42, stroke: "rgba(198, 163, 90, 0.55)", strokeWidth: 3 }));

  if (logo) {
    elements.push(`<image href="${logo}" x="900" y="72" width="72" height="72" opacity="0.9" />`);
  }

  elements.push(
    text(`${recap.homeTeam.name} vs ${recap.awayTeam.name}`, 540, 112, {
      erodeFill: textErodeFill(textVariant, CARD),
      size: 35,
      weight: graphicTextWeight(textVariant, "title")
    })
  );
  elements.push(
    text(dateCourseLine || recap.courseName || "Official match recap", 540, 149, {
      color: "rgba(16,32,23,0.78)",
      erodeFill: textErodeFill(textVariant, CARD),
      size: 21,
      weight: graphicTextWeight(textVariant, "subtitle")
    })
  );

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

    elements.push(
      text(label, tableX, tableY - 12, {
        anchor: "start",
        color: GOLD,
        erodeFill: textErodeFill(textVariant, CARD),
        letterSpacing: 4,
        size: 17,
        weight: graphicTextWeight(textVariant, "sectionLabel")
      })
    );

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
      { backgroundFill: CARD, label: "Hole", y: tableY + 39, size: 22, weight: graphicTextWeight(textVariant, "tableHeader") },
      { backgroundFill: CARD, label: "HCP", y: tableY + 84, size: 18, weight: graphicTextWeight(textVariant, "tableText") },
      { backgroundFill: CARD, label: "Yards", y: tableY + 130, size: 17, weight: graphicTextWeight(textVariant, "tableText") },
      { backgroundFill: PAR_ROW, label: "Par", y: tableY + 174, size: 17, weight: graphicTextWeight(textVariant, "tableText") },
      { backgroundFill: CARD, label: clipText(recap.homeTeam.name, 18), y: tableY + 230, size: 17, weight: graphicTextWeight(textVariant, "tableText") },
      { backgroundFill: CARD, label: clipText(recap.awayTeam.name, 18), y: tableY + 294, size: 17, weight: graphicTextWeight(textVariant, "tableText") }
    ].forEach((item) => {
      elements.push(
        text(item.label, tableX + 18, item.y, {
          anchor: "start",
          erodeFill: textErodeFill(textVariant, item.backgroundFill),
          size: item.size,
          weight: item.weight
        })
      );
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
        elements.push(text(String(hole.holeNumber), centerX, tableY + 37, { erodeFill: textErodeFill(textVariant, "#ded9c7"), size: 19, weight: graphicTextWeight(textVariant, "score") }));
        elements.push(text(String(hole.strokeIndex || "-"), centerX, tableY + 84, { erodeFill: textErodeFill(textVariant, CARD), size: 17, weight: graphicTextWeight(textVariant, "tableText") }));
        elements.push(text(String(hole.yardage ?? "-"), centerX, tableY + 130, { erodeFill: textErodeFill(textVariant, CARD), size: 16, weight: graphicTextWeight(textVariant, "yardage") }));
        elements.push(text(String(hole.par || "-"), centerX, tableY + 174, { erodeFill: textErodeFill(textVariant, PAR_ROW), size: 17, weight: graphicTextWeight(textVariant, "tableText") }));

        if (winner === "home") {
          elements.push(winningScoreCell(cellX, tableY + 190, colWidth, rowHeights[4], "home"));
        } else if (winner === "away") {
          elements.push(winningScoreCell(cellX, tableY + 254, colWidth, rowHeights[5], "away"));
        }

        elements.push(scoreMark(centerX, homeY - 7, 30, scoreShape(hole.homeNet, hole.par)));
        elements.push(scoreMark(centerX, awayY - 7, 30, scoreShape(hole.awayNet, hole.par)));
        elements.push(
          text(String(hole.homeNet ?? "-"), centerX, homeY, {
            erodeFill: textErodeFill(textVariant, winner === "home" ? HOME_WIN : CARD),
            size: 20,
            weight: graphicTextWeight(textVariant, "score")
          })
        );
        elements.push(
          text(String(hole.awayNet ?? "-"), centerX, awayY, {
            erodeFill: textErodeFill(textVariant, winner === "away" ? AWAY_WIN : CARD),
            size: 20,
            weight: graphicTextWeight(textVariant, "score")
          })
        );
        return;
      }

      elements.push(text(column.label, centerX, tableY + 36, { erodeFill: textErodeFill(textVariant, CARD), size: 15, weight: graphicTextWeight(textVariant, "tableText") }));
      elements.push(text(String(column.yardage ?? "-"), centerX, tableY + 130, { erodeFill: textErodeFill(textVariant, CARD), size: 14, weight: graphicTextWeight(textVariant, "yardage") }));
      elements.push(text(String(column.par), centerX, tableY + 174, { erodeFill: textErodeFill(textVariant, PAR_ROW), size: 17, weight: graphicTextWeight(textVariant, "tableText") }));
      elements.push(text(String(column.homeNet), centerX, tableY + 230, { erodeFill: textErodeFill(textVariant, CARD), size: 20, weight: graphicTextWeight(textVariant, "score") }));
      elements.push(text(String(column.awayNet), centerX, tableY + 294, { erodeFill: textErodeFill(textVariant, CARD), size: 20, weight: graphicTextWeight(textVariant, "score") }));
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

    elements.push(text(clipText(team.name, 24), nameX, 938, { anchor: "start", erodeFill: textErodeFill(textVariant, fill), size: 20, weight: graphicTextWeight(textVariant, "statName") }));
    elements.push(text("POINTS WON", x + 24, 965, { anchor: "start", color: stroke, erodeFill: textErodeFill(textVariant, fill), size: 11, weight: graphicTextWeight(textVariant, "statLabel"), letterSpacing: 2 }));
    elements.push(text(formatPoints(team.totalPoints), x + 24, 988, { anchor: "start", erodeFill: textErodeFill(textVariant, fill), size: 26, weight: graphicTextWeight(textVariant, "statValue") }));
    elements.push(text("HOLES WON", holesX, 965, { anchor: "start", color: stroke, erodeFill: textErodeFill(textVariant, fill), size: 11, weight: graphicTextWeight(textVariant, "statLabel"), letterSpacing: 2 }));
    elements.push(text(String(team.holesWon), holesX, 988, { anchor: "start", erodeFill: textErodeFill(textVariant, fill), size: 26, weight: graphicTextWeight(textVariant, "statValue") }));

    statsX += width + statsGap;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">${elements.join("")}</svg>`;
}

async function renderPlayoffGraphicSvg(recap: AdminGraphicRecap, textVariant: GraphicTextVariant) {
  const logo = await logoDataUri();
  const winner = winningTeam(recap);
  const homeLines = teamDisplayLines(recap.homeTeam.name);
  const awayLines = teamDisplayLines(recap.awayTeam.name);
  const headline = playoffResultHeadline(recap);
  const headlineSize = headline.length > 12 ? 76 : 96;
  const elements: string[] = [];

  elements.push(rect(0, 0, 1080, 1080, { fill: "#063322" }));
  elements.push(rect(26, 26, 1028, 1028, { fill: PAPER }));
  elements.push(rect(31, 31, 1018, 1018, { stroke: GOLD, strokeWidth: 4 }));

  if (logo) {
    elements.push(`<image href="${logo}" x="377" y="52" width="326" height="246" opacity="0.95" />`);
  }

  elements.push(line(360, 368, 400, 368, "#a77b28", 2));
  elements.push(line(680, 368, 720, 368, "#a77b28", 2));
  elements.push(
    text("MATCH RECAP", 540, 380, {
      color: "#a77b28",
      erodeFill: textErodeFill(textVariant, PAPER),
      letterSpacing: 9,
      size: 35,
      weight: graphicTextWeight(textVariant, "sectionLabel")
    })
  );

  homeLines.slice(0, 2).forEach((lineText, index) => {
    elements.push(
      text(clipText(lineText, 16), 285, 492 + index * 76, {
        erodeFill: textErodeFill(textVariant, PAPER),
        size: lineText.length > 12 ? 52 : 62,
        weight: 800
      })
    );
  });
  awayLines.slice(0, 2).forEach((lineText, index) => {
    elements.push(
      text(clipText(lineText, 16), 795, 492 + index * 76, {
        erodeFill: textErodeFill(textVariant, PAPER),
        size: lineText.length > 12 ? 52 : 62,
        weight: 800
      })
    );
  });

  elements.push(line(540, 424, 540, 452, "#a77b28", 2));
  elements.push(`<circle cx="540" cy="515" r="50" fill="none" stroke="#a77b28" stroke-width="2" />`);
  elements.push(
    text("VS", 540, 533, {
      color: "#a77b28",
      erodeFill: textErodeFill(textVariant, PAPER),
      size: 38,
      weight: 800
    })
  );

  elements.push(line(92, 636, 988, 636, "#a77b28", 2));
  elements.push(
    text(clipText(winner.name.toUpperCase(), 28), 540, 704, {
      erodeFill: textErodeFill(textVariant, PAPER),
      letterSpacing: 3,
      size: winner.name.length > 22 ? 31 : 38,
      weight: graphicTextWeight(textVariant, "sectionLabel")
    })
  );
  elements.push(goldRays(230, 786, "left"));
  elements.push(goldRays(850, 786, "right"));
  elements.push(
    text(headline, 540, 832, {
      erodeFill: textErodeFill(textVariant, PAPER),
      size: headlineSize,
      weight: 900
    })
  );

  elements.push(line(92, 888, 988, 888, "#a77b28", 2));
  elements.push(line(392, 918, 392, 1010, "#a77b28", 2));
  elements.push(line(688, 918, 688, 1010, "#a77b28", 2));
  elements.push(locationPinIcon(217, 916, 48, INK));
  elements.push(calendarIcon(519, 915, 48, INK));
  elements.push(trophyIcon(818, 918, 46, INK));
  elements.push(
    text(clipText(recap.courseName.toUpperCase(), 24), 240, 985, {
      erodeFill: textErodeFill(textVariant, PAPER),
      size: recap.courseName.length > 22 ? 17 : 20,
      weight: 800
    })
  );
  elements.push(
    text(clipText((recap.courseMeta ?? "").toUpperCase(), 24), 240, 1016, {
      erodeFill: textErodeFill(textVariant, PAPER),
      size: 18,
      weight: 500
    })
  );
  elements.push(
    text(formatFullDate(recap.playedOn).toUpperCase(), 540, 1000, {
      erodeFill: textErodeFill(textVariant, PAPER),
      size: 22,
      weight: 800
    })
  );
  elements.push(
    text(stageLabel(recap.stage), 840, 1000, {
      erodeFill: textErodeFill(textVariant, PAPER),
      letterSpacing: 1,
      size: 22,
      weight: 800
    })
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">${elements.join("")}</svg>`;
}

async function renderGraphicSvg(recap: AdminGraphicRecap, textVariant: GraphicTextVariant, graphicMode: GraphicMode) {
  if (graphicMode === "playoff") {
    return renderPlayoffGraphicSvg(recap, textVariant);
  }

  return renderScorecardGraphicSvg(recap, textVariant);
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
  const textVariant = graphicTextVariantFromUrl(request);

  if (!recap) {
    return NextResponse.json({ error: "Graphic recap not found" }, { status: 404 });
  }

  const graphicMode = graphicModeFromUrl(request, recap);
  const svg = await renderGraphicSvg(recap, textVariant, graphicMode);
  const { Resvg } = await import("@resvg/resvg-js");
  const fontPath = path.join(process.cwd(), "public", "two-man-export-font.ttf");
  await readFile(fontPath);

  const png = new Resvg(svg, {
    font: {
      defaultFontFamily: EXPORT_FONT_FAMILY,
      fontFiles: [fontPath],
      loadSystemFonts: false
    }
  }).render().asPng();
  const disposition = new URL(request.url).searchParams.get("disposition") === "inline" ? "inline" : "attachment";

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `${disposition}; filename="${downloadFilename(recap, textVariant, graphicMode)}"`,
      "Content-Type": "image/png",
      "X-Two-Man-Graphic-Mode": graphicMode,
      "X-Two-Man-Graphic-Renderer": "resvg-bundled-font-v1",
      "X-Two-Man-Graphic-Variant": textVariant === "thin" ? THIN_TEXT_VARIANT_PARAM : "standard"
    }
  });
}
