"use server";

import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseBulkRosterCsv, readBulkRosterText } from "@/lib/server/admin-import";
import { syncTournamentBracket, syncTournamentBracketTx } from "@/lib/server/bracket-sync";
import {
  assertAdminLoginAllowed,
  adminPasswordMatches,
  clearAdminLoginAttempts,
  clearAdminSession,
  createAdminSession,
  recordFailedAdminLogin,
  requireAdminSession
} from "@/lib/server/admin-auth";
import { db } from "@/lib/server/db";
import { createMatchInvitation } from "@/lib/server/invitations";
import {
  parseAdminLoginForm,
  parseBracketSettingsForm,
  parseMatchForm,
  parsePlayerForm,
  parsePlayerUpdateForm,
  parseMatchForfeitForm,
  parseMatchReopenForm,
  parsePodAssignmentForm,
  parsePodForm,
  parseTeamSeedUpdateForm,
  parseTeamForm,
  parseTournamentForm
} from "@/lib/server/admin-validation";

function adminRedirect(kind: "success" | "error", message: string) {
  redirect(`/admin?kind=${kind}&message=${encodeURIComponent(message)}`);
}

export async function adminLoginAction(formData: FormData) {
  try {
    const parsed = parseAdminLoginForm(formData);

    await assertAdminLoginAllowed();

    if (!adminPasswordMatches(parsed.password)) {
      await recordFailedAdminLogin();
      throw new Error("Incorrect admin password.");
    }

    await clearAdminLoginAttempts();
    await createAdminSession();
  } catch (error) {
    adminRedirect("error", error instanceof Error ? error.message : "Failed to sign in.");
  }

  redirect("/admin");
}

export async function adminLogoutAction() {
  await clearAdminSession();
  redirect("/admin");
}

async function requireTournamentId(): Promise<string> {
  const tournament = await db.tournament.findFirst({
    orderBy: {
      createdAt: "desc"
    },
    select: {
      id: true
    }
  });

  if (!tournament) {
    throw new Error("Create the tournament first.");
  }

  return tournament.id;
}

function nextOpenPodSlot(usedSlots: Set<number>) {
  for (const slot of [1, 2, 3]) {
    if (!usedSlots.has(slot)) {
      return slot;
    }
  }

  return null;
}

function buildPodPairingKey(podId: string | null, homeTeamId: string | null, awayTeamId: string | null) {
  if (!podId || !homeTeamId || !awayTeamId) {
    return null;
  }

  return `${podId}:${[homeTeamId, awayTeamId].sort().join(":")}`;
}

export async function saveTournamentAction(formData: FormData) {
  try {
    await requireAdminSession();
    const parsed = parseTournamentForm(formData);
    const existing = await db.tournament.findFirst({
      orderBy: {
        createdAt: "desc"
      },
      select: {
        id: true
      }
    });

    if (existing) {
      await db.tournament.update({
        where: { id: existing.id },
        data: {
          name: parsed.name,
          slug: parsed.slug,
          seasonYear: parsed.seasonYear,
          startDate: new Date(parsed.startDate),
          endDate: new Date(parsed.endDate),
          status: "ACTIVE"
        }
      });
    } else {
      await db.tournament.create({
        data: {
          id: nanoid(),
          name: parsed.name,
          slug: parsed.slug,
          seasonYear: parsed.seasonYear,
          startDate: new Date(parsed.startDate),
          endDate: new Date(parsed.endDate),
          status: "ACTIVE"
        }
      });
    }

    revalidatePath("/admin");
  } catch (error) {
    adminRedirect("error", error instanceof Error ? error.message : "Failed to save tournament.");
  }

  adminRedirect("success", "Tournament settings saved.");
}

export async function saveBracketSettingsAction(formData: FormData) {
  try {
    await requireAdminSession();
    const tournamentId = await requireTournamentId();
    const parsed = parseBracketSettingsForm(formData);
    const existingBracket = await db.bracket.findFirst({
      where: {
        tournamentId
      },
      orderBy: {
        createdAt: "asc"
      },
      include: {
        rounds: true
      }
    });

    if (existingBracket) {
      await db.bracket.update({
        where: { id: existingBracket.id },
        data: {
          label: parsed.label,
          qualifierCount: parsed.qualifierCount
        }
      });
    } else {
      const bracketId = nanoid();

      await db.bracket.create({
        data: {
          id: bracketId,
          tournamentId,
          label: parsed.label,
          qualifierCount: parsed.qualifierCount,
          rounds: {
            create: [
              {
                id: nanoid(),
                label: "Quarterfinals",
                stage: "QUARTERFINAL",
                roundOrder: 1
              },
              {
                id: nanoid(),
                label: "Semifinals",
                stage: "SEMIFINAL",
                roundOrder: 2
              },
              {
                id: nanoid(),
                label: "Championship",
                stage: "CHAMPIONSHIP",
                roundOrder: 3
              }
            ]
          }
        }
      });
    }

    await syncTournamentBracket(tournamentId);
    revalidatePath("/admin");
  } catch (error) {
    adminRedirect("error", error instanceof Error ? error.message : "Failed to save bracket settings.");
  }

  adminRedirect("success", "Bracket settings saved.");
}

export async function syncBracketAction() {
  try {
    await requireAdminSession();
    const tournamentId = await requireTournamentId();

    await syncTournamentBracket(tournamentId);
    revalidatePath("/admin");
  } catch (error) {
    adminRedirect("error", error instanceof Error ? error.message : "Failed to sync bracket.");
  }

  adminRedirect("success", "Bracket shell synced.");
}

export async function createPlayerAction(formData: FormData) {
  try {
    await requireAdminSession();
    const tournamentId = await requireTournamentId();
    const parsed = parsePlayerForm(formData);

    await db.player.create({
      data: {
        id: nanoid(),
        tournamentId,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        displayName: `${parsed.firstName} ${parsed.lastName}`,
        email: parsed.email,
        ghinNumber: parsed.ghinNumber,
        handicapIndex: parsed.handicapIndex,
        handicapSyncStatus: parsed.ghinNumber ? "PENDING" : "MANUAL"
      }
    });

    revalidatePath("/admin");
  } catch (error) {
    adminRedirect("error", error instanceof Error ? error.message : "Failed to create player.");
  }

  adminRedirect("success", "Player created.");
}

export async function updatePlayerAction(formData: FormData) {
  let successMessage = "Player updated.";

  try {
    await requireAdminSession();
    const parsed = parsePlayerUpdateForm(formData);

    await db.player.update({
      where: {
        id: parsed.playerId
      },
      data: {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        displayName: `${parsed.firstName} ${parsed.lastName}`,
        email: parsed.email
      }
    });

    revalidatePath("/admin");
    successMessage = `Updated ${parsed.firstName} ${parsed.lastName}.`;
  } catch (error) {
    adminRedirect("error", error instanceof Error ? error.message : "Failed to update player.");
  }

  adminRedirect("success", successMessage);
}

export async function generatePodMatchLinksAction() {
  let successMessage = "Generated pod match links.";

  try {
    await requireAdminSession();
    const tournamentId = await requireTournamentId();
    const tournament = await db.tournament.findUnique({
      where: {
        id: tournamentId
      },
      include: {
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
        matches: {
          where: {
            stage: "POD_PLAY"
          },
          select: {
            homeTeamId: true,
            awayTeamId: true,
            podId: true
          }
        }
      }
    });

    if (!tournament) {
      throw new Error("Tournament not found.");
    }

    const existingKeys = new Set(
      tournament.matches
        .map((match) => buildPodPairingKey(match.podId, match.homeTeamId, match.awayTeamId))
        .filter((value): value is string => Boolean(value))
    );

    const matchesToCreate: Array<{
      podId: string;
      roundLabel: string;
      homeTeamId: string;
      awayTeamId: string;
    }> = [];

    for (const pod of tournament.pods) {
      const teamEntries = pod.teams;

      if (teamEntries.length !== 3) {
        continue;
      }

      const pairings = [
        [teamEntries[0], teamEntries[1]],
        [teamEntries[0], teamEntries[2]],
        [teamEntries[1], teamEntries[2]]
      ];

      for (const [pairingIndex, pairing] of pairings.entries()) {
        const homeTeamId = pairing[0]?.team.id;
        const awayTeamId = pairing[1]?.team.id;

        if (!homeTeamId || !awayTeamId) {
          continue;
        }

        const pairingKey = buildPodPairingKey(pod.id, homeTeamId, awayTeamId);

        if (pairingKey && existingKeys.has(pairingKey)) {
          continue;
        }

        matchesToCreate.push({
          podId: pod.id,
          roundLabel: `${pod.name} Match ${pairingIndex + 1}`,
          homeTeamId,
          awayTeamId
        });
      }
    }

    if (matchesToCreate.length === 0) {
      revalidatePath("/admin");
      successMessage = "Pod match links were already generated.";
    } else {
      await db.match.createMany({
        data: matchesToCreate.map((match) => {
          const matchId = nanoid();
          return {
            id: matchId,
            tournamentId,
            podId: match.podId,
            stage: "POD_PLAY",
            status: "READY",
            roundLabel: match.roundLabel,
            homeTeamId: match.homeTeamId,
            awayTeamId: match.awayTeamId,
            privateToken: nanoid(24),
            publicScorecardSlug: `${match.roundLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${matchId}`
          };
        })
      });

      successMessage = `Generated ${matchesToCreate.length} pod match links.`;
    }

    revalidatePath("/admin");
  } catch (error) {
    adminRedirect("error", error instanceof Error ? error.message : "Failed to generate match links.");
  }

  adminRedirect("success", successMessage);
}

export async function updateTeamSeedAction(formData: FormData) {
  try {
    await requireAdminSession();
    const parsed = parseTeamSeedUpdateForm(formData);

    await db.team.update({
      where: {
        id: parsed.teamId
      },
      data: {
        seedNumber: parsed.seedNumber
      }
    });

    revalidatePath("/admin");
  } catch (error) {
    adminRedirect("error", error instanceof Error ? error.message : "Failed to save team seed.");
  }

  adminRedirect("success", "Team seed saved.");
}

export async function resetTeamSeedsAction() {
  try {
    await requireAdminSession();
    const tournamentId = await requireTournamentId();

    await db.team.updateMany({
      where: {
        tournamentId
      },
      data: {
        seedNumber: null
      }
    });

    revalidatePath("/admin");
  } catch (error) {
    adminRedirect("error", error instanceof Error ? error.message : "Failed to reset seeds.");
  }

  adminRedirect("success", "Seed overrides cleared.");
}

export async function reopenMatchAction(formData: FormData) {
  let successMessage = "Match reopened.";

  try {
    await requireAdminSession();
    const parsed = parseMatchReopenForm(formData);
    const match = await db.match.findUnique({
      where: {
        id: parsed.matchId
      },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });

    if (!match) {
      throw new Error("Match not found.");
    }

    await db.$transaction(async (tx) => {
      await tx.match.update({
        where: {
          id: parsed.matchId
        },
        data: {
          status: "REOPENED",
          reopenedAt: new Date(),
          finalizedAt: null,
          submittedAt: null,
          winningTeamId: null,
          isOverride: true,
          overrideNote: parsed.overrideNote ?? "Reopened by commissioner for correction."
        }
      });

      await tx.matchAuditLog.create({
        data: {
          id: nanoid(),
          matchId: parsed.matchId,
          action: "REOPENED",
          actorLabel: "Commissioner",
          note: parsed.overrideNote ?? "Reopened by commissioner for correction."
        }
      });

      await syncTournamentBracketTx(tx, match.tournamentId);
    });

    revalidatePath("/admin");
    successMessage = `${match.homeTeam?.name ?? "Match"} vs ${match.awayTeam?.name ?? "match"} reopened.`;
  } catch (error) {
    adminRedirect("error", error instanceof Error ? error.message : "Failed to reopen match.");
  }

  adminRedirect("success", successMessage);
}

export async function resetMatchCardAction(formData: FormData) {
  let successMessage = "Match scorecard reset.";

  try {
    await requireAdminSession();
    const parsed = parseMatchReopenForm(formData);
    const match = await db.match.findUnique({
      where: {
        id: parsed.matchId
      },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });

    if (!match) {
      throw new Error("Match not found.");
    }

    await db.$transaction(async (tx) => {
      await tx.holeScore.deleteMany({
        where: {
          matchId: parsed.matchId
        }
      });

      await tx.matchPlayer.deleteMany({
        where: {
          matchId: parsed.matchId
        }
      });

      await tx.match.update({
        where: {
          id: parsed.matchId
        },
        data: {
          courseId: null,
          status: "READY",
          winningTeamId: null,
          submittedAt: null,
          finalizedAt: null,
          reopenedAt: null,
          isOverride: true,
          overrideNote: parsed.overrideNote ?? "Reset by commissioner to rebuild the scorecard."
        }
      });

      await tx.matchAuditLog.create({
        data: {
          id: nanoid(),
          matchId: parsed.matchId,
          action: "RESET",
          actorLabel: "Commissioner",
          note: parsed.overrideNote ?? "Reset by commissioner to rebuild the scorecard."
        }
      });

      await syncTournamentBracketTx(tx, match.tournamentId);
    });

    revalidatePath("/admin");
    successMessage = `${match.homeTeam?.name ?? "Match"} vs ${match.awayTeam?.name ?? "match"} reset.`;
  } catch (error) {
    adminRedirect("error", error instanceof Error ? error.message : "Failed to reset match.");
  }

  adminRedirect("success", successMessage);
}

export async function forfeitMatchAction(formData: FormData) {
  let successMessage = "Match forfeited.";

  try {
    await requireAdminSession();
    const parsed = parseMatchForfeitForm(formData);
    const match = await db.match.findUnique({
      where: {
        id: parsed.matchId
      },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });

    if (!match) {
      throw new Error("Match not found.");
    }

    if (
      parsed.winnerTeamId !== match.homeTeamId &&
      parsed.winnerTeamId !== match.awayTeamId
    ) {
      throw new Error("Forfeit winner must be one of the teams in this match.");
    }

    await db.$transaction(async (tx) => {
      await tx.holeScore.deleteMany({
        where: {
          matchId: parsed.matchId
        }
      });

      await tx.match.update({
        where: {
          id: parsed.matchId
        },
        data: {
          status: "FORFEIT",
          winningTeamId: parsed.winnerTeamId,
          submittedAt: new Date(),
          finalizedAt: new Date(),
          reopenedAt: null,
          isOverride: true,
          overrideNote: parsed.overrideNote ?? "Marked as a forfeit by the commissioner."
        }
      });

      await tx.matchAuditLog.create({
        data: {
          id: nanoid(),
          matchId: parsed.matchId,
          action: "FORFEIT",
          actorLabel: "Commissioner",
          note: parsed.overrideNote ?? "Marked as a forfeit by the commissioner."
        }
      });

      await syncTournamentBracketTx(tx, match.tournamentId);
    });

    revalidatePath("/admin");
    successMessage = `${match.homeTeam?.name ?? "Team"} vs ${match.awayTeam?.name ?? "team"} marked as a forfeit.`;
  } catch (error) {
    adminRedirect("error", error instanceof Error ? error.message : "Failed to record the forfeit.");
  }

  adminRedirect("success", successMessage);
}

export async function bulkImportRosterAction(formData: FormData) {
  try {
    await requireAdminSession();
    const tournamentId = await requireTournamentId();
    const csvText = await readBulkRosterText(formData);
    const rows = parseBulkRosterCsv(csvText);

    await db.$transaction(async (tx) => {
      const rowEmails = rows.flatMap((row) => [row.player1Email, row.player2Email]);
      const rowTeamNames = rows.map((row) => row.teamName);
      const existingPlayers = await tx.player.findMany({
        where: {
          tournamentId,
          email: {
            in: rowEmails
          }
        }
      });
      const existingTeams = await tx.team.findMany({
        where: {
          tournamentId,
          name: {
            in: rowTeamNames
          }
        },
        select: {
          name: true
        }
      });

      if (existingTeams.length > 0) {
        throw new Error(
          `These team names already exist: ${existingTeams.map((team) => team.name).join(", ")}`
        );
      }

      const rosteredPlayers = existingPlayers.length
        ? await tx.teamPlayer.findMany({
            where: {
              playerId: {
                in: existingPlayers.map((player) => player.id)
              }
            },
            include: {
              player: {
                select: {
                  displayName: true
                }
              },
              team: {
                select: {
                  name: true
                }
              }
            }
          })
        : [];

      if (rosteredPlayers.length > 0) {
        throw new Error(
          `These players are already assigned to teams: ${rosteredPlayers
            .map((entry) => `${entry.player.displayName} (${entry.team.name})`)
            .join(", ")}`
        );
      }

      const playerByEmail = new Map(
        existingPlayers.map((player) => [player.email?.toLowerCase() ?? "", player])
      );
      const existingPods = await tx.pod.findMany({
        where: {
          tournamentId
        },
        orderBy: {
          podOrder: "asc"
        },
        include: {
          teams: {
            select: {
              slotNumber: true
            }
          }
        }
      });
      const podByName = new Map(
        existingPods.map((pod) => [
          pod.name.toLowerCase(),
          {
            id: pod.id,
            name: pod.name,
            podOrder: pod.podOrder,
            usedSlots: new Set(pod.teams.map((team) => team.slotNumber))
          }
        ])
      );
      let nextPodOrder = existingPods.reduce((max, pod) => Math.max(max, pod.podOrder), 0) + 1;

      for (const row of rows) {
        let playerOne = playerByEmail.get(row.player1Email);

        if (playerOne) {
          playerOne = await tx.player.update({
            where: { id: playerOne.id },
            data: {
              firstName: row.player1FirstName,
              lastName: row.player1LastName,
              displayName: `${row.player1FirstName} ${row.player1LastName}`,
              ghinNumber: row.player1Ghin,
              handicapIndex: row.player1HandicapIndex,
              handicapSyncStatus: row.player1Ghin ? "PENDING" : "MANUAL"
            }
          });
        } else {
          playerOne = await tx.player.create({
            data: {
              id: nanoid(),
              tournamentId,
              firstName: row.player1FirstName,
              lastName: row.player1LastName,
              displayName: `${row.player1FirstName} ${row.player1LastName}`,
              email: row.player1Email,
              ghinNumber: row.player1Ghin,
              handicapIndex: row.player1HandicapIndex,
              handicapSyncStatus: row.player1Ghin ? "PENDING" : "MANUAL"
            }
          });
        }

        playerByEmail.set(row.player1Email, playerOne);

        let playerTwo = playerByEmail.get(row.player2Email);

        if (playerTwo) {
          playerTwo = await tx.player.update({
            where: { id: playerTwo.id },
            data: {
              firstName: row.player2FirstName,
              lastName: row.player2LastName,
              displayName: `${row.player2FirstName} ${row.player2LastName}`,
              ghinNumber: row.player2Ghin,
              handicapIndex: row.player2HandicapIndex,
              handicapSyncStatus: row.player2Ghin ? "PENDING" : "MANUAL"
            }
          });
        } else {
          playerTwo = await tx.player.create({
            data: {
              id: nanoid(),
              tournamentId,
              firstName: row.player2FirstName,
              lastName: row.player2LastName,
              displayName: `${row.player2FirstName} ${row.player2LastName}`,
              email: row.player2Email,
              ghinNumber: row.player2Ghin,
              handicapIndex: row.player2HandicapIndex,
              handicapSyncStatus: row.player2Ghin ? "PENDING" : "MANUAL"
            }
          });
        }

        playerByEmail.set(row.player2Email, playerTwo);

        const teamId = nanoid();

        await tx.team.create({
          data: {
            id: teamId,
            tournamentId,
            name: row.teamName,
            seedNumber: row.seedNumber
          }
        });

        await tx.teamPlayer.createMany({
          data: [
            {
              teamId,
              playerId: playerOne.id,
              rosterPosition: 1
            },
            {
              teamId,
              playerId: playerTwo.id,
              rosterPosition: 2
            }
          ]
        });

        if (row.podName) {
          const podKey = row.podName.toLowerCase();
          let pod = podByName.get(podKey);

          if (!pod) {
            const createdPod = await tx.pod.create({
              data: {
                id: nanoid(),
                tournamentId,
                name: row.podName,
                podOrder: nextPodOrder
              }
            });

            pod = {
              id: createdPod.id,
              name: createdPod.name,
              podOrder: createdPod.podOrder,
              usedSlots: new Set<number>()
            };
            podByName.set(podKey, pod);
            nextPodOrder += 1;
          }

          const slotNumber = row.podSlot ?? nextOpenPodSlot(pod.usedSlots);

          if (!slotNumber) {
            throw new Error(`No open pod slots remain in ${pod.name}.`);
          }

          if (pod.usedSlots.has(slotNumber)) {
            throw new Error(`${pod.name} slot ${slotNumber} is already occupied.`);
          }

          await tx.podTeam.create({
            data: {
              podId: pod.id,
              teamId,
              slotNumber
            }
          });

          pod.usedSlots.add(slotNumber);
        }
      }
    });

    revalidatePath("/admin");
    adminRedirect("success", `Imported ${rows.length} teams and ${rows.length * 2} players.`);
  } catch (error) {
    adminRedirect("error", error instanceof Error ? error.message : "Bulk roster import failed.");
  }
}

export async function createTeamAction(formData: FormData) {
  try {
    await requireAdminSession();
    const tournamentId = await requireTournamentId();
    const parsed = parseTeamForm(formData);
    const existingRosteredPlayers = await db.teamPlayer.findMany({
      where: {
        playerId: {
          in: [parsed.playerOneId, parsed.playerTwoId]
        }
      },
      select: {
        playerId: true
      }
    });

    if (existingRosteredPlayers.length > 0) {
      throw new Error("One or more selected players are already assigned to a team.");
    }

    await db.$transaction(async (tx) => {
      const teamId = nanoid();

      await tx.team.create({
        data: {
          id: teamId,
          tournamentId,
          name: parsed.name,
          seedNumber: parsed.seedNumber
        }
      });

      await tx.teamPlayer.createMany({
        data: [
          {
            teamId,
            playerId: parsed.playerOneId,
            rosterPosition: 1
          },
          {
            teamId,
            playerId: parsed.playerTwoId,
            rosterPosition: 2
          }
        ]
      });
    });

    revalidatePath("/admin");
    adminRedirect("success", "Team created.");
  } catch (error) {
    adminRedirect("error", error instanceof Error ? error.message : "Failed to create team.");
  }
}

export async function createPodAction(formData: FormData) {
  try {
    await requireAdminSession();
    const tournamentId = await requireTournamentId();
    const parsed = parsePodForm(formData);

    await db.pod.create({
      data: {
        id: nanoid(),
        tournamentId,
        name: parsed.name,
        podOrder: parsed.podOrder
      }
    });

    revalidatePath("/admin");
    adminRedirect("success", "Pod created.");
  } catch (error) {
    adminRedirect("error", error instanceof Error ? error.message : "Failed to create pod.");
  }
}

export async function assignTeamToPodAction(formData: FormData) {
  try {
    await requireAdminSession();
    const parsed = parsePodAssignmentForm(formData);
    const existingSlot = await db.podTeam.findFirst({
      where: {
        podId: parsed.podId,
        slotNumber: parsed.slotNumber
      },
      select: {
        teamId: true
      }
    });

    if (existingSlot && existingSlot.teamId !== parsed.teamId) {
      throw new Error("That pod slot is already occupied.");
    }

    await db.$transaction(async (tx) => {
      await tx.podTeam.deleteMany({
        where: {
          teamId: parsed.teamId
        }
      });

      await tx.podTeam.create({
        data: {
          podId: parsed.podId,
          teamId: parsed.teamId,
          slotNumber: parsed.slotNumber
        }
      });
    });

    revalidatePath("/admin");
    adminRedirect("success", "Team assigned to pod.");
  } catch (error) {
    adminRedirect("error", error instanceof Error ? error.message : "Failed to assign pod.");
  }
}

export async function createMatchAction(formData: FormData) {
  try {
    await requireAdminSession();
    const tournamentId = await requireTournamentId();
    const parsed = parseMatchForm(formData);
    const teams = await db.team.findMany({
      where: {
        id: {
          in: [parsed.homeTeamId, parsed.awayTeamId]
        }
      },
      include: {
        roster: {
          include: {
            player: true
          }
        },
        podMemberships: true
      }
    });

    if (teams.length !== 2) {
      throw new Error("Both teams must exist before scheduling a match.");
    }

    if (parsed.stage === "POD_PLAY") {
      const validPodMatch = teams.every((team) =>
        team.podMemberships.some((membership) => membership.podId === parsed.podId)
      );

      if (!validPodMatch) {
        throw new Error("Pod-play matches must be scheduled between teams in the selected pod.");
      }
    }

    await db.$transaction(async (tx) => {
      const matchId = nanoid();
      const privateToken = nanoid(24);

      await tx.match.create({
        data: {
          id: matchId,
          tournamentId,
          podId: parsed.podId,
          stage: parsed.stage,
          status: "SCHEDULED",
          roundLabel: parsed.roundLabel,
          scheduledAt: new Date(parsed.scheduledAt),
          homeTeamId: parsed.homeTeamId,
          awayTeamId: parsed.awayTeamId,
          privateToken,
          publicScorecardSlug: `${parsed.roundLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${matchId}`
        }
      });

      const invitations = teams.flatMap((team) =>
        team.roster.map((entry) =>
          createMatchInvitation({
            matchId,
            recipientEmail: entry.player.email ?? `${entry.player.id}@fairwaymatch.dev`,
            claimedByPlayerId: entry.player.id
          })
        )
      );

      await tx.matchInvitation.createMany({
        data: invitations.map((invitation) => ({
          id: invitation.id,
          matchId: invitation.matchId,
          recipientPlayerId: invitation.claimedByPlayerId,
          claimedByPlayerId: invitation.claimedByPlayerId,
          recipientEmail: invitation.recipientEmail,
          token: invitation.token,
          sentAt: null,
          openedAt: null
        }))
      });

    });

    revalidatePath("/admin");
    adminRedirect("success", "Match scheduled and invite links generated.");
  } catch (error) {
    adminRedirect("error", error instanceof Error ? error.message : "Failed to create match.");
  }
}
