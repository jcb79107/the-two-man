import { type Match, nameOf, teams, pars } from "./data";
import { qualified, result, standings } from "./domain";
import { bracketMatches } from "./bracket-model";
import { publication } from "./publication";
import type { HistoricalGame } from "./history-data";
export type GraphicKind = "result" | "scorecard" | "standings" | "bracket";
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export function graphicSvg(
  matches: Match[],
  kind: GraphicKind,
  matchId: string,
  games: HistoricalGame[] = publication.games,
  seedIds: string[] = publication.seeds,
) {
  const text = (
    s: string,
    x: number,
    y: number,
    size = 28,
    fill = "#182d26",
    weight = 400,
  ) =>
    `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}">${escape(s)}</text>`;
  const line = (y: number) => `<path d="M64 ${y}H1016" stroke="#c5cec2"/>`;
  let body = "";
  let subtitle = "";
  const playoff = games.find((g) => g.id === matchId);
  if (kind === "result" && playoff) {
    subtitle = playoff.round;
    body = `<rect x="0" y="360" width="1080" height="600" fill="#073e2f"/>`;
    body += text(nameOf(playoff.winner!), 64, 465, 52, "#f6f4eb", 700);
    body += text(playoff.score, 64, 650, 130, "#dce8b3", 700);
    body += text(
      `defeated ${nameOf(playoff.winner === playoff.a ? playoff.b : playoff.a)}`,
      64,
      760,
      36,
      "#f6f4eb",
    );
    body += text(
      playoff.next ? "ADVANCES" : "CHAMPIONS",
      64,
      870,
      48,
      "#f6f4eb",
      700,
    );
    body += text(playoff.course.slice(0, 45), 64, 1060, 28);
    body += text(playoff.date, 64, 1110, 28);
  } else if (kind === "scorecard") {
    const m = matches.find((m) => m.id === matchId && m.status === "official");
    if (!m)
      throw new Error(
        "A full published regular-season card is required. Playoffs use a result graphic.",
      );
    const r = result(m);
    subtitle = `Pod ${m.pod} · ${nameOf(m.a)} vs ${nameOf(m.b)}`;
    const names = [
      ...teams.find((t) => t.id === m.a)!.names,
      ...teams.find((t) => t.id === m.b)!.names,
    ];
    body += text(
      names.map((n, i) => `P${i + 1}: ${n}`).join("    "),
      64,
      378,
      24,
    );
    body += text(
      "Gross scores · • = one stroke · A/B = team best net",
      64,
      418,
      24,
    );
    const xs = [64, 145, 250, 360, 470, 580, 760, 925];
    ["Hole", "Par", "P1", "P2", "P3", "P4", "A", "B"].forEach(
      (v, i) => (body += text(v, xs[i], 468, 24, "#073e2f", 700)),
    );
    for (let h = 0; h < 18; h++) {
      const y = 508 + h * 31;
      const cells = [
        String(h + 1),
        String((m.pars ?? pars)[h]),
        ...m.scores.map((row, p) => `${row[h]}${m.strokes[p][h] ? "•" : ""}`),
        String(r.a[h]),
        String(r.b[h]),
      ];
      cells.forEach((v, i) => (body += text(v, xs[i], y, 24)));
      body += line(y + 10);
    }
    body += text(
      `Hole points: ${r.aPoints} – ${r.bPoints}`,
      64,
      1120,
      34,
      "#073e2f",
      700,
    );
    body += text(m.course.slice(0, 45), 64, 1170, 24);
    body += text(m.date.slice(0, 10), 64, 1208, 22);
  } else if (kind === "result") {
    const m = matches.find((m) => m.id === matchId && m.status === "official");
    if (!m) throw new Error("Choose a published result to make a graphic.");
    const r = result(m);
    subtitle = `Pod ${m.pod} · Regular season`;
    body = `<rect x="0" y="340" width="1080" height="650" fill="#073e2f"/>`;
    body += text(nameOf(m.a), 64, 440, 46, "#f6f4eb", 700);
    body += text(`${r.aPoints}`, 64, 590, 132, "#dce8b3", 700);
    body += text(nameOf(m.b), 64, 720, 46, "#f6f4eb", 700);
    body += text(`${r.bPoints}`, 64, 870, 132, "#dce8b3", 700);
    body += text("Hole points · 18 holes", 64, 944, 26, "#f6f4eb");
    body += text(
      r.winner ? `${nameOf(r.winner)} win` : "Match tied",
      64,
      1072,
      40,
      "#073e2f",
      700,
    );
    // Keep user-entered course labels inside the 64px margins. A conservative
    // character limit fits even wide glyphs at 28px; retain the full accessible title.
    const course = Array.from(m.course);
    const label =
      course.length > 32 ? course.slice(0, 31).join("") + "…" : m.course;
    body += `<g><title>${escape(m.course)}</title>${text(label, 64, 1130, 28)}</g>`;
    body += text(
      new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "America/Chicago",
      }).format(
        new Date(m.date.length === 10 ? `${m.date}T12:00:00Z` : m.date),
      ),
      64,
      1172,
      26,
    );
  } else if (kind === "standings") {
    subtitle = `${matches.filter((m) => m.status === "official").length} of ${matches.length} matches completed`;
    body =
      text("TEAM", 64, 370, 22) +
      text("W–L–T", 660, 370, 22) +
      text("HOLE PTS", 850, 370, 22) +
      line(392);
    standings(matches).forEach((r, i) => {
      const y = 430 + i * 43;
      body +=
        text(String(i + 1), 64, y, 24) +
        text(nameOf(r.team.id), 122, y, 28, "#182d26", 600) +
        text(`${r.won}–${r.lost}–${r.tied}`, 660, y, 26) +
        text(r.points.toFixed(1), 890, y, 28, "#073e2f", 700) +
        line(y + 15);
    });
  } else {
    const seeds = qualified(matches);
    subtitle =
      seedIds.length || seeds.length
        ? "Confirmed field · Playoffs"
        : "Seeds pending · Playoffs";
    const nodes = bracketMatches(
      seedIds.length ? seedIds : seeds.map((r) => r.team.id),
      games,
    );
    const positions = [
      [64, 400],
      [64, 600],
      [64, 800],
      [64, 1000],
      [400, 500],
      [400, 900],
      [736, 700],
    ];
    body =
      text("QUARTERFINALS", 64, 360, 22) +
      text("SEMIFINALS", 400, 360, 22) +
      text("FINAL", 736, 360, 22);
    nodes.forEach((n, i) => {
      const [x, y] = positions[i];
      if (n.next) {
        const j = nodes.findIndex((v) => v.id === n.next);
        const [nx, ny] = positions[j];
        body += `<path d="M${x + 280} ${y + 65}H${x + 308}V${ny + 65}H${nx}" fill="none" stroke="#073e2f" stroke-width="3"/>`;
      }
      body +=
        `<rect x="${x}" y="${y}" width="280" height="130" fill="#e8ede4" stroke="#c5cec2"/>` +
        text(n.label, x + 16, y + 28, 20, "#56665e", 600);
      n.slots.forEach((s, k) => {
        body += text(
          `${s.label}${s.id && s.id === n.winner ? " ✓" : ""}`,
          x + 16,
          y + 68 + k * 38,
          20,
          "#182d26",
          600,
        );
      });
    });
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><rect width="1080" height="1350" fill="#f6f4eb"/><g font-family="Arial, Helvetica, sans-serif">${text("THE TWO-MAN", 64, 108, 52, "#073e2f", 900)}${text("SEASON 02 / 2027", 64, 160, 24)}${line(202)}${text(kind === "result" ? "MATCH RESULT" : kind === "scorecard" ? "SCORECARD" : kind === "standings" ? "STANDINGS" : "THE BRACKET", 64, 282, 64, "#073e2f", 900)}${text(subtitle, 64, 322, 26)}${body}${line(1246)}${text("THE TWO-MAN", 64, 1300, 26, "#073e2f", 700)}${text("PREVIEW · SAMPLE DATA", 710, 1300, 22, "#56665e")}</g></svg>`;
}
