export interface SubmittedScoreRow {
  holeNumber?: unknown;
  scores?: Record<string, unknown>;
}

export function validateSubmittedScoreRows(input: {
  scores: SubmittedScoreRow[];
  playerIds: string[];
  holeTemplate: Array<{ holeNumber: number }>;
  action: "saveDraft" | "publish";
}) {
  const allowedHoleNumbers = new Set(input.holeTemplate.map((hole) => hole.holeNumber));
  const allowedPlayerIds = new Set(input.playerIds);
  const seenHoleNumbers = new Set<number>();
  const persistedRows: Array<{
    id: string;
    matchId: string;
    playerId: string;
    holeNumber: number;
    grossScore: number;
  }> = [];

  if (input.holeTemplate.length !== 18) {
    throw new Error("This scorecard is missing its 18-hole template. Re-run setup before scoring.");
  }

  if (input.scores.length === 0) {
    throw new Error("No scores were submitted.");
  }

  for (const hole of input.scores) {
    const holeNumber = Number(hole?.holeNumber);
    const values = hole?.scores ?? {};

    if (!Number.isInteger(holeNumber) || !allowedHoleNumbers.has(holeNumber)) {
      throw new Error("Each score row must include a valid hole number from this scorecard.");
    }

    if (seenHoleNumbers.has(holeNumber)) {
      throw new Error(`Hole ${holeNumber} was submitted more than once.`);
    }

    seenHoleNumbers.add(holeNumber);

    const submittedPlayerIds = Object.keys(values);
    const unknownPlayerIds = submittedPlayerIds.filter((playerId) => !allowedPlayerIds.has(playerId));

    if (unknownPlayerIds.length > 0) {
      throw new Error("Submitted scores included a player who is not part of this match.");
    }

    for (const playerId of input.playerIds) {
      const rawValue = values[playerId];

      if (rawValue == null || rawValue === "") {
        if (input.action === "publish") {
          throw new Error("All 18 holes must be filled in for every player before publishing.");
        }

        continue;
      }

      const grossScore = Number(rawValue);

      if (!Number.isInteger(grossScore) || grossScore < 1 || grossScore > 20) {
        throw new Error("Gross scores must be whole numbers between 1 and 20.");
      }

      persistedRows.push({
        id: `__MATCH_ID__-${playerId}-hole-${holeNumber}`,
        matchId: "__MATCH_ID__",
        playerId,
        holeNumber,
        grossScore
      });
    }
  }

  if (input.action === "publish") {
    const missingHoleNumbers = input.holeTemplate
      .map((hole) => hole.holeNumber)
      .filter((holeNumber) => !seenHoleNumbers.has(holeNumber));

    if (missingHoleNumbers.length > 0) {
      throw new Error("All 18 holes must be submitted before publishing.");
    }
  }

  return persistedRows;
}

export function buildPublishedHoleScores(input: {
  playerIds: string[];
  holeTemplate: Array<{ holeNumber: number }>;
  persistedRows: Array<{ playerId: string; holeNumber: number; grossScore: number }>;
}) {
  return input.holeTemplate.map((hole) => ({
    holeNumber: hole.holeNumber,
    scores: Object.fromEntries(
      input.playerIds.map((playerId) => {
        const saved = input.persistedRows.find(
          (row) => row.playerId === playerId && row.holeNumber === hole.holeNumber
        );

        return [playerId, saved?.grossScore ?? null];
      })
    )
  }));
}
