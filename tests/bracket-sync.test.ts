import { describe, expect, it } from "vitest";

function deriveAdvancingSlot(input: {
  currentMatch: {
    status: string;
    winningTeamId: string | null;
    homeTeamId: string | null;
    awayTeamId: string | null;
    homeSeedNumber: number | null;
    awaySeedNumber: number | null;
  } | null;
  expectedMatch: {
    homeTeamId: string | null;
    awayTeamId: string | null;
    homeSeedNumber: number | null;
    awaySeedNumber: number | null;
  };
  fallbackLabel: string;
  teamNames: Record<string, string>;
}) {
  const match = input.currentMatch;

  if (
    !match ||
    (match.status !== "FINAL" && match.status !== "FORFEIT") ||
    !match.winningTeamId ||
    match.homeTeamId !== input.expectedMatch.homeTeamId ||
    match.awayTeamId !== input.expectedMatch.awayTeamId ||
    match.homeSeedNumber !== input.expectedMatch.homeSeedNumber ||
    match.awaySeedNumber !== input.expectedMatch.awaySeedNumber
  ) {
    return {
      teamId: null,
      seedNumber: null,
      label: input.fallbackLabel
    };
  }

  if (match.winningTeamId === match.homeTeamId) {
    return {
      teamId: match.homeTeamId,
      seedNumber: match.homeSeedNumber,
      label: match.homeTeamId ? input.teamNames[match.homeTeamId] ?? input.fallbackLabel : input.fallbackLabel
    };
  }

  if (match.winningTeamId === match.awayTeamId) {
    return {
      teamId: match.awayTeamId,
      seedNumber: match.awaySeedNumber,
      label: match.awayTeamId ? input.teamNames[match.awayTeamId] ?? input.fallbackLabel : input.fallbackLabel
    };
  }

  return {
    teamId: null,
    seedNumber: null,
    label: input.fallbackLabel
  };
}

function shouldResetMatch(input: {
  currentMatch: {
    homeTeamId: string | null;
    awayTeamId: string | null;
    homeSeedNumber: number | null;
    awaySeedNumber: number | null;
    homeSeedLabel: string | null;
    awaySeedLabel: string | null;
    bracketId: string | null;
    bracketRoundId: string | null;
    advancesToMatchId: string | null;
    advancesToSlot: string | null;
    roundLabel: string;
    stage: string;
    playerSelectionsCount: number;
    holeScoresCount: number;
    submittedAt: Date | null;
    finalizedAt: Date | null;
    winningTeamId: string | null;
    courseId: string | null;
    scheduledAt: Date | null;
  };
  expected: {
    homeTeamId: string | null;
    awayTeamId: string | null;
    homeSeedNumber: number | null;
    awaySeedNumber: number | null;
    homeSeedLabel: string | null;
    awaySeedLabel: string | null;
    bracketId: string | null;
    bracketRoundId: string | null;
    advancesToMatchId: string | null;
    advancesToSlot: string | null;
    roundLabel: string;
    stage: string;
  };
}) {
  const { currentMatch, expected } = input;
  const participantsChanged =
    currentMatch.homeTeamId !== expected.homeTeamId ||
    currentMatch.awayTeamId !== expected.awayTeamId ||
    currentMatch.homeSeedNumber !== expected.homeSeedNumber ||
    currentMatch.awaySeedNumber !== expected.awaySeedNumber;
  const shellChanged =
    currentMatch.homeSeedLabel !== expected.homeSeedLabel ||
    currentMatch.awaySeedLabel !== expected.awaySeedLabel ||
    currentMatch.bracketId !== expected.bracketId ||
    currentMatch.bracketRoundId !== expected.bracketRoundId ||
    currentMatch.advancesToMatchId !== expected.advancesToMatchId ||
    currentMatch.advancesToSlot !== expected.advancesToSlot ||
    currentMatch.roundLabel !== expected.roundLabel ||
    currentMatch.stage !== expected.stage;

  return (
    participantsChanged ||
    ((expected.homeTeamId == null || expected.awayTeamId == null) &&
      (currentMatch.homeTeamId != null ||
        currentMatch.awayTeamId != null ||
        currentMatch.playerSelectionsCount > 0 ||
        currentMatch.holeScoresCount > 0 ||
        currentMatch.submittedAt != null ||
        currentMatch.finalizedAt != null))
  );
}

describe("bracket advancement trust", () => {
  it("advances the winner only when the finalized quarterfinal still matches the expected seeded matchup", () => {
    const advanced = deriveAdvancingSlot({
      currentMatch: {
        status: "FINAL",
        winningTeamId: "team-1",
        homeTeamId: "team-1",
        awayTeamId: "team-8",
        homeSeedNumber: 1,
        awaySeedNumber: 8
      },
      expectedMatch: {
        homeTeamId: "team-1",
        awayTeamId: "team-8",
        homeSeedNumber: 1,
        awaySeedNumber: 8
      },
      fallbackLabel: "Winner of Quarterfinal 1",
      teamNames: {
        "team-1": "Alpha"
      }
    });

    expect(advanced).toEqual({
      teamId: "team-1",
      seedNumber: 1,
      label: "Alpha"
    });
  });

  it("refuses to advance a stale winner when upstream participants no longer match the expected bracket slot", () => {
    const advanced = deriveAdvancingSlot({
      currentMatch: {
        status: "FINAL",
        winningTeamId: "team-1",
        homeTeamId: "team-1",
        awayTeamId: "team-7",
        homeSeedNumber: 1,
        awaySeedNumber: 7
      },
      expectedMatch: {
        homeTeamId: "team-1",
        awayTeamId: "team-8",
        homeSeedNumber: 1,
        awaySeedNumber: 8
      },
      fallbackLabel: "Winner of Quarterfinal 1",
      teamNames: {
        "team-1": "Alpha"
      }
    });

    expect(advanced).toEqual({
      teamId: null,
      seedNumber: null,
      label: "Winner of Quarterfinal 1"
    });
  });

  it("flags a downstream match for reset when reopened upstream results remove one of its participants", () => {
    const reset = shouldResetMatch({
      currentMatch: {
        homeTeamId: "team-1",
        awayTeamId: "team-4",
        homeSeedNumber: 1,
        awaySeedNumber: 4,
        homeSeedLabel: "Alpha",
        awaySeedLabel: "Bravo",
        bracketId: "bracket-1",
        bracketRoundId: "round-sf",
        advancesToMatchId: "championship",
        advancesToSlot: "HOME",
        roundLabel: "Semifinal 1",
        stage: "SEMIFINAL",
        playerSelectionsCount: 4,
        holeScoresCount: 72,
        submittedAt: new Date(),
        finalizedAt: new Date(),
        winningTeamId: "team-1",
        courseId: "course-1",
        scheduledAt: new Date()
      },
      expected: {
        homeTeamId: null,
        awayTeamId: "team-4",
        homeSeedNumber: null,
        awaySeedNumber: 4,
        homeSeedLabel: "Winner of Quarterfinal 1",
        awaySeedLabel: "Bravo",
        bracketId: "bracket-1",
        bracketRoundId: "round-sf",
        advancesToMatchId: "championship",
        advancesToSlot: "HOME",
        roundLabel: "Semifinal 1",
        stage: "SEMIFINAL"
      }
    });

    expect(reset).toBe(true);
  });
});
