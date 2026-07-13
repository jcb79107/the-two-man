"use client";

import { useEffect, useState } from "react";
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
const HOME_WIN = "#d6eadc";
const AWAY_WIN = "#e7def5";
const HOME_STROKE = "#17533d";
const AWAY_STROKE = "#6a4d90";
const LOGO_SRC = "/two-man-main-logo.png";
const THIN_TEXT_VARIANT_PARAM = "thin-text";
const FONT_STACK = "Avenir Next, Helvetica Neue, Arial, sans-serif";
const DISPLAY_FONT_STACK = "Georgia, Times New Roman, serif";

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

function canvasFont(variant: GraphicTextVariant, key: GraphicTextWeightKey, size: number) {
  return `${GRAPHIC_TEXT_WEIGHTS[variant][key]} ${size}px ${FONT_STACK}`;
}

function canvasDisplayFont(weight: number, size: number) {
  return `${weight} ${size}px ${DISPLAY_FONT_STACK}`;
}

function formatPoints(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
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

function sumNumbers(values: Array<number | null | undefined>) {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

function sumTeamScores(holes: RecapHole[], side: TeamSide) {
  return sumNumbers(holes.map((hole) => (side === "home" ? hole.homeNet : hole.awayNet)));
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

function matchInfoLine(recap: AdminGraphicRecap) {
  return [formatShortDate(recap.playedOn), recap.courseName, recap.courseMeta].filter(Boolean).join(" / ");
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

function cleanFilePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function loadLogoImage() {
  return Promise.race([
    loadCanvasImage(LOGO_SRC).catch(() => null),
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 3000))
  ]);
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

function drawScoreMark(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  shape: ScoreShape
) {
  if (shape === "none") return;

  context.strokeStyle = INK;
  context.lineWidth = shape === "double-circle" || shape === "double-square" ? 3 : 5;

  if (shape === "circle" || shape === "double-circle") {
    context.beginPath();
    context.arc(x, y, size / 2, 0, Math.PI * 2);
    context.stroke();

    if (shape === "double-circle") {
      context.lineWidth = 2;
      context.beginPath();
      context.arc(x, y, size / 2 + 5, 0, Math.PI * 2);
      context.stroke();
    }

    return;
  }

  context.strokeRect(x - size / 2, y - size / 2, size, size);

  if (shape === "double-square") {
    context.lineWidth = 2;
    context.strokeRect(x - size / 2 - 5, y - size / 2 - 5, size + 10, size + 10);
  }
}

function drawTrophyIcon(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  stroke: string
) {
  const scale = size / 40;

  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = stroke;
  context.fillStyle = PAR_ROW;
  context.lineWidth = 3;

  context.beginPath();
  context.moveTo(12, 8);
  context.lineTo(28, 8);
  context.lineTo(26, 22);
  context.quadraticCurveTo(24, 29, 20, 29);
  context.quadraticCurveTo(16, 29, 14, 22);
  context.closePath();
  context.fill();
  context.stroke();

  context.beginPath();
  context.moveTo(12, 12);
  context.lineTo(7, 12);
  context.quadraticCurveTo(4, 12, 5, 16);
  context.quadraticCurveTo(6, 22, 13, 22);
  context.stroke();

  context.beginPath();
  context.moveTo(28, 12);
  context.lineTo(33, 12);
  context.quadraticCurveTo(36, 12, 35, 16);
  context.quadraticCurveTo(34, 22, 27, 22);
  context.stroke();

  context.fillStyle = stroke;
  context.fillRect(18, 29, 4, 5);
  context.fillRect(12, 34, 16, 4);
  context.restore();
}

function drawLocationPinIcon(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  fill: string
) {
  const scale = size / 42;

  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  context.fillStyle = fill;
  context.beginPath();
  context.moveTo(21, 40);
  context.bezierCurveTo(16, 32, 8, 24, 8, 16);
  context.bezierCurveTo(8, 7, 14, 2, 21, 2);
  context.bezierCurveTo(28, 2, 34, 7, 34, 16);
  context.bezierCurveTo(34, 24, 26, 32, 21, 40);
  context.closePath();
  context.fill();
  context.fillStyle = CARD;
  context.beginPath();
  context.arc(21, 16, 6, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawCalendarIcon(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  stroke: string
) {
  const scale = size / 42;

  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  context.strokeStyle = stroke;
  context.fillStyle = "transparent";
  context.lineWidth = 4;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeRect(7, 9, 28, 28);
  context.beginPath();
  context.moveTo(7, 17);
  context.lineTo(35, 17);
  context.moveTo(14, 5);
  context.lineTo(14, 12);
  context.moveTo(28, 5);
  context.lineTo(28, 12);
  context.stroke();
  context.fillStyle = stroke;
  for (const row of [0, 1, 2]) {
    for (const col of [0, 1, 2]) {
      context.fillRect(13 + col * 7, 22 + row * 5, 3, 3);
    }
  }
  context.restore();
}

function drawGoldRays(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  direction: "left" | "right"
) {
  const sign = direction === "left" ? -1 : 1;

  context.save();
  context.strokeStyle = "#a77b28";
  context.lineWidth = 5;
  context.lineCap = "round";
  [
    { y: -34, x1: 38, x2: 100 },
    { y: 0, x1: 28, x2: 92 },
    { y: 34, x1: 38, x2: 100 }
  ].forEach((ray) => {
    context.beginPath();
    context.moveTo(centerX + sign * ray.x1, centerY + ray.y);
    context.lineTo(centerX + sign * ray.x2, centerY + ray.y * 1.45);
    context.stroke();
  });
  context.restore();
}

function drawWinningScoreCell(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  side: TeamSide
) {
  const fill = side === "home" ? HOME_WIN : AWAY_WIN;

  context.fillStyle = fill;
  context.fillRect(x + 2, y + 2, width - 4, height - 4);
  context.strokeStyle = side === "home" ? HOME_STROKE : AWAY_STROKE;
  context.lineWidth = 3;
  context.strokeRect(x + 5, y + 5, width - 10, height - 10);
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

function drawFittedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  options: {
    color?: string;
    maxSize: number;
    minSize: number;
    weight?: number;
    align?: CanvasTextAlign;
    family?: string;
  }
) {
  const family = options.family ?? FONT_STACK;
  let size = options.maxSize;

  while (size > options.minSize && measureCanvasText(context, text, `${options.weight ?? 700} ${size}px ${family}`) > maxWidth) {
    size -= 2;
  }

  drawGridText(
    context,
    text,
    x,
    y,
    maxWidth,
    `${options.weight ?? 700} ${size}px ${family}`,
    options.color ?? INK,
    options.align ?? "center"
  );
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function measureCanvasText(context: CanvasRenderingContext2D, text: string, font: string) {
  context.save();
  context.font = font;
  const width = context.measureText(text).width;
  context.restore();
  return width;
}

function statsCardWidthForCanvas(
  context: CanvasRenderingContext2D,
  teamName: string,
  winner: boolean,
  textVariant: GraphicTextVariant
) {
  const nameWidth = measureCanvasText(context, teamName, canvasFont(textVariant, "statName", 20));
  const headerWidth = nameWidth + (winner ? 84 : 54);

  return Math.ceil(clampNumber(Math.max(headerWidth, 292), 292, 360));
}

function drawPlayoffGraphic(
  context: CanvasRenderingContext2D,
  recap: AdminGraphicRecap,
  logoImage: CanvasImageSource | null = null,
  textVariant: GraphicTextVariant = "standard"
) {
  const width = 1080;
  const height = 1080;
  const winner = winningTeam(recap);
  const winnerName = winner.name.toUpperCase();
  const resultHeadline = playoffResultHeadline(recap);
  const homeLines = teamDisplayLines(recap.homeTeam.name);
  const awayLines = teamDisplayLines(recap.awayTeam.name);
  const courseName = recap.courseName || "COURSE TBD";
  const courseMeta = recap.courseMeta ?? "";
  const dateLabel = formatFullDate(recap.playedOn).toUpperCase();
  const roundLabel = stageLabel(recap.stage);

  context.clearRect(0, 0, width, height);
  context.fillStyle = "#063322";
  context.fillRect(0, 0, width, height);

  context.fillStyle = PAPER;
  context.fillRect(26, 26, 1028, 1028);
  context.strokeStyle = GOLD;
  context.lineWidth = 4;
  context.strokeRect(31, 31, 1018, 1018);

  if (logoImage) {
    context.save();
    context.globalAlpha = 0.95;
    context.drawImage(logoImage, 377, 52, 326, 246);
    context.restore();
  }

  context.strokeStyle = "#a77b28";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(360, 368);
  context.lineTo(400, 368);
  context.moveTo(680, 368);
  context.lineTo(720, 368);
  context.stroke();
  drawGridText(context, "MATCH RECAP", 540, 380, 280, canvasFont(textVariant, "sectionLabel", 35), "#a77b28");

  const teamLineY = 492;
  homeLines.slice(0, 2).forEach((line, index) => {
    drawFittedText(context, line, 285, teamLineY + index * 76, 330, {
      family: DISPLAY_FONT_STACK,
      maxSize: 62,
      minSize: 38,
      weight: 800
    });
  });
  awayLines.slice(0, 2).forEach((line, index) => {
    drawFittedText(context, line, 795, teamLineY + index * 76, 330, {
      family: DISPLAY_FONT_STACK,
      maxSize: 62,
      minSize: 38,
      weight: 800
    });
  });

  context.strokeStyle = "#a77b28";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(540, 424);
  context.lineTo(540, 452);
  context.stroke();
  context.beginPath();
  context.arc(540, 515, 50, 0, Math.PI * 2);
  context.stroke();
  drawGridText(context, "VS", 540, 533, 62, canvasDisplayFont(800, 38), "#a77b28");

  context.strokeStyle = "#a77b28";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(92, 636);
  context.lineTo(988, 636);
  context.stroke();

  drawFittedText(context, winnerName, 540, 704, 680, {
    color: INK,
    maxSize: 38,
    minSize: 26,
    weight: GRAPHIC_TEXT_WEIGHTS[textVariant].sectionLabel
  });
  drawGoldRays(context, 230, 786, "left");
  drawGoldRays(context, 850, 786, "right");
  drawFittedText(context, resultHeadline, 540, 832, 660, {
    color: INK,
    family: DISPLAY_FONT_STACK,
    maxSize: 96,
    minSize: 54,
    weight: 900
  });

  context.beginPath();
  context.moveTo(92, 888);
  context.lineTo(988, 888);
  context.stroke();
  context.beginPath();
  context.moveTo(392, 918);
  context.lineTo(392, 1010);
  context.moveTo(688, 918);
  context.lineTo(688, 1010);
  context.stroke();

  drawLocationPinIcon(context, 217, 916, 48, INK);
  drawCalendarIcon(context, 519, 915, 48, INK);
  drawTrophyIcon(context, 818, 918, 46, INK);

  drawFittedText(context, courseName.toUpperCase(), 240, 985, 260, {
    color: INK,
    maxSize: 20,
    minSize: 14,
    weight: 800
  });
  drawFittedText(context, courseMeta.toUpperCase(), 240, 1016, 260, {
    color: INK,
    maxSize: 18,
    minSize: 13,
    weight: 500
  });
  drawFittedText(context, dateLabel, 540, 1000, 250, {
    color: INK,
    maxSize: 22,
    minSize: 15,
    weight: 800
  });
  drawFittedText(context, roundLabel, 840, 1000, 250, {
    color: INK,
    maxSize: 22,
    minSize: 15,
    weight: 800
  });
}

function drawScorecardGraphic(
  context: CanvasRenderingContext2D,
  recap: AdminGraphicRecap,
  logoImage: CanvasImageSource | null = null,
  textVariant: GraphicTextVariant = "standard"
) {
  const width = 1080;
  const height = 1080;
  const dateCourseLine = matchInfoLine(recap);
  const winnerSide = matchWinnerSide(recap);

  context.clearRect(0, 0, width, height);
  context.fillStyle = PAPER;
  context.fillRect(0, 0, width, height);

  fillRoundRect(context, 54, 54, 972, 972, 42, CARD);
  strokeRoundRect(context, 54, 54, 972, 972, 42, "rgba(198, 163, 90, 0.55)", 3);

  if (logoImage) {
    context.save();
    context.globalAlpha = 0.9;
    context.drawImage(logoImage, 900, 72, 72, 72);
    context.restore();
  }

  drawGridText(
    context,
    `${recap.homeTeam.name} vs ${recap.awayTeam.name}`,
    width / 2,
    112,
    840,
    canvasFont(textVariant, "title", 35)
  );
  drawGridText(
    context,
    dateCourseLine || recap.courseName || "Official match recap",
    width / 2,
    149,
    840,
    canvasFont(textVariant, "subtitle", 21),
    "rgba(16,32,23,0.78)"
  );

  function drawSegment(segment: SegmentKey, tableY: number, label: string) {
    const columns = buildScorecardColumns(recap, segment);
    const labelWidth = 192;
    const colWidth = segment === "front" ? 67 : 61;
    const tableWidth = labelWidth + columns.length * colWidth;
    const tableX = (width - tableWidth) / 2;
    const rowHeights = [58, 42, 48, 42, 64, 64];
    const tableHeight = rowHeights.reduce((total, value) => total + value, 0);
    const rowFills = [CARD, CARD, CARD, PAR_ROW, CARD, CARD];
    let y = tableY;

    drawGridText(context, label, tableX, tableY - 12, 180, canvasFont(textVariant, "sectionLabel", 17), GOLD, "left");

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
    for (let index = 0; index <= columns.length; index += 1) {
      const x = tableX + labelWidth + index * colWidth;
      context.beginPath();
      context.moveTo(x, tableY);
      context.lineTo(x, tableY + tableHeight);
      context.stroke();
    }

    const labels = [
      { label: "Hole", y: tableY + 39, font: canvasFont(textVariant, "tableHeader", 22) },
      { label: "HCP", y: tableY + 84, font: canvasFont(textVariant, "tableText", 18) },
      { label: "Yards", y: tableY + 130, font: canvasFont(textVariant, "tableText", 17) },
      { label: "Par", y: tableY + 174, font: canvasFont(textVariant, "tableText", 17) },
      { label: recap.homeTeam.name, y: tableY + 230, font: canvasFont(textVariant, "tableText", 17) },
      { label: recap.awayTeam.name, y: tableY + 294, font: canvasFont(textVariant, "tableText", 17) }
    ];

    for (const item of labels) {
      drawGridText(context, item.label, tableX + 18, item.y, labelWidth - 28, item.font, INK, "left");
    }
    columns.forEach((column, index) => {
      const centerX = tableX + labelWidth + index * colWidth + colWidth / 2;
      const cellX = tableX + labelWidth + index * colWidth;

      if (column.kind === "hole") {
        const hole = column.hole;
        const winner = holeWinnerSide(hole, recap);

        fillRoundRect(context, centerX - 18, tableY + 11, 36, 36, 18, "#ded9c7");
        drawGridText(context, String(hole.holeNumber), centerX, tableY + 37, 34, canvasFont(textVariant, "score", 19));
        drawGridText(context, String(hole.strokeIndex || "-"), centerX, tableY + 84, 38, canvasFont(textVariant, "tableText", 17));
        drawGridText(context, String(hole.yardage ?? "-"), centerX, tableY + 130, 58, canvasFont(textVariant, "yardage", 16));
        drawGridText(context, String(hole.par || "-"), centerX, tableY + 174, 38, canvasFont(textVariant, "tableText", 17));

        const homeY = tableY + 230;
        const awayY = tableY + 294;
        if (winner === "home") {
          drawWinningScoreCell(context, cellX, tableY + 190, colWidth, rowHeights[4], "home");
        } else if (winner === "away") {
          drawWinningScoreCell(context, cellX, tableY + 254, colWidth, rowHeights[5], "away");
        }
        drawScoreMark(context, centerX, homeY - 7, 30, scoreShape(hole.homeNet, hole.par));
        drawScoreMark(context, centerX, awayY - 7, 30, scoreShape(hole.awayNet, hole.par));
        drawGridText(context, String(hole.homeNet ?? "-"), centerX, homeY, 38, canvasFont(textVariant, "score", 20));
        drawGridText(context, String(hole.awayNet ?? "-"), centerX, awayY, 38, canvasFont(textVariant, "score", 20));

        return;
      }

      drawGridText(context, column.label, centerX, tableY + 36, colWidth - 6, canvasFont(textVariant, "tableText", 15));
      drawGridText(context, "", centerX, tableY + 84, colWidth - 6, canvasFont(textVariant, "tableText", 17));
      drawGridText(context, String(column.yardage ?? "-"), centerX, tableY + 130, colWidth - 6, canvasFont(textVariant, "yardage", 14));
      drawGridText(context, String(column.par), centerX, tableY + 174, colWidth - 6, canvasFont(textVariant, "tableText", 17));
      drawGridText(context, String(column.homeNet), centerX, tableY + 230, colWidth - 6, canvasFont(textVariant, "score", 20));
      drawGridText(context, String(column.awayNet), centerX, tableY + 294, colWidth - 6, canvasFont(textVariant, "score", 20));
    });
  }

  drawSegment("front", 190, "Front 9");
  drawSegment("back", 555, "Back 9");

  const statsY = 908;
  const statsGap = 28;
  const statsItems = [
    { side: "home" as const, team: recap.homeTeam, fill: HOME_ROW, stroke: HOME_STROKE },
    { side: "away" as const, team: recap.awayTeam, fill: AWAY_ROW, stroke: AWAY_STROKE }
  ].map(({ side, team, fill, stroke }) => {
    return { side, team, fill, stroke, width: statsCardWidthForCanvas(context, team.name, winnerSide === side, textVariant) };
  });
  const statsTotalWidth = statsItems.reduce((total, item) => total + item.width, 0) + statsGap;
  let statsX = (width - statsTotalWidth) / 2;

  statsItems.forEach(({ side, team, fill, stroke, width: cardWidth }) => {
    const winner = winnerSide === side;
    const x = statsX;
    const nameX = winner ? x + 58 : x + 24;
    const nameWidth = cardWidth - (nameX - x) - 22;
    const holesX = x + Math.round(cardWidth * 0.52);

    fillRoundRect(context, x, statsY, cardWidth, 86, 18, fill);
    strokeRoundRect(context, x, statsY, cardWidth, 86, 18, winner ? stroke : "rgba(198, 163, 90, 0.35)", winner ? 3 : 2);

    if (winner) {
      drawTrophyIcon(context, x + 23, statsY + 10, 28, stroke);
    }

    drawGridText(context, team.name, nameX, statsY + 30, nameWidth, canvasFont(textVariant, "statName", 20), INK, "left");
    drawGridText(context, "POINTS WON", x + 24, statsY + 57, 116, canvasFont(textVariant, "statLabel", 11), stroke, "left");
    drawGridText(context, formatPoints(team.totalPoints), x + 24, statsY + 80, 92, canvasFont(textVariant, "statValue", 26), INK, "left");
    drawGridText(context, "HOLES WON", holesX, statsY + 57, 116, canvasFont(textVariant, "statLabel", 11), stroke, "left");
    drawGridText(context, String(team.holesWon), holesX, statsY + 80, 56, canvasFont(textVariant, "statValue", 26), INK, "left");

    statsX += cardWidth + statsGap;
  });

}

function drawGraphic(
  context: CanvasRenderingContext2D,
  recap: AdminGraphicRecap,
  logoImage: CanvasImageSource | null = null,
  textVariant: GraphicTextVariant = "standard",
  graphicMode: GraphicMode = "scorecard"
) {
  if (graphicMode === "playoff") {
    drawPlayoffGraphic(context, recap, logoImage, textVariant);
    return;
  }

  drawScorecardGraphic(context, recap, logoImage, textVariant);
}

function graphicPngHref(id: string, textVariant: GraphicTextVariant, graphicMode: GraphicMode, disposition?: "inline") {
  const params = new URLSearchParams();

  params.set("mode", graphicMode);

  if (textVariant === "thin") {
    params.set("variant", THIN_TEXT_VARIANT_PARAM);
  }

  if (disposition) {
    params.set("disposition", disposition);
  }

  const query = params.toString();

  return `/api/admin/graphics/${encodeURIComponent(id)}${query ? `?${query}` : ""}`;
}

function ScoreValue({
  value,
  par
}: {
  value: number | null;
  par: number;
}) {
  const shape = scoreShape(value, par);
  const shapeClass =
    shape === "circle"
      ? "rounded-full border-[3px] border-ink"
      : shape === "double-circle"
        ? "rounded-full border-2 border-ink"
        : shape === "square"
        ? "border-[3px] border-ink"
        : shape === "double-square"
          ? "border-2 border-ink"
          : "";
  const outerClass =
    shape === "double-circle"
      ? "rounded-full border border-ink p-[2px]"
      : shape === "double-square"
        ? "border border-ink p-[2px]"
        : "";

  return (
    <span className={`mx-auto grid h-8 w-8 place-items-center ${outerClass}`}>
      <span className={`grid h-6 w-6 place-items-center text-xs font-semibold leading-none text-ink ${shapeClass}`}>
        {value ?? "-"}
      </span>
    </span>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true">
      <path
        d="M12 8h16l-2 14c-.7 4.5-3.5 7-6 7s-5.3-2.5-6-7L12 8Z"
        fill={PAR_ROW}
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <path
        d="M12 12H7c-3 0-3 3-2 5 1.3 3.8 4 5 8 5M28 12h5c3 0 3 3 2 5-1.3 3.8-4 5-8 5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <path d="M18 29h4v5h-4zM12 34h16v4H12z" fill="currentColor" />
    </svg>
  );
}

function ScorecardSegmentPreview({
  title,
  segment,
  recap
}: {
  title: string;
  segment: SegmentKey;
  recap: AdminGraphicRecap;
}) {
  const columns = buildScorecardColumns(recap, segment);

  function scoreCellClass(column: ScorecardColumn, side: TeamSide, isLast: boolean) {
    const base = `grid place-items-center border-r border-[#c6a35a] px-0.5 py-1.5 ${isLast ? " last:border-r-0" : ""}`;

    if (column.kind !== "hole" || holeWinnerSide(column.hole, recap) !== side) {
      return base;
    }

    return `${base} ${
      side === "home"
        ? "bg-[#d6eadc] ring-2 ring-inset ring-[#17533d]"
        : "bg-[#e7def5] ring-2 ring-inset ring-[#6a4d90]"
    }`;
  }

  return (
    <div>
      <p className="mb-1 text-left text-[0.52rem] font-bold uppercase tracking-[0.16em] text-[#c6a35a]">
        {title}
      </p>
      <div className="overflow-hidden rounded-[12px] border border-[#c6a35a] text-left">
        <div
          className="grid"
          style={{ gridTemplateColumns: `minmax(5.45rem, 1.42fr) repeat(${columns.length}, minmax(0, 1fr))` }}
        >
          <div className="border-b border-r border-[#c6a35a] px-2 py-1.5 text-sm font-bold text-ink">Hole</div>
          {columns.map((column) => (
            <div
              key={`hole-${title}-${column.key}`}
              className="grid place-items-center border-b border-r border-[#c6a35a] px-0.5 py-1 last:border-r-0"
            >
              {column.kind === "hole" ? (
                <span className="grid h-5 w-5 place-items-center rounded-full bg-[#ded9c7] text-[0.64rem] font-semibold text-ink">
                  {column.hole.holeNumber}
                </span>
              ) : (
                <span className="text-[0.54rem] font-semibold text-ink">{column.label}</span>
              )}
            </div>
          ))}

          <div className="border-b border-r border-[#c6a35a] px-2 py-1 text-xs font-bold text-ink">HCP</div>
          {columns.map((column) => (
            <div
              key={`hcp-${title}-${column.key}`}
              className="grid place-items-center border-b border-r border-[#c6a35a] px-0.5 py-1 text-[0.62rem] font-semibold text-ink last:border-r-0"
            >
              {column.kind === "hole" ? column.hole.strokeIndex || "-" : ""}
            </div>
          ))}

          <div className="border-b border-r border-[#c6a35a] px-2 py-1 text-xs font-bold text-ink">Yards</div>
          {columns.map((column) => (
            <div
              key={`yards-${title}-${column.key}`}
              className="grid place-items-center border-b border-r border-[#c6a35a] px-0.5 py-1 text-[0.54rem] font-semibold text-ink last:border-r-0"
            >
              {column.kind === "hole" ? column.hole.yardage ?? "-" : column.yardage ?? "-"}
            </div>
          ))}

          <div className="border-b border-r border-[#c6a35a] bg-[#f4de88] px-2 py-1 text-xs font-bold text-ink">Par</div>
          {columns.map((column) => (
            <div
              key={`par-${title}-${column.key}`}
              className="grid place-items-center border-b border-r border-[#c6a35a] bg-[#f4de88] px-0.5 py-1 text-[0.62rem] font-semibold text-ink last:border-r-0"
            >
              {column.kind === "hole" ? column.hole.par || "-" : column.par}
            </div>
          ))}

          <div className="grid content-center border-b border-r border-[#c6a35a] px-2 py-1.5 text-ink">
            <span className="block truncate text-[0.66rem] font-semibold">{recap.homeTeam.name}</span>
          </div>
          {columns.map((column, index) => (
            <div
              key={`home-${title}-${column.key}`}
              className={`${scoreCellClass(column, "home", index === columns.length - 1)} border-b`}
            >
              {column.kind === "hole" ? (
                <ScoreValue value={column.hole.homeNet} par={column.hole.par} />
              ) : (
                <span className="text-xs font-semibold text-ink">{column.homeNet}</span>
              )}
            </div>
          ))}

          <div className="grid content-center border-r border-[#c6a35a] px-2 py-1.5 text-ink">
            <span className="block truncate text-[0.66rem] font-semibold">{recap.awayTeam.name}</span>
          </div>
          {columns.map((column, index) => (
            <div key={`away-${title}-${column.key}`} className={scoreCellClass(column, "away", index === columns.length - 1)}>
              {column.kind === "hole" ? (
                <ScoreValue value={column.hole.awayNet} par={column.hole.par} />
              ) : (
                <span className="text-xs font-semibold text-ink">{column.awayNet}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScorecardGraphicPreview({ recap }: { recap: AdminGraphicRecap }) {
  const dateCourseLine = matchInfoLine(recap);
  const winnerSide = matchWinnerSide(recap);
  const teamStats = [
    { side: "home" as const, team: recap.homeTeam, fill: "bg-[#edf6f0]", accent: "text-[#17533d]", ring: "ring-[#17533d]" },
    { side: "away" as const, team: recap.awayTeam, fill: "bg-[#f4effb]", accent: "text-[#6a4d90]", ring: "ring-[#6a4d90]" }
  ];

  return (
    <div className="mx-auto aspect-square w-full max-w-[620px] overflow-hidden rounded-[30px] border border-[#c6a35a]/55 bg-[#f7f0df] p-[3.9%] shadow-[0_18px_48px_rgba(17,32,23,0.12)]">
      <div className="h-[119.05%] w-[119.05%] origin-top-left scale-[0.84]">
        <div className="relative flex h-full flex-col rounded-[24px] border border-[#c6a35a]/55 bg-[#fffaf0] p-[3.2%] text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SRC} alt="" className="absolute right-5 top-3 h-14 w-14 object-contain opacity-90" />
          <h3 className="mt-1 truncate text-[1.5rem] font-bold leading-tight text-ink">
            {recap.homeTeam.name} vs {recap.awayTeam.name}
          </h3>
          <p className="mt-1 truncate text-[0.72rem] font-semibold text-ink/66">
            {dateCourseLine || recap.courseName || "Official match recap"}
          </p>

          <div className="mt-[2.7%] grid gap-3">
            <ScorecardSegmentPreview title="Front 9" segment="front" recap={recap} />
            <ScorecardSegmentPreview title="Back 9" segment="back" recap={recap} />
          </div>

          <div className="mt-auto pt-[2.2%]">
            <div className="mx-auto grid w-[80%] grid-cols-2 gap-3">
              {teamStats.map((item) => (
                <div
                  key={item.team.id}
                  className={`relative min-w-0 rounded-[12px] border border-[#c6a35a]/30 px-3 py-1.5 text-left ${item.fill} ${
                    winnerSide === item.side ? `ring-2 ring-inset ${item.ring}` : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    {winnerSide === item.side ? (
                      <TrophyIcon className={`h-5 w-5 shrink-0 translate-y-px ${item.side === "home" ? "text-[#17533d]" : "text-[#6a4d90]"}`} />
                    ) : null}
                    <p className="truncate text-[0.66rem] font-bold leading-tight text-ink">{item.team.name}</p>
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <div>
                      <p className={`truncate text-[0.42rem] font-semibold uppercase tracking-[0.1em] ${item.accent}`}>
                        Points won
                      </p>
                      <p className="text-sm font-bold leading-tight text-ink">{formatPoints(item.team.totalPoints)}</p>
                    </div>
                    <div>
                      <p className={`truncate text-[0.42rem] font-semibold uppercase tracking-[0.1em] ${item.accent}`}>
                        Holes won
                      </p>
                      <p className="text-sm font-bold leading-tight text-ink">{item.team.holesWon}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayoffGraphicPreview({ recap }: { recap: AdminGraphicRecap }) {
  const winner = winningTeam(recap);
  const homeLines = teamDisplayLines(recap.homeTeam.name);
  const awayLines = teamDisplayLines(recap.awayTeam.name);

  return (
    <div className="mx-auto aspect-square w-full max-w-[620px] overflow-hidden bg-[#063322] p-[2.4%] shadow-[0_18px_48px_rgba(17,32,23,0.12)]">
      <div className="flex h-full flex-col border border-[#a77b28] bg-[#f7f0df] px-[6.2%] py-[3.2%] text-center text-[#102017]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_SRC} alt="" className="mx-auto h-[24%] w-[38%] object-contain" />
        <div className="mt-2 flex items-center justify-center gap-4 text-[1.25rem] font-bold uppercase tracking-[0.22em] text-[#a77b28]">
          <span className="h-px w-9 bg-[#a77b28]" />
          <span>Match Recap</span>
          <span className="h-px w-9 bg-[#a77b28]" />
        </div>
        <div className="mt-[7%] grid grid-cols-[1fr_auto_1fr] items-center gap-5">
          <div className="font-serif text-[2.1rem] font-black uppercase leading-[0.92]">
            {homeLines.slice(0, 2).map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </div>
          <div className="grid h-16 w-16 place-items-center rounded-full border border-[#a77b28] font-serif text-2xl font-black text-[#a77b28]">
            VS
          </div>
          <div className="font-serif text-[2.1rem] font-black uppercase leading-[0.92]">
            {awayLines.slice(0, 2).map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-[6%] h-px bg-[#a77b28]" />
        <p className="mt-[4%] truncate text-[1.55rem] font-black uppercase tracking-[0.08em]">{winner.name}</p>
        <p className="mt-3 font-serif text-[4.6rem] font-black uppercase leading-none">{playoffResultHeadline(recap)}</p>
        <div className="mt-auto h-px bg-[#a77b28]" />
        <div className="grid grid-cols-3 divide-x divide-[#a77b28] pt-5 text-[0.74rem] font-black uppercase tracking-[0.06em]">
          <div className="px-2">
            <p className="truncate">{recap.courseName}</p>
            <p className="mt-1 font-medium">{recap.courseMeta ?? ""}</p>
          </div>
          <p className="px-2">{formatFullDate(recap.playedOn)}</p>
          <p className="px-2">{stageLabel(recap.stage)}</p>
        </div>
      </div>
    </div>
  );
}

export function AdminInstagramGraphicGenerator({ recaps }: AdminInstagramGraphicGeneratorProps) {
  const [selectedId, setSelectedId] = useState(recaps[0]?.id ?? "");
  const [textVariant, setTextVariant] = useState<GraphicTextVariant>("standard");
  const [graphicMode, setGraphicMode] = useState<GraphicMode>(recaps[0] && isPlayoffRecap(recaps[0]) ? "playoff" : "scorecard");
  const [previewUrl, setPreviewUrl] = useState("");
  const selectedRecap = recaps.find((recap) => recap.id === selectedId) ?? recaps[0] ?? null;
  const selectedIsPlayoff = selectedRecap ? isPlayoffRecap(selectedRecap) : false;

  useEffect(() => {
    let active = true;
    const frame = window.requestAnimationFrame(() => {
      void (async () => {
        if (!selectedRecap) {
          if (active) {
            setPreviewUrl("");
          }
          return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = 1080;
        canvas.height = 1080;
        const context = canvas.getContext("2d");

        if (!context) {
          return;
        }

        const logoImage = await loadLogoImage();
        if (!active) {
          return;
        }

        drawGraphic(context, selectedRecap, logoImage, textVariant, graphicMode);
        setPreviewUrl(canvas.toDataURL("image/png"));
      })();
    });

    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
    };
  }, [selectedRecap, textVariant, graphicMode]);

  if (!selectedRecap) {
    return (
      <div className="rounded-[24px] border border-dashed border-mist bg-sand px-4 py-6 text-sm leading-6 text-ink/72">
        Finalize a scorecard and it will appear here for recap graphic generation.
      </div>
    );
  }

  const downloadGraphicPngHref = graphicPngHref(selectedRecap.id, textVariant, graphicMode);
  const openGraphicPngHref = graphicPngHref(selectedRecap.id, textVariant, graphicMode, "inline");
  const graphicModeLabel = graphicMode === "playoff" ? "playoff match recap" : "scorecard recap";

  return (
    <div className="grid gap-4">
      <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-fairway/72">
        Match
        <select
          value={selectedRecap.id}
          onChange={(event) => {
            const nextId = event.target.value;
            const nextRecap = recaps.find((recap) => recap.id === nextId);

            setSelectedId(nextId);
            setGraphicMode(nextRecap && isPlayoffRecap(nextRecap) ? "playoff" : "scorecard");
          }}
          className="rounded-2xl border border-mist bg-white px-4 py-3 text-base font-semibold normal-case tracking-normal text-ink"
        >
          {recaps.map((recap) => (
            <option key={recap.id} value={recap.id}>
              {recap.homeTeam.name} vs {recap.awayTeam.name} / {recap.roundLabel}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-fairway/72">
        Mode
        <div className="grid grid-cols-2 rounded-full border border-mist bg-white p-1 text-sm font-semibold normal-case tracking-normal">
          {[
            { key: "scorecard" as const, label: "Scorecard", disabled: selectedIsPlayoff },
            { key: "playoff" as const, label: "Playoff", disabled: !selectedIsPlayoff }
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              disabled={item.disabled}
              onClick={() => setGraphicMode(item.key)}
              className={`rounded-full px-4 py-2 transition disabled:cursor-not-allowed disabled:opacity-45 ${
                graphicMode === item.key ? "bg-pine text-white shadow-sm" : "text-ink/68 hover:bg-sand"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-fairway/72">
        Version
        <div className="grid grid-cols-2 rounded-full border border-mist bg-white p-1 text-sm font-semibold normal-case tracking-normal">
          {[
            { key: "standard" as const, label: "Standard" },
            { key: "thin" as const, label: "Thin text" }
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTextVariant(item.key)}
              className={`rounded-full px-4 py-2 transition ${
                textVariant === item.key ? "bg-pine text-white shadow-sm" : "text-ink/68 hover:bg-sand"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Instagram graphic preview"
          className="mx-auto aspect-square w-full max-w-[620px] rounded-[30px] shadow-[0_18px_48px_rgba(17,32,23,0.12)]"
        />
      ) : graphicMode === "playoff" ? (
        <PlayoffGraphicPreview recap={selectedRecap} />
      ) : (
        <ScorecardGraphicPreview recap={selectedRecap} />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <a
          href={downloadGraphicPngHref}
          download={downloadFilename(selectedRecap, textVariant, graphicMode)}
          className="rounded-full bg-pine px-4 py-2.5 text-sm font-semibold text-white"
        >
          Download PNG
        </a>
        <a
          href={openGraphicPngHref}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-mist bg-white px-4 py-2.5 text-sm font-semibold text-ink"
        >
          Open PNG
        </a>
        <p className="text-xs leading-5 text-ink/58">
          Downloads the selected server-rendered 1080 x 1080 {graphicModeLabel}. Use Open PNG if your browser blocks downloads.
        </p>
      </div>
    </div>
  );
}
