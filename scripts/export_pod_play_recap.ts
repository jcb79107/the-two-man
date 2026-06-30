import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  getOfficialResultSnapshotForMatch,
  type OfficialResultSnapshot
} from "@/lib/server/official-result-snapshot";
import {
  computeProjectedPlayoffPicture,
  computeQualifiedSeeds,
  compareStandings
} from "@/lib/server/qualification";
import {
  computePodStandings,
  type MatchStandingInput
} from "@/lib/server/standings";
import type { StandingsRow, TeamProfile } from "@/types/models";

type DbClient = typeof import("@/lib/server/db")["db"];

type CliOptions = {
  envFiles: string[];
  out?: string;
  seasonYear: number;
  slug?: string;
};

type TournamentRecord = NonNullable<Awaited<ReturnType<typeof loadTournament>>>;
type MatchRecord = TournamentRecord["matches"][number];
type TeamRecord = TournamentRecord["teams"][number];
type PlayerRecord = TeamRecord["roster"][number]["player"];
type PlayerSelection = MatchRecord["playerSelections"][number];

type RecordSummary = {
  wins: number;
  losses: number;
  ties: number;
};

type MatchSource = {
  matchId: string;
  matchLabel: string;
};

type RoundStat = MatchSource & {
  course: string;
  coursePar: number;
  courseRating: number;
  score: number;
  slope: number;
  teeName: string;
  toPar: number;
};

type BestTeamRound = MatchSource & {
  course: string;
  score: number;
  toPar: number;
};

type LargestWin = MatchSource & {
  pointMargin: number;
};

type TeamAggregate = {
  id: string;
  name: string;
  pod: string;
  bestGrossBetterBallRound: BestTeamRound | null;
  bestNetBetterBallRound: BestTeamRound | null;
  closingAvailable: number;
  closingPointsWon: number;
  largestWin: LargestWin | null;
  scoringHolesLost: number;
  scoringHolesTied: number;
  scoringHolesWon: number;
  scoringSourceMatches: Map<string, string>;
  standingHolesLost: number;
  standingHolesTied: number;
  standingHolesWon: number;
  standingSourceMatches: Map<string, string>;
};

type PlayerAggregate = {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
  pod: string;
  birdies: number;
  closingCountedCredits: number;
  closingTeamPointsWhenCounted: number;
  countedBetterBallCredits: number;
  contributionOnTeamHoleWins: number;
  eagles: number;
  grossRounds: RoundStat[];
  grossStrokeTotal: number;
  holesPlayed: number;
  longestParOrBetterStreak: number;
  matchesPlayed: Set<string>;
  netBirdiesOrBetter: number;
  netRounds: RoundStat[];
  netStrokeTotal: number;
  parsOrBetter: number;
  sourceMatches: Map<string, string>;
};

type DataQualityIssue = MatchSource & {
  reason: string;
  status: string;
};

const FINAL_SCORECARD_HOLE_COUNT = 18;
const PLAYER_LEADERBOARD_MIN_HOLES = 18;
const CLOSING_HOLES = new Set([15, 16, 17, 18]);

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    envFiles: [".env.local", ".env"],
    seasonYear: 2026
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    if (arg === "--slug") {
      options.slug = readOptionValue(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--season-year") {
      options.seasonYear = Number(readOptionValue(argv, index, arg));
      index += 1;
      continue;
    }

    if (arg === "--out") {
      options.out = readOptionValue(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--env-file") {
      options.envFiles = [readOptionValue(argv, index, arg)];
      index += 1;
      continue;
    }

    if (arg === "--no-env-file") {
      options.envFiles = [];
      continue;
    }

    throw new Error(`Unknown option "${arg}". Run with --help for usage.`);
  }

  if (!Number.isInteger(options.seasonYear)) {
    throw new Error("--season-year must be an integer.");
  }

  return options;
}

function readOptionValue(argv: string[], index: number, optionName: string) {
  const value = argv[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${optionName} requires a value.`);
  }

  return value;
}

function printHelp() {
  console.log(`Usage:
  npm run recap:export -- [--slug the-two-man-2026] [--season-year 2026] [--out exports/pod-play-recap.json]

Loads .env.local then .env by default. Existing shell environment variables win.
The export uses only official FINAL pod-play scorecards for scoring stats and keeps forfeits in standings only.`);
}

function loadEnvFiles(envFiles: string[]) {
  const loaded: string[] = [];

  for (const envFile of envFiles) {
    const resolved = path.resolve(process.cwd(), envFile);

    if (!existsSync(resolved)) {
      continue;
    }

    process.loadEnvFile(resolved);
    loaded.push(resolved);
  }

  return loaded;
}

function hasDatabaseUrl() {
  return [
    "DATABASE_URL",
    "POSTGRES_PRISMA_URL",
    "POSTGRES_URL",
    "POSTGRES_URL_NON_POOLING",
    "DATABASE_URL_UNPOOLED"
  ].some((key) => Boolean(process.env[key]));
}

async function loadTournament(db: DbClient, options: CliOptions) {
  return db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");

    return tx.tournament.findFirst({
      where: options.slug
        ? {
            slug: options.slug
          }
        : {
            seasonYear: options.seasonYear
          },
      orderBy: {
        createdAt: "desc"
      },
      include: {
        pods: {
          orderBy: {
            podOrder: "asc"
          }
        },
        teams: {
          orderBy: {
            name: "asc"
          },
          include: {
            roster: {
              orderBy: {
                rosterPosition: "asc"
              },
              include: {
                player: true
              }
            },
            podMemberships: {
              include: {
                pod: true
              }
            }
          }
        },
        matches: {
          where: {
            stage: "POD_PLAY"
          },
          orderBy: [
            {
              scheduledAt: "asc"
            },
            {
              roundLabel: "asc"
            },
            {
              createdAt: "asc"
            }
          ],
          include: {
            tournament: {
              select: {
                forfeitPointsAwarded: true,
                forfeitHolesWonAwarded: true
              }
            },
            pod: true,
            course: true,
            homeTeam: true,
            awayTeam: true,
            playerSelections: {
              include: {
                player: true,
                team: true,
                tee: {
                  include: {
                    holes: {
                      orderBy: {
                        holeNumber: "asc"
                      }
                    }
                  }
                }
              }
            },
            holeScores: {
              orderBy: [
                {
                  holeNumber: "asc"
                },
                {
                  playerId: "asc"
                }
              ]
            }
          }
        }
      }
    });
  });
}

function round(value: number, digits = 3) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function sortByNumberThenName<T>(
  items: T[],
  value: (item: T) => number,
  name: (item: T) => string,
  direction: "asc" | "desc" = "desc"
) {
  return [...items].sort((left, right) => {
    const difference = value(left) - value(right);

    if (difference !== 0) {
      return direction === "asc" ? difference : -difference;
    }

    return name(left).localeCompare(name(right));
  });
}

function ranked<T>(items: T[], limit = 10) {
  return items.slice(0, limit).map((item, index) => ({
    rank: index + 1,
    ...item
  }));
}

function emptyBestTeamRound(): BestTeamRound {
  return {
    score: 0,
    toPar: 0,
    matchId: "",
    matchLabel: "",
    course: ""
  };
}

function emptyLargestWin(): LargestWin {
  return {
    pointMargin: 0,
    matchId: "",
    matchLabel: ""
  };
}

function emptyBestPlayerRound(includeGrossContext: true): RoundStat;
function emptyBestPlayerRound(includeGrossContext?: false): MatchSource & {
  score: number;
  toPar: number;
};
function emptyBestPlayerRound(includeGrossContext = false) {
  const base = {
    score: 0,
    toPar: 0,
    matchId: "",
    matchLabel: ""
  };

  if (!includeGrossContext) {
    return base;
  }

  return {
    ...base,
    teeName: "",
    course: "",
    coursePar: 0,
    courseRating: 0,
    slope: 0
  };
}

function matchLabel(match: MatchRecord) {
  const home = match.homeTeam?.name ?? match.homeSeedLabel ?? "TBD";
  const away = match.awayTeam?.name ?? match.awaySeedLabel ?? "TBD";
  return `${match.roundLabel}: ${home} vs ${away}`;
}

function matchPlayedOn(match: MatchRecord) {
  return match.finalizedAt ?? match.submittedAt ?? match.scheduledAt ?? match.updatedAt;
}

function courseName(match: MatchRecord) {
  return match.course?.name ?? "Unknown course";
}

function teamIdsForMatch(match: MatchRecord) {
  return [match.homeTeamId, match.awayTeamId].filter((teamId): teamId is string => Boolean(teamId));
}

function sourceFromMatch(match: MatchRecord): MatchSource {
  return {
    matchId: match.id,
    matchLabel: matchLabel(match)
  };
}

function recordFromStanding(row: StandingsRow): RecordSummary {
  return {
    wins: row.wins,
    losses: row.losses,
    ties: row.ties
  };
}

function podNameForTeam(team: TeamRecord) {
  return team.podMemberships[0]?.pod.name ?? "Unassigned";
}

function podIdForTeam(team: TeamRecord) {
  return team.podMemberships[0]?.podId ?? "";
}

function buildTeamProfiles(tournament: TournamentRecord): TeamProfile[] {
  return tournament.teams.map((team) => ({
    id: team.id,
    name: team.name,
    podId: podIdForTeam(team),
    players: team.roster.map((entry) => ({
      id: entry.player.id,
      firstName: entry.player.firstName,
      lastName: entry.player.lastName,
      displayName: entry.player.displayName,
      email: entry.player.email,
      handicapIndex: entry.player.handicapIndex == null ? 0 : Number(entry.player.handicapIndex),
      ghinNumber: entry.player.ghinNumber,
      handicapSyncStatus: entry.player.handicapSyncStatus,
      lastHandicapSyncAt: entry.player.lastHandicapSyncAt?.toISOString() ?? null
    }))
  }));
}

function initializeTeamAggregates(tournament: TournamentRecord) {
  const aggregates = new Map<string, TeamAggregate>();

  for (const team of tournament.teams) {
    aggregates.set(team.id, {
      id: team.id,
      name: team.name,
      pod: podNameForTeam(team),
      bestGrossBetterBallRound: null,
      bestNetBetterBallRound: null,
      closingAvailable: 0,
      closingPointsWon: 0,
      largestWin: null,
      scoringHolesLost: 0,
      scoringHolesTied: 0,
      scoringHolesWon: 0,
      scoringSourceMatches: new Map(),
      standingHolesLost: 0,
      standingHolesTied: 0,
      standingHolesWon: 0,
      standingSourceMatches: new Map()
    });
  }

  return aggregates;
}

function initializePlayerAggregates(tournament: TournamentRecord) {
  const aggregates = new Map<string, PlayerAggregate>();

  for (const team of tournament.teams) {
    for (const rosterEntry of team.roster) {
      const player = rosterEntry.player;

      aggregates.set(player.id, {
        id: player.id,
        name: player.displayName,
        teamId: team.id,
        teamName: team.name,
        pod: podNameForTeam(team),
        birdies: 0,
        closingCountedCredits: 0,
        closingTeamPointsWhenCounted: 0,
        countedBetterBallCredits: 0,
        contributionOnTeamHoleWins: 0,
        eagles: 0,
        grossRounds: [],
        grossStrokeTotal: 0,
        holesPlayed: 0,
        longestParOrBetterStreak: 0,
        matchesPlayed: new Set(),
        netBirdiesOrBetter: 0,
        netRounds: [],
        netStrokeTotal: 0,
        parsOrBetter: 0,
        sourceMatches: new Map()
      });
    }
  }

  return aggregates;
}

function getSnapshotCompletenessIssue(match: MatchRecord, snapshot: OfficialResultSnapshot | null) {
  if (!snapshot) {
    return "No official result snapshot could be read or computed.";
  }

  if (snapshot.players.length !== 4) {
    return `Expected 4 player snapshots, found ${snapshot.players.length}.`;
  }

  if (snapshot.holes.length !== FINAL_SCORECARD_HOLE_COUNT) {
    return `Expected ${FINAL_SCORECARD_HOLE_COUNT} scored holes, found ${snapshot.holes.length}.`;
  }

  const holeNumbers = new Set(snapshot.holes.map((hole) => hole.holeNumber));
  for (let holeNumber = 1; holeNumber <= FINAL_SCORECARD_HOLE_COUNT; holeNumber += 1) {
    if (!holeNumbers.has(holeNumber)) {
      return `Missing hole ${holeNumber}.`;
    }
  }

  for (const player of snapshot.players) {
    for (const hole of snapshot.holes) {
      if (typeof player.grossByHole[hole.holeNumber] !== "number") {
        return `Missing gross score for ${player.playerName} on hole ${hole.holeNumber}.`;
      }

      const net = hole.playerNetScores[player.playerId] ?? player.netByHole[hole.holeNumber];
      if (typeof net !== "number") {
        return `Missing net score for ${player.playerName} on hole ${hole.holeNumber}.`;
      }
    }
  }

  for (const teamId of teamIdsForMatch(match)) {
    if (!snapshot.teamSummaries.some((summary) => summary.teamId === teamId)) {
      return `Missing team summary for ${teamId}.`;
    }
  }

  return null;
}

function selectionByPlayerId(match: MatchRecord) {
  return new Map(match.playerSelections.map((selection) => [selection.playerId, selection]));
}

function courseParForMatch(snapshot: OfficialResultSnapshot) {
  const holeMeta = snapshot.holeMeta.length > 0 ? snapshot.holeMeta : snapshot.holes;
  return holeMeta.reduce((total, hole) => total + (hole.par ?? 0), 0);
}

function grossScoreForPlayer(snapshot: OfficialResultSnapshot, playerId: string) {
  const player = snapshot.players.find((entry) => entry.playerId === playerId);

  if (!player) {
    return null;
  }

  return snapshot.holes.reduce((total, hole) => total + player.grossByHole[hole.holeNumber], 0);
}

function netScoreForPlayer(snapshot: OfficialResultSnapshot, playerId: string) {
  return snapshot.holes.reduce((total, hole) => {
    const net = hole.playerNetScores[playerId];

    if (typeof net !== "number") {
      return total;
    }

    return total + net;
  }, 0);
}

function updateBestTeamRound(
  current: BestTeamRound | null,
  candidate: BestTeamRound
) {
  if (!current || candidate.score < current.score) {
    return candidate;
  }

  if (candidate.score === current.score && candidate.toPar < current.toPar) {
    return candidate;
  }

  return current;
}

function updateLargestWin(current: LargestWin | null, candidate: LargestWin) {
  if (!current || candidate.pointMargin > current.pointMargin) {
    return candidate;
  }

  return current;
}

function betterBallCreditsForHole(snapshot: OfficialResultSnapshot, holeNumber: number) {
  const credits = new Map<string, number>();
  const playersByTeam = new Map<string, typeof snapshot.players>();

  for (const player of snapshot.players) {
    const teamPlayers = playersByTeam.get(player.teamId) ?? [];
    teamPlayers.push(player);
    playersByTeam.set(player.teamId, teamPlayers);
  }

  const hole = snapshot.holes.find((entry) => entry.holeNumber === holeNumber);

  if (!hole) {
    return credits;
  }

  for (const teamPlayers of playersByTeam.values()) {
    const scoredPlayers = teamPlayers
      .map((player) => ({
        player,
        net: hole.playerNetScores[player.playerId] ?? player.netByHole[holeNumber]
      }))
      .filter((entry): entry is { player: typeof teamPlayers[number]; net: number } =>
        typeof entry.net === "number"
      );

    if (scoredPlayers.length === 0) {
      continue;
    }

    const lowNet = Math.min(...scoredPlayers.map((entry) => entry.net));
    const countedPlayers = scoredPlayers.filter((entry) => entry.net === lowNet);
    const credit = 1 / countedPlayers.length;

    for (const counted of countedPlayers) {
      credits.set(counted.player.playerId, credit);
    }
  }

  return credits;
}

function updateStandingHoleBreakdown(
  match: MatchRecord,
  snapshot: OfficialResultSnapshot,
  teamAggregates: Map<string, TeamAggregate>
) {
  const summaries = snapshot.teamSummaries;

  if (summaries.length !== 2) {
    return;
  }

  for (const summary of summaries) {
    const aggregate = teamAggregates.get(summary.teamId);
    const opponent = summaries.find((entry) => entry.teamId !== summary.teamId);

    if (!aggregate || !opponent) {
      continue;
    }

    aggregate.standingHolesWon += summary.holesWon;
    aggregate.standingHolesLost += opponent.holesWon;
    aggregate.standingHolesTied += match.status === "FORFEIT"
      ? 0
      : Math.max(0, snapshot.holes.length - summary.holesWon - opponent.holesWon);
    aggregate.standingSourceMatches.set(match.id, matchLabel(match));
  }
}

function updateTeamScoringStats(
  match: MatchRecord,
  snapshot: OfficialResultSnapshot,
  teamAggregates: Map<string, TeamAggregate>
) {
  const par = courseParForMatch(snapshot);
  const summaries = snapshot.teamSummaries;

  for (const summary of summaries) {
    const aggregate = teamAggregates.get(summary.teamId);

    if (!aggregate) {
      continue;
    }

    aggregate.scoringSourceMatches.set(match.id, matchLabel(match));

    if (summary.betterBallGrossTotal != null) {
      aggregate.bestGrossBetterBallRound = updateBestTeamRound(
        aggregate.bestGrossBetterBallRound,
        {
          ...sourceFromMatch(match),
          course: courseName(match),
          score: summary.betterBallGrossTotal,
          toPar: summary.betterBallGrossTotal - par
        }
      );
    }

    if (summary.betterBallNetTotal != null) {
      aggregate.bestNetBetterBallRound = updateBestTeamRound(
        aggregate.bestNetBetterBallRound,
        {
          ...sourceFromMatch(match),
          course: courseName(match),
          score: summary.betterBallNetTotal,
          toPar: summary.betterBallNetTotal - par
        }
      );
    }
  }

  for (const hole of snapshot.holes) {
    for (const teamId of Object.keys(hole.teamPoints)) {
      const aggregate = teamAggregates.get(teamId);

      if (!aggregate) {
        continue;
      }

      if (hole.teamPoints[teamId] === 1) {
        aggregate.scoringHolesWon += 1;
      } else if (hole.teamPoints[teamId] === 0.5) {
        aggregate.scoringHolesTied += 1;
      } else {
        aggregate.scoringHolesLost += 1;
      }

      if (CLOSING_HOLES.has(hole.holeNumber)) {
        aggregate.closingPointsWon += hole.teamPoints[teamId] ?? 0;
        aggregate.closingAvailable += 1;
      }
    }
  }

  const [first, second] = summaries;
  if (!first || !second) {
    return;
  }

  for (const summary of summaries) {
    if (summary.resultCode !== "WIN") {
      continue;
    }

    const opponent = summary.teamId === first.teamId ? second : first;
    const aggregate = teamAggregates.get(summary.teamId);

    if (!aggregate) {
      continue;
    }

    aggregate.largestWin = updateLargestWin(aggregate.largestWin, {
      ...sourceFromMatch(match),
      pointMargin: round(Math.abs(summary.totalPoints - opponent.totalPoints), 1)
    });
  }
}

function updatePlayerStats(
  match: MatchRecord,
  snapshot: OfficialResultSnapshot,
  playerAggregates: Map<string, PlayerAggregate>
) {
  const selections = selectionByPlayerId(match);

  for (const snapshotPlayer of snapshot.players) {
    const aggregate = playerAggregates.get(snapshotPlayer.playerId);
    const selection = selections.get(snapshotPlayer.playerId);

    if (!aggregate || !selection) {
      continue;
    }

    const grossScore = grossScoreForPlayer(snapshot, snapshotPlayer.playerId);
    const netScore = netScoreForPlayer(snapshot, snapshotPlayer.playerId);
    const coursePar = selection.parSnapshot;
    const grossRound: RoundStat = {
      ...sourceFromMatch(match),
      course: courseName(match),
      coursePar,
      courseRating: Number(selection.courseRatingSnapshot),
      score: grossScore ?? 0,
      slope: selection.slopeSnapshot,
      teeName: selection.teeNameSnapshot,
      toPar: (grossScore ?? 0) - coursePar
    };
    const netRound: RoundStat = {
      ...grossRound,
      score: netScore,
      toPar: netScore - coursePar
    };

    aggregate.matchesPlayed.add(match.id);
    aggregate.sourceMatches.set(match.id, matchLabel(match));
    aggregate.grossRounds.push(grossRound);
    aggregate.netRounds.push(netRound);
    aggregate.grossStrokeTotal += grossScore ?? 0;
    aggregate.netStrokeTotal += netScore;
    aggregate.holesPlayed += snapshot.holes.length;

    let currentParOrBetterStreak = 0;

    for (const hole of snapshot.holes) {
      const gross = snapshotPlayer.grossByHole[hole.holeNumber];
      const net = hole.playerNetScores[snapshotPlayer.playerId] ?? snapshotPlayer.netByHole[hole.holeNumber];
      const par = hole.par ?? snapshot.holeMeta.find((entry) => entry.holeNumber === hole.holeNumber)?.par;

      if (typeof par !== "number") {
        continue;
      }

      if (gross <= par - 1) {
        aggregate.birdies += gross === par - 1 ? 1 : 0;
        aggregate.eagles += gross <= par - 2 ? 1 : 0;
      }

      if (gross <= par) {
        aggregate.parsOrBetter += 1;
        currentParOrBetterStreak += 1;
        aggregate.longestParOrBetterStreak = Math.max(
          aggregate.longestParOrBetterStreak,
          currentParOrBetterStreak
        );
      } else {
        currentParOrBetterStreak = 0;
      }

      if (typeof net === "number" && net <= par - 1) {
        aggregate.netBirdiesOrBetter += 1;
      }
    }
  }

  for (const hole of snapshot.holes) {
    const credits = betterBallCreditsForHole(snapshot, hole.holeNumber);

    for (const [playerId, credit] of credits.entries()) {
      const aggregate = playerAggregates.get(playerId);
      const player = snapshot.players.find((entry) => entry.playerId === playerId);

      if (!aggregate || !player) {
        continue;
      }

      const teamPoints = hole.teamPoints[player.teamId] ?? 0;
      aggregate.countedBetterBallCredits += credit;

      if (teamPoints === 1) {
        aggregate.contributionOnTeamHoleWins += credit;
      }

      if (CLOSING_HOLES.has(hole.holeNumber)) {
        aggregate.closingTeamPointsWhenCounted += teamPoints * credit;
        aggregate.closingCountedCredits += credit;
      }
    }
  }
}

function bestRound(rounds: RoundStat[]) {
  return [...rounds].sort((left, right) => {
    if (left.score !== right.score) {
      return left.score - right.score;
    }

    return left.toPar - right.toPar;
  })[0] ?? null;
}

function sourceMatchesFromMap(sourceMatches: Map<string, string>) {
  return [...sourceMatches.entries()].map(([matchId, label]) => ({
    matchId,
    matchLabel: label
  }));
}

function buildMatchHighlight(match: MatchRecord, snapshot: OfficialResultSnapshot) {
  const teamNames = new Map([
    [match.homeTeamId, match.homeTeam?.name ?? "Home"],
    [match.awayTeamId, match.awayTeam?.name ?? "Away"]
  ]);
  const summaries = snapshot.teamSummaries;
  const orderedSummaries = [...summaries].sort((left, right) => right.totalPoints - left.totalPoints);
  const winnerSummary =
    orderedSummaries.find((summary) => summary.teamId === snapshot.winningTeamId) ??
    orderedSummaries.find((summary) => summary.resultCode === "WIN") ??
    null;
  const loserSummary = winnerSummary
    ? orderedSummaries.find((summary) => summary.teamId !== winnerSummary.teamId) ?? null
    : null;
  const [first, second] = summaries;
  const pointMargin = first && second ? round(Math.abs(first.totalPoints - second.totalPoints), 1) : 0;
  const finalResult =
    first && second
      ? `${teamNames.get(first.teamId) ?? "Team"} ${first.totalPoints} - ${second.totalPoints} ${teamNames.get(second.teamId) ?? "Team"}`
      : "Unavailable";
  const winner = winnerSummary
    ? teamNames.get(winnerSummary.teamId) ?? "Winner"
    : "Tie";
  const decisiveHole = winnerSummary
    ? findDecisiveHole(snapshot, winnerSummary.teamId)
    : FINAL_SCORECARD_HOLE_COUNT;
  const comebackDeficit = winnerSummary
    ? largestDeficitOvercome(snapshot, winnerSummary.teamId)
    : 0;
  const homeClosingPoints = sumClosingPoints(snapshot, match.homeTeamId);
  const awayClosingPoints = sumClosingPoints(snapshot, match.awayTeamId);
  const closingSummary = `${match.homeTeam?.name ?? "Home"} ${round(homeClosingPoints, 1)} - ${round(awayClosingPoints, 1)} ${match.awayTeam?.name ?? "Away"} on holes 15-18`;

  return {
    ...sourceFromMatch(match),
    date: matchPlayedOn(match).toISOString().slice(0, 10),
    course: courseName(match),
    homeTeam: match.homeTeam?.name ?? "Home",
    awayTeam: match.awayTeam?.name ?? "Away",
    finalResult,
    winner,
    pointMargin,
    closestMatchCandidate: false,
    largestComebackCandidate: false,
    decisiveHole,
    closingSummary,
    comebackDeficit,
    loserTeamId: loserSummary?.teamId ?? null
  };
}

function cumulativeScoreAfterHole(snapshot: OfficialResultSnapshot, throughHole: number) {
  const totals: Record<string, number> = {};

  for (const hole of snapshot.holes.filter((entry) => entry.holeNumber <= throughHole)) {
    for (const [teamId, points] of Object.entries(hole.teamPoints)) {
      totals[teamId] = (totals[teamId] ?? 0) + points;
    }
  }

  return totals;
}

function findDecisiveHole(snapshot: OfficialResultSnapshot, winnerTeamId: string) {
  for (const hole of snapshot.holes) {
    const totals = cumulativeScoreAfterHole(snapshot, hole.holeNumber);
    const winnerPoints = totals[winnerTeamId] ?? 0;
    const opponentPoints = Math.max(
      ...Object.entries(totals)
        .filter(([teamId]) => teamId !== winnerTeamId)
        .map(([, points]) => points),
      0
    );
    const holesRemaining = FINAL_SCORECARD_HOLE_COUNT - hole.holeNumber;

    if (winnerPoints - opponentPoints > holesRemaining) {
      return hole.holeNumber;
    }
  }

  return FINAL_SCORECARD_HOLE_COUNT;
}

function largestDeficitOvercome(snapshot: OfficialResultSnapshot, winnerTeamId: string) {
  let largestDeficit = 0;

  for (const hole of snapshot.holes) {
    const totals = cumulativeScoreAfterHole(snapshot, hole.holeNumber);
    const winnerPoints = totals[winnerTeamId] ?? 0;
    const opponentPoints = Math.max(
      ...Object.entries(totals)
        .filter(([teamId]) => teamId !== winnerTeamId)
        .map(([, points]) => points),
      0
    );

    largestDeficit = Math.max(largestDeficit, opponentPoints - winnerPoints);
  }

  return largestDeficit;
}

function sumClosingPoints(snapshot: OfficialResultSnapshot, teamId: string | null) {
  if (!teamId) {
    return 0;
  }

  return snapshot.holes
    .filter((hole) => CLOSING_HOLES.has(hole.holeNumber))
    .reduce((total, hole) => total + (hole.teamPoints[teamId] ?? 0), 0);
}

function buildOutput(input: {
  completeFinalMatches: Array<{ match: MatchRecord; snapshot: OfficialResultSnapshot }>;
  dataQualityIssues: DataQualityIssue[];
  forfeitMatches: MatchRecord[];
  generatedAt: string;
  nonFinalMatches: MatchRecord[];
  playerAggregates: Map<string, PlayerAggregate>;
  standings: StandingsRow[];
  teamAggregates: Map<string, TeamAggregate>;
  tournament: TournamentRecord;
}) {
  const {
    completeFinalMatches,
    dataQualityIssues,
    forfeitMatches,
    generatedAt,
    nonFinalMatches,
    playerAggregates,
    standings,
    teamAggregates,
    tournament
  } = input;
  const standingsByTeamId = new Map(standings.map((row) => [row.teamId, row]));
  const podStandings = tournament.pods.map((pod) => ({
    pod,
    rows: standings.filter((row) => row.podId === pod.id).sort(compareStandings)
  }));
  const computedSeeds = computeQualifiedSeeds({
    pods: tournament.pods.map((pod) => ({ id: pod.id, name: pod.name })),
    standings,
    podStandings,
    matches: tournament.matches
  });
  const projectedSeeds = computeProjectedPlayoffPicture({
    pods: tournament.pods.map((pod) => ({ id: pod.id, name: pod.name })),
    standings,
    podStandings,
    matches: tournament.matches
  }).projectedPlayoffField;
  const seeds = computedSeeds.length > 0 ? computedSeeds : projectedSeeds;
  const seedByTeamId = new Map(seeds.map((seed) => [seed.teamId, seed]));
  const podNameById = new Map(tournament.pods.map((pod) => [pod.id, pod.name]));

  const raceTeams = tournament.teams
    .map((team) => {
      const row = standingsByTeamId.get(team.id);
      const aggregate = teamAggregates.get(team.id);
      const seed = seedByTeamId.get(team.id);

      return {
        teamId: team.id,
        teamName: team.name,
        pod: podNameForTeam(team),
        record: row ? recordFromStanding(row) : { wins: 0, losses: 0, ties: 0 },
        podPoints: row?.holePoints ?? 0,
        holesWon: aggregate?.standingHolesWon ?? 0,
        holesLost: aggregate?.standingHolesLost ?? 0,
        holesTied: aggregate?.standingHolesTied ?? 0,
        qualificationStatus: seed?.qualifierType ?? "ELIMINATED"
      };
    })
    .sort((left, right) => {
      const leftPodOrder = tournament.pods.find((pod) => pod.name === left.pod)?.podOrder ?? 999;
      const rightPodOrder = tournament.pods.find((pod) => pod.name === right.pod)?.podOrder ?? 999;

      if (leftPodOrder !== rightPodOrder) {
        return leftPodOrder - rightPodOrder;
      }

      const leftStanding = standingsByTeamId.get(left.teamId);
      const rightStanding = standingsByTeamId.get(right.teamId);

      if (leftStanding && rightStanding) {
        return compareStandings(leftStanding, rightStanding);
      }

      return left.teamName.localeCompare(right.teamName);
    });

  const podWinners = seeds
    .filter((seed) => seed.qualifierType === "POD_WINNER")
    .map((seed) => {
      const row = standingsByTeamId.get(seed.teamId);
      const aggregate = teamAggregates.get(seed.teamId);

      return {
        pod: podNameById.get(seed.podId) ?? "",
        teamId: seed.teamId,
        teamName: seed.teamName,
        record: row ? recordFromStanding(row) : { wins: 0, losses: 0, ties: 0 },
        podPoints: row?.holePoints ?? 0,
        holesWon: aggregate?.standingHolesWon ?? 0,
        holesLost: aggregate?.standingHolesLost ?? 0,
        holesTied: aggregate?.standingHolesTied ?? 0,
        qualificationStatus: "POD_WINNER"
      };
    });

  const wildCards = seeds
    .filter((seed) => seed.qualifierType === "WILD_CARD")
    .map((seed) => {
      const row = standingsByTeamId.get(seed.teamId);
      const aggregate = teamAggregates.get(seed.teamId);

      return {
        seed: seed.seedNumber,
        teamId: seed.teamId,
        teamName: seed.teamName,
        pod: podNameById.get(seed.podId) ?? "",
        record: row ? recordFromStanding(row) : { wins: 0, losses: 0, ties: 0 },
        podPoints: row?.holePoints ?? 0,
        holesWon: aggregate?.standingHolesWon ?? 0,
        holesLost: aggregate?.standingHolesLost ?? 0,
        holesTied: aggregate?.standingHolesTied ?? 0,
        qualificationStatus: "WILD_CARD"
      };
    });

  const teamStats = raceTeams.map((raceTeam) => {
    const row = standingsByTeamId.get(raceTeam.teamId);
    const aggregate = teamAggregates.get(raceTeam.teamId);
    const scoringHoleTotal =
      (aggregate?.scoringHolesWon ?? 0) +
      (aggregate?.scoringHolesLost ?? 0) +
      (aggregate?.scoringHolesTied ?? 0);

    return {
      teamId: raceTeam.teamId,
      teamName: raceTeam.teamName,
      pod: raceTeam.pod,
      matchesPlayed: row?.matchesPlayed ?? 0,
      record: raceTeam.record,
      podPoints: raceTeam.podPoints,
      holesWon: raceTeam.holesWon,
      holesLost: raceTeam.holesLost,
      holesTied: raceTeam.holesTied,
      holeWinPct: scoringHoleTotal > 0 ? round((aggregate?.scoringHolesWon ?? 0) / scoringHoleTotal) : 0,
      bestNetBetterBallRound: aggregate?.bestNetBetterBallRound ?? emptyBestTeamRound(),
      bestGrossBetterBallRound: aggregate?.bestGrossBetterBallRound ?? emptyBestTeamRound(),
      closingHoles15to18: {
        pointsWon: round(aggregate?.closingPointsWon ?? 0, 1),
        pointsAvailable: aggregate?.closingAvailable ?? 0,
        pointPct:
          aggregate && aggregate.closingAvailable > 0
            ? round(aggregate.closingPointsWon / aggregate.closingAvailable)
            : 0
      },
      largestWin: aggregate?.largestWin ?? emptyLargestWin(),
      sourceMatches: sourceMatchesFromMap(aggregate?.scoringSourceMatches ?? new Map()),
      standingMatches: sourceMatchesFromMap(aggregate?.standingSourceMatches ?? new Map())
    };
  });

  const playerStats = [...playerAggregates.values()]
    .map((aggregate) => {
      const grossBest = bestRound(aggregate.grossRounds);
      const netBest = bestRound(aggregate.netRounds);
      const roundCount = aggregate.grossRounds.length;

      return {
        playerId: aggregate.id,
        playerName: aggregate.name,
        teamId: aggregate.teamId,
        teamName: aggregate.teamName,
        pod: aggregate.pod,
        matchesPlayed: aggregate.matchesPlayed.size,
        holesPlayed: aggregate.holesPlayed,
        gross: {
          average: roundCount > 0 ? round(aggregate.grossStrokeTotal / roundCount, 1) : 0,
          bestRound: grossBest ?? emptyBestPlayerRound(true)
        },
        net: {
          average: roundCount > 0 ? round(aggregate.netStrokeTotal / roundCount, 1) : 0,
          bestRound: netBest
            ? {
                score: netBest.score,
                toPar: netBest.toPar,
                matchId: netBest.matchId,
                matchLabel: netBest.matchLabel
              }
            : emptyBestPlayerRound(false)
        },
        birdies: aggregate.birdies,
        eagles: aggregate.eagles,
        parsOrBetter: aggregate.parsOrBetter,
        netBirdiesOrBetter: aggregate.netBirdiesOrBetter,
        countedBetterBallCredits: round(aggregate.countedBetterBallCredits, 1),
        countedHoleRate:
          aggregate.holesPlayed > 0
            ? round(aggregate.countedBetterBallCredits / aggregate.holesPlayed)
            : 0,
        contributionOnTeamHoleWins: round(aggregate.contributionOnTeamHoleWins, 1),
        closingHoles15to18: {
          teamPointsWonWhenCounted: round(aggregate.closingTeamPointsWhenCounted, 2),
          countedCredits: round(aggregate.closingCountedCredits, 1)
        },
        longestParOrBetterStreak: aggregate.longestParOrBetterStreak,
        sourceMatches: sourceMatchesFromMap(aggregate.sourceMatches)
      };
    })
    .sort((left, right) => left.playerName.localeCompare(right.playerName));

  const matchHighlights = completeFinalMatches.map(({ match, snapshot }) =>
    buildMatchHighlight(match, snapshot)
  );
  const closestMargin = Math.min(...matchHighlights.map((highlight) => highlight.pointMargin));
  const largestComeback = Math.max(...matchHighlights.map((highlight) => highlight.comebackDeficit));
  const publicMatchHighlights = matchHighlights.map((highlight) => {
    const { comebackDeficit, loserTeamId, ...publicHighlight } = highlight;

    return {
      ...publicHighlight,
      closestMatchCandidate: publicHighlight.pointMargin === closestMargin,
      largestComebackCandidate: comebackDeficit > 0 && comebackDeficit === largestComeback
    };
  });

  const eligiblePlayers = playerStats.filter((player) => player.holesPlayed >= PLAYER_LEADERBOARD_MIN_HOLES);
  const teamStatsByScoringHoles = sortByNumberThenName(
    teamStats,
    (team) => team.sourceMatches.length,
    (team) => team.teamName
  );

  const leaderboards = {
    mostHolesWon: ranked(
      sortByNumberThenName(
        teamStats,
        (team) => teamAggregates.get(team.teamId)?.scoringHolesWon ?? 0,
        (team) => team.teamName
      ).map((team) => ({
        teamId: team.teamId,
        teamName: team.teamName,
        pod: team.pod,
        holesWon: teamAggregates.get(team.teamId)?.scoringHolesWon ?? 0,
        scope: "completeFinalScorecardsOnly",
        minimumMatches: 1,
        sourceMatches: team.sourceMatches
      }))
    ),
    bestRecord: ranked(
      sortByNumberThenName(
        raceTeams,
        (team) => {
          const record = team.record;
          return record.wins + record.ties * 0.5;
        },
        (team) => team.teamName
      ).map((team) => ({
        teamId: team.teamId,
        teamName: team.teamName,
        pod: team.pod,
        record: team.record,
        recordPoints: team.record.wins + team.record.ties * 0.5,
        scope: "officialStandings",
        forfeitsIncluded: true
      }))
    ),
    mostPodPoints: ranked(
      sortByNumberThenName(raceTeams, (team) => team.podPoints, (team) => team.teamName).map((team) => ({
        teamId: team.teamId,
        teamName: team.teamName,
        pod: team.pod,
        podPoints: team.podPoints,
        scope: "officialStandings",
        forfeitsIncluded: true
      }))
    ),
    bestNetBetterBallRound: ranked(
      teamStatsByScoringHoles
        .filter((team) => team.bestNetBetterBallRound.score > 0)
        .sort((left, right) => left.bestNetBetterBallRound.score - right.bestNetBetterBallRound.score)
        .map((team) => ({
          teamId: team.teamId,
          teamName: team.teamName,
          pod: team.pod,
          ...team.bestNetBetterBallRound
        }))
    ),
    lowestGrossRound: ranked(
      eligiblePlayers
        .filter((player) => player.gross.bestRound.score > 0)
        .sort((left, right) => left.gross.bestRound.score - right.gross.bestRound.score)
        .map((player) => ({
          playerId: player.playerId,
          playerName: player.playerName,
          teamId: player.teamId,
          teamName: player.teamName,
          pod: player.pod,
          minimumHoles: PLAYER_LEADERBOARD_MIN_HOLES,
          ...player.gross.bestRound
        }))
    ),
    lowestNetRound: ranked(
      eligiblePlayers
        .filter((player) => player.net.bestRound.score > 0)
        .sort((left, right) => left.net.bestRound.score - right.net.bestRound.score)
        .map((player) => ({
          playerId: player.playerId,
          playerName: player.playerName,
          teamId: player.teamId,
          teamName: player.teamName,
          pod: player.pod,
          minimumHoles: PLAYER_LEADERBOARD_MIN_HOLES,
          ...player.net.bestRound
        }))
    ),
    mostBirdies: ranked(
      sortByNumberThenName(eligiblePlayers, (player) => player.birdies, (player) => player.playerName).map((player) => ({
        playerId: player.playerId,
        playerName: player.playerName,
        teamId: player.teamId,
        teamName: player.teamName,
        pod: player.pod,
        birdies: player.birdies,
        minimumHoles: PLAYER_LEADERBOARD_MIN_HOLES,
        sourceMatches: player.sourceMatches
      }))
    ),
    mostCountedBetterBallCredits: ranked(
      sortByNumberThenName(
        eligiblePlayers,
        (player) => player.countedBetterBallCredits,
        (player) => player.playerName
      ).map((player) => ({
        playerId: player.playerId,
        playerName: player.playerName,
        teamId: player.teamId,
        teamName: player.teamName,
        pod: player.pod,
        countedBetterBallCredits: player.countedBetterBallCredits,
        countedHoleRate: player.countedHoleRate,
        minimumHoles: PLAYER_LEADERBOARD_MIN_HOLES,
        sourceMatches: player.sourceMatches
      }))
    ),
    bestClosingPerformance: ranked(
      sortByNumberThenName(
        teamStats.filter((team) => team.closingHoles15to18.pointsAvailable > 0),
        (team) => team.closingHoles15to18.pointPct,
        (team) => team.teamName
      ).map((team) => ({
        teamId: team.teamId,
        teamName: team.teamName,
        pod: team.pod,
        ...team.closingHoles15to18,
        minimumClosingHoles: 4,
        scope: "completeFinalScorecardsOnly",
        sourceMatches: team.sourceMatches
      }))
    ),
    longestParOrBetterStreak: ranked(
      sortByNumberThenName(
        eligiblePlayers,
        (player) => player.longestParOrBetterStreak,
        (player) => player.playerName
      ).map((player) => ({
        playerId: player.playerId,
        playerName: player.playerName,
        teamId: player.teamId,
        teamName: player.teamName,
        pod: player.pod,
        longestParOrBetterStreak: player.longestParOrBetterStreak,
        minimumHoles: PLAYER_LEADERBOARD_MIN_HOLES,
        sourceMatches: player.sourceMatches
      }))
    ),
    largestWin: ranked(
      teamStats
        .filter((team) => team.largestWin.pointMargin > 0)
        .sort((left, right) => right.largestWin.pointMargin - left.largestWin.pointMargin)
        .map((team) => ({
          teamId: team.teamId,
          teamName: team.teamName,
          pod: team.pod,
          ...team.largestWin,
          scope: "completeFinalScorecardsOnly"
        }))
    ),
    closestMatch: ranked(
      [...publicMatchHighlights]
        .sort((left, right) => left.pointMargin - right.pointMargin)
        .map((highlight) => ({
          matchId: highlight.matchId,
          matchLabel: highlight.matchLabel,
          date: highlight.date,
          course: highlight.course,
          finalResult: highlight.finalResult,
          pointMargin: highlight.pointMargin,
          scope: "completeFinalScorecardsOnly"
        }))
    )
  };

  return {
    generatedAt,
    tournament: {
      id: tournament.id,
      name: tournament.name,
      seasonYear: tournament.seasonYear,
      podPlayMatchCount: tournament.matches.length,
      officialScorecardMatchCount: completeFinalMatches.length,
      forfeitMatchCount: forfeitMatches.length
    },
    playoffRace: {
      podWinners,
      wildCards,
      allTeams: raceTeams
    },
    teamStats,
    playerStats,
    matchHighlights: publicMatchHighlights,
    leaderboards,
    dataQuality: {
      matchesExcludedForIncompleteScorecards: dataQualityIssues,
      nonFinalPodPlayMatchesExcludedFromScoringStats: nonFinalMatches.map((match) => ({
        ...sourceFromMatch(match),
        status: match.status,
        scheduledAt: match.scheduledAt?.toISOString() ?? null
      })),
      forfeitsExcludedFromScoringStats: forfeitMatches.map((match) => ({
        ...sourceFromMatch(match),
        status: match.status,
        winner: match.winningTeamId
          ? tournament.teams.find((team) => team.id === match.winningTeamId)?.name ?? match.winningTeamId
          : null
      })),
      notes: [
        "The export reads production data in a Postgres read-only transaction and performs no writes.",
        "Scoring stats use only official FINAL pod-play matches with 18 complete scored holes.",
        "Non-final pod-play matches are excluded from scoring stats until they are official FINAL.",
        "FORFEIT matches are preserved in official standings fields only; they are excluded from scoring averages, birdies, streaks, closing-hole golf stats, and actual-hole leaderboards.",
        "gross.average and net.average are 18-hole round averages over complete final scorecards.",
        `Player performance leaderboards require at least ${PLAYER_LEADERBOARD_MIN_HOLES} scored holes.`,
        "Better-ball contribution credit is 1.0 for a solo team low net score on a hole and split equally when partners tie.",
        "Longest par-or-better streaks reset at match boundaries.",
        computedSeeds.length > 0
          ? "Playoff race uses the existing qualification engine for official seeds."
          : "Playoff race fell back to projected seeds because the qualification engine did not lock an official field."
      ]
    }
  };
}

async function writeExport(output: unknown, outPath: string) {
  const resolved = path.resolve(process.cwd(), outPath);
  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  return resolved;
}

function defaultOutputPath(seasonYear: number, generatedAt: string) {
  const timestamp = generatedAt
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z")
    .replace("T", "-");

  return path.join("exports", `pod-play-recap-${seasonYear}-${timestamp}.json`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const loadedEnvFiles = loadEnvFiles(options.envFiles);

  if (!hasDatabaseUrl()) {
    throw new Error(
      "No database URL was found. Set DATABASE_URL or run from a checkout with .env.local."
    );
  }

  const { db } = await import("@/lib/server/db");
  const tournament = await loadTournament(db, options);

  if (!tournament) {
    throw new Error(
      options.slug
        ? `Tournament slug "${options.slug}" was not found.`
        : `No tournament was found for seasonYear ${options.seasonYear}.`
    );
  }

  const generatedAt = new Date().toISOString();
  const teamProfiles = buildTeamProfiles(tournament);
  const teamAggregates = initializeTeamAggregates(tournament);
  const playerAggregates = initializePlayerAggregates(tournament);
  const snapshotsByMatchId = new Map<string, OfficialResultSnapshot>();
  const completeFinalMatches: Array<{ match: MatchRecord; snapshot: OfficialResultSnapshot }> = [];
  const dataQualityIssues: DataQualityIssue[] = [];
  const forfeitMatches = tournament.matches.filter((match) => match.status === "FORFEIT");
  const nonFinalMatches = tournament.matches.filter(
    (match) => match.status !== "FINAL" && match.status !== "FORFEIT"
  );

  for (const match of tournament.matches) {
    if (match.status !== "FINAL" && match.status !== "FORFEIT") {
      continue;
    }

    const snapshot = getOfficialResultSnapshotForMatch(match);

    if (snapshot) {
      snapshotsByMatchId.set(match.id, snapshot);
      updateStandingHoleBreakdown(match, snapshot, teamAggregates);
    }

    if (match.status === "FORFEIT") {
      continue;
    }

    const completenessIssue = getSnapshotCompletenessIssue(match, snapshot);
    if (completenessIssue) {
      dataQualityIssues.push({
        ...sourceFromMatch(match),
        status: match.status,
        reason: completenessIssue
      });
      continue;
    }

    if (!snapshot) {
      continue;
    }

    completeFinalMatches.push({ match, snapshot });
    updateTeamScoringStats(match, snapshot, teamAggregates);
    updatePlayerStats(match, snapshot, playerAggregates);
  }

  const standingsInputs: MatchStandingInput[] = tournament.matches.map((match) => ({
    id: match.id,
    podId: match.podId,
    stage: match.stage,
    status: match.status,
    winningTeamId: match.winningTeamId,
    teamSummaries: snapshotsByMatchId.get(match.id)?.teamSummaries ?? []
  }));
  const standings = computePodStandings(teamProfiles, standingsInputs);
  const output = buildOutput({
    completeFinalMatches,
    dataQualityIssues,
    forfeitMatches,
    generatedAt,
    nonFinalMatches,
    playerAggregates,
    standings,
    teamAggregates,
    tournament
  });
  const outPath = await writeExport(
    output,
    options.out ?? defaultOutputPath(tournament.seasonYear, generatedAt)
  );

  console.log(`Pod Play Recap export written to ${outPath}`);
  console.log(`Tournament: ${tournament.name} (${tournament.seasonYear})`);
  console.log(`Pod-play matches in database: ${tournament.matches.length}`);
  console.log(`Official FINAL complete scorecards used for scoring stats: ${completeFinalMatches.length}`);
  console.log(`Non-final pod-play matches excluded from scoring stats: ${nonFinalMatches.length}`);
  console.log(`FORFEIT matches preserved in standings and excluded from scoring stats: ${forfeitMatches.length}`);
  console.log(`FINAL matches excluded for incomplete scorecards: ${dataQualityIssues.length}`);
  console.log(
    `Regenerate with: npm run recap:export -- --season-year ${tournament.seasonYear}${
      options.slug ? ` --slug ${options.slug}` : ""
    }`
  );

  if (loadedEnvFiles.length > 0) {
    console.log(`Env files loaded: ${loadedEnvFiles.map((file) => path.relative(process.cwd(), file)).join(", ")}`);
  }

  await db.$disconnect();
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
