import "server-only";

import { Prisma } from "@prisma/client";
import { buildMatchPlayerSnapshots, scoreMatch } from "@/lib/scoring/engine";
import type { MatchPlayerInput } from "@/lib/scoring/types";
import { getStoredCourseCatalog } from "@/lib/server/course-catalog";
import { db } from "@/lib/server/db";

function decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value == null) {
    return null;
  }

  return Number(value);
}

function formatStageLabel(stage: string) {
  switch (stage) {
    case "POD_PLAY":
      return "Pod Play";
    case "QUARTERFINAL":
      return "Quarterfinal";
    case "SEMIFINAL":
      return "Semifinal";
    case "CHAMPIONSHIP":
      return "Championship";
    default:
      return stage;
  }
}

function buildPlayerInputFromSelection(selection: {
  playerId: string;
  playerName: string;
  teamId: string;
  handicapIndex: number;
  teeId: string;
  teeName: string;
  slope: number;
  courseRating: number;
  par: number;
  holes: Array<{ holeNumber: number; par: number; strokeIndex: number; yardage?: number }>;
}): MatchPlayerInput {
  return {
    playerId: selection.playerId,
    playerName: selection.playerName,
    teamId: selection.teamId,
    handicapIndex: selection.handicapIndex,
    teeId: selection.teeId,
    teeName: selection.teeName,
    slope: selection.slope,
    courseRating: selection.courseRating,
    par: selection.par,
    holes: selection.holes
  };
}

export interface PrivateMatchView {
  match: {
    id: string;
    tournamentSlug: string;
    roundLabel: string;
    stage: string;
    stageLabel: string;
    status: string;
    winningTeamId: string | null;
    playedOn: string | null;
    privateToken: string;
    courseId: string | null;
    homeTeamName: string;
    awayTeamName: string;
  };
  players: Array<{
    playerId: string;
    playerName: string;
    teamId: string;
    teamName: string;
    handicapIndex: number | null;
    teeId: string | null;
  }>;
  courses: Array<{
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    tees: Array<{
      id: string;
      name: string;
      gender: string;
      par: number;
      slope: number;
      courseRating: number;
      holes: Array<{
        holeNumber: number;
        par: number;
        strokeIndex: number;
        yardage?: number;
      }>;
    }>;
  }>;
  setupComplete: boolean;
  isPublished: boolean;
  setupPreview: {
    allowancePct: number;
    maxStrokesPerHole: number;
    lowPlayerId: string;
    players: Array<{
      playerId: string;
      playerName: string;
      teamId: string;
      teeId: string;
      teeName: string;
      handicapIndex: number;
      courseHandicap: number;
      playingHandicap: number;
      matchStrokeCount: number;
      strokesByHole: Record<number, number>;
    }>;
  } | null;
  holeInputs: Array<{
    holeNumber: number;
    scores: Record<string, number | null>;
  }>;
  scorecard:
    | {
        winningTeamId: string | null;
        teamSummaries: Array<{
          teamId: string;
          totalPoints: number;
          holesWon: number;
          betterBallGrossTotal: number | null;
          betterBallNetTotal: number | null;
          resultCode: string;
        }>;
        holes: Array<{
          holeNumber: number;
          teamPoints: Record<string, number>;
          teamBetterBallGross: Record<string, number>;
          teamBetterBallNet: Record<string, number>;
          winningTeamId: string | null;
          playerNetScores: Record<string, number>;
        }>;
      }
    | null;
}

export async function getPrivateMatchRecordByToken(token: string): Promise<PrivateMatchView | null> {
  try {
    const match = await db.match.findUnique({
      where: {
        privateToken: token
      },
      include: {
        tournament: {
          select: {
            slug: true
          }
        },
        homeTeam: {
          include: {
            roster: {
              orderBy: {
                rosterPosition: "asc"
              },
              include: {
                player: true
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
                player: true
              }
            }
          }
        },
        playerSelections: {
          include: {
            player: true,
            team: true,
            tee: {
              include: {
                holes: {
                  orderBy: {
                    holeNumber: "asc"
                  }
                }
              }
            }
          },
          orderBy: {
            playerId: "asc"
          }
        },
        holeScores: {
          orderBy: [{ holeNumber: "asc" }, { playerId: "asc" }]
        }
      }
    });

    if (!match || !match.homeTeam || !match.awayTeam) {
      return null;
    }

    const courses = match.courseId
      ? (await getStoredCourseCatalog()).filter((course) => course.id === match.courseId)
      : [];

    const rosterPlayers = [
      ...match.homeTeam.roster.map((entry) => ({
        playerId: entry.player.id,
        playerName: entry.player.displayName,
        teamId: match.homeTeam!.id,
        teamName: match.homeTeam!.name,
        handicapIndex: null as number | null,
        teeId: null as string | null
      })),
      ...match.awayTeam.roster.map((entry) => ({
        playerId: entry.player.id,
        playerName: entry.player.displayName,
        teamId: match.awayTeam!.id,
        teamName: match.awayTeam!.name,
        handicapIndex: null as number | null,
        teeId: null as string | null
      }))
    ];

    const selectionByPlayerId = new Map(
      match.playerSelections.map((selection) => [
        selection.playerId,
        {
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
            strokeIndex: hole.strokeIndex,
            yardage: hole.yardage ?? undefined
          }))
        }
      ])
    );

    const players = rosterPlayers.map((player) => {
      const persisted = selectionByPlayerId.get(player.playerId);

      return {
        ...player,
        handicapIndex: persisted?.handicapIndex ?? player.handicapIndex,
        teeId: persisted?.teeId ?? null
      };
    });

    const setupInputs = rosterPlayers
      .map((player) => {
        const persisted = selectionByPlayerId.get(player.playerId);

        if (!persisted) {
          return null;
        }

        return buildPlayerInputFromSelection(persisted);
      })
      .filter((value): value is MatchPlayerInput => Boolean(value));

    const setupPreview =
      setupInputs.length === 4
        ? buildMatchPlayerSnapshots({
            players: setupInputs
          })
        : null;

    const holesTemplate =
      setupInputs[0]?.holes.map((hole) => ({
        holeNumber: hole.holeNumber,
        scores: Object.fromEntries(rosterPlayers.map((player) => [player.playerId, null]))
      })) ?? [];

    const scoresByHole = new Map<number, Record<string, number | null>>();

    for (const hole of holesTemplate) {
      scoresByHole.set(hole.holeNumber, { ...hole.scores });
    }

    for (const holeScore of match.holeScores) {
      const entry = scoresByHole.get(holeScore.holeNumber);

      if (entry) {
        entry[holeScore.playerId] = holeScore.grossScore;
      }
    }

    const holeInputs = Array.from(scoresByHole.entries())
      .sort((left, right) => left[0] - right[0])
      .map(([holeNumber, scores]) => ({
        holeNumber,
        scores
      }));

    const canScore =
      setupInputs.length === 4 &&
      holeInputs.length > 0 &&
      holeInputs.every((hole) =>
        rosterPlayers.every((player) => typeof hole.scores[player.playerId] === "number")
      );

    const scorecard =
      canScore && setupInputs.length === 4
        ? scoreMatch({
            players: setupInputs,
            holeScores: holeInputs.map((hole) => ({
              holeNumber: hole.holeNumber,
              scores: hole.scores
            }))
          })
        : null;

    return {
      match: {
        id: match.id,
        tournamentSlug: match.tournament.slug,
        roundLabel: match.roundLabel,
        stage: match.stage,
        stageLabel: formatStageLabel(match.stage),
        status: match.status,
        winningTeamId: match.winningTeamId,
        playedOn: (match.finalizedAt ?? match.submittedAt ?? match.scheduledAt)
          ? (match.finalizedAt ?? match.submittedAt ?? match.scheduledAt)!.toISOString().slice(0, 10)
          : null,
        privateToken: match.privateToken,
        courseId: match.courseId,
        homeTeamName: match.homeTeam.name,
        awayTeamName: match.awayTeam.name
      },
      players,
      courses,
      setupComplete: setupInputs.length === 4,
      isPublished: match.status === "FINAL" || match.status === "SUBMITTED" || match.status === "FORFEIT",
      setupPreview,
      holeInputs,
      scorecard: scorecard
        ? {
            winningTeamId: scorecard.winningTeamId,
            teamSummaries: scorecard.teamSummaries,
            holes: scorecard.holes
          }
        : null
    };
  } catch {
    return null;
  }
}
