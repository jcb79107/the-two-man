import { normalizeKnownCourseHoles } from "@/lib/server/course-hole-corrections";

type MatchHole = {
  holeNumber: number;
  par: number;
  strokeIndex: number;
  yardage?: number | null;
};

type MatchPlayerSelection = {
  playerId: string;
  teeId: string;
  teeNameSnapshot: string;
  slopeSnapshot: number;
  courseRatingSnapshot: unknown;
  parSnapshot: number;
  player: {
    displayName: string;
  };
  tee: {
    holes: MatchHole[];
  };
};

type MatchHoleScore = {
  holeNumber: number;
  playerId: string;
  grossScore: number;
};

type ComputedPlayer = {
  playerId: string;
  playerName: string;
  teamId: string;
  teeName: string;
  handicapIndex: number;
  matchStrokeCount: number;
  strokesByHole: Record<number, number>;
  grossByHole: Record<number, number>;
  netByHole: Record<number, number | null>;
};

type ComputedHole = {
  holeNumber: number;
  teamPoints: Record<string, number>;
  teamBetterBallGross?: Record<string, number>;
  teamBetterBallNet: Record<string, number>;
  winningTeamId: string | null;
  playerNetScores?: Record<string, number | null>;
};

type ComputedSummary = {
  teamId: string;
  totalPoints: number;
  holesWon: number;
  betterBallGrossTotal: number | null;
  betterBallNetTotal: number | null;
  resultCode: ComputedResultCode;
};

type ComputedResultCode = "WIN" | "LOSS" | "TIE" | "FORFEIT_WIN" | "FORFEIT_LOSS";

type ComputedScorecard = {
  players: ComputedPlayer[];
  holes: ComputedHole[];
  teamSummaries: ComputedSummary[];
  holeMeta?: Array<{
    holeNumber: number;
    par: number;
    strokeIndex: number;
    yardage: number | null;
  }>;
};

type CorrectablePublicMatch = {
  id: string;
  publicScorecardSlug: string;
  playerSelections: MatchPlayerSelection[];
  holeScores: MatchHoleScore[];
};

const HERITAGE_OAKS_CORRECTED_MATCH_IDS = new Set([
  "a9ba0d7cbda94ddda8a7a",
  "pod-1-match-3-a9ba0d7cbda94ddda8a7a"
]);

const BRIARWOOD_CORRECTED_MATCH_IDS = new Set([
  "f13e674887224826adc18"
]);

const BRYN_MAWR_HOLWAY_CHASE_CORRECTED_MATCH_IDS = new Set([
  "790d2420711943629dafc"
]);

const BRYN_MAWR_DAITCH_REIMER_TIE_CORRECTED_MATCH_IDS = new Set([
  "5d58d0c0b37f4b87a570a"
]);

const SUNSET_STONE_RABIN_CORRECTED_MATCH_IDS = new Set([
  "a33ade26035147989b239"
]);

const BRIARWOOD_II_TEE_HOLES: MatchHole[] = [
  { holeNumber: 1, par: 4, strokeIndex: 7, yardage: 410 },
  { holeNumber: 2, par: 4, strokeIndex: 11, yardage: 375 },
  { holeNumber: 3, par: 5, strokeIndex: 1, yardage: 545 },
  { holeNumber: 4, par: 3, strokeIndex: 15, yardage: 195 },
  { holeNumber: 5, par: 5, strokeIndex: 13, yardage: 520 },
  { holeNumber: 6, par: 4, strokeIndex: 9, yardage: 380 },
  { holeNumber: 7, par: 4, strokeIndex: 5, yardage: 400 },
  { holeNumber: 8, par: 3, strokeIndex: 17, yardage: 175 },
  { holeNumber: 9, par: 4, strokeIndex: 3, yardage: 420 },
  { holeNumber: 10, par: 4, strokeIndex: 10, yardage: 370 },
  { holeNumber: 11, par: 3, strokeIndex: 16, yardage: 150 },
  { holeNumber: 12, par: 4, strokeIndex: 2, yardage: 435 },
  { holeNumber: 13, par: 5, strokeIndex: 14, yardage: 490 },
  { holeNumber: 14, par: 4, strokeIndex: 6, yardage: 370 },
  { holeNumber: 15, par: 3, strokeIndex: 18, yardage: 175 },
  { holeNumber: 16, par: 4, strokeIndex: 4, yardage: 400 },
  { holeNumber: 17, par: 4, strokeIndex: 8, yardage: 380 },
  { holeNumber: 18, par: 4, strokeIndex: 12, yardage: 380 }
];

const correctedGrossScoresByPlayerName: Record<string, number[]> = {
  "Andrew Rausch": [6, 5, 5, 5, 5, 3, 6, 5, 6, 2, 4, 4, 5, 4, 4, 3, 4, 4],
  "Brandon Grant": [6, 7, 4, 5, 5, 4, 5, 6, 6, 3, 5, 7, 5, 3, 4, 5, 8, 6],
  "Ross Agins": [8, 5, 6, 5, 7, 4, 8, 4, 7, 3, 5, 6, 5, 3, 4, 5, 8, 5],
  "Noah Deutsch": [7, 5, 4, 6, 3, 3, 6, 5, 5, 5, 5, 4, 5, 5, 6, 7, 6, 7]
};

function isHeritageOaksCorrectionTarget(match: CorrectablePublicMatch) {
  return HERITAGE_OAKS_CORRECTED_MATCH_IDS.has(match.id) ||
    HERITAGE_OAKS_CORRECTED_MATCH_IDS.has(match.publicScorecardSlug);
}

function isBriarwoodCorrectionTarget(matchId: string) {
  return BRIARWOOD_CORRECTED_MATCH_IDS.has(matchId);
}

function isBrynMawrHolwayChaseCorrectionTarget(match: CorrectablePublicMatch) {
  return BRYN_MAWR_HOLWAY_CHASE_CORRECTED_MATCH_IDS.has(match.id) ||
    BRYN_MAWR_HOLWAY_CHASE_CORRECTED_MATCH_IDS.has(match.publicScorecardSlug);
}

function isBrynMawrDaitchReimerTieCorrectionTarget(matchId: string) {
  return BRYN_MAWR_DAITCH_REIMER_TIE_CORRECTED_MATCH_IDS.has(matchId);
}

function isSunsetStoneRabinCorrectionTarget(match: CorrectablePublicMatch) {
  return SUNSET_STONE_RABIN_CORRECTED_MATCH_IDS.has(match.id) ||
    SUNSET_STONE_RABIN_CORRECTED_MATCH_IDS.has(match.publicScorecardSlug);
}

export function applyPublicScorecardCorrections<T extends CorrectablePublicMatch>(match: T): T {
  const normalizedSelections = match.playerSelections.map((selection) => ({
    ...selection,
    tee: {
      ...selection.tee,
      holes: normalizeKnownCourseHoles(selection.tee.holes)
    }
  }));

  if (isHeritageOaksCorrectionTarget(match)) {
    const allPlayersPresent = normalizedSelections.every(
      (selection) => correctedGrossScoresByPlayerName[selection.player.displayName]?.length === 18
    );

    if (!allPlayersPresent) {
      return match;
    }

    return {
      ...match,
      playerSelections: normalizedSelections.map((selection) => ({
        ...selection,
        teeId: "usga-7437-612687",
        teeNameSnapshot: "Maroon",
        slopeSnapshot: 125,
        courseRatingSnapshot: 68.9,
        parSnapshot: 70,
        tee: {
          ...selection.tee,
          holes: selection.tee.holes.map((hole) =>
            hole.holeNumber === 9
              ? {
                  ...hole,
                  par: 4
                }
              : hole
          )
        }
      })),
      holeScores: normalizedSelections.flatMap((selection) => {
        const grossScores = correctedGrossScoresByPlayerName[selection.player.displayName];

        return grossScores.map((grossScore, index) => ({
          holeNumber: index + 1,
          playerId: selection.playerId,
          grossScore
        }));
      })
    };
  }

  if (isBrynMawrHolwayChaseCorrectionTarget(match)) {
    const chaseSelection = normalizedSelections.find((selection) =>
      /\bChase$/i.test(selection.player.displayName.trim())
    );

    if (!chaseSelection) {
      return {
        ...match,
        playerSelections: normalizedSelections
      };
    }

    return {
      ...match,
      playerSelections: normalizedSelections,
      holeScores: match.holeScores.map((score) =>
        score.playerId === chaseSelection.playerId &&
        score.holeNumber === 17 &&
        score.grossScore === 5
          ? {
              ...score,
              grossScore: 6
            }
          : score
      )
    };
  }

  if (isSunsetStoneRabinCorrectionTarget(match)) {
    const rabinSelection = normalizedSelections.find((selection) =>
      /\bRabin$/i.test(selection.player.displayName.trim())
    );

    if (!rabinSelection) {
      return {
        ...match,
        playerSelections: normalizedSelections
      };
    }

    return {
      ...match,
      playerSelections: normalizedSelections,
      holeScores: match.holeScores.map((score) =>
        score.playerId === rabinSelection.playerId &&
        score.holeNumber === 18 &&
        score.grossScore === 5
          ? {
              ...score,
              grossScore: 6
            }
          : score
      )
    };
  }

  if (!isBriarwoodCorrectionTarget(match.id) && !isBriarwoodCorrectionTarget(match.publicScorecardSlug)) {
    return {
      ...match,
      playerSelections: normalizedSelections
    };
  }

  return {
    ...match,
    playerSelections: normalizedSelections.map((selection) => ({
      ...selection,
      teeNameSnapshot: "II",
      tee: {
        ...selection.tee,
        holes: BRIARWOOD_II_TEE_HOLES
      }
    }))
  };
}

const briarwoodStrokeOverrides: Record<string, { handicapIndex: number; playerName?: string; strokeHoles: number[] }> = {
  "team-04-player-1": { handicapIndex: 3.6, playerName: "Zach Nankin", strokeHoles: [] },
  "team-04-player-2": { handicapIndex: 12.0, strokeHoles: [1, 3, 6, 7, 9, 12, 14, 16, 17] },
  "team-17-player-1": { handicapIndex: 11.0, playerName: "Zak Lieberman", strokeHoles: [1, 3, 7, 9, 12, 16] },
  "team-17-player-2": { handicapIndex: 11.8, strokeHoles: [1, 3, 7, 9, 12, 14, 16, 17] }
};

const brynMawrDaitchReimerStrokeOverrides: Array<{
  namePattern: RegExp;
  strokeHoles: number[];
}> = [
  { namePattern: /\bMalkin$/i, strokeHoles: [4] },
  { namePattern: /\bJolcol?ver$/i, strokeHoles: [4] },
  { namePattern: /\bDaitch$/i, strokeHoles: [2, 3, 4, 5, 6, 9, 10, 12, 13, 15, 17, 18] },
  { namePattern: /\bReimer$/i, strokeHoles: [] }
];

function resultCodeFor(teamId: string, teamPoints: Record<string, number>): ComputedResultCode {
  const entries = Object.entries(teamPoints).sort((a, b) => b[1] - a[1]);
  if (entries.length !== 2) {
    return "TIE";
  }

  if (entries[0][1] === entries[1][1]) {
    return "TIE";
  }

  return entries[0][0] === teamId ? "WIN" : "LOSS";
}

function applyStrokeOverride(
  player: ComputedPlayer,
  override: { handicapIndex?: number; playerName?: string; strokeHoles: number[] }
): ComputedPlayer {
  const strokeHoles = new Set(override.strokeHoles);
  const strokesByHole = Object.fromEntries(
    Object.keys(player.grossByHole).map((holeNumber) => {
      const hole = Number(holeNumber);
      return [hole, strokeHoles.has(hole) ? 1 : 0];
    })
  );
  const netByHole = Object.fromEntries(
    Object.entries(player.grossByHole).map(([holeNumber, gross]) => {
      const hole = Number(holeNumber);
      return [hole, typeof gross === "number" ? gross - (strokesByHole[hole] ?? 0) : null];
    })
  );

  return {
    ...player,
    playerName: override.playerName ?? player.playerName,
    handicapIndex: override.handicapIndex ?? player.handicapIndex,
    matchStrokeCount: override.strokeHoles.length,
    strokesByHole,
    netByHole
  };
}

function recomputeComputedScorecard(
  scorecard: ComputedScorecard,
  players: ComputedPlayer[],
  holeMeta?: ComputedScorecard["holeMeta"]
): ComputedScorecard {
  const teamIds = [...new Set(players.map((player) => player.teamId))];

  if (teamIds.length !== 2) {
    return {
      ...scorecard,
      players
    };
  }

  const teamPoints: Record<string, number> = Object.fromEntries(teamIds.map((teamId) => [teamId, 0]));
  const holesWon: Record<string, number> = Object.fromEntries(teamIds.map((teamId) => [teamId, 0]));
  const betterBallGrossTotals: Record<string, number> = Object.fromEntries(teamIds.map((teamId) => [teamId, 0]));
  const betterBallNetTotals: Record<string, number> = Object.fromEntries(teamIds.map((teamId) => [teamId, 0]));
  const holeMetaByNumber = new Map((holeMeta ?? scorecard.holeMeta ?? []).map((hole) => [hole.holeNumber, hole]));

  const holes = scorecard.holes.map((hole) => {
    const teamBetterBallGross = Object.fromEntries(
      teamIds.map((teamId) => [
        teamId,
        Math.min(
          ...players
            .filter((player) => player.teamId === teamId)
            .map((player) => player.grossByHole[hole.holeNumber])
        )
      ])
    );
    const playerNetScores = Object.fromEntries(
      players.map((player) => [player.playerId, player.netByHole[hole.holeNumber] ?? null])
    );
    const teamBetterBallNet = Object.fromEntries(
      teamIds.map((teamId) => [
        teamId,
        Math.min(
          ...players
            .filter((player) => player.teamId === teamId)
            .map((player) => player.netByHole[hole.holeNumber] ?? Number.POSITIVE_INFINITY)
        )
      ])
    );

    const [teamAId, teamBId] = teamIds;
    const teamA = teamBetterBallNet[teamAId];
    const teamB = teamBetterBallNet[teamBId];
    let winningTeamId: string | null = null;
    const holePoints: Record<string, number> = Object.fromEntries(teamIds.map((teamId) => [teamId, 0.5]));

    if (teamA < teamB) {
      winningTeamId = teamAId;
      holePoints[teamAId] = 1;
      holePoints[teamBId] = 0;
    } else if (teamB < teamA) {
      winningTeamId = teamBId;
      holePoints[teamAId] = 0;
      holePoints[teamBId] = 1;
    }

    for (const teamId of teamIds) {
      teamPoints[teamId] += holePoints[teamId];
      betterBallGrossTotals[teamId] += teamBetterBallGross[teamId];
      betterBallNetTotals[teamId] += teamBetterBallNet[teamId];
    }

    if (winningTeamId) {
      holesWon[winningTeamId] += 1;
    }

    const meta = holeMetaByNumber.get(hole.holeNumber);

    return {
      ...hole,
      par: meta?.par ?? (hole as ComputedHole & { par?: number }).par,
      strokeIndex: meta?.strokeIndex ?? (hole as ComputedHole & { strokeIndex?: number }).strokeIndex,
      yardage: meta?.yardage ?? (hole as ComputedHole & { yardage?: number | null }).yardage ?? null,
      teamPoints: holePoints,
      teamBetterBallGross,
      teamBetterBallNet,
      winningTeamId,
      playerNetScores
    };
  });

  return {
    ...scorecard,
    players,
    holes: holes as ComputedHole[],
    teamSummaries: teamIds.map((teamId) => ({
      teamId,
      totalPoints: teamPoints[teamId],
      holesWon: holesWon[teamId],
      betterBallGrossTotal: betterBallGrossTotals[teamId],
      betterBallNetTotal: betterBallNetTotals[teamId],
      resultCode: resultCodeFor(teamId, teamPoints)
    })),
    holeMeta: holeMeta ?? scorecard.holeMeta
  };
}

function applyBrynMawrDaitchReimerTieCorrection(scorecard: ComputedScorecard): ComputedScorecard {
  const players = scorecard.players.map((player) => {
    const override = brynMawrDaitchReimerStrokeOverrides.find((candidate) =>
      candidate.namePattern.test(player.playerName.trim())
    );

    return override ? applyStrokeOverride(player, override) : player;
  });
  const correctedPlayers = players.filter((player) =>
    brynMawrDaitchReimerStrokeOverrides.some((candidate) =>
      candidate.namePattern.test(player.playerName.trim())
    )
  );

  if (correctedPlayers.length !== 4) {
    return scorecard;
  }

  return recomputeComputedScorecard(scorecard, players);
}

export function applyComputedPublicScorecardCorrections(
  matchId: string,
  scorecard: ComputedScorecard
): ComputedScorecard {
  if (isBrynMawrDaitchReimerTieCorrectionTarget(matchId)) {
    return applyBrynMawrDaitchReimerTieCorrection(scorecard);
  }

  if (!isBriarwoodCorrectionTarget(matchId)) {
    return scorecard;
  }

  const players = scorecard.players.map((player) => {
    const override = briarwoodStrokeOverrides[player.playerId];

    if (!override) {
      return player;
    }

    return applyStrokeOverride(player, override);
  });

  const holeMeta = BRIARWOOD_II_TEE_HOLES.map((hole) => ({
    holeNumber: hole.holeNumber,
    par: hole.par,
    strokeIndex: hole.strokeIndex,
    yardage: hole.yardage ?? null
  }));
  const recomputed = recomputeComputedScorecard(scorecard, players, holeMeta);

  return {
    ...recomputed,
    players: recomputed.players.map((player) => ({
      ...player,
      teeName: "II"
    }))
  };
}
