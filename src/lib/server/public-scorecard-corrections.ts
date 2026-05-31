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
  "Andrew Rausch": [6, 5, 5, 5, 5, 3, 6, 5, 6, 2, 4, 4, 5, 4, 4, 3, 4, 4],
  "Brandon Grant": [6, 7, 4, 5, 5, 4, 5, 6, 6, 3, 5, 7, 5, 3, 4, 5, 8, 6],
  "Ross Agins": [8, 5, 6, 5, 7, 4, 8, 4, 7, 3, 5, 6, 5, 3, 4, 5, 8, 5],
  "Noah Deutsch": [7, 5, 4, 6, 3, 3, 6, 5, 5, 5, 5, 4, 5, 5, 6, 7, 6, 7]
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
