import type {
  ForfeitScoringInput,
  HoleScoreInput,
  MatchPlayerInput,
  MatchScoringInput,
  MatchScoringResult,
  PlayerHandicapSnapshot,
  TeamMatchSummary
} from "@/lib/scoring/types";

const DEFAULT_ALLOWANCE_PCT = 0.9;
const DEFAULT_MAX_STROKES_PER_HOLE = 1;

function roundHalfAwayFromZero(value: number): number {
  const sign = value < 0 ? -1 : 1;
  return sign * Math.floor(Math.abs(value) + 0.5);
}

function calculateUnroundedCourseHandicap(input: {
  handicapIndex: number;
  slope: number;
  courseRating: number;
  par: number;
}): number {
  return (input.handicapIndex * input.slope) / 113 + (input.courseRating - input.par);
}

export function calculateCourseHandicap(input: {
  handicapIndex: number;
  slope: number;
  courseRating: number;
  par: number;
}): number {
  return roundHalfAwayFromZero(calculateUnroundedCourseHandicap(input));
}

export function calculatePlayingHandicap(input: {
  handicapIndex: number;
  slope: number;
  courseRating: number;
  par: number;
  allowancePct?: number;
}): number {
  return roundHalfAwayFromZero(
    calculateUnroundedCourseHandicap(input) * (input.allowancePct ?? DEFAULT_ALLOWANCE_PCT)
  );
}

function buildPlayerSnapshot(
  player: MatchPlayerInput,
  lowCourseHandicap: number,
  maxStrokeHoles: number,
  allowancePct: number
): PlayerHandicapSnapshot {
  const courseHandicapInput = {
    handicapIndex: player.handicapIndex,
    slope: player.slope,
    courseRating: player.courseRating,
    par: player.par
  };
  const unroundedCourseHandicap = calculateUnroundedCourseHandicap(courseHandicapInput);
  const courseHandicap = roundHalfAwayFromZero(unroundedCourseHandicap);
  const playingHandicap = Math.max(
    0,
    roundHalfAwayFromZero((courseHandicap - lowCourseHandicap) * allowancePct)
  );
  const matchStrokeCount = Math.max(0, Math.min(maxStrokeHoles, playingHandicap));
  const strokesByHole = Object.fromEntries(
    player.holes.map((hole) => [
      hole.holeNumber,
      hole.strokeIndex <= matchStrokeCount ? DEFAULT_MAX_STROKES_PER_HOLE : 0
    ])
  );

  return {
    playerId: player.playerId,
    playerName: player.playerName,
    teamId: player.teamId,
    teeId: player.teeId,
    teeName: player.teeName,
    handicapIndex: player.handicapIndex,
    courseHandicap,
    playingHandicap,
    matchStrokeCount,
    strokesByHole
  };
}

function validateScoringInput(input: MatchScoringInput): void {
  const teamIds = [...new Set(input.players.map((player) => player.teamId))];

  if (teamIds.length !== 2) {
    throw new Error("Match scoring requires exactly two teams.");
  }

  if (input.players.length !== 4) {
    throw new Error("Match scoring requires exactly four player entries.");
  }

  if (input.players.some((player) => player.holes.length !== input.holeScores.length)) {
    throw new Error("Each player tee must define the same number of holes as the scorecard.");
  }
}

function summarizeTeamResults(
  teamIds: string[],
  holePointTotals: Record<string, number>,
  holeWins: Record<string, number>,
  betterBallGrossTotals: Record<string, number>,
  betterBallNetTotals: Record<string, number>
): TeamMatchSummary[] {
  const [teamAId, teamBId] = teamIds;
  const teamAWon = holePointTotals[teamAId] > holePointTotals[teamBId];
  const teamBWon = holePointTotals[teamBId] > holePointTotals[teamAId];

  return teamIds.map((teamId) => {
    let resultCode: TeamMatchSummary["resultCode"];

    if (!teamAWon && !teamBWon) {
      resultCode = "TIE";
    } else if ((teamId === teamAId && teamAWon) || (teamId === teamBId && teamBWon)) {
      resultCode = "WIN";
    } else {
      resultCode = "LOSS";
    }

    return {
      teamId,
      totalPoints: holePointTotals[teamId],
      holesWon: holeWins[teamId],
      betterBallGrossTotal: betterBallGrossTotals[teamId],
      betterBallNetTotal: betterBallNetTotals[teamId],
      resultCode
    };
  });
}

function validatePlayerSetup(players: MatchPlayerInput[]): void {
  const teamIds = [...new Set(players.map((player) => player.teamId))];

  if (teamIds.length !== 2) {
    throw new Error("Match setup requires exactly two teams.");
  }

  if (players.length !== 4) {
    throw new Error("Match setup requires exactly four players.");
  }
}

export function buildMatchPlayerSnapshots(input: {
  allowancePct?: number;
  maxStrokesPerHole?: number;
  players: MatchPlayerInput[];
}) {
  validatePlayerSetup(input.players);

  const allowancePct = input.allowancePct ?? DEFAULT_ALLOWANCE_PCT;
  const holeCount = input.players[0]?.holes.length ?? 0;
  const maxStrokeHoles = Math.max(
    0,
    holeCount * (input.maxStrokesPerHole ?? DEFAULT_MAX_STROKES_PER_HOLE)
  );
  const courseHandicaps = input.players.map((player) =>
    roundHalfAwayFromZero(
      calculateUnroundedCourseHandicap({
        handicapIndex: player.handicapIndex,
        slope: player.slope,
        courseRating: player.courseRating,
        par: player.par
      })
    )
  );
  const lowCourseHandicap = Math.min(...courseHandicaps);
  const lowPlayer = input.players[courseHandicaps.indexOf(lowCourseHandicap)];
  const players = input.players.map((player) =>
    buildPlayerSnapshot(player, lowCourseHandicap, maxStrokeHoles, allowancePct)
  );

  return {
    allowancePct,
    maxStrokesPerHole: input.maxStrokesPerHole ?? DEFAULT_MAX_STROKES_PER_HOLE,
    lowPlayerId: lowPlayer.playerId,
    players: players.map((player) => ({
      ...player,
      strokesByHole: Object.fromEntries(
        Object.entries(player.strokesByHole).map(([holeNumber, strokes]) => [
          Number(holeNumber),
          Math.min(input.maxStrokesPerHole ?? DEFAULT_MAX_STROKES_PER_HOLE, strokes)
        ])
      )
    }))
  };
}

function scoreWithSnapshots(input: {
  players: PlayerHandicapSnapshot[];
  holeScores: HoleScoreInput[];
  allowancePct?: number;
  maxStrokesPerHole?: number;
  lowPlayerId?: string;
}): MatchScoringResult {
  const allowancePct = input.allowancePct ?? DEFAULT_ALLOWANCE_PCT;
  const maxStrokesPerHole = input.maxStrokesPerHole ?? DEFAULT_MAX_STROKES_PER_HOLE;
  const teamIds = [...new Set(input.players.map((player) => player.teamId))];

  if (teamIds.length !== 2) {
    throw new Error("Match scoring requires exactly two teams.");
  }

  if (input.players.length !== 4) {
    throw new Error("Match scoring requires exactly four player entries.");
  }

  const players = input.players.map((player) => ({
    ...player,
    strokesByHole: Object.fromEntries(
      Object.entries(player.strokesByHole).map(([holeNumber, strokes]) => [
        Number(holeNumber),
        Math.min(maxStrokesPerHole, Number(strokes) || 0)
      ])
    )
  }));
  const snapshotsByPlayerId = Object.fromEntries(
    players.map((player) => [player.playerId, player])
  );
  const playersByTeam = players.reduce<Record<string, PlayerHandicapSnapshot[]>>(
    (accumulator, player) => {
      if (!accumulator[player.teamId]) {
        accumulator[player.teamId] = [];
      }

      accumulator[player.teamId].push(player);
      return accumulator;
    },
    {}
  );
  const holePointTotals = Object.fromEntries(teamIds.map((teamId) => [teamId, 0]));
  const holeWins = Object.fromEntries(teamIds.map((teamId) => [teamId, 0]));
  const betterBallGrossTotals = Object.fromEntries(teamIds.map((teamId) => [teamId, 0]));
  const betterBallNetTotals = Object.fromEntries(teamIds.map((teamId) => [teamId, 0]));

  const holes = input.holeScores.map((holeScore: HoleScoreInput) => {
    const playerNetScores: Record<string, number> = {};
    const teamBetterBallGross: Record<string, number> = {};
    const teamBetterBallNet: Record<string, number> = {};

    for (const player of players) {
      const gross = holeScore.scores[player.playerId];

      if (gross == null) {
        throw new Error(`Missing gross score for player ${player.playerId} on hole ${holeScore.holeNumber}.`);
      }

      const strokeCount = snapshotsByPlayerId[player.playerId]?.strokesByHole[holeScore.holeNumber] ?? 0;
      playerNetScores[player.playerId] = gross - strokeCount;
    }

    for (const teamId of teamIds) {
      const teamPlayers = playersByTeam[teamId];
      const grossScores = teamPlayers.map((player) => {
        const gross = holeScore.scores[player.playerId];

        if (gross == null) {
          throw new Error("Expected gross score to exist for each team player.");
        }

        return gross;
      });
      const netScores = teamPlayers.map((player) => playerNetScores[player.playerId]);

      teamBetterBallGross[teamId] = Math.min(...grossScores);
      teamBetterBallNet[teamId] = Math.min(...netScores);
      betterBallGrossTotals[teamId] += teamBetterBallGross[teamId];
      betterBallNetTotals[teamId] += teamBetterBallNet[teamId];
    }

    const [teamAId, teamBId] = teamIds;
    let winningTeamId: string | null = null;
    const teamPoints: Record<string, number> = {
      [teamAId]: 0.5,
      [teamBId]: 0.5
    };

    if (teamBetterBallNet[teamAId] < teamBetterBallNet[teamBId]) {
      winningTeamId = teamAId;
      teamPoints[teamAId] = 1;
      teamPoints[teamBId] = 0;
      holeWins[teamAId] += 1;
    } else if (teamBetterBallNet[teamBId] < teamBetterBallNet[teamAId]) {
      winningTeamId = teamBId;
      teamPoints[teamAId] = 0;
      teamPoints[teamBId] = 1;
      holeWins[teamBId] += 1;
    }

    for (const teamId of teamIds) {
      holePointTotals[teamId] += teamPoints[teamId];
    }

    return {
      holeNumber: holeScore.holeNumber,
      teamPoints,
      teamBetterBallGross,
      teamBetterBallNet,
      winningTeamId,
      playerNetScores
    };
  });

  const teamSummaries = summarizeTeamResults(
    teamIds,
    holePointTotals,
    holeWins,
    betterBallGrossTotals,
    betterBallNetTotals
  );
  const winningTeamId =
    teamSummaries.find((summary) => summary.resultCode === "WIN")?.teamId ?? null;
  const lowPlayerId =
    input.lowPlayerId ??
    players.reduce((lowest, player) =>
      player.courseHandicap < lowest.courseHandicap ? player : lowest
    ).playerId;

  return {
    allowancePct,
    maxStrokesPerHole,
    lowPlayerId,
    winningTeamId,
    players,
    holes,
    teamSummaries
  };
}

export function scoreMatch(input: MatchScoringInput): MatchScoringResult {
  validateScoringInput(input);

  const preview = buildMatchPlayerSnapshots({
    allowancePct: input.allowancePct,
    maxStrokesPerHole: input.maxStrokesPerHole,
    players: input.players
  });
  return scoreWithSnapshots({
    players: preview.players,
    holeScores: input.holeScores,
    allowancePct: preview.allowancePct,
    maxStrokesPerHole: preview.maxStrokesPerHole,
    lowPlayerId: preview.lowPlayerId
  });
}

export function scorePublishedMatch(input: {
  players: PlayerHandicapSnapshot[];
  holeScores: HoleScoreInput[];
  allowancePct?: number;
  maxStrokesPerHole?: number;
  lowPlayerId?: string;
}): MatchScoringResult {
  return scoreWithSnapshots(input);
}

export function scoreForfeit(input: ForfeitScoringInput): TeamMatchSummary[] {
  const awardedPoints = input.awardedPoints ?? 12;
  const awardedHolesWon = input.awardedHolesWon ?? 6;

  return [
    {
      teamId: input.winnerTeamId,
      totalPoints: awardedPoints,
      holesWon: awardedHolesWon,
      betterBallGrossTotal: null,
      betterBallNetTotal: null,
      resultCode: "FORFEIT_WIN"
    },
    {
      teamId: input.loserTeamId,
      totalPoints: 0,
      holesWon: 0,
      betterBallGrossTotal: null,
      betterBallNetTotal: null,
      resultCode: "FORFEIT_LOSS"
    }
  ];
}
