import "server-only";

import { scoreForfeit, scoreMatch } from "@/lib/scoring/engine";
import {
  demoCourses,
  demoDetailedMatchResult,
  demoMatches,
  demoTeams
} from "@/lib/demo/mock-data";
import {
  applyComputedPublicScorecardCorrections,
  applyPublicScorecardCorrections
} from "@/lib/server/public-scorecard-corrections";
import { db } from "@/lib/server/db";

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
  playedOn: string | null;
  courseName: string;
  courseMeta: string | null;
  podName: string | null;
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
      playedOn: match.scheduledAt.slice(0, 10),
      courseName: course?.name ?? "Demo Country Club",
      courseMeta: [course?.city, course?.state].filter(Boolean).join(", ") || null,
      podName: "Pod A",
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
      const correctedMatch = applyPublicScorecardCorrections(match) as typeof match;

      if (!correctedMatch.homeTeam || !correctedMatch.awayTeam) {
        continue;
      }

      const homeTeamId = correctedMatch.homeTeam.id;
      const awayTeamId = correctedMatch.awayTeam.id;
      let teamSummaries: Array<{
        teamId: string;
        totalPoints: number;
        holesWon: number;
        betterBallNetTotal: number | null;
      }>;
      let holes: AdminGraphicRecapHole[] = [];
      let winningTeamId = correctedMatch.winningTeamId;

      if (correctedMatch.status === "FORFEIT" && correctedMatch.winningTeamId) {
        const loserTeamId = correctedMatch.winningTeamId === homeTeamId ? awayTeamId : homeTeamId;
        teamSummaries = scoreForfeit({
          winnerTeamId: correctedMatch.winningTeamId,
          loserTeamId,
          awardedPoints: Number(correctedMatch.tournament.forfeitPointsAwarded),
          awardedHolesWon: correctedMatch.tournament.forfeitHolesWonAwarded
        });
      } else {
        if (correctedMatch.playerSelections.length !== 4) {
          continue;
        }

        const holesTemplate = correctedMatch.playerSelections[0]?.tee.holes ?? [];
        const scoresByHole = new Map<number, Record<string, number | null>>();

        for (const hole of holesTemplate) {
          scoresByHole.set(
            hole.holeNumber,
            Object.fromEntries(correctedMatch.playerSelections.map((selection) => [selection.playerId, null]))
          );
        }

        for (const score of correctedMatch.holeScores) {
          const hole = scoresByHole.get(score.holeNumber);

          if (hole) {
            hole[score.playerId] = score.grossScore;
          }
        }

        const complete = Array.from(scoresByHole.values()).every((scores) =>
          correctedMatch.playerSelections.every(
            (selection) => typeof scores[selection.playerId] === "number"
          )
        );

        if (!complete) {
          continue;
        }

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
        });

        const correctedScored = applyComputedPublicScorecardCorrections(correctedMatch.id, {
          ...scored,
          holeMeta: holesTemplate.map((hole) => ({
            holeNumber: hole.holeNumber,
            par: hole.par,
            strokeIndex: hole.strokeIndex,
            yardage: hole.yardage ?? null
          })),
          players: correctedMatch.playerSelections.map((selection) => {
            const grossByHole = Object.fromEntries(
              correctedMatch.holeScores
                .filter((holeScore) => holeScore.playerId === selection.playerId)
                .map((holeScore) => [holeScore.holeNumber, holeScore.grossScore])
            );
            const snapshot = scored.players.find((player) => player.playerId === selection.playerId);

            return {
              playerId: selection.playerId,
              playerName: selection.player.displayName,
              teamId: selection.teamId,
              teeName: selection.teeNameSnapshot,
              handicapIndex: Number(selection.handicapIndexSnapshot),
              matchStrokeCount: snapshot?.matchStrokeCount ?? 0,
              strokesByHole: snapshot?.strokesByHole ?? {},
              grossByHole,
              netByHole: Object.fromEntries(
                scored.holes.map((hole) => [hole.holeNumber, hole.playerNetScores[selection.playerId] ?? null])
              )
            };
          })
        });

        teamSummaries = correctedScored.teamSummaries;
        winningTeamId = correctedMatch.winningTeamId ?? scored.winningTeamId;
        holes = correctedScored.holes.map((hole) => ({
          holeNumber: hole.holeNumber,
          par: correctedScored.holeMeta?.find((entry) => entry.holeNumber === hole.holeNumber)?.par ?? 0,
          strokeIndex: correctedScored.holeMeta?.find((entry) => entry.holeNumber === hole.holeNumber)?.strokeIndex ?? 0,
          yardage: correctedScored.holeMeta?.find((entry) => entry.holeNumber === hole.holeNumber)?.yardage ?? null,
          winningTeamId: hole.winningTeamId,
          homePoints: hole.teamPoints[homeTeamId] ?? 0,
          awayPoints: hole.teamPoints[awayTeamId] ?? 0,
          homeNet: hole.teamBetterBallNet[homeTeamId] ?? null,
          awayNet: hole.teamBetterBallNet[awayTeamId] ?? null
        }));
      }

      const homeSummary = summaryForTeam(teamSummaries, homeTeamId);
      const awaySummary = summaryForTeam(teamSummaries, awayTeamId);

      recaps.push({
        id: correctedMatch.id,
        privateToken: correctedMatch.privateToken,
        publicScorecardSlug: correctedMatch.publicScorecardSlug,
        roundLabel: correctedMatch.roundLabel,
        stage: correctedMatch.stage,
        status: correctedMatch.status,
        playedOn: formatPlayedOn(correctedMatch.finalizedAt ?? correctedMatch.submittedAt ?? correctedMatch.scheduledAt),
        courseName: correctedMatch.course?.name ?? "Course pending",
        courseMeta: formatCourseMeta(correctedMatch.course),
        podName: correctedMatch.pod?.name ?? null,
        homeTeam: {
          id: homeTeamId,
          name: correctedMatch.homeTeam.name,
          players: teamPlayers(correctedMatch.homeTeam),
          totalPoints: homeSummary.totalPoints,
          holesWon: homeSummary.holesWon,
          betterBallNetTotal: decimalToNumber(homeSummary.betterBallNetTotal)
        },
        awayTeam: {
          id: awayTeamId,
          name: correctedMatch.awayTeam.name,
          players: teamPlayers(correctedMatch.awayTeam),
          totalPoints: awaySummary.totalPoints,
          holesWon: awaySummary.holesWon,
          betterBallNetTotal: decimalToNumber(awaySummary.betterBallNetTotal)
        },
        winningTeamId,
        holes
      });
    }

    return recaps.length > 0 ? recaps : buildDevelopmentDemoRecaps();
  } catch {
    return buildDevelopmentDemoRecaps();
  }
}
