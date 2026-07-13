import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tournamentSlug = process.argv[2] ?? "the-two-man-2026";

  const tournament = await prisma.tournament.findUnique({
    where: {
      slug: tournamentSlug
    },
    select: {
      id: true,
      name: true
    }
  });

  if (!tournament) {
    throw new Error(`Tournament "${tournamentSlug}" was not found.`);
  }

  const teamIds = (
    await prisma.team.findMany({
      where: {
        tournamentId: tournament.id
      },
      select: {
        id: true
      }
    })
  ).map((team) => team.id);

  const matchIds = (
    await prisma.match.findMany({
      where: {
        tournamentId: tournament.id
      },
      select: {
        id: true
      }
    })
  ).map((match) => match.id);

  await prisma.$transaction(async (tx) => {
    if (matchIds.length > 0) {
      await tx.matchInvitation.deleteMany({
        where: {
          matchId: {
            in: matchIds
          }
        }
      });

      await tx.matchAuditLog.deleteMany({
        where: {
          matchId: {
            in: matchIds
          }
        }
      });

      await tx.holeScore.deleteMany({
        where: {
          matchId: {
            in: matchIds
          }
        }
      });

      await tx.matchPlayer.deleteMany({
        where: {
          matchId: {
            in: matchIds
          }
        }
      });
    }

    await tx.activityFeedEvent.deleteMany({
      where: {
        tournamentId: tournament.id
      }
    });

    await tx.externalSyncLog.deleteMany({
      where: {
        entityType: {
          in: ["MATCH", "BRACKET", "TOURNAMENT"]
        },
        entityId: {
          in: [tournament.id, ...matchIds]
        }
      }
    });

    await tx.match.deleteMany({
      where: {
        tournamentId: tournament.id
      }
    });

    await tx.bracketRound.deleteMany({
      where: {
        bracket: {
          tournamentId: tournament.id
        }
      }
    });

    await tx.bracket.deleteMany({
      where: {
        tournamentId: tournament.id
      }
    });

    if (teamIds.length > 0) {
      await tx.team.updateMany({
        where: {
          id: {
            in: teamIds
          }
        },
        data: {
          seedNumber: null
        }
      });
    }
  });

  console.log(
    `Reset tournament state for ${tournament.name} (${tournamentSlug}). Preserved players, teams, pods, and course data.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
