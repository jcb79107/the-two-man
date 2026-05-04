import "server-only";

import { db } from "@/lib/server/db";

export interface AdminDashboardData {
  databaseReady: boolean;
  databaseError: string | null;
  tournament: {
    id: string;
    name: string;
    slug: string;
    seasonYear: number;
    startDate: string;
    endDate: string;
  } | null;
  bracket: {
    id: string;
    label: string;
    qualifierCount: number;
    rounds: Array<{
      id: string;
      label: string;
      stage: string;
      roundOrder: number;
      matchCount: number;
    }>;
  } | null;
  summary: {
    players: number;
    teams: number;
    pods: number;
  };
  teams: Array<{
    id: string;
    name: string;
    seedNumber: number | null;
    podName: string | null;
    slotNumber: number | null;
  }>;
  matchLinks: Array<{
    id: string;
    roundLabel: string;
    stage: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    submittedAt: string | null;
    finalizedAt: string | null;
    reopenedAt: string | null;
    scheduledAt: string | null;
    podName: string | null;
    homeTeamId: string | null;
    homeTeamName: string | null;
    awayTeamId: string | null;
    awayTeamName: string | null;
    privateToken: string;
    publicScorecardSlug: string;
    isOverride: boolean;
    overrideNote: string | null;
    playedOn: string | null;
    recipients: Array<{
      playerId: string;
      displayName: string;
      email: string | null;
    }>;
  }>;
  players: Array<{
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
    email: string | null;
    ghinNumber: string | null;
    handicapSyncStatus: string;
    teamName: string | null;
    podName: string | null;
  }>;
  pods: Array<{
    id: string;
    name: string;
    podOrder: number;
    teams: Array<{
      teamId: string;
      teamName: string;
      slotNumber: number;
      seedNumber: number | null;
    }>;
  }>;
  recentAuditLog: Array<{
    id: string;
    action: string;
    actorLabel: string | null;
    note: string | null;
    createdAt: string;
    roundLabel: string;
    homeTeamName: string | null;
    awayTeamName: string | null;
    matchStatus: string;
  }>;
}

function decimalToNumber(value: unknown): number | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  return Number(value);
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  try {
    const tournament = await db.tournament.findFirst({
      orderBy: {
        createdAt: "desc"
      },
      include: {
        players: {
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          include: {
            teamMemberships: {
              include: {
                team: {
                  include: {
                    podMemberships: {
                      include: {
                        pod: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        pods: {
          orderBy: {
            podOrder: "asc"
          },
          include: {
            teams: {
              orderBy: {
                slotNumber: "asc"
              },
              include: {
                team: true
              }
            }
          }
        },
        teams: {
          select: {
            id: true
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
              },
              include: {
                matches: {
                  select: {
                    id: true
                  }
                }
              }
            }
          }
        },
        matches: {
          orderBy: [{ stage: "asc" }, { roundLabel: "asc" }],
          include: {
            pod: true,
            homeTeam: {
              include: {
                roster: {
                  orderBy: {
                    rosterPosition: "asc"
                  },
                  include: {
                    player: {
                      select: {
                        id: true,
                        displayName: true,
                        email: true
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
                        id: true,
                        displayName: true,
                        email: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!tournament) {
      return {
        databaseReady: true,
        databaseError: null,
        tournament: null,
        bracket: null,
        summary: {
          players: 0,
          teams: 0,
          pods: 0
        },
        teams: [],
        matchLinks: [],
        players: [],
        pods: [],
        recentAuditLog: []
      };
    }

    const players = tournament.players.map((player) => {
      const team = player.teamMemberships[0]?.team;
      const pod = team?.podMemberships[0]?.pod;

      return {
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        displayName: player.displayName,
        email: player.email ?? null,
        ghinNumber: player.ghinNumber,
        handicapSyncStatus: player.handicapSyncStatus,
        teamName: team?.name ?? null,
        podName: pod?.name ?? null
      };
    });

    const teams = tournament.pods.flatMap((pod) =>
      pod.teams.map((entry) => ({
        id: entry.team.id,
        name: entry.team.name,
        seedNumber: entry.team.seedNumber,
        podName: pod.name,
        slotNumber: entry.slotNumber
      }))
    );

    const matchLinks = tournament.matches.map((match) => {
      const recipients = [...(match.homeTeam?.roster ?? []), ...(match.awayTeam?.roster ?? [])].map((entry) => ({
        playerId: entry.player.id,
        displayName: entry.player.displayName,
        email: entry.player.email ?? null
      }));

      return {
        id: match.id,
        roundLabel: match.roundLabel,
        stage: match.stage,
        status: match.status,
        createdAt: match.createdAt.toISOString(),
        updatedAt: match.updatedAt.toISOString(),
        submittedAt: match.submittedAt?.toISOString() ?? null,
        finalizedAt: match.finalizedAt?.toISOString() ?? null,
        reopenedAt: match.reopenedAt?.toISOString() ?? null,
        scheduledAt: match.scheduledAt?.toISOString() ?? null,
        podName: match.pod?.name ?? null,
        homeTeamId: match.homeTeamId ?? null,
        homeTeamName: match.homeTeam?.name ?? null,
        awayTeamId: match.awayTeamId ?? null,
        awayTeamName: match.awayTeam?.name ?? null,
        privateToken: match.privateToken,
        publicScorecardSlug: match.publicScorecardSlug,
        isOverride: match.isOverride,
        overrideNote: match.overrideNote ?? null,
        playedOn: (match.finalizedAt ?? match.submittedAt ?? match.scheduledAt)
          ? (match.finalizedAt ?? match.submittedAt ?? match.scheduledAt)?.toISOString().slice(0, 10) ?? null
          : null,
        recipients
      };
    });

    const pods = tournament.pods.map((pod) => ({
      id: pod.id,
      name: pod.name,
      podOrder: pod.podOrder,
      teams: pod.teams.map((entry) => ({
        teamId: entry.team.id,
        teamName: entry.team.name,
        slotNumber: entry.slotNumber,
        seedNumber: entry.team.seedNumber
      }))
    }));

    const bracket = tournament.brackets[0]
      ? {
          id: tournament.brackets[0].id,
          label: tournament.brackets[0].label,
          qualifierCount: tournament.brackets[0].qualifierCount,
          rounds: tournament.brackets[0].rounds.map((round) => ({
            id: round.id,
            label: round.label,
            stage: round.stage,
            roundOrder: round.roundOrder,
            matchCount: round.matches.length
          }))
        }
      : null;

    const recentAuditLog = await db.matchAuditLog.findMany({
      where: {
        match: {
          tournamentId: tournament.id
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 12,
      include: {
        match: {
          include: {
            homeTeam: true,
            awayTeam: true
          }
        }
      }
    });

    return {
      databaseReady: true,
      databaseError: null,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        slug: tournament.slug,
        seasonYear: tournament.seasonYear,
        startDate: tournament.startDate.toISOString().slice(0, 10),
        endDate: tournament.endDate.toISOString().slice(0, 10)
      },
      bracket,
      summary: {
        players: players.length,
        teams: tournament.teams.length,
        pods: pods.length
      },
      teams,
      matchLinks,
      players,
      pods,
      recentAuditLog: recentAuditLog.map((entry) => ({
        id: entry.id,
        action: entry.action,
        actorLabel: entry.actorLabel ?? null,
        note: entry.note ?? null,
        createdAt: entry.createdAt.toISOString(),
        roundLabel: entry.match.roundLabel,
        homeTeamName: entry.match.homeTeam?.name ?? null,
        awayTeamName: entry.match.awayTeam?.name ?? null,
        matchStatus: entry.match.status
      }))
    };
  } catch (error) {
    return {
      databaseReady: false,
      databaseError: error instanceof Error ? error.message : "Failed to connect to the database.",
      tournament: null,
      bracket: null,
      summary: {
        players: 0,
        teams: 0,
        pods: 0
      },
      teams: [],
      matchLinks: [],
      players: [],
      pods: [],
      recentAuditLog: []
    };
  }
}
