import { db } from "@/lib/server/db";

async function main() {
  const tournament = await db.tournament.findFirst({
    orderBy: {
      createdAt: "desc"
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
      brackets: {
        include: {
          rounds: {
            orderBy: {
              roundOrder: "asc"
            }
          }
        }
      },
      matches: {
        orderBy: [{ stage: "asc" }, { roundLabel: "asc" }]
      }
    }
  });

  if (!tournament) {
    throw new Error("No tournament found.");
  }

  const podWinners = tournament.pods
    .map((pod) => pod.teams[0]?.team)
    .filter((team): team is NonNullable<typeof team> => Boolean(team));
  const wildCards = tournament.pods
    .flatMap((pod) => pod.teams.slice(1).map((entry) => entry.team))
    .filter((team): team is NonNullable<typeof team> => Boolean(team))
    .slice(0, 2);

  const seededTeams = [...podWinners, ...wildCards].slice(0, 8);
  const seedIds = new Set(seededTeams.map((team) => team.id));

  await db.$transaction(async (tx) => {
    const allTeams = await tx.team.findMany({
      where: {
        tournamentId: tournament.id
      },
      select: {
        id: true
      }
    });

    for (const team of allTeams) {
      await tx.team.update({
        where: {
          id: team.id
        },
        data: {
          seedNumber: null
        }
      });
    }

    for (const [index, team] of seededTeams.entries()) {
      await tx.team.update({
        where: {
          id: team.id
        },
        data: {
          seedNumber: index + 1
        }
      });
    }
  });

  const bracket = tournament.brackets[0];
  if (!bracket) {
    throw new Error("No bracket shell found. Use Sync bracket shell in admin first.");
  }

  const bracketMatches = tournament.matches.filter((match) => match.bracketId === bracket.id);
  const qf1 = bracketMatches.find((match) => match.roundLabel === "Quarterfinal 1");
  const qf2 = bracketMatches.find((match) => match.roundLabel === "Quarterfinal 2");
  const qf3 = bracketMatches.find((match) => match.roundLabel === "Quarterfinal 3");
  const qf4 = bracketMatches.find((match) => match.roundLabel === "Quarterfinal 4");
  const sf1 = bracketMatches.find((match) => match.roundLabel === "Semifinal 1");
  const sf2 = bracketMatches.find((match) => match.roundLabel === "Semifinal 2");
  const championship = bracketMatches.find((match) => match.roundLabel === "Championship");

  if (!qf1 || !qf2 || !qf3 || !qf4 || !sf1 || !sf2 || !championship) {
    throw new Error("Bracket shell is incomplete. Use Sync bracket shell in admin first.");
  }

  const seedsByNumber = new Map(seededTeams.map((team, index) => [index + 1, team]));
  const slot = (seedNumber: number) => seedsByNumber.get(seedNumber) ?? null;

  await db.$transaction(async (tx) => {
    await tx.match.update({
      where: { id: qf1.id },
      data: {
        stage: "QUARTERFINAL",
        status: "FORFEIT",
        homeTeamId: slot(1)?.id ?? null,
        awayTeamId: slot(8)?.id ?? null,
        winningTeamId: slot(1)?.id ?? null,
        homeSeedNumber: 1,
        awaySeedNumber: 8,
        homeSeedLabel: slot(1)?.name ?? "Seed 1",
        awaySeedLabel: slot(8)?.name ?? "Seed 8",
        submittedAt: new Date("2026-05-18T18:00:00.000Z"),
        finalizedAt: new Date("2026-05-18T18:30:00.000Z")
      }
    });

    await tx.match.update({
      where: { id: qf2.id },
      data: {
        stage: "QUARTERFINAL",
        status: "FORFEIT",
        homeTeamId: slot(4)?.id ?? null,
        awayTeamId: slot(5)?.id ?? null,
        winningTeamId: slot(5)?.id ?? null,
        homeSeedNumber: 4,
        awaySeedNumber: 5,
        homeSeedLabel: slot(4)?.name ?? "Seed 4",
        awaySeedLabel: slot(5)?.name ?? "Seed 5",
        submittedAt: new Date("2026-05-19T19:00:00.000Z"),
        finalizedAt: new Date("2026-05-19T19:25:00.000Z")
      }
    });

    await tx.match.update({
      where: { id: qf3.id },
      data: {
        stage: "QUARTERFINAL",
        status: "READY",
        homeTeamId: slot(2)?.id ?? null,
        awayTeamId: slot(7)?.id ?? null,
        winningTeamId: null,
        homeSeedNumber: 2,
        awaySeedNumber: 7,
        homeSeedLabel: slot(2)?.name ?? "Seed 2",
        awaySeedLabel: slot(7)?.name ?? "Seed 7",
        submittedAt: null,
        finalizedAt: null
      }
    });

    await tx.match.update({
      where: { id: qf4.id },
      data: {
        stage: "QUARTERFINAL",
        status: "SCHEDULED",
        homeTeamId: slot(3)?.id ?? null,
        awayTeamId: slot(6)?.id ?? null,
        winningTeamId: null,
        homeSeedNumber: 3,
        awaySeedNumber: 6,
        homeSeedLabel: slot(3)?.name ?? "Seed 3",
        awaySeedLabel: slot(6)?.name ?? "Seed 6",
        submittedAt: null,
        finalizedAt: null
      }
    });

    await tx.match.update({
      where: { id: sf1.id },
      data: {
        stage: "SEMIFINAL",
        status: "READY",
        homeTeamId: slot(1)?.id ?? null,
        awayTeamId: slot(5)?.id ?? null,
        winningTeamId: null,
        homeSeedNumber: 1,
        awaySeedNumber: 5,
        homeSeedLabel: slot(1)?.name ?? "Winner of Quarterfinal 1",
        awaySeedLabel: slot(5)?.name ?? "Winner of Quarterfinal 2",
        submittedAt: null,
        finalizedAt: null
      }
    });

    await tx.match.update({
      where: { id: sf2.id },
      data: {
        stage: "SEMIFINAL",
        status: "SCHEDULED",
        homeTeamId: null,
        awayTeamId: null,
        winningTeamId: null,
        homeSeedNumber: null,
        awaySeedNumber: null,
        homeSeedLabel: "Winner of Quarterfinal 3",
        awaySeedLabel: "Winner of Quarterfinal 4",
        submittedAt: null,
        finalizedAt: null
      }
    });

    await tx.match.update({
      where: { id: championship.id },
      data: {
        stage: "CHAMPIONSHIP",
        status: "SCHEDULED",
        homeTeamId: null,
        awayTeamId: null,
        winningTeamId: null,
        homeSeedNumber: null,
        awaySeedNumber: null,
        homeSeedLabel: "Winner of Semifinal 1",
        awaySeedLabel: "Winner of Semifinal 2",
        submittedAt: null,
        finalizedAt: null
      }
    });
  });

  const seededNames = seededTeams.map((team, index) => `${index + 1}. ${team.name}`);
  console.log("Bracket preview staged for:");
  console.log(seededNames.join("\n"));
  console.log("Quarterfinals 1 and 2 were advanced to populate Semifinal 1.");
  console.log("Use `npm run tournament:reset:state` when you want to wipe preview state.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
