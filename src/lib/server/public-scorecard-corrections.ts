type MatchHole = {
  holeNumber: number;
  par: number;
  strokeIndex: number;
  yardage?: number | null;
};

type MatchPlayerSelection = {
  playerId: string;
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

const correctedGrossScoresByPlayerName: Record<string, number[]> = {
  "Andrew Rausch": [6, 5, 5, 5, 5, 3, 6, 5, 6, 3, 4, 4, 5, 4, 4, 3, 3, 4],
  "Brandon Grant": [6, 7, 4, 5, 5, 4, 5, 6, 6, 5, 5, 7, 5, 3, 4, 3, 4, 7],
  "Ross Agins": [8, 5, 6, 5, 7, 4, 8, 4, 7, 3, 6, 6, 5, 3, 4, 5, 8, 5],
  "Noah Deutsch": [7, 5, 4, 6, 4, 3, 6, 5, 5, 5, 5, 4, 5, 5, 6, 7, 6, 7]
};

function isHeritageOaksCorrectionTarget(match: CorrectablePublicMatch) {
  return HERITAGE_OAKS_CORRECTED_MATCH_IDS.has(match.id) ||
    HERITAGE_OAKS_CORRECTED_MATCH_IDS.has(match.publicScorecardSlug);
}

export function applyPublicScorecardCorrections<T extends CorrectablePublicMatch>(match: T): T {
  if (!isHeritageOaksCorrectionTarget(match)) {
    return match;
  }

  const allPlayersPresent = match.playerSelections.every(
    (selection) => correctedGrossScoresByPlayerName[selection.player.displayName]?.length === 18
  );

  if (!allPlayersPresent) {
    return match;
  }

  return {
    ...match,
    playerSelections: match.playerSelections.map((selection) => ({
      ...selection,
      tee: {
        ...selection.tee,
        holes: selection.tee.holes.map((hole) =>
          hole.holeNumber === 9
            ? {
                ...hole,
                par: 5
              }
            : hole
        )
      }
    })),
    holeScores: match.playerSelections.flatMap((selection) => {
      const grossScores = correctedGrossScoresByPlayerName[selection.player.displayName];

      return grossScores.map((grossScore, index) => ({
        holeNumber: index + 1,
        playerId: selection.playerId,
        grossScore
      }));
    })
  };
}
