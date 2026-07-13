import type { Prisma } from "@prisma/client";
import { scoreForfeit, scoreMatch } from "@/lib/scoring/engine";
import { getMatchPlayDecision } from "@/lib/scoring/match-play";
import type {
  PlayerHandicapSnapshot,
  TeamMatchSummary
} from "@/lib/scoring/types";
import { normalizeKnownCourseHoles } from "@/lib/server/course-hole-corrections";
import {
  applyComputedPublicScorecardCorrections,
  applyPublicScorecardCorrections
} from "@/lib/server/public-scorecard-corrections";
import { applyOfficialResultToTeamSummaries } from "@/lib/server/standings";

export const OFFICIAL_RESULT_SNAPSHOT_VERSION = 1;

export type OfficialResultSnapshotPlayer = PlayerHandicapSnapshot & {
  grossByHole: Record<number, number>;
  netByHole: Record<number, number | null>;
};

export type OfficialResultSnapshotHole = {
  holeNumber: number;
  teamPoints: Record<string, number>;
  teamBetterBallGross: Record<string, number>;
  teamBetterBallNet: Record<string, number>;
  winningTeamId: string | null;
  playerNetScores: Record<string, number | null>;
  par?: number;
  strokeIndex?: number;
  yardage?: number | null;
};

export type OfficialResultSnapshot = {
  version: typeof OFFICIAL_RESULT_SNAPSHOT_VERSION;
  generatedAt: string;
  winningTeamId: string | null;
  allowancePct: number;
  maxStrokesPerHole: number;
  lowPlayerId: string | null;
  teamSummaries: TeamMatchSummary[];
  holes: OfficialResultSnapshotHole[];
  players: OfficialResultSnapshotPlayer[];
  holeMeta: Array<{
    holeNumber: number;
    par: number;
    strokeIndex: number;
    yardage: number | null;
  }>;
};

type MatchHole = {
  holeNumber: number;
  par: number;
  strokeIndex: number;
  yardage?: number | null;
};

type MatchForOfficialResult = {
  id: string;
  publicScorecardSlug: string;
  stage: string;
  status: string;
  winningTeamId: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  officialResultSnapshot?: unknown;
  tournament: {
    forfeitPointsAwarded: number;
    forfeitHolesWonAwarded: number;
  };
  playerSelections: Array<{
    playerId: string;
    teamId: string;
    teeId: string;
    teeNameSnapshot: string;
    handicapIndexSnapshot: unknown;
    slopeSnapshot: number;
    courseRatingSnapshot: unknown;
    parSnapshot: number;
    player: {
      displayName: string;
    };
    tee: {
      holes: MatchHole[];
    };
  }>;
  holeScores: Array<{
    holeNumber: number;
    playerId: string;
    grossScore: number;
  }>;
};

type SnapshotScorecard = {
  allowancePct?: number;
  maxStrokesPerHole?: number;
  lowPlayerId?: string | null;
  teamSummaries: TeamMatchSummary[];
  holes: Array<Omit<OfficialResultSnapshotHole, "teamBetterBallGross" | "playerNetScores"> & {
    teamBetterBallGross?: Record<string, number>;
    playerNetScores?: Record<string, number | null>;
  }>;
  players: Array<Partial<PlayerHandicapSnapshot> & {
    playerId: string;
    playerName: string;
    teamId: string;
    teeId?: string;
    teeName: string;
    handicapIndex: number;
    matchStrokeCount: number;
    strokesByHole: Record<number, number>;
  }>;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function hasSnapshotShape(value: unknown): value is OfficialResultSnapshot {
  if (!isObject(value)) {
    return false;
  }

  return (
    value.version === OFFICIAL_RESULT_SNAPSHOT_VERSION &&
    typeof value.generatedAt === "string" &&
    (typeof value.winningTeamId === "string" || value.winningTeamId === null) &&
    Array.isArray(value.teamSummaries) &&
    Array.isArray(value.holes) &&
    Array.isArray(value.players) &&
    Array.isArray(value.holeMeta)
  );
}

export function parseOfficialResultSnapshot(value: unknown): OfficialResultSnapshot | null {
  if (!hasSnapshotShape(value)) {
    return null;
  }

  return value;
}

export function officialResultSnapshotToJson(
  snapshot: OfficialResultSnapshot
): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(snapshot)) as Prisma.InputJsonObject;
}

function buildSnapshotFromScorecard(input: {
  generatedAt?: Date;
  scorecard: SnapshotScorecard;
  winningTeamId: string | null;
  playerSelections: MatchForOfficialResult["playerSelections"];
  holeScores: MatchForOfficialResult["holeScores"];
  holeMeta: OfficialResultSnapshot["holeMeta"];
}): OfficialResultSnapshot {
  return {
    version: OFFICIAL_RESULT_SNAPSHOT_VERSION,
    generatedAt: (input.generatedAt ?? new Date()).toISOString(),
    winningTeamId: input.winningTeamId,
    allowancePct: input.scorecard.allowancePct ?? 0.9,
    maxStrokesPerHole: input.scorecard.maxStrokesPerHole ?? 1,
    lowPlayerId: input.scorecard.lowPlayerId ?? null,
    teamSummaries: input.scorecard.teamSummaries,
    holes: input.scorecard.holes.map((hole) => ({
      ...hole,
      teamBetterBallGross: hole.teamBetterBallGross ?? {},
      playerNetScores: hole.playerNetScores ?? {}
    })),
    holeMeta: input.holeMeta,
    players: input.playerSelections.map((selection) => {
      const snapshot = input.scorecard.players.find((player) => player.playerId === selection.playerId);
      const grossByHole = Object.fromEntries(
        input.holeScores
          .filter((holeScore) => holeScore.playerId === selection.playerId)
          .map((holeScore) => [holeScore.holeNumber, holeScore.grossScore])
      );

      return {
        playerId: selection.playerId,
        playerName: selection.player.displayName,
        teamId: selection.teamId,
        teeId: snapshot?.teeId ?? selection.teeId,
        teeName: selection.teeNameSnapshot,
        handicapIndex: Number(selection.handicapIndexSnapshot),
        courseHandicap: snapshot?.courseHandicap ?? 0,
        playingHandicap: snapshot?.playingHandicap ?? 0,
        matchStrokeCount: snapshot?.matchStrokeCount ?? 0,
        strokesByHole: snapshot?.strokesByHole ?? {},
        grossByHole,
        netByHole: Object.fromEntries(
          input.scorecard.holes.map((hole) => [
            hole.holeNumber,
            hole.playerNetScores?.[selection.playerId] ?? null
          ])
        )
      };
    })
  };
}

function buildForfeitSnapshot(
  match: MatchForOfficialResult,
  generatedAt?: Date
): OfficialResultSnapshot | null {
  if (!match.winningTeamId || !match.homeTeamId || !match.awayTeamId) {
    return null;
  }

  const loserTeamId = match.winningTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;

  return {
    version: OFFICIAL_RESULT_SNAPSHOT_VERSION,
    generatedAt: (generatedAt ?? new Date()).toISOString(),
    winningTeamId: match.winningTeamId,
    allowancePct: 0.9,
    maxStrokesPerHole: 1,
    lowPlayerId: null,
    teamSummaries: scoreForfeit({
      winnerTeamId: match.winningTeamId,
      loserTeamId,
      awardedPoints: match.tournament.forfeitPointsAwarded,
      awardedHolesWon: match.tournament.forfeitHolesWonAwarded
    }),
    holes: [],
    players: [],
    holeMeta: []
  };
}

export function buildManualMatchPlaySnapshot(input: {
  homeTeamId: string;
  awayTeamId: string;
  winningTeamId: string;
  lead: number;
  holesRemaining: number;
  playedHoleCount: number;
  generatedAt?: Date;
}): OfficialResultSnapshot | null {
  if (input.winningTeamId !== input.homeTeamId && input.winningTeamId !== input.awayTeamId) {
    return null;
  }

  const losingTeamId = input.winningTeamId === input.homeTeamId ? input.awayTeamId : input.homeTeamId;
  const playedHoleCount = Math.min(18, Math.max(1, input.playedHoleCount));
  const lead = Math.min(18, Math.max(0, input.lead));
  const winnerPoints = (playedHoleCount + lead) / 2;
  const loserPoints = playedHoleCount - winnerPoints;
  const teamSummaries: TeamMatchSummary[] = [
    {
      teamId: input.winningTeamId,
      totalPoints: winnerPoints,
      holesWon: lead,
      betterBallGrossTotal: null,
      betterBallNetTotal: null,
      resultCode: "WIN"
    },
    {
      teamId: losingTeamId,
      totalPoints: loserPoints,
      holesWon: 0,
      betterBallGrossTotal: null,
      betterBallNetTotal: null,
      resultCode: "LOSS"
    }
  ];
  const holes = Array.from({ length: playedHoleCount }, (_, index) => {
    const holeNumber = index + 1;

    return {
      holeNumber,
      teamPoints: {},
      teamBetterBallGross: {},
      teamBetterBallNet: {},
      winningTeamId: null,
      playerNetScores: {}
    };
  });

  return {
    version: OFFICIAL_RESULT_SNAPSHOT_VERSION,
    generatedAt: (input.generatedAt ?? new Date()).toISOString(),
    winningTeamId: input.winningTeamId,
    allowancePct: 0.9,
    maxStrokesPerHole: 1,
    lowPlayerId: null,
    teamSummaries,
    holes,
    players: [],
    holeMeta: holes.map((hole) => ({
      holeNumber: hole.holeNumber,
      par: 4,
      strokeIndex: hole.holeNumber,
      yardage: null
    }))
  };
}

export function computeOfficialResultSnapshotForMatch(
  match: MatchForOfficialResult,
  options?: { generatedAt?: Date }
): OfficialResultSnapshot | null {
  const correctedMatch = applyPublicScorecardCorrections(match) as MatchForOfficialResult;

  if (correctedMatch.status === "FORFEIT") {
    return buildForfeitSnapshot(correctedMatch, options?.generatedAt);
  }

  if (correctedMatch.playerSelections.length !== 4) {
    return null;
  }

  const holesTemplate = normalizeKnownCourseHoles(correctedMatch.playerSelections[0]?.tee.holes ?? []);
  const scoresByHole = new Map<number, Record<string, number | null>>();

  for (const hole of holesTemplate) {
    scoresByHole.set(
      hole.holeNumber,
      Object.fromEntries(correctedMatch.playerSelections.map((selection) => [selection.playerId, null]))
    );
  }

  for (const holeScore of correctedMatch.holeScores) {
    const scores = scoresByHole.get(holeScore.holeNumber);

    if (scores) {
      scores[holeScore.playerId] = holeScore.grossScore;
    }
  }

  const scoredHoleNumbers = holesTemplate
    .map((hole) => hole.holeNumber)
    .filter((holeNumber) => {
      const scores = scoresByHole.get(holeNumber);

      return (
        scores != null &&
        correctedMatch.playerSelections.every((selection) => typeof scores[selection.playerId] === "number")
      );
    });
  const hasCompleteScores = scoredHoleNumbers.length === holesTemplate.length;
  const isPlayoffMatch = correctedMatch.stage !== "POD_PLAY";

  if (!hasCompleteScores && !isPlayoffMatch) {
    return null;
  }

  if (isPlayoffMatch && scoredHoleNumbers.length === 0) {
    return null;
  }

  const scoredHoleNumberSet = new Set(isPlayoffMatch ? scoredHoleNumbers : holesTemplate.map((hole) => hole.holeNumber));
  const scoredHolesTemplate = holesTemplate.filter((hole) => scoredHoleNumberSet.has(hole.holeNumber));

  const scored = scoreMatch({
    players: correctedMatch.playerSelections.map((selection) => ({
      playerId: selection.playerId,
      playerName: selection.player.displayName,
      teamId: selection.teamId,
      handicapIndex: Number(selection.handicapIndexSnapshot),
      teeId: selection.teeId,
      teeName: selection.teeNameSnapshot,
      slope: selection.slopeSnapshot,
      courseRating: Number(selection.courseRatingSnapshot),
      par: selection.parSnapshot,
      holes: normalizeKnownCourseHoles(selection.tee.holes).map((hole) => ({
        holeNumber: hole.holeNumber,
        par: hole.par,
        strokeIndex: hole.strokeIndex
      }))
    })),
    holeScores: scoredHolesTemplate.map((hole) => ({
      holeNumber: hole.holeNumber,
      scores: scoresByHole.get(hole.holeNumber) ?? {}
    }))
  });
  const matchPlayDecision = getMatchPlayDecision({
    teamSummaries: scored.teamSummaries,
    playedHoleCount: scoredHolesTemplate.length,
    totalHoleCount: holesTemplate.length,
    winningTeamId: correctedMatch.winningTeamId
  });

  if (isPlayoffMatch && !matchPlayDecision.isComplete) {
    return null;
  }

  const holeMeta = scoredHolesTemplate.map((hole) => ({
    holeNumber: hole.holeNumber,
    par: hole.par,
    strokeIndex: hole.strokeIndex,
    yardage: hole.yardage ?? null
  }));
  const correctedScored = applyComputedPublicScorecardCorrections(correctedMatch.id, {
    ...scored,
    holeMeta,
    players: buildSnapshotFromScorecard({
      scorecard: scored,
      winningTeamId: scored.winningTeamId,
      playerSelections: correctedMatch.playerSelections,
      holeScores: correctedMatch.holeScores,
      holeMeta
    }).players
  });
  const officialScorecard = {
    ...scored,
    ...correctedScored,
    teamSummaries: applyOfficialResultToTeamSummaries(
      correctedScored.teamSummaries,
      correctedMatch.winningTeamId
    )
  };
  const officialWinningTeamId =
    (isPlayoffMatch ? matchPlayDecision.winningTeamId : null) ??
    correctedMatch.winningTeamId ??
    officialScorecard.teamSummaries.find((summary) => summary.resultCode === "WIN")?.teamId ??
    null;

  return buildSnapshotFromScorecard({
    generatedAt: options?.generatedAt,
    scorecard: officialScorecard,
    winningTeamId: officialWinningTeamId,
    playerSelections: correctedMatch.playerSelections,
    holeScores: correctedMatch.holeScores,
    holeMeta
  });
}

export function getOfficialResultSnapshotForMatch(
  match: MatchForOfficialResult
): OfficialResultSnapshot | null {
  if (match.status === "FINAL" || match.status === "FORFEIT") {
    const snapshot = parseOfficialResultSnapshot(match.officialResultSnapshot);

    if (snapshot) {
      return snapshot;
    }
  }

  return computeOfficialResultSnapshotForMatch(match);
}
