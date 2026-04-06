import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";
import { buildMatchPlayerSnapshots, scoreMatch } from "@/lib/scoring/engine";
import type { MatchPlayerInput } from "@/lib/scoring/types";
import { syncTournamentBracketTx } from "@/lib/server/bracket-sync";
import { computeQualifiedSeeds } from "@/lib/server/qualification";
import { computePodStandings, type MatchStandingInput } from "@/lib/server/standings";

const prisma = new PrismaClient();

const TOURNAMENT_SLUG = process.argv[2] ?? null;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const DRY_RUN_HOLES = [
  { holeNumber: 1, par: 4, strokeIndex: 9, yardage: 412 },
  { holeNumber: 2, par: 4, strokeIndex: 11, yardage: 377 },
  { holeNumber: 3, par: 4, strokeIndex: 5, yardage: 399 },
  { holeNumber: 4, par: 3, strokeIndex: 15, yardage: 221 },
  { holeNumber: 5, par: 4, strokeIndex: 7, yardage: 386 },
  { holeNumber: 6, par: 4, strokeIndex: 13, yardage: 336 },
  { holeNumber: 7, par: 5, strokeIndex: 1, yardage: 515 },
  { holeNumber: 8, par: 3, strokeIndex: 17, yardage: 162 },
  { holeNumber: 9, par: 4, strokeIndex: 3, yardage: 431 },
  { holeNumber: 10, par: 4, strokeIndex: 10, yardage: 401 },
  { holeNumber: 11, par: 4, strokeIndex: 12, yardage: 354 },
  { holeNumber: 12, par: 5, strokeIndex: 2, yardage: 529 },
  { holeNumber: 13, par: 3, strokeIndex: 18, yardage: 168 },
  { holeNumber: 14, par: 4, strokeIndex: 6, yardage: 409 },
  { holeNumber: 15, par: 4, strokeIndex: 8, yardage: 392 },
  { holeNumber: 16, par: 5, strokeIndex: 4, yardage: 544 },
  { holeNumber: 17, par: 3, strokeIndex: 16, yardage: 173 },
  { holeNumber: 18, par: 4, strokeIndex: 14, yardage: 418 }
];

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function buildDryRunOutcome(homePoints: number) {
  const ties = Number.isInteger(homePoints) ? 0 : 1;
  const homeWins = Math.floor(homePoints - ties * 0.5);
  const awayWins = 18 - homeWins - ties;

  assertCondition(homeWins >= 0 && awayWins >= 0, `Invalid point split for ${homePoints}.`);

  return {
    homeWins,
    awayWins,
    ties
  };
}

function buildHoleScores(input: {
  holes: typeof DRY_RUN_HOLES;
  homePlayerIds: [string, string];
  awayPlayerIds: [string, string];
  homePoints: number;
}) {
  const { homeWins, awayWins, ties } = buildDryRunOutcome(input.homePoints);
  const outcomes = [
    ...Array.from({ length: homeWins }, () => "HOME" as const),
    ...Array.from({ length: awayWins }, () => "AWAY" as const),
    ...Array.from({ length: ties }, () => "TIE" as const)
  ];

  return input.holes.map((hole, index) => {
    const outcome = outcomes[index] ?? "TIE";
    const homePrimary = index % 2 === 0 ? input.homePlayerIds[0] : input.homePlayerIds[1];
    const homeSecondary = homePrimary === input.homePlayerIds[0] ? input.homePlayerIds[1] : input.homePlayerIds[0];
    const awayPrimary = index % 2 === 0 ? input.awayPlayerIds[1] : input.awayPlayerIds[0];
    const awaySecondary = awayPrimary === input.awayPlayerIds[0] ? input.awayPlayerIds[1] : input.awayPlayerIds[0];

    if (outcome === "HOME") {
      return {
        holeNumber: hole.holeNumber,
        scores: {
          [homePrimary]: Math.max(1, hole.par - 1),
          [homeSecondary]: hole.par + 1,
          [awayPrimary]: hole.par + 1,
          [awaySecondary]: hole.par + 2
        }
      };
    }

    if (outcome === "AWAY") {
      return {
        holeNumber: hole.holeNumber,
        scores: {
          [homePrimary]: hole.par + 1,
          [homeSecondary]: hole.par + 2,
          [awayPrimary]: Math.max(1, hole.par - 1),
          [awaySecondary]: hole.par + 1
        }
      };
    }

    return {
      holeNumber: hole.holeNumber,
      scores: {
        [homePrimary]: hole.par,
        [homeSecondary]: hole.par + 1,
        [awayPrimary]: hole.par,
        [awaySecondary]: hole.par + 1
      }
    };
  });
}

async function resetTournamentState(tournamentId: string) {
  const matchIds = (
    await prisma.match.findMany({
      where: {
        tournamentId
      },
      select: {
        id: true
      }
    })
  ).map((match) => match.id);

  const teamIds = (
    await prisma.team.findMany({
      where: {
        tournamentId
      },
      select: {
        id: true
      }
    })
  ).map((team) => team.id);

  await prisma.$transaction(async (tx) => {
    if (matchIds.length > 0) {
      await tx.matchInvitation.deleteMany({ where: { matchId: { in: matchIds } } });
      await tx.matchAuditLog.deleteMany({ where: { matchId: { in: matchIds } } });
      await tx.holeScore.deleteMany({ where: { matchId: { in: matchIds } } });
      await tx.matchPlayer.deleteMany({ where: { matchId: { in: matchIds } } });
    }

    await tx.activityFeedEvent.deleteMany({ where: { tournamentId } });
    await tx.match.deleteMany({ where: { tournamentId } });
    await tx.bracketRound.deleteMany({ where: { bracket: { tournamentId } } });
    await tx.bracket.deleteMany({ where: { tournamentId } });

    if (teamIds.length > 0) {
      await tx.team.updateMany({
        where: { id: { in: teamIds } },
        data: { seedNumber: null }
      });
    }
  });
}

async function ensureBracket(tournamentId: string) {
  const existing = await prisma.bracket.findFirst({
    where: { tournamentId },
    include: {
      rounds: true
    }
  });

  if (existing) {
    return existing;
  }

  return prisma.bracket.create({
    data: {
      id: nanoid(),
      tournamentId,
      label: "Championship Bracket",
      qualifierCount: 8,
      rounds: {
        create: [
          { id: nanoid(), label: "Quarterfinals", stage: "QUARTERFINAL", roundOrder: 1 },
          { id: nanoid(), label: "Semifinals", stage: "SEMIFINAL", roundOrder: 2 },
          { id: nanoid(), label: "Championship", stage: "CHAMPIONSHIP", roundOrder: 3 }
        ]
      }
    },
    include: {
      rounds: true
    }
  });
}

async function ensureDryRunCourse() {
  const existing = await prisma.course.findUnique({
    where: {
      providerKey: "dry-run-course"
    },
    include: {
      tees: {
        include: {
          holes: {
            orderBy: { holeNumber: "asc" }
          }
        }
      }
    }
  });

  if (existing?.tees[0]) {
    return { course: existing, tee: existing.tees[0] };
  }

  const course = await prisma.course.create({
    data: {
      id: nanoid(),
      providerKey: "dry-run-course",
      name: "Dry Run Golf Club",
      city: "Chicago",
      state: "IL",
      tees: {
        create: {
          id: nanoid(),
          providerKey: "dry-run-tee",
          name: "Championship",
          gender: "OPEN",
          par: 72,
          slope: 113,
          courseRating: 72,
          holes: {
            create: DRY_RUN_HOLES.map((hole) => ({
              id: nanoid(),
              holeNumber: hole.holeNumber,
              par: hole.par,
              strokeIndex: hole.strokeIndex,
              yardage: hole.yardage
            }))
          }
        }
      }
    },
    include: {
      tees: {
        include: {
          holes: {
            orderBy: { holeNumber: "asc" }
          }
        }
      }
    }
  });

  return { course, tee: course.tees[0] };
}

async function ensurePodMatches(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      pods: {
        orderBy: { podOrder: "asc" },
        include: {
          teams: {
            orderBy: { slotNumber: "asc" },
            include: { team: true }
          }
        }
      },
      matches: {
        where: { stage: "POD_PLAY" }
      }
    }
  });

  assertCondition(tournament, "Tournament not found while generating pod matches.");

  if (tournament.matches.length > 0) {
    return tournament.matches;
  }

  const rows: Array<{
    id: string;
    tournamentId: string;
    podId: string;
    stage: "POD_PLAY";
    status: "READY";
    roundLabel: string;
    homeTeamId: string;
    awayTeamId: string;
    privateToken: string;
    publicScorecardSlug: string;
  }> = [];

  for (const pod of tournament.pods) {
    const [team1, team2, team3] = pod.teams.map((entry) => entry.team);

    if (!team1 || !team2 || !team3) {
      continue;
    }

    const pairings = [
      [team1, team2],
      [team1, team3],
      [team2, team3]
    ];

    for (const [index, [home, away]] of pairings.entries()) {
      const matchId = nanoid();
      const roundLabel = `${pod.name} Match ${index + 1}`;

      rows.push({
        id: matchId,
        tournamentId,
        podId: pod.id,
        stage: "POD_PLAY",
        status: "READY",
        roundLabel,
        homeTeamId: home.id,
        awayTeamId: away.id,
        privateToken: nanoid(24),
        publicScorecardSlug: `${roundLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${matchId}`
      });
    }
  }

  await prisma.match.createMany({ data: rows });
  return prisma.match.findMany({
    where: {
      tournamentId,
      stage: "POD_PLAY"
    },
    orderBy: [{ podId: "asc" }, { roundLabel: "asc" }]
  });
}

async function loadMatchForSimulation(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      tournament: true,
      homeTeam: {
        include: {
          roster: {
            orderBy: { rosterPosition: "asc" },
            include: { player: true }
          }
        }
      },
      awayTeam: {
        include: {
          roster: {
            orderBy: { rosterPosition: "asc" },
            include: { player: true }
          }
        }
      }
    }
  });

  assertCondition(match && match.homeTeam && match.awayTeam, `Match ${matchId} is incomplete.`);
  const homeTeam = match.homeTeam;
  const awayTeam = match.awayTeam;

  return {
    ...match,
    homeTeam,
    awayTeam
  };
}

async function setupAndPublishMatchDirect(input: {
  matchId: string;
  courseId: string;
  teeId: string;
  holes: typeof DRY_RUN_HOLES;
  homePoints: number;
  winningTeamIdOverride?: string | null;
  auditNote: string;
}) {
  const match = await loadMatchForSimulation(input.matchId);
  const homeTeam = match.homeTeam;
  const awayTeam = match.awayTeam;
  const roster = [
    ...homeTeam.roster.map((entry) => ({
      playerId: entry.player.id,
      playerName: entry.player.displayName,
      teamId: homeTeam.id
    })),
    ...awayTeam.roster.map((entry) => ({
      playerId: entry.player.id,
      playerName: entry.player.displayName,
      teamId: awayTeam.id
    }))
  ];

  assertCondition(roster.length === 4, `Match ${match.roundLabel} must have four players.`);

  const players: MatchPlayerInput[] = roster.map((player) => ({
    ...player,
    handicapIndex: 0,
    teeId: input.teeId,
    teeName: "Championship",
    slope: 113,
    courseRating: 72,
    par: 72,
    holes: input.holes
  }));
  const preview = buildMatchPlayerSnapshots({ players });
  const homePlayerIds = [homeTeam.roster[0]!.player.id, homeTeam.roster[1]!.player.id] as [string, string];
  const awayPlayerIds = [awayTeam.roster[0]!.player.id, awayTeam.roster[1]!.player.id] as [string, string];
  const holeScores = buildHoleScores({
    holes: input.holes,
    homePlayerIds,
    awayPlayerIds,
    homePoints: input.homePoints
  });
  const result = scoreMatch({
    players,
    holeScores
  });
  const resolvedWinnerTeamId = result.winningTeamId ?? input.winningTeamIdOverride ?? null;

  if (match.stage !== "POD_PLAY") {
    assertCondition(
      resolvedWinnerTeamId,
      `Playoff match ${match.roundLabel} requires a winner.`
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.holeScore.deleteMany({ where: { matchId: match.id } });
    await tx.matchPlayer.deleteMany({ where: { matchId: match.id } });

    await tx.match.update({
      where: { id: match.id },
      data: {
        courseId: input.courseId,
        status: "FINAL",
        winningTeamId: resolvedWinnerTeamId,
        submittedAt: new Date(),
        finalizedAt: new Date(),
        scheduledAt: new Date()
      }
    });

    await tx.matchPlayer.createMany({
      data: preview.players.map((snapshot) => ({
        id: `${match.id}-${snapshot.playerId}`,
        matchId: match.id,
        playerId: snapshot.playerId,
        teamId: snapshot.teamId,
        teeId: input.teeId,
        teeNameSnapshot: snapshot.teeName,
        handicapIndexSnapshot: snapshot.handicapIndex,
        slopeSnapshot: 113,
        courseRatingSnapshot: 72,
        parSnapshot: 72,
        courseHandicap: snapshot.courseHandicap,
        playingHandicap: snapshot.playingHandicap,
        matchStrokeCount: snapshot.matchStrokeCount,
        strokesByHole: snapshot.strokesByHole
      }))
    });

    await tx.holeScore.createMany({
      data: holeScores.flatMap((hole) =>
        Object.entries(hole.scores).map(([playerId, grossScore]) => ({
          id: `${match.id}-${playerId}-hole-${hole.holeNumber}`,
          matchId: match.id,
          playerId,
          holeNumber: hole.holeNumber,
          grossScore
        }))
      )
    });

    await tx.matchAuditLog.create({
      data: {
        id: nanoid(),
        matchId: match.id,
        action: "DRY_RUN_PUBLISH",
        actorLabel: "Dry run",
        note: input.auditNote
      }
    });

    await syncTournamentBracketTx(tx, match.tournamentId);
  });

  return { match, result, winningTeamId: resolvedWinnerTeamId };
}

async function publishPodMatchViaApi(input: {
  privateToken: string;
  courseId: string;
  teeId: string;
  playerIds: string[];
  homePoints: number;
}) {
  const setupResponse = await fetch(`${APP_URL}/api/matches/${input.privateToken}/scorecard`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      action: "setup",
      courseId: input.courseId,
      players: input.playerIds.map((playerId) => ({
        playerId,
        handicapIndex: 0,
        teeId: input.teeId
      })),
      teeHoleOverrides: []
    })
  });

  if (!setupResponse.ok) {
    const body = await setupResponse.text();
    throw new Error(
      `Dry run setup API failed for token ${input.privateToken} (${setupResponse.status}): ${body}`
    );
  }

  const holeScores = buildHoleScores({
    holes: DRY_RUN_HOLES,
    homePlayerIds: [input.playerIds[0]!, input.playerIds[1]!] as [string, string],
    awayPlayerIds: [input.playerIds[2]!, input.playerIds[3]!] as [string, string],
    homePoints: input.homePoints
  });

  const publishResponse = await fetch(`${APP_URL}/api/matches/${input.privateToken}/scorecard`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      action: "publish",
      scores: holeScores
    })
  });

  if (!publishResponse.ok) {
    const body = await publishResponse.text();
    throw new Error(
      `Dry run publish API failed for token ${input.privateToken} (${publishResponse.status}): ${body}`
    );
  }
}

async function reopenMatch(matchId: string, note: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId }
  });

  assertCondition(match, `Match ${matchId} not found for reopen.`);

  await prisma.$transaction(async (tx) => {
    await tx.match.update({
      where: { id: matchId },
      data: {
        status: "REOPENED",
        reopenedAt: new Date(),
        submittedAt: null,
        finalizedAt: null,
        winningTeamId: null,
        isOverride: true,
        overrideNote: note
      }
    });

    await tx.matchAuditLog.create({
      data: {
        id: nanoid(),
        matchId,
        action: "REOPENED",
        actorLabel: "Dry run",
        note
      }
    });

    await syncTournamentBracketTx(tx, match.tournamentId);
  });
}

async function checkPublicEndpoints(slug: string, publicScorecardSlug: string) {
  const urls = [
    `${APP_URL}/`,
    `${APP_URL}/tournament/${slug}`,
    `${APP_URL}/tournament/${slug}/standings`,
    `${APP_URL}/tournament/${slug}/standings?tab=playoff`,
    `${APP_URL}/tournament/${slug}/bracket`,
    `${APP_URL}/tournament/${slug}/rules`,
    `${APP_URL}/tournament/${slug}/matches/${publicScorecardSlug}`,
    `${APP_URL}/api/public/tournament/${slug}/standings`,
    `${APP_URL}/api/public/tournament/${slug}/bracket`
  ];

  for (const url of urls) {
    const response = await fetch(url);
    assertCondition(response.ok, `Public endpoint failed during dry run: ${url}`);
  }
}

async function main() {
  const preferredSlugs = [TOURNAMENT_SLUG, "two-match-2026", "fairway-match-2026"].filter(
    (value): value is string => Boolean(value)
  );
  let tournament =
    preferredSlugs.length > 0
      ? await prisma.tournament.findFirst({
          where: {
            slug: {
              in: preferredSlugs
            }
          },
          orderBy: {
            createdAt: "desc"
          },
          include: {
            pods: {
              orderBy: { podOrder: "asc" },
              include: {
                teams: {
                  orderBy: { slotNumber: "asc" },
                  include: { team: true }
                }
              }
            }
          }
        })
      : null;

  if (!tournament) {
    tournament = await prisma.tournament.findFirst({
      orderBy: {
        createdAt: "desc"
      },
      include: {
        pods: {
          orderBy: { podOrder: "asc" },
          include: {
            teams: {
              orderBy: { slotNumber: "asc" },
              include: { team: true }
            }
          }
        }
      }
    });
  }

  assertCondition(tournament, "No tournament was found for the dry run.");
  assertCondition(tournament.pods.length === 6, "Dry run expects six populated pods.");

  await resetTournamentState(tournament.id);
  await ensureBracket(tournament.id);
  const { course, tee } = await ensureDryRunCourse();
  await ensurePodMatches(tournament.id);

  const podPlans = [
    { lossPoints: 8, winPoints: 11 },
    { lossPoints: 8, winPoints: 10 },
    { lossPoints: 7, winPoints: 10 },
    { lossPoints: 7, winPoints: 9 },
    { lossPoints: 7, winPoints: 8 },
    { lossPoints: 6, winPoints: 8 }
  ];

  const podMatches = await prisma.match.findMany({
    where: {
      tournamentId: tournament.id,
      stage: "POD_PLAY"
    },
    orderBy: [{ podId: "asc" }, { roundLabel: "asc" }]
  });

  const firstPodMatch = await loadMatchForSimulation(podMatches[0]!.id);
  await publishPodMatchViaApi({
    privateToken: firstPodMatch.privateToken,
    courseId: course.id,
    teeId: tee.id,
    playerIds: [
      firstPodMatch.homeTeam.roster[0]!.player.id,
      firstPodMatch.homeTeam.roster[1]!.player.id,
      firstPodMatch.awayTeam.roster[0]!.player.id,
      firstPodMatch.awayTeam.roster[1]!.player.id
    ],
    homePoints: 10
  });

  for (const [podIndex, pod] of tournament.pods.entries()) {
    const matches = podMatches.filter((match) => match.podId === pod.id);
    const [team1, team2, team3] = pod.teams.map((entry) => entry.team);
    assertCondition(matches.length === 3 && team1 && team2 && team3, `Pod ${pod.name} is incomplete.`);

    const plan = podPlans[podIndex]!;
    const matchPlans = [
      { match: matches[0]!, homeTeamId: team1.id, awayTeamId: team2.id, homePoints: podIndex === 0 ? null : 10 + (podIndex % 2 === 0 ? 1 : 0) },
      { match: matches[1]!, homeTeamId: team1.id, awayTeamId: team3.id, homePoints: 10 },
      { match: matches[2]!, homeTeamId: team2.id, awayTeamId: team3.id, homePoints: plan.winPoints }
    ];

    for (const entry of matchPlans) {
      if (entry.match.id === firstPodMatch.id) {
        continue;
      }

      await setupAndPublishMatchDirect({
        matchId: entry.match.id,
        courseId: course.id,
        teeId: tee.id,
        holes: DRY_RUN_HOLES,
        homePoints: entry.homePoints ?? plan.lossPoints,
        auditNote: `Dry run pod-play publish for ${pod.name}.`
      });
    }
  }

  await prisma.$transaction(async (tx) => {
    await syncTournamentBracketTx(tx, tournament.id);
  });

  const tournamentAfterPods = await prisma.tournament.findUnique({
    where: { id: tournament.id },
    include: {
      teams: {
        include: {
          roster: { include: { player: true } },
          podMemberships: true
        }
      },
      pods: {
        orderBy: { podOrder: "asc" }
      },
      matches: {
        include: {
          tournament: true,
          playerSelections: {
            include: {
              player: true,
              tee: {
                include: {
                  holes: { orderBy: { holeNumber: "asc" } }
                }
              }
            }
          },
          holeScores: true
        }
      }
    }
  });

  assertCondition(tournamentAfterPods, "Tournament missing after pod phase.");

  const teamProfiles = tournamentAfterPods.teams.map((team) => ({
    id: team.id,
    name: team.name,
    podId: team.podMemberships[0]?.podId ?? "",
    players: team.roster.map((entry) => ({
      id: entry.player.id,
      firstName: entry.player.firstName,
      lastName: entry.player.lastName,
      displayName: entry.player.displayName,
      handicapIndex: 0
    }))
  }));
  const standingsInputs: MatchStandingInput[] = tournamentAfterPods.matches.map((match) => ({
    id: match.id,
    podId: match.podId,
    stage: match.stage,
    status: match.status,
    teamSummaries:
      match.status === "FORFEIT"
        ? []
        : match.playerSelections.length === 4
          ? scoreMatch({
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
              holeScores: DRY_RUN_HOLES.map((hole) => ({
                holeNumber: hole.holeNumber,
                scores: Object.fromEntries(
                  match.holeScores
                    .filter((score) => score.holeNumber === hole.holeNumber)
                    .map((score) => [score.playerId, score.grossScore])
                )
              }))
            }).teamSummaries
          : []
  }));

  const standings = computePodStandings(teamProfiles, standingsInputs);
  const podStandings = tournamentAfterPods.pods.map((pod) => ({
    pod: { id: pod.id, name: pod.name },
    rows: standings.filter((row) => row.podId === pod.id)
  }));
  const seeds = computeQualifiedSeeds({
    pods: podStandings.map((entry) => entry.pod),
    standings,
    podStandings,
    matches: tournamentAfterPods.matches.map((match) => ({
      podId: match.podId,
      stage: match.stage,
      status: match.status
    }))
  });

  assertCondition(seeds.length === 8, `Expected 8 playoff seeds, received ${seeds.length}.`);

  const bracketMatches = await prisma.match.findMany({
    where: {
      tournamentId: tournament.id,
      bracketId: { not: null }
    },
    orderBy: [{ stage: "asc" }, { roundLabel: "asc" }]
  });

  const byLabel = new Map(bracketMatches.map((match) => [match.roundLabel, match]));
  const qf1 = byLabel.get("Quarterfinal 1");
  const qf2 = byLabel.get("Quarterfinal 2");
  const qf3 = byLabel.get("Quarterfinal 3");
  const qf4 = byLabel.get("Quarterfinal 4");
  const sf1 = byLabel.get("Semifinal 1");
  const sf2 = byLabel.get("Semifinal 2");
  const championship = byLabel.get("Championship");
  assertCondition(qf1 && qf2 && qf3 && qf4 && sf1 && sf2 && championship, "Bracket shell is incomplete after pod play.");

  const apiQuarterfinal = await loadMatchForSimulation(qf1.id);
  await publishPodMatchViaApi({
    privateToken: apiQuarterfinal.privateToken,
    courseId: course.id,
    teeId: tee.id,
    playerIds: [
      apiQuarterfinal.homeTeam.roster[0]!.player.id,
      apiQuarterfinal.homeTeam.roster[1]!.player.id,
      apiQuarterfinal.awayTeam.roster[0]!.player.id,
      apiQuarterfinal.awayTeam.roster[1]!.player.id
    ],
    homePoints: 10
  });

  await setupAndPublishMatchDirect({
    matchId: qf2.id,
    courseId: course.id,
    teeId: tee.id,
    holes: DRY_RUN_HOLES,
    homePoints: 10,
    auditNote: "Dry run quarterfinal publish."
  });
  await setupAndPublishMatchDirect({
    matchId: qf3.id,
    courseId: course.id,
    teeId: tee.id,
    holes: DRY_RUN_HOLES,
    homePoints: 9.5,
    winningTeamIdOverride: qf3.homeTeamId,
    auditNote: "Dry run quarterfinal tiebreak publish."
  });
  await setupAndPublishMatchDirect({
    matchId: qf4.id,
    courseId: course.id,
    teeId: tee.id,
    holes: DRY_RUN_HOLES,
    homePoints: 8,
    auditNote: "Dry run quarterfinal publish."
  });

  await setupAndPublishMatchDirect({
    matchId: sf1.id,
    courseId: course.id,
    teeId: tee.id,
    holes: DRY_RUN_HOLES,
    homePoints: 10,
    auditNote: "Dry run semifinal publish."
  });

  await reopenMatch(qf2.id, "Dry run reopen test after semifinal progression.");

  const sf1AfterReopen = await prisma.match.findUnique({ where: { id: sf1.id } });
  assertCondition(
    sf1AfterReopen?.homeTeamId != null && sf1AfterReopen.awayTeamId == null,
    "Reopening Quarterfinal 2 should clear the dependent semifinal slot."
  );

  await setupAndPublishMatchDirect({
    matchId: qf2.id,
    courseId: course.id,
    teeId: tee.id,
    holes: DRY_RUN_HOLES,
    homePoints: 7,
    auditNote: "Dry run quarterfinal republish after reopen."
  });

  await setupAndPublishMatchDirect({
    matchId: sf1.id,
    courseId: course.id,
    teeId: tee.id,
    holes: DRY_RUN_HOLES,
    homePoints: 9.5,
    winningTeamIdOverride: sf1AfterReopen.homeTeamId,
    auditNote: "Dry run semifinal republish after reopen."
  });
  await setupAndPublishMatchDirect({
    matchId: sf2.id,
    courseId: course.id,
    teeId: tee.id,
    holes: DRY_RUN_HOLES,
    homePoints: 10,
    auditNote: "Dry run semifinal publish."
  });
  await setupAndPublishMatchDirect({
    matchId: championship.id,
    courseId: course.id,
    teeId: tee.id,
    holes: DRY_RUN_HOLES,
    homePoints: 9.5,
    winningTeamIdOverride: championship.homeTeamId,
    auditNote: "Dry run championship publish."
  });

  const finalChampionship = await prisma.match.findUnique({
    where: { id: championship.id }
  });
  assertCondition(finalChampionship?.status === "FINAL", "Championship did not finalize.");
  assertCondition(finalChampionship.winningTeamId, "Championship winner missing.");

  await checkPublicEndpoints(tournament.slug, championship.publicScorecardSlug);

  const report = `# Dry Run Report

- Date: ${new Date().toISOString()}
- Tournament: ${tournament.name} (${tournament.slug})
- Seed count locked: ${seeds.length}/8
- Pod matches completed: ${podMatches.length}
- Playoff matches completed: 7/7
- Reopen/override path: validated by reopening Quarterfinal 2 after semifinal advancement
- Public endpoints checked: home, tournament home, standings, playoff picture, bracket, rules, public match, standings API, bracket API

## Dry Run Checks

- Pod standings resolved from completed pod-play matches
- Wild cards projected and seeded
- Quarterfinals, semifinals, and championship populated
- Playoff tiebreak publication path exercised
- Reopen rollback cleared stale downstream bracket state
- Republish after reopen rehydrated the bracket correctly
- Public match center, standings, bracket, and rules routes returned successfully

## Notes

- Dry-run course used: ${course.name} / ${tee.name}
- Handicap entry path simulated with current-index snapshots of 0.0 to keep score math deterministic
- Reset to clean launch state with: \`npm run tournament:reset:state ${tournament.slug}\`
`;

  writeFileSync(join(process.cwd(), "docs", "dry-run-report.md"), report, "utf8");

  console.log(`Dry run completed for ${tournament.slug}. Report written to docs/dry-run-report.md`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
