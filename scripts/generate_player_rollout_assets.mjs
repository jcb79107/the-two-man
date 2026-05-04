import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const outDir = path.join(root, "release-assets", "player-rollout");
const logoPath = path.join(root, "public", "two-man-logo.png");

const palette = {
  pine: "#0f4634",
  fairway: "#2b7355",
  ink: "#112017",
  sand: "#f4ead6",
  paper: "#fffaf2",
  gold: "#d8c07d",
  mist: "#d8e3dc",
  purple: "#634aa0",
  cream: "#f8f1df",
  white: "#ffffff"
};

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function rect(x, y, width, height, fill, radius = 0, extra = "") {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" ${extra}/>`;
}

function text(value, x, y, size, fill = palette.ink, weight = 600, extra = "") {
  return `<text x="${x}" y="${y}" font-family="Inter, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" ${extra}>${esc(value)}</text>`;
}

function multiline(lines, x, y, size, fill = palette.ink, weight = 500, lineHeight = 1.34, extra = "") {
  return lines
    .map((line, index) => text(line, x, y + index * size * lineHeight, size, fill, weight, extra))
    .join("");
}

function pill(label, x, y, width, fill = palette.sand, color = palette.ink) {
  return `
    ${rect(x, y, width, 44, fill, 22, `stroke="${palette.mist}" stroke-width="2"`)}
    ${text(label, x + width / 2, y + 28, 17, color, 700, 'text-anchor="middle"')}
  `;
}

function phoneFrame(screenMarkup) {
  const x = 144;
  const y = 690;
  const width = 1002;
  const height = 1920;
  const inset = 42;
  return `
    <g filter="url(#phoneShadow)">
      ${rect(x, y, width, height, "#121916", 88)}
      ${rect(x + 18, y + 18, width - 36, height - 36, palette.paper, 72)}
      ${rect(x + inset, y + inset, width - inset * 2, height - inset * 2, "#f5efdf", 52)}
      <clipPath id="screenClip">
        <rect x="${x + inset}" y="${y + inset}" width="${width - inset * 2}" height="${height - inset * 2}" rx="52"/>
      </clipPath>
      <g clip-path="url(#screenClip)">
        ${screenMarkup(x + inset, y + inset, width - inset * 2, height - inset * 2)}
      </g>
    </g>
  `;
}

function appTopBar(x, y, width) {
  return `
    ${rect(x, y, width, 138, "#edf2e5", 0)}
    <image href="${logoDataUri}" x="${x + 34}" y="${y + 28}" width="82" height="82" preserveAspectRatio="xMidYMid meet"/>
    ${text("The Two Man", x + 136, y + 66, 34, palette.pine, 800)}
    ${text("2026 SEASON", x + 136, y + 106, 20, palette.ink, 700, 'letter-spacing="9"')}
    ${pill("Rules", x + width - 160, y + 42, 112, "#edf2e5", palette.ink)}
  `;
}

function bottomNav(x, y, width, active = "Home") {
  const labels = ["Home", "Standings", "Bracket"];
  const gap = 18;
  const itemW = (width - 88 - gap * 2) / 3;
  return `
    ${rect(x, y + 1680, width, 142, "rgba(255,255,255,0.95)", 0)}
    ${labels.map((label, index) => {
      const left = x + 44 + index * (itemW + gap);
      const isActive = label === active;
      return `
        ${rect(left, y + 1708, itemW, 88, isActive ? palette.pine : "#f4ead6", 38)}
        ${text(label, left + itemW / 2, y + 1763, 28, isActive ? palette.white : "#5b5a51", 700, 'text-anchor="middle"')}
      `;
    }).join("")}
  `;
}

function homeScreen(x, y, width, height) {
  return `
    ${rect(x, y, width, height, "#f4ead6")}
    ${appTopBar(x, y, width)}
    ${rect(x + 38, y + 188, width - 76, 620, "#f9edc1", 58, `stroke="${palette.gold}" stroke-width="3"`)}
    <image href="${logoDataUri}" x="${x + 220}" y="${y + 225}" width="480" height="360" preserveAspectRatio="xMidYMid meet"/>
    ${rect(x + 38, y + 860, width - 76, 246, "#ffffff", 38, `stroke="${palette.mist}" stroke-width="2"`)}
    ${text("NEED A RULING?", x + 76, y + 918, 25, "#6fa08b", 800, 'letter-spacing="10"')}
    ${rect(x + 76, y + 968, width - 152, 92, palette.pine, 38)}
    ${text("Launch rules judge", x + 182, y + 1026, 29, palette.white, 800)}
    ${text("OPEN", x + width - 172, y + 1026, 22, palette.white, 800, 'letter-spacing="6"')}
    ${rect(x + 38, y + 1160, width - 76, 520, palette.white, 42)}
    ${text("Live feed", x + 78, y + 1230, 39, palette.ink, 800)}
    ${feedItem("FIELD SET", "Championship Bracket set", "Barron & Loewenstein leads the eight-team knockout field.", x + 78, y + 1295, width - 156)}
    ${feedItem("FINAL", "Quarterfinal result posted", "Public standings and bracket updated automatically.", x + 78, y + 1518, width - 156)}
    ${bottomNav(x, y, width, "Home")}
  `;
}

function feedItem(kicker, title, body, x, y, width) {
  return `
    ${rect(x, y, width, 178, "#fbfefa", 30, `stroke="${palette.mist}" stroke-width="2"`)}
    ${rect(x + 34, y + 34, 86, 86, "#6b4ab0", 24)}
    ${pill(kicker, x + 156, y + 34, 188, "#eee7f8", palette.purple)}
    ${text(title, x + 156, y + 102, 28, palette.ink, 800)}
    ${text(body, x + 156, y + 145, 21, "#4f5b52", 500)}
  `;
}

function standingsScreen(x, y, width, height) {
  return `
    ${rect(x, y, width, height, "#f4ead6")}
    ${appTopBar(x, y, width)}
    ${rect(x + 38, y + 178, width - 76, 380, palette.white, 46)}
    ${text("The Two Man standings", x + 78, y + 260, 39, palette.ink, 800)}
    ${multiline(["Pods sorted by record, hole points,", "holes won, then net better-ball."], x + 78, y + 338, 28, palette.ink, 500)}
    ${pill("Pods", x + 78, y + 458, 180, "#f4ead6", palette.ink)}
    ${pill("Playoff", x + 284, y + 458, 220, "#f4ead6", palette.ink)}
    ${pill("Teams", x + 530, y + 458, 180, palette.pine, palette.white)}
    ${rect(x + 38, y + 620, width - 76, 1050, palette.white, 44)}
    ${text("All teams", x + 78, y + 695, 38, palette.ink, 800)}
    ${legend(x + 78, y + 744)}
    ${tableHeader(x + 78, y + 890, width - 156, ["Team", "Pod"])}
    ${teamRow("Baer & Cadden", "Pod 1", "Y", x + 78, y + 968, width - 156)}
    ${teamRow("Barron & Loewenstein", "Pod 5", "Y", x + 78, y + 1082, width - 156)}
    ${teamRow("Levin & Sutker", "Pod 3", "Y", x + 78, y + 1196, width - 156)}
    ${teamRow("Malkin & Jolcover", "Pod 4", "X", x + 78, y + 1310, width - 156)}
    ${teamRow("Stone & Stone", "Pod 6", "PB", x + 78, y + 1424, width - 156)}
    ${bottomNav(x, y, width, "Standings")}
  `;
}

function legend(x, y) {
  return `
    ${pill("Y CLINCHED POD", x, y, 300, "#e4f3ec", palette.fairway)}
    ${pill("X CLINCHED WILD CARD", x, y + 58, 410, "#e4f3ec", palette.fairway)}
    ${pill("PB PROJECTED", x + 430, y + 58, 250, "#eee7f8", palette.purple)}
    ${pill("E ELIMINATED", x, y + 116, 250, "#f7e4dd", "#a25d4e")}
  `;
}

function tableHeader(x, y, width, cols) {
  return `
    ${rect(x, y, width, 78, "#f3e6cf", 0)}
    ${text(cols[0], x + 34, y + 50, 23, "#5c8a72", 800, 'letter-spacing="6"')}
    ${text(cols[1], x + width - 96, y + 50, 23, "#5c8a72", 800, 'letter-spacing="6"')}
  `;
}

function teamRow(team, pod, mark, x, y, width) {
  return `
    ${rect(x, y, width, 114, "#ffffff", 0, `stroke="${palette.mist}" stroke-width="2"`)}
    ${rect(x + 34, y + 28, 76, 54, mark === "PB" ? "#eee7f8" : "#e4f3ec", 27)}
    ${text(mark, x + 72, y + 63, 21, mark === "PB" ? palette.purple : palette.fairway, 800, 'text-anchor="middle"')}
    ${text(team, x + 140, y + 67, 30, palette.ink, 700)}
    ${text(pod, x + width - 40, y + 67, 29, palette.ink, 500, 'text-anchor="end"')}
  `;
}

function bracketScreen(x, y, width, height) {
  return `
    ${rect(x, y, width, height, "#f4ead6")}
    ${appTopBar(x, y, width)}
    ${rect(x + 38, y + 178, width - 76, 1450, palette.white, 46)}
    ${text("Championship Bracket", x + 78, y + 258, 39, palette.ink, 800)}
    ${roundCard("ROUND 1", "Quarterfinals", "4 matchups", true, x + 78, y + 315, 330)}
    ${roundCard("ROUND 2", "Semifinals", "2 matchups", false, x + 426, y + 315, 330)}
    ${roundCard("ROUND 3", "Championship", "1 match", false, x + 774, y + 315, 330)}
    ${rect(x + 78, y + 520, width - 156, 146, "#fffaf2", 30, `stroke="${palette.gold}" stroke-width="3"`)}
    ${text("QUARTERFINAL", x + 118, y + 575, 24, palette.ink, 800, 'letter-spacing="7"')}
    ${text("ADVANCED", x + width - 118, y + 575, 24, palette.ink, 800, 'text-anchor="end" letter-spacing="7"')}
    ${text("Quarterfinals", x + 118, y + 635, 38, palette.ink, 800)}
    ${text("4/4", x + width - 118, y + 635, 42, palette.ink, 800, 'text-anchor="end"')}
    ${matchup("FINAL", "Baer & Cadden", "Agins & Deutsch", x + 78, y + 710, width - 156)}
    ${matchup("FINAL", "Barron & Loewenstein", "Holway & Chase", x + 78, y + 950, width - 156)}
    ${matchup("FINAL", "Levin & Sutker", "Grant & Rausch", x + 78, y + 1190, width - 156)}
    ${matchup("FINAL", "Malkin & Jolcover", "Stone & Stone", x + 78, y + 1430, width - 156)}
    ${bottomNav(x, y, width, "Bracket")}
  `;
}

function roundCard(kicker, label, sub, active, x, y, width) {
  return `
    ${rect(x, y, width, 150, active ? palette.pine : palette.white, 32, `stroke="${palette.gold}" stroke-width="3"`)}
    ${text(kicker, x + 34, y + 53, 23, active ? palette.white : "#6fa08b", 800, 'letter-spacing="7"')}
    ${text(label, x + 34, y + 98, 30, active ? palette.white : palette.ink, 800)}
    ${text(sub, x + 34, y + 132, 23, active ? "#ffffffcc" : "#4f5b52", 500)}
  `;
}

function matchup(status, teamA, teamB, x, y, width) {
  return `
    ${rect(x, y, width, 200, "#ffffff", 32, `stroke="${palette.gold}" stroke-width="2"`)}
    ${text("MATCH", x + 34, y + 54, 23, palette.ink, 800, 'letter-spacing="7"')}
    ${pill(status, x + width - 160, y + 30, 118, "#e4f3ec", palette.fairway)}
    ${text(teamA, x + 34, y + 112, 32, palette.ink, 800)}
    ${text(teamB, x + 34, y + 158, 32, palette.ink, 500)}
  `;
}

function setupScreen(x, y, width, height) {
  return `
    ${rect(x, y, width, height, "#f4ead6")}
    ${appTopBar(x, y, width)}
    ${rect(x + 38, y + 178, width - 76, 1450, palette.white, 46)}
    ${text("Private match link", x + 78, y + 258, 39, palette.ink, 800)}
    ${multiline(["Confirm indexes, course, and tees", "before anyone starts scoring."], x + 78, y + 318, 27, palette.ink, 500)}
    ${rect(x + 78, y + 430, width - 156, 148, palette.pine, 30)}
    ${text("Baer & Cadden vs Agins & Deutsch", x + 118, y + 492, 32, palette.white, 800)}
    ${text("Pod 1 Match 2", x + 118, y + 538, 24, "#ffffffb8", 500)}
    ${playerSetup("Baer", "7.1", "Blue tees", x + 78, y + 640, width - 156)}
    ${playerSetup("Cadden", "12.8", "Blue tees", x + 78, y + 792, width - 156)}
    ${playerSetup("Agins", "9.4", "White tees", x + 78, y + 944, width - 156)}
    ${playerSetup("Deutsch", "14.2", "White tees", x + 78, y + 1096, width - 156)}
    ${rect(x + 78, y + 1280, width - 156, 98, palette.pine, 42)}
    ${text("Confirm setup and open scorecard", x + width / 2, y + 1342, 28, palette.white, 800, 'text-anchor="middle"')}
    ${bottomNav(x, y, width, "Home")}
  `;
}

function playerSetup(name, index, tee, x, y, width) {
  return `
    ${rect(x, y, width, 120, "#fbfefa", 28, `stroke="${palette.mist}" stroke-width="2"`)}
    ${text(name, x + 32, y + 48, 28, palette.ink, 800)}
    ${text("Handicap Index", x + 32, y + 88, 19, "#6b766e", 500)}
    ${text(index, x + width - 260, y + 70, 32, palette.pine, 800)}
    ${text(tee, x + width - 34, y + 70, 25, palette.ink, 600, 'text-anchor="end"')}
  `;
}

function scorecardScreen(x, y, width, height) {
  const cellW = 55;
  const startX = x + 330;
  const startY = y + 615;
  return `
    ${rect(x, y, width, height, "#f4ead6")}
    ${appTopBar(x, y, width)}
    ${rect(x + 38, y + 178, width - 76, 1450, "#f7efd8", 46, `stroke="${palette.gold}" stroke-width="3"`)}
    ${rect(x + 38, y + 178, width - 76, 190, "#6b6760", 46)}
    ${text("POD PLAY", x + 78, y + 245, 23, "#ffffffb0", 800, 'letter-spacing="8"')}
    ${text("Baer & Cadden vs Agins & Deutsch", x + 78, y + 300, 34, palette.white, 800)}
    ${text("9/18 holes filled", x + 78, y + 342, 24, "#ffffffcc", 500)}
    ${rect(x + 78, y + 420, width - 156, 130, "#edf5ef", 28, `stroke="${palette.mist}" stroke-width="2"`)}
    ${text("BAER & CADDEN", x + 118, y + 474, 23, palette.pine, 800, 'letter-spacing="6"')}
    ${text("TEAM NET", x + width - 118, y + 474, 23, "#6b766e", 500, 'text-anchor="end" letter-spacing="6"')}
    ${text("+2", x + width - 118, y + 535, 54, palette.ink, 800, 'text-anchor="end"')}
    ${rect(x + 78, y + 590, width - 156, 620, palette.white, 28, `stroke="${palette.gold}" stroke-width="3"`)}
    ${rect(x + 78, y + 590, width - 156, 70, "#7a766f", 24)}
    ${text("Hole", x + 104, y + 636, 21, palette.white, 800)}
    ${[1,2,3,4,5,6,7,8,9].map((n, i) => text(String(n), startX + i * cellW, y + 636, 24, palette.white, 800, 'text-anchor="middle"')).join("")}
    ${metaRow("HCP", [9,11,5,15,7,13,1,17,3], x + 78, startY + 64, width - 156)}
    ${metaRow("Yards", [412,377,399,221,386,336,515,162,431], x + 78, startY + 128, width - 156, 20)}
    ${metaRow("Par", [4,4,4,3,4,4,5,3,4], x + 78, startY + 192, width - 156)}
    ${scoreRow("Baer", [3,5,3,4,3,5,4,4,3], x + 78, startY + 256, width - 156)}
    ${scoreRow("Cadden", [5,3,5,2,5,3,6,2,5], x + 78, startY + 350, width - 156)}
    ${netRow("BC best ball", [3,3,3,2,3,3,4,2,3], x + 78, startY + 444, width - 156)}
    ${rect(x + 78, y + 1194, width - 156, 96, palette.pine, 42)}
    ${text("Submit official scorecard", x + width / 2, y + 1255, 29, palette.white, 800, 'text-anchor="middle"')}
    ${bottomNav(x, y, width, "Home")}
  `;
}

function scoreRow(name, scores, x, y, width) {
  const startX = x + 252;
  const cellW = 55;
  return `
    ${rect(x, y, width, 92, "#ffffff", 0, `stroke="${palette.mist}" stroke-width="1"`)}
    ${text(name, x + 24, y + 38, 25, palette.ink, 800)}
    ${text("Gross", x + 24, y + 70, 18, "#6b766e", 500)}
    ${scores.map((score, i) => text(String(score), startX + i * cellW, y + 58, 27, palette.ink, 800, 'text-anchor="middle"')).join("")}
  `;
}

function netRow(name, scores, x, y, width) {
  const startX = x + 252;
  const cellW = 55;
  return `
    ${rect(x, y, width, 92, "#80a9b5", 0)}
    ${text(name, x + 24, y + 38, 24, palette.white, 800)}
    ${text("Team net used", x + 24, y + 70, 16, "#ffffffd8", 700, 'letter-spacing="3"')}
    ${scores.map((score, i) => text(String(score), startX + i * cellW, y + 58, 27, "#11414b", 800, 'text-anchor="middle"')).join("")}
  `;
}

function metaRow(label, values, x, y, width, size = 23) {
  const startX = x + 252;
  const cellW = 55;
  return `
    ${rect(x, y, width, 62, "#fffaf2", 0, `stroke="${palette.mist}" stroke-width="1"`)}
    ${text(label, x + 24, y + 40, 22, palette.ink, 800)}
    ${values.map((value, i) => text(String(value), startX + i * cellW, y + 40, size, "#59645d", 800, 'text-anchor="middle"')).join("")}
  `;
}

function screenshotSvg({ headline, subhead, screen }) {
  const width = 1290;
  const height = 2796;
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="phoneShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="42" stdDeviation="34" flood-color="#112017" flood-opacity="0.22"/>
        </filter>
      </defs>
      ${rect(0, 0, width, height, "#efe6d3")}
      <circle cx="150" cy="180" r="260" fill="#f8f1df" opacity="0.8"/>
      <circle cx="1180" cy="420" r="360" fill="#dce9df" opacity="0.75"/>
      <image href="${logoDataUri}" x="96" y="92" width="118" height="118" preserveAspectRatio="xMidYMid meet"/>
      ${text("THE TWO MAN", 238, 146, 29, palette.pine, 900, 'letter-spacing="8"')}
      ${text("PLAYER GUIDE", 238, 194, 22, palette.ink, 700, 'letter-spacing="10"')}
      ${multiline(headline, 96, 340, 78, palette.pine, 900, 1.05)}
      ${multiline(subhead, 100, 520, 34, palette.ink, 500, 1.28)}
      ${phoneFrame(screen)}
    </svg>
  `;
}

function gifPalette() {
  const values = [];

  for (let r = 0; r < 6; r += 1) {
    for (let g = 0; g < 6; g += 1) {
      for (let b = 0; b < 6; b += 1) {
        values.push([r * 51, g * 51, b * 51]);
      }
    }
  }

  while (values.length < 256) {
    const v = Math.round(((values.length - 216) / 39) * 255);
    values.push([v, v, v]);
  }

  return values.slice(0, 256);
}

function quantizeToCube(raw) {
  const indexed = Buffer.alloc(raw.length / 3);

  for (let source = 0, target = 0; source < raw.length; source += 3, target += 1) {
    const r = Math.round(raw[source] / 51);
    const g = Math.round(raw[source + 1] / 51);
    const b = Math.round(raw[source + 2] / 51);
    indexed[target] = r * 36 + g * 6 + b;
  }

  return indexed;
}

function writeU16(value) {
  return Buffer.from([value & 0xff, (value >> 8) & 0xff]);
}

function subBlocks(data) {
  const blocks = [];

  for (let index = 0; index < data.length; index += 255) {
    const chunk = data.subarray(index, index + 255);
    blocks.push(Buffer.from([chunk.length]), chunk);
  }

  blocks.push(Buffer.from([0]));
  return Buffer.concat(blocks);
}

function lzwEncode(indices) {
  const clearCode = 256;
  const endCode = 257;
  let nextCode = 258;
  let codeSize = 9;
  let dict = new Map();

  for (let index = 0; index < 256; index += 1) {
    dict.set(String.fromCharCode(index), index);
  }

  const output = [];

  function emit(code) {
    output.push({ code, size: codeSize });
    if (nextCode >= (1 << codeSize) && codeSize < 12) {
      codeSize += 1;
    }
  }

  output.push({ code: clearCode, size: codeSize });
  let phrase = String.fromCharCode(indices[0]);

  for (let index = 1; index < indices.length; index += 1) {
    const current = String.fromCharCode(indices[index]);
    const combined = phrase + current;

    if (dict.has(combined)) {
      phrase = combined;
    } else {
      emit(dict.get(phrase));

      if (nextCode < 4096) {
        dict.set(combined, nextCode);
        nextCode += 1;
      } else {
        emit(clearCode);
        dict = new Map();
        for (let reset = 0; reset < 256; reset += 1) {
          dict.set(String.fromCharCode(reset), reset);
        }
        nextCode = 258;
        codeSize = 9;
      }

      phrase = current;
    }
  }

  emit(dict.get(phrase));
  output.push({ code: endCode, size: codeSize });

  const bytes = [];
  let bitBuffer = 0;
  let bitCount = 0;

  for (const entry of output) {
    bitBuffer |= entry.code << bitCount;
    bitCount += entry.size;

    while (bitCount >= 8) {
      bytes.push(bitBuffer & 0xff);
      bitBuffer >>= 8;
      bitCount -= 8;
    }
  }

  if (bitCount > 0) {
    bytes.push(bitBuffer & 0xff);
  }

  return Buffer.from(bytes);
}

function makeGif(frames, width, height, delayCs) {
  const colors = gifPalette();
  const colorTable = Buffer.alloc(256 * 3);

  colors.forEach(([r, g, b], index) => {
    colorTable[index * 3] = r;
    colorTable[index * 3 + 1] = g;
    colorTable[index * 3 + 2] = b;
  });

  const chunks = [
    Buffer.from("GIF89a", "ascii"),
    writeU16(width),
    writeU16(height),
    Buffer.from([0xf7, 0, 0]),
    colorTable,
    Buffer.from([0x21, 0xff, 0x0b]),
    Buffer.from("NETSCAPE2.0", "ascii"),
    Buffer.from([0x03, 0x01, 0x00, 0x00, 0x00])
  ];

  for (const indexed of frames) {
    const encoded = lzwEncode(indexed);
    chunks.push(
      Buffer.from([0x21, 0xf9, 0x04, 0x08]),
      writeU16(delayCs),
      Buffer.from([0x00, 0x00]),
      Buffer.from([0x2c]),
      writeU16(0),
      writeU16(0),
      writeU16(width),
      writeU16(height),
      Buffer.from([0x00]),
      Buffer.from([0x08]),
      subBlocks(encoded)
    );
  }

  chunks.push(Buffer.from([0x3b]));
  return Buffer.concat(chunks);
}

async function renderPng(fileName, config) {
  const svg = screenshotSvg(config);
  await sharp(Buffer.from(svg)).png().toFile(path.join(outDir, fileName));
}

function videoSvg({ headline, subhead, screen }) {
  return screenshotSvg({ headline, subhead, screen })
    .replace('width="1290" height="2796" viewBox="0 0 1290 2796"', 'width="720" height="1280" viewBox="0 0 1290 2796"');
}

async function renderGifFrame(config) {
  const raw = await sharp(Buffer.from(videoSvg(config)))
    .resize(720, 1280)
    .removeAlpha()
    .raw()
    .toBuffer();

  return quantizeToCube(raw);
}

const logoBuffer = await fs.readFile(logoPath);
const logoDataUri = `data:image/png;base64,${logoBuffer.toString("base64")}`;

const assets = [
  {
    fileName: "01-season-hub.png",
    headline: ["Your tournament", "hub in one tap."],
    subhead: ["See rules, live updates, standings,", "and bracket movement from your phone."],
    screen: homeScreen
  },
  {
    fileName: "02-standings.png",
    headline: ["Know the", "playoff race."],
    subhead: ["Check pods, wild cards, and the", "full field without chasing a group chat."],
    screen: standingsScreen
  },
  {
    fileName: "03-bracket.png",
    headline: ["Swipe the", "knockout board."],
    subhead: ["Follow quarterfinals, semifinals,", "and the title match round by round."],
    screen: bracketScreen
  },
  {
    fileName: "04-private-match-link.png",
    headline: ["One private link", "for every match."],
    subhead: ["Confirm indexes, course, and tees", "before the official card opens."],
    screen: setupScreen
  },
  {
    fileName: "05-scorecard.png",
    headline: ["Post the card", "with confidence."],
    subhead: ["Enter gross scores, see net best ball,", "then submit the official result."],
    screen: scorecardScreen
  }
];

await fs.mkdir(outDir, { recursive: true });

for (const asset of assets) {
  await renderPng(asset.fileName, asset);
}

const gifFrames = [];
for (const asset of assets) {
  gifFrames.push(await renderGifFrame(asset));
}
gifFrames.push(await renderGifFrame(assets[0]));

await fs.writeFile(path.join(outDir, "the-two-man-player-demo.gif"), makeGif(gifFrames, 720, 1280, 130));

await fs.writeFile(
  path.join(outDir, "README.md"),
  [
    "# The Two Man Player Rollout Assets",
    "",
    "Player-facing release assets for tournament rollout. No admin surfaces are shown.",
    "",
    "## Screenshots",
    "",
    ...assets.map((asset) => `- ${asset.fileName}`),
    "",
    "## Animated demo",
    "",
    "- the-two-man-player-demo.gif",
    "",
    "The animated demo is a lightweight video-style GIF because this environment does not have MP4 tooling installed.",
    "",
    "## Suggested rollout copy",
    "",
    "1. Start at the Season Hub to see rules, standings, bracket movement, and tournament updates.",
    "2. Use your private match link to confirm handicap indexes, course, and tees before play.",
    "3. Enter gross scores only. The app applies strokes and calculates net best ball.",
    "4. Submit one official scorecard per match, then the public standings and bracket update.",
    ""
  ].join("\n")
);

console.log(`Generated ${assets.length} screenshots and 1 animated demo in ${outDir}`);
