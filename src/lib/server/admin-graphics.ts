import "server-only";

import {
  demoCourses,
  demoDetailedMatchResult,
  demoMatches,
  demoTeams
} from "@/lib/demo/mock-data";
import { formatMatchPlayResultLabel } from "@/lib/scoring/match-play";
import { db } from "@/lib/server/db";
import { getOfficialResultSnapshotForMatch } from "@/lib/server/official-result-snapshot";
import type { OfficialResultSnapshot } from "@/lib/server/official-result-snapshot";

export interface AdminGraphicRecapHole {
  holeNumber: number;
  par: number;
  strokeIndex: number;
  yardage: number | null;
  winningTeamId: string | null;
  homePoints: number;
  awayPoints: number;
  homeNet: number | null;
  awayNet: number | null;
}

export interface AdminGraphicRecap {
  id: string;
  privateToken: string;
  publicScorecardSlug: string;
  roundLabel: string;
  stage: string;
  status: string;
  resultLabel: string | null;
  playedOn: string | null;
  courseName: string;
  courseMeta: string | null;
  podName: string | null;
  homeSeedNumber: number | null;
  awaySeedNumber: number | null;
  homeTeam: {
    id: string;
    name: string;
    players: string[];
    totalPoints: number;
    holesWon: number;
    betterBallNetTotal: number | null;
  };
  awayTeam: {
    id: string;
    name: string;
    players: string[];
    totalPoints: number;
    holesWon: number;
    betterBallNetTotal: number | null;
  };
  winningTeamId: string | null;
  holes: AdminGraphicRecapHole[];
}

function decimalToNumber(value: unknown) {
  if (value == null) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  return Number(value);
}

function formatCourseMeta(course: { city: string | null; state: string | null } | null) {
  const parts = [course?.city, course?.state].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

function teamPlayers(team: {
  roster: Array<{
    player: {
      displayName: string;
    };
  }>;
}) {
  return team.roster.map((entry) => entry.player.displayName);
}

function summaryForTeam(
  summaries: Array<{
    teamId: string;
    totalPoints: number;
    holesWon: number;
    betterBallNetTotal: number | null;
  }>,
  teamId: string
) {
  return (
    summaries.find((summary) => summary.teamId === teamId) ?? {
      teamId,
      totalPoints: 0,
      holesWon: 0,
      betterBallNetTotal: null
    }
  );
}

function formatPlayedOn(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null;
}

function buildResultLabel(input: {
  stage: string;
  winningTeamId: string | null;
  snapshot: OfficialResultSnapshot;
  teamNames: Record<string, string>;
}) {
  if (input.stage === "POD_PLAY") {
    return null;
  }

  const forfeitWinner = input.snapshot.teamSummaries.find((summary) => summary.resultCode === "FORFEIT_WIN");

  if (forfeitWinner) {
    return `${input.teamNames[forfeitWinner.teamId] ?? "Team"} wins by forfeit`;
  }

  return formatMatchPlayResultLabel({
    teamSummaries: input.snapshot.teamSummaries,
    teamNames: input.teamNames,
    playedHoleCount: input.snapshot.holes.length,
    totalHoleCount: 18,
    winningTeamId: input.winningTeamId
  });
}

function buildDevelopmentDemoRecaps(): AdminGraphicRecap[] {
  if (process.env.NODE_ENV === "production") {
    return [];
  }

  const match = demoMatches.find((candidate) => candidate.id === "pod-a-match-1");

  if (!match?.homeTeamId || !match.awayTeamId) {
    return [];
  }

  const homeTeam = demoTeams.find((team) => team.id === match.homeTeamId);
  const awayTeam = demoTeams.find((team) => team.id === match.awayTeamId);
  const course = demoCourses.find((candidate) => candidate.id === match.courseId);
  const demoHoles = course?.tees[0]?.holes ?? [];
  const homeSummary = summaryForTeam(demoDetailedMatchResult.teamSummaries, match.homeTeamId);
  const awaySummary = summaryForTeam(demoDetailedMatchResult.teamSummaries, match.awayTeamId);

  if (!homeTeam || !awayTeam) {
    return [];
  }

  return [
    {
      id: match.id,
      privateToken: match.privateToken,
      publicScorecardSlug: match.publicScorecardSlug,
      roundLabel: match.roundLabel,
      stage: match.stage,
      status: match.status,
      resultLabel: null,
      playedOn: match.scheduledAt.slice(0, 10),
      courseName: course?.name ?? "Demo Country Club",
      courseMeta: [course?.city, course?.state].filter(Boolean).join(", ") || null,
      podName: "Pod A",
      homeSeedNumber: null,
      awaySeedNumber: null,
      homeTeam: {
        id: homeTeam.id,
        name: homeTeam.name,
        players: homeTeam.players.map((player) => player.displayName),
        totalPoints: homeSummary.totalPoints,
        holesWon: homeSummary.holesWon,
        betterBallNetTotal: homeSummary.betterBallNetTotal
      },
      awayTeam: {
        id: awayTeam.id,
        name: awayTeam.name,
        players: awayTeam.players.map((player) => player.displayName),
        totalPoints: awaySummary.totalPoints,
        holesWon: awaySummary.holesWon,
        betterBallNetTotal: awaySummary.betterBallNetTotal
      },
      winningTeamId: demoDetailedMatchResult.winningTeamId ?? match.winningTeamId ?? null,
      holes: demoDetailedMatchResult.holes.map((hole) => ({
        par: demoHoles.find((entry) => entry.holeNumber === hole.holeNumber)?.par ?? 0,
        strokeIndex: demoHoles.find((entry) => entry.holeNumber === hole.holeNumber)?.strokeIndex ?? 0,
        yardage:
          (demoHoles.find((entry) => entry.holeNumber === hole.holeNumber) as { yardage?: number } | undefined)
            ?.yardage ?? null,
        holeNumber: hole.holeNumber,
        winningTeamId: hole.winningTeamId,
        homePoints: hole.teamPoints[homeTeam.id] ?? 0,
        awayPoints: hole.teamPoints[awayTeam.id] ?? 0,
        homeNet: hole.teamBetterBallNet[homeTeam.id] ?? null,
        awayNet: hole.teamBetterBallNet[awayTeam.id] ?? null
      }))
    }
  ];
}

export async function getAdminGraphicRecaps(): Promise<AdminGraphicRecap[]> {
  try {
    const tournament = await db.tournament.findFirst({
      orderBy: {
        createdAt: "desc"
      },
      select: {
        id: true
      }
    });

    if (!tournament) {
      return [];
    }

    const matches = await db.match.findMany({
      where: {
        tournamentId: tournament.id,
        status: {
          in: ["FINAL", "FORFEIT"]
        }
      },
      orderBy: [
        {
          finalizedAt: "desc"
        },
        {
          submittedAt: "desc"
        },
        {
          updatedAt: "desc"
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
        homeTeam: {
          include: {
            roster: {
              orderBy: {
                rosterPosition: "asc"
              },
              include: {
                player: {
                  select: {
                    displayName: true
                  }
                }
              }
            }
          }
        },
        awayTeam: {
          include: {
            roster: {
              orderBy: {
                rosterPosition: "asc"
              },
              include: {
                player: {
                  select: {
                    displayName: true
                  }
                }
              }
            }
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

    const recaps: AdminGraphicRecap[] = [];

    for (const match of matches) {
      if (!match.homeTeam || !match.awayTeam) {
        continue;
      }

      const homeTeamId = match.homeTeam.id;
      const awayTeamId = match.awayTeam.id;
      const officialSnapshot = getOfficialResultSnapshotForMatch(match);

      if (!officialSnapshot) {
        continue;
      }

      const teamSummaries = officialSnapshot.teamSummaries;
      const holes = officialSnapshot.holes.map((hole) => ({
        holeNumber: hole.holeNumber,
        par: officialSnapshot.holeMeta.find((entry) => entry.holeNumber === hole.holeNumber)?.par ?? 0,
        strokeIndex: officialSnapshot.holeMeta.find((entry) => entry.holeNumber === hole.holeNumber)?.strokeIndex ?? 0,
        yardage: officialSnapshot.holeMeta.find((entry) => entry.holeNumber === hole.holeNumber)?.yardage ?? null,
        winningTeamId: hole.winningTeamId,
        homePoints: hole.teamPoints[homeTeamId] ?? 0,
        awayPoints: hole.teamPoints[awayTeamId] ?? 0,
        homeNet: hole.teamBetterBallNet[homeTeamId] ?? null,
        awayNet: hole.teamBetterBallNet[awayTeamId] ?? null
      }));

      const homeSummary = summaryForTeam(teamSummaries, homeTeamId);
      const awaySummary = summaryForTeam(teamSummaries, awayTeamId);

      recaps.push({
        id: match.id,
        privateToken: match.privateToken,
        publicScorecardSlug: match.publicScorecardSlug,
        roundLabel: match.roundLabel,
        stage: match.stage,
        status: match.status,
        resultLabel: buildResultLabel({
          stage: match.stage,
          winningTeamId: officialSnapshot.winningTeamId,
          snapshot: officialSnapshot,
          teamNames: {
            [homeTeamId]: match.homeTeam.name,
            [awayTeamId]: match.awayTeam.name
          }
        }),
        playedOn: formatPlayedOn(match.finalizedAt ?? match.submittedAt ?? match.scheduledAt),
        courseName: match.course?.name ?? "Course pending",
        courseMeta: formatCourseMeta(match.course),
        podName: match.pod?.name ?? null,
        homeSeedNumber: match.homeSeedNumber,
        awaySeedNumber: match.awaySeedNumber,
        homeTeam: {
          id: homeTeamId,
          name: match.homeTeam.name,
          players: teamPlayers(match.homeTeam),
          totalPoints: homeSummary.totalPoints,
          holesWon: homeSummary.holesWon,
          betterBallNetTotal: decimalToNumber(homeSummary.betterBallNetTotal)
        },
        awayTeam: {
          id: awayTeamId,
          name: match.awayTeam.name,
          players: teamPlayers(match.awayTeam),
          totalPoints: awaySummary.totalPoints,
          holesWon: awaySummary.holesWon,
          betterBallNetTotal: decimalToNumber(awaySummary.betterBallNetTotal)
        },
        winningTeamId: officialSnapshot.winningTeamId,
        holes
      });
    }

    return recaps.length > 0 ? recaps : buildDevelopmentDemoRecaps();
  } catch {
    return buildDevelopmentDemoRecaps();
  }
}
