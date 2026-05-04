if (typeof window !== "undefined") {
  throw new Error("bracket-sync is server-only.");
}

import { nanoid } from "nanoid";
import { Prisma } from "@prisma/client";
import { scoreForfeit, scoreMatch } from "@/lib/scoring/engine";
import type { TeamMatchSummary } from "@/lib/scoring/types";
import { db } from "@/lib/server/db";
import { computeQualifiedSeeds } from "@/lib/server/qualification";
import { computePodStandings, type MatchStandingInput } from "@/lib/server/standings";

type SyncClient = Prisma.TransactionClient;

interface BracketSlotExpectation {
  roundLabel: string;
  stage: "QUARTERFINAL" | "SEMIFINAL" | "CHAMPIONSHIP";
  bracketId: string;
  bracketRoundId: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeSeedNumber: number | null;
  awaySeedNumber: number | null;
  homeSeedLabel: string | null;
  awaySeedLabel: string | null;
  advancesToMatchId: string | null;
  advancesToSlot: "HOME" | "AWAY" | null;
}

function buildPublicSlug(label: string, matchId: string) {
  return `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${matchId}`;
}

function buildResultSummary(match: {
  status: string;
  winningTeamId: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
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
    tee: {
      holes: Array<{
        holeNumber: number;
        par: number;
        strokeIndex: number;
      }>;
    };
    player: {
      displayName: string;
    };
  }>;
  holeScores: Array<{
    holeNumber: number;
    playerId: string;
    grossScore: number;
  }>;
}): TeamMatchSummary[] {
  if (match.status === "FORFEIT" && match.winningTeamId && match.homeTeamId && match.awayTeamId) {
    const loserTeamId = match.winningTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;

    return scoreForfeit({
      winnerTeamId: match.winningTeamId,
      loserTeamId,
      awardedPoints: match.tournament.forfeitPointsAwarded,
      awardedHolesWon: match.tournament.forfeitHolesWonAwarded
    });
  }

  if (match.playerSelections.length !== 4) {
    return [];
  }

  const holesTemplate = match.playerSelections[0]?.tee.holes ?? [];
  const scoresByHole = new Map<number, Record<string, number | null>>();

  for (const hole of holesTemplate) {
    scoresByHole.set(
      hole.holeNumber,
      Object.fromEntries(match.playerSelections.map((selection) => [selection.playerId, null]))
    );
  }

  for (const holeScore of match.holeScores) {
    const scores = scoresByHole.get(holeScore.holeNumber);

    if (scores) {
      scores[holeScore.playerId] = holeScore.grossScore;
    }
  }

  const hasCompleteScores = Array.from(scoresByHole.values()).every((scores) =>
    match.playerSelections.every((selection) => typeof scores[selection.playerId] === "number")
  );

  if (!hasCompleteScores) {
    return [];
  }

  return scoreMatch({
    players: match.playerSelections.map((selection) => ({
      playerId: selection.playerId,
      playerName: selection.player.displayName,
      teamId: selection.teamId,
      handicapIndex: Number(selection.handicapIndexSnapshot),
      teeId: selection.teeId,
      teeName: selection.teeNameSnapshot,
      slope: selection.slopeSnapshot,
      courseRating: Number(selection.courseRatingSnapshot),
      par: selection.parSnapshot,
      holes: selection.tee.holes.map((hole) => ({
        holeNumber: hole.holeNumber,
        par: hole.par,
        strokeIndex: hole.strokeIndex
      }))
    })),
    holeScores: holesTemplate.map((hole) => ({
      holeNumber: hole.holeNumber,
      scores: scoresByHole.get(hole.holeNumber) ?? {}
    }))
  }).teamSummaries;
}

async function ensureStandardBracketRounds(tx: SyncClient, bracket: {
  id: string;
  rounds: Array<{ id: string; label: string; stage: string; roundOrder: number }>;
}) {
  const required = [
    { label: "Quarterfinals", stage: "QUARTERFINAL" as const, roundOrder: 1 },
    { label: "Semifinals", stage: "SEMIFINAL" as const, roundOrder: 2 },
    { label: "Championship", stage: "CHAMPIONSHIP" as const, roundOrder: 3 }
  ];

  for (const round of required) {
    if (bracket.rounds.some((existing) => existing.stage === round.stage)) {
      continue;
    }

    await tx.bracketRound.create({
      data: {
        id: nanoid(),
        bracketId: bracket.id,
        label: round.label,
        stage: round.stage,
        roundOrder: round.roundOrder
      }
    });
  }

  return tx.bracketRound.findMany({
    where: {
      bracketId: bracket.id
    },
    orderBy: {
      roundOrder: "asc"
    }
  });
}

async function ensureBracketShellMatches(
  tx: SyncClient,
  input: {
    tournamentId: string;
    bracketId: string;
    rounds: Array<{ id: string; stage: string }>;
    existingMatches: Array<{
      id: string;
      roundLabel: string;
    }>;
  }
) {
  const quarterfinalRoundId = input.rounds.find((round) => round.stage === "QUARTERFINAL")?.id;
  const semifinalRoundId = input.rounds.find((round) => round.stage === "SEMIFINAL")?.id;
  const championshipRoundId = input.rounds.find((round) => round.stage === "CHAMPIONSHIP")?.id;

  if (!quarterfinalRoundId || !semifinalRoundId || !championshipRoundId) {
    throw new Error("Bracket rounds are incomplete.");
  }

  const definitions = [
    {
      roundLabel: "Quarterfinal 1",
      stage: "QUARTERFINAL" as const,
      bracketRoundId: quarterfinalRoundId,
      homeSeedNumber: 1,
      awaySeedNumber: 8,
      homeSeedLabel: "Seed 1",
      awaySeedLabel: "Seed 8",
      advancesToLabel: "Semifinal 1",
      advancesToSlot: "HOME" as const
    },
    {
      roundLabel: "Quarterfinal 2",
      stage: "QUARTERFINAL" as const,
      bracketRoundId: quarterfinalRoundId,
      homeSeedNumber: 4,
      awaySeedNumber: 5,
      homeSeedLabel: "Seed 4",
      awaySeedLabel: "Seed 5",
      advancesToLabel: "Semifinal 1",
      advancesToSlot: "AWAY" as const
    },
    {
      roundLabel: "Quarterfinal 3",
      stage: "QUARTERFINAL" as const,
      bracketRoundId: quarterfinalRoundId,
      homeSeedNumber: 2,
      awaySeedNumber: 7,
      homeSeedLabel: "Seed 2",
      awaySeedLabel: "Seed 7",
      advancesToLabel: "Semifinal 2",
      advancesToSlot: "HOME" as const
    },
    {
      roundLabel: "Quarterfinal 4",
      stage: "QUARTERFINAL" as const,
      bracketRoundId: quarterfinalRoundId,
      homeSeedNumber: 3,
      awaySeedNumber: 6,
      homeSeedLabel: "Seed 3",
      awaySeedLabel: "Seed 6",
      advancesToLabel: "Semifinal 2",
      advancesToSlot: "AWAY" as const
    },
    {
      roundLabel: "Semifinal 1",
      stage: "SEMIFINAL" as const,
      bracketRoundId: semifinalRoundId,
      homeSeedNumber: null,
      awaySeedNumber: null,
      homeSeedLabel: "Winner of Quarterfinal 1",
      awaySeedLabel: "Winner of Quarterfinal 2",
      advancesToLabel: "Championship",
      advancesToSlot: "HOME" as const
    },
    {
      roundLabel: "Semifinal 2",
      stage: "SEMIFINAL" as const,
      bracketRoundId: semifinalRoundId,
      homeSeedNumber: null,
      awaySeedNumber: null,
      homeSeedLabel: "Winner of Quarterfinal 3",
      awaySeedLabel: "Winner of Quarterfinal 4",
      advancesToLabel: "Championship",
      advancesToSlot: "AWAY" as const
    },
    {
      roundLabel: "Championship",
      stage: "CHAMPIONSHIP" as const,
      bracketRoundId: championshipRoundId,
      homeSeedNumber: null,
      awaySeedNumber: null,
      homeSeedLabel: "Winner of Semifinal 1",
      awaySeedLabel: "Winner of Semifinal 2",
      advancesToLabel: null,
      advancesToSlot: null
    }
  ];

  const existingByLabel = new Map(input.existingMatches.map((match) => [match.roundLabel, match.id]));
  const idsByLabel = new Map(
    definitions.map((definition) => [definition.roundLabel, existingByLabel.get(definition.roundLabel) ?? nanoid()])
  );

  const missingDefinitions = definitions.filter((definition) => !existingByLabel.has(definition.roundLabel));

  for (const definition of missingDefinitions) {
    const matchId = idsByLabel.get(definition.roundLabel);

    if (!matchId) {
      continue;
    }

    await tx.match.create({
      data: {
        id: matchId,
        tournamentId: input.tournamentId,
        bracketId: input.bracketId,
        bracketRoundId: definition.bracketRoundId,
        stage: definition.stage,
        status: "SCHEDULED",
        roundLabel: definition.roundLabel,
        privateToken: nanoid(24),
        publicScorecardSlug: buildPublicSlug(definition.roundLabel, matchId),
        homeSeedNumber: definition.homeSeedNumber,
        awaySeedNumber: definition.awaySeedNumber,
        homeSeedLabel: definition.homeSeedLabel,
        awaySeedLabel: definition.awaySeedLabel,
        advancesToMatchId: null,
        advancesToSlot: definition.advancesToSlot
      }
    });
  }

  for (const definition of definitions) {
    const matchId = idsByLabel.get(definition.roundLabel);

    if (!matchId) {
      continue;
    }

    const advancesToMatchId = definition.advancesToLabel
      ? (idsByLabel.get(definition.advancesToLabel) ?? null)
      : null;

    await tx.match.update({
      where: {
        id: matchId
      },
      data: {
        advancesToMatchId,
        advancesToSlot: definition.advancesToSlot
      }
    });
  }
}

function deriveAdvancingSlot(input: {
  currentMatch: {
    status: string;
    winningTeamId: string | null;
    homeTeamId: string | null;
    awayTeamId: string | null;
    homeSeedNumber: number | null;
    awaySeedNumber: number | null;
  } | null;
  expectedMatch: BracketSlotExpectation;
  fallbackLabel: string;
  teamNames: Record<string, string>;
}) {
  const match = input.currentMatch;

  if (
    !match ||
    match.status !== "FINAL" && match.status !== "FORFEIT" ||
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

async function syncMatchSlot(
  tx: SyncClient,
  currentMatch: {
    id: string;
    status: string;
    roundLabel: string;
    stage: string;
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
    winningTeamId: string | null;
    courseId: string | null;
    scheduledAt: Date | null;
    submittedAt: Date | null;
    finalizedAt: Date | null;
    reopenedAt: Date | null;
    playerSelections: Array<{ id: string }>;
    holeScores: Array<{ id: string }>;
  },
  expected: BracketSlotExpectation
) {
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
  const shouldReset =
    participantsChanged ||
    ((expected.homeTeamId == null || expected.awayTeamId == null) &&
      (currentMatch.homeTeamId != null ||
        currentMatch.awayTeamId != null ||
        currentMatch.playerSelections.length > 0 ||
        currentMatch.holeScores.length > 0 ||
        currentMatch.submittedAt != null ||
        currentMatch.finalizedAt != null));
  const hasLiveData =
    currentMatch.playerSelections.length > 0 ||
    currentMatch.holeScores.length > 0 ||
    currentMatch.submittedAt != null ||
    currentMatch.finalizedAt != null ||
    currentMatch.winningTeamId != null ||
    currentMatch.courseId != null ||
    currentMatch.scheduledAt != null;
  const expectedReady = Boolean(expected.homeTeamId && expected.awayTeamId);
  let nextStatus:
    | "SCHEDULED"
    | "READY"
    | "IN_PROGRESS"
    | "SUBMITTED"
    | "FINAL"
    | "FORFEIT"
    | "REOPENED";

  if (shouldReset) {
    nextStatus = expectedReady ? "READY" : "SCHEDULED";
  } else if (!expectedReady) {
    nextStatus = "SCHEDULED";
  } else if (currentMatch.status === "SCHEDULED") {
    nextStatus = "READY";
  } else if (
    currentMatch.status === "READY" ||
    currentMatch.status === "IN_PROGRESS" ||
    currentMatch.status === "SUBMITTED" ||
    currentMatch.status === "FINAL" ||
    currentMatch.status === "FORFEIT" ||
    currentMatch.status === "REOPENED"
  ) {
    nextStatus = currentMatch.status;
  } else {
    nextStatus = "READY";
  }

  if (!participantsChanged && !shellChanged && !shouldReset && currentMatch.status === nextStatus) {
    return;
  }

  if (shouldReset) {
    await tx.holeScore.deleteMany({
      where: {
        matchId: currentMatch.id
      }
    });

    await tx.matchPlayer.deleteMany({
      where: {
        matchId: currentMatch.id
      }
    });

    if (hasLiveData) {
      await tx.matchAuditLog.create({
        data: {
          id: nanoid(),
          matchId: currentMatch.id,
          action: "BRACKET_RESET",
          actorLabel: "System",
          note: "Bracket participants changed and the dependent scorecard was reset."
        }
      });
    }
  }

  await tx.match.update({
    where: {
      id: currentMatch.id
    },
    data: {
      bracketId: expected.bracketId,
      bracketRoundId: expected.bracketRoundId,
      stage: expected.stage,
      roundLabel: expected.roundLabel,
      homeTeamId: expected.homeTeamId,
      awayTeamId: expected.awayTeamId,
      homeSeedNumber: expected.homeSeedNumber,
      awaySeedNumber: expected.awaySeedNumber,
      homeSeedLabel: expected.homeSeedLabel,
      awaySeedLabel: expected.awaySeedLabel,
      advancesToMatchId: expected.advancesToMatchId,
      advancesToSlot: expected.advancesToSlot,
      status: nextStatus,
      winningTeamId: shouldReset ? null : currentMatch.winningTeamId,
      submittedAt: shouldReset ? null : currentMatch.submittedAt,
      finalizedAt: shouldReset ? null : currentMatch.finalizedAt,
      reopenedAt: shouldReset ? null : currentMatch.reopenedAt,
      courseId: shouldReset ? null : currentMatch.courseId,
      scheduledAt: shouldReset ? null : currentMatch.scheduledAt
    }
  });
}

export async function syncTournamentBracket(tournamentId: string) {
  await db.$transaction(async (tx) => {
    await syncTournamentBracketTx(tx, tournamentId);
  });
}

export async function syncTournamentBracketTx(tx: SyncClient, tournamentId: string) {
  const tournament = await tx.tournament.findUnique({
    where: {
      id: tournamentId
    },
    include: {
      teams: {
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
      pods: {
        orderBy: {
          podOrder: "asc"
        }
      },
      brackets: {
        orderBy: {
          createdAt: "asc"
        },
        include: {
          rounds: {
            orderBy: {
              roundOrder: "asc"
            }
          }
        }
      },
      matches: {
        orderBy: [{ stage: "asc" }, { roundLabel: "asc" }],
        include: {
          tournament: {
            select: {
              forfeitPointsAwarded: true,
              forfeitHolesWonAwarded: true
            }
          },
          playerSelections: {
            include: {
              player: true,
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
            orderBy: [{ holeNumber: "asc" }, { playerId: "asc" }]
          }
        }
      }
    }
  });

  if (!tournament) {
    return;
  }

  const bracket = tournament.brackets[0];

  if (!bracket) {
    return;
  }

  const rounds = await ensureStandardBracketRounds(tx, bracket);

  await ensureBracketShellMatches(tx, {
    tournamentId,
    bracketId: bracket.id,
    rounds,
    existingMatches: tournament.matches.filter((match) => match.bracketId === bracket.id)
  });

  const allMatches = await tx.match.findMany({
    where: {
      tournamentId
    },
    orderBy: [{ stage: "asc" }, { roundLabel: "asc" }],
    include: {
      tournament: {
        select: {
          forfeitPointsAwarded: true,
          forfeitHolesWonAwarded: true
        }
      },
      playerSelections: {
        include: {
          player: true,
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
        orderBy: [{ holeNumber: "asc" }, { playerId: "asc" }]
      }
    }
  });

  const teamProfiles = tournament.teams.map((team) => ({
    id: team.id,
    name: team.name,
    podId: team.podMemberships[0]?.podId ?? "",
    players: team.roster.map((entry) => ({
      id: entry.player.id,
      firstName: entry.player.firstName,
      lastName: entry.player.lastName,
      displayName: entry.player.displayName,
      handicapIndex: Number(entry.player.handicapIndex ?? 0),
      ghinNumber: entry.player.ghinNumber,
      handicapSyncStatus: entry.player.handicapSyncStatus
    }))
  }));

  const standingsInputs: MatchStandingInput[] = allMatches.map((match) => ({
    id: match.id,
    podId: match.podId,
    stage: match.stage,
    status: match.status,
    teamSummaries: buildResultSummary(match)
  }));

  const standings = computePodStandings(teamProfiles, standingsInputs);
  const podStandings = tournament.pods.map((pod) => ({
    pod,
    rows: standings.filter((row) => row.podId === pod.id)
  }));
  const seeds = computeQualifiedSeeds({
    pods: tournament.pods.map((pod) => ({ id: pod.id, name: pod.name })),
    standings,
    podStandings,
    matches: allMatches.map((match) => ({
      podId: match.podId,
      stage: match.stage,
      status: match.status
    }))
  });
  const seedByNumber = new Map(seeds.map((seed) => [seed.seedNumber, seed]));
  const teamNames = Object.fromEntries(tournament.teams.map((team) => [team.id, team.name]));
  const bracketMatches = allMatches.filter((match) => match.bracketId === bracket.id);
  const currentByLabel = new Map(bracketMatches.map((match) => [match.roundLabel, match]));
  const roundIdByStage = new Map(rounds.map((round) => [round.stage, round.id]));

  const qf1 = currentByLabel.get("Quarterfinal 1");
  const qf2 = currentByLabel.get("Quarterfinal 2");
  const qf3 = currentByLabel.get("Quarterfinal 3");
  const qf4 = currentByLabel.get("Quarterfinal 4");
  const sf1 = currentByLabel.get("Semifinal 1");
  const sf2 = currentByLabel.get("Semifinal 2");
  const championship = currentByLabel.get("Championship");

  if (!qf1 || !qf2 || !qf3 || !qf4 || !sf1 || !sf2 || !championship) {
    throw new Error("Bracket shell is incomplete.");
  }

  const seedSlot = (seedNumber: number) => {
    const seed = seedByNumber.get(seedNumber);

    return {
      teamId: seed?.teamId ?? null,
      label: seed?.teamName ?? `Seed ${seedNumber}`,
      seedNumber
    };
  };

  const qfExpectations: BracketSlotExpectation[] = [
    {
      roundLabel: "Quarterfinal 1",
      stage: "QUARTERFINAL",
      bracketId: bracket.id,
      bracketRoundId: roundIdByStage.get("QUARTERFINAL") ?? qf1.bracketRoundId ?? "",
      homeTeamId: seedSlot(1).teamId,
      awayTeamId: seedSlot(8).teamId,
      homeSeedNumber: 1,
      awaySeedNumber: 8,
      homeSeedLabel: seedSlot(1).label,
      awaySeedLabel: seedSlot(8).label,
      advancesToMatchId: sf1.id,
      advancesToSlot: "HOME"
    },
    {
      roundLabel: "Quarterfinal 2",
      stage: "QUARTERFINAL",
      bracketId: bracket.id,
      bracketRoundId: roundIdByStage.get("QUARTERFINAL") ?? qf2.bracketRoundId ?? "",
      homeTeamId: seedSlot(4).teamId,
      awayTeamId: seedSlot(5).teamId,
      homeSeedNumber: 4,
      awaySeedNumber: 5,
      homeSeedLabel: seedSlot(4).label,
      awaySeedLabel: seedSlot(5).label,
      advancesToMatchId: sf1.id,
      advancesToSlot: "AWAY"
    },
    {
      roundLabel: "Quarterfinal 3",
      stage: "QUARTERFINAL",
      bracketId: bracket.id,
      bracketRoundId: roundIdByStage.get("QUARTERFINAL") ?? qf3.bracketRoundId ?? "",
      homeTeamId: seedSlot(2).teamId,
      awayTeamId: seedSlot(7).teamId,
      homeSeedNumber: 2,
      awaySeedNumber: 7,
      homeSeedLabel: seedSlot(2).label,
      awaySeedLabel: seedSlot(7).label,
      advancesToMatchId: sf2.id,
      advancesToSlot: "HOME"
    },
    {
      roundLabel: "Quarterfinal 4",
      stage: "QUARTERFINAL",
      bracketId: bracket.id,
      bracketRoundId: roundIdByStage.get("QUARTERFINAL") ?? qf4.bracketRoundId ?? "",
      homeTeamId: seedSlot(3).teamId,
      awayTeamId: seedSlot(6).teamId,
      homeSeedNumber: 3,
      awaySeedNumber: 6,
      homeSeedLabel: seedSlot(3).label,
      awaySeedLabel: seedSlot(6).label,
      advancesToMatchId: sf2.id,
      advancesToSlot: "AWAY"
    }
  ];

  const qfExpectationByLabel = new Map(qfExpectations.map((match) => [match.roundLabel, match]));

  const sf1Home = deriveAdvancingSlot({
    currentMatch: qf1,
    expectedMatch: qfExpectationByLabel.get("Quarterfinal 1")!,
    fallbackLabel: "Winner of Quarterfinal 1",
    teamNames
  });
  const sf1Away = deriveAdvancingSlot({
    currentMatch: qf2,
    expectedMatch: qfExpectationByLabel.get("Quarterfinal 2")!,
    fallbackLabel: "Winner of Quarterfinal 2",
    teamNames
  });
  const sf2Home = deriveAdvancingSlot({
    currentMatch: qf3,
    expectedMatch: qfExpectationByLabel.get("Quarterfinal 3")!,
    fallbackLabel: "Winner of Quarterfinal 3",
    teamNames
  });
  const sf2Away = deriveAdvancingSlot({
    currentMatch: qf4,
    expectedMatch: qfExpectationByLabel.get("Quarterfinal 4")!,
    fallbackLabel: "Winner of Quarterfinal 4",
    teamNames
  });

  const sfExpectations: BracketSlotExpectation[] = [
    {
      roundLabel: "Semifinal 1",
      stage: "SEMIFINAL",
      bracketId: bracket.id,
      bracketRoundId: roundIdByStage.get("SEMIFINAL") ?? sf1.bracketRoundId ?? "",
      homeTeamId: sf1Home.teamId,
      awayTeamId: sf1Away.teamId,
      homeSeedNumber: sf1Home.seedNumber,
      awaySeedNumber: sf1Away.seedNumber,
      homeSeedLabel: sf1Home.label,
      awaySeedLabel: sf1Away.label,
      advancesToMatchId: championship.id,
      advancesToSlot: "HOME"
    },
    {
      roundLabel: "Semifinal 2",
      stage: "SEMIFINAL",
      bracketId: bracket.id,
      bracketRoundId: roundIdByStage.get("SEMIFINAL") ?? sf2.bracketRoundId ?? "",
      homeTeamId: sf2Home.teamId,
      awayTeamId: sf2Away.teamId,
      homeSeedNumber: sf2Home.seedNumber,
      awaySeedNumber: sf2Away.seedNumber,
      homeSeedLabel: sf2Home.label,
      awaySeedLabel: sf2Away.label,
      advancesToMatchId: championship.id,
      advancesToSlot: "AWAY"
    }
  ];

  const sfExpectationByLabel = new Map(sfExpectations.map((match) => [match.roundLabel, match]));
  const championshipHome = deriveAdvancingSlot({
    currentMatch: sf1,
    expectedMatch: sfExpectationByLabel.get("Semifinal 1")!,
    fallbackLabel: "Winner of Semifinal 1",
    teamNames
  });
  const championshipAway = deriveAdvancingSlot({
    currentMatch: sf2,
    expectedMatch: sfExpectationByLabel.get("Semifinal 2")!,
    fallbackLabel: "Winner of Semifinal 2",
    teamNames
  });

  const championshipExpectation: BracketSlotExpectation = {
    roundLabel: "Championship",
    stage: "CHAMPIONSHIP",
    bracketId: bracket.id,
    bracketRoundId: roundIdByStage.get("CHAMPIONSHIP") ?? championship.bracketRoundId ?? "",
    homeTeamId: championshipHome.teamId,
    awayTeamId: championshipAway.teamId,
    homeSeedNumber: championshipHome.seedNumber,
    awaySeedNumber: championshipAway.seedNumber,
    homeSeedLabel: championshipHome.label,
    awaySeedLabel: championshipAway.label,
    advancesToMatchId: null,
    advancesToSlot: null
  };

  for (const expectation of [...qfExpectations, ...sfExpectations, championshipExpectation]) {
    const currentMatch = currentByLabel.get(expectation.roundLabel);

    if (!currentMatch) {
      continue;
    }

    await syncMatchSlot(tx, currentMatch, expectation);
  }
}
