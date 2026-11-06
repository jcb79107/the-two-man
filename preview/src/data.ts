export type MatchStatus =
  | "official"
  | "review"
  | "scheduled"
  | "unbooked"
  | "correction";
export type Team = {
  id: string;
  names: [string, string];
  pod: string;
  seed: number;
  color: string;
};
export type Match = {
  id: string;
  a: string;
  b: string;
  pod: string;
  status: MatchStatus;
  course: string;
  tees: string;
  date: string;
  lockedAt: string | null;
  scores: number[][];
  strokes: number[][];
  evidence: boolean;
  note: string;
};
export const PREVIEW_NOW = "2027-06-24T12:00:00-05:00";
export const pods = ["A", "B", "C", "D", "E", "F"];
const pairs: [string, string][] = [
  ["Bennett", "Reed"],
  ["Sullivan", "Brooks"],
  ["Hayes", "Walker"],
  ["Carter", "Ellis"],
  ["Morgan", "Wells"],
  ["Parker", "Shaw"],
  ["Collins", "Price"],
  ["Foster", "Lane"],
  ["Harrison", "Blake"],
  ["Miller", "Grant"],
  ["Turner", "Reese"],
  ["Cooper", "Miles"],
  ["Anderson", "Cole"],
  ["Mitchell", "Stone"],
  ["Davis", "Hart"],
  ["Campbell", "Ford"],
  ["Mason", "Banks"],
  ["Palmer", "West"],
];
export const teams: Team[] = pairs.map((names, i) => ({
  id: `t${i + 1}`,
  names,
  pod: pods[Math.floor(i / 3)],
  seed: i + 1,
  color: ["pine", "clay", "blue"][i % 3],
}));
export const nameOf = (id: string) =>
  teams.find((t) => t.id === id)?.names.join(" & ") ?? "To be decided";
export const initials = (id: string) =>
  teams
    .find((t) => t.id === id)
    ?.names.map((n) => n[0])
    .join("") ?? "TM";
export const pars = [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];
export const strokeIndex = [
  5, 13, 17, 1, 7, 11, 15, 3, 9, 6, 18, 2, 12, 8, 16, 14, 4, 10,
];
// Fictional, explicitly supplied per-hole strokes. No GHIN/course-handicap calculation.
export const agreedStrokes = [
  strokeIndex.map((n) => (n <= 4 ? 1 : 0)),
  strokeIndex.map((n) => (n <= 8 ? 1 : 0)),
  strokeIndex.map((n) => (n <= 6 ? 1 : 0)),
  strokeIndex.map((n) => (n <= 10 ? 1 : 0)),
];
const scoreRows = (variant: number) =>
  [0, 1, 2, 3].map((p) =>
    pars.map(
      (par, h) =>
        par +
        ((h + p + variant) % 4 === 0 ? 1 : 0) +
        agreedStrokes[p][h] +
        (p > 1 && h % 5 === variant % 5 ? 1 : 0),
    ),
  );
export const matches: Match[] = pods.flatMap((pod, i) => {
  const ts = teams.filter((t) => t.pod === pod);
  return [
    [0, 1],
    [0, 2],
    [1, 2],
  ].map(([a, b], j) => ({
    id: `m${i * 3 + j + 1}`,
    a: ts[a].id,
    b: ts[b].id,
    pod,
    status: (i === 0 && j === 0
      ? "review"
      : i === 0 && j === 2
        ? "scheduled"
        : i === 4 && j === 2
          ? "unbooked"
          : "official") as MatchStatus,
    course: ["The Glen Club", "Harborside International", "Stonewall Orchard"][
      j
    ],
    tees: "Blue tees · 18 holes",
    date:
      i === 0 && j === 2
        ? "2027-06-29T09:00:00-05:00"
        : i === 4 && j === 2
          ? ""
          : `2027-06-${String(8 + i * 2 + j).padStart(2, "0")}T09:00:00-05:00`,
    lockedAt:
      (i === 0 && j === 2) || (i === 4 && j === 2)
        ? null
        : `2027-06-${String(6 + i * 2 + j).padStart(2, "0")}T18:00:00-05:00`,
    scores: scoreRows(i + j),
    strokes: agreedStrokes.map((r) => [...r]),
    evidence: true,
    note: "",
  }));
});
export const season = {
  year: 2027,
  buyIn: 250,
  podAward: 250,
  championAward: 2000,
  runnerUpAward: 1000,
  deadline: "June 30",
  prizePool: 4500,
};
export const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
export const dateLabel = (date: string, withTime = false) =>
  date
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        month: "short",
        day: "numeric",
        ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
      }).format(new Date(date))
    : "Date needed";
