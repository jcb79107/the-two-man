import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const prisma = new PrismaClient();

const RESPONSES_CSV = process.argv[2] ?? resolve(process.cwd(), "data/examples/field-responses.example.csv");
const PODS_CSV = process.argv[3] ?? resolve(process.cwd(), "data/examples/pods.example.csv");

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function titleCaseWord(word: string) {
  if (!word) {
    return word;
  }

  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function normalizeName(fullName: string) {
  return normalizeWhitespace(fullName)
    .split(" ")
    .filter(Boolean)
    .map(titleCaseWord)
    .join(" ");
}

function getLastName(fullName: string) {
  const normalized = normalizeName(fullName);
  const parts = normalized.split(" ");
  return parts[parts.length - 1] ?? normalized;
}

function buildTeamName(playerOneName: string, playerTwoName: string) {
  return `${getLastName(playerOneName)} & ${getLastName(playerTwoName)}`;
}

function canonicalizeTeamName(teamName: string) {
  return teamName
    .split("&")
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)
    .map(titleCaseWord)
    .sort((left, right) => left.localeCompare(right))
    .join(" & ")
    .toLowerCase();
}

function resolveRegistrationKey(teamName: string) {
  return canonicalizeTeamName(teamName);
}

function parseResponses() {
  const contents = readFileSync(RESPONSES_CSV, "utf8");
  const lines = contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const rows = lines.slice(1).map(splitCsvLine);

  return new Map(
    rows.map((row) => {
      const playerOneName = normalizeName(row[1] ?? "");
      const playerTwoName = normalizeName((row[3] ?? row[2] ?? "").trim());
      const teamName = buildTeamName(playerOneName, playerTwoName);

      return [
        canonicalizeTeamName(teamName),
        {
          teamName,
          players: [
            {
              fullName: playerOneName
            },
            {
              fullName: playerTwoName
            }
          ]
        }
      ] as const;
    })
  );
}

function parsePods() {
  const contents = readFileSync(PODS_CSV, "utf8");
  const lines = contents
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);
  const rows = lines.slice(1, 4).map(splitCsvLine);

  return Array.from({ length: 6 }, (_, podIndex) => ({
    name: `Pod ${podIndex + 1}`,
    teams: rows
      .map((row) => normalizeWhitespace(row[podIndex] ?? ""))
      .filter(Boolean)
  }));
}

async function main() {
  const responses = parseResponses();
  const pods = parsePods();

  await prisma.activityFeedEvent.deleteMany();
  await prisma.matchInvitation.deleteMany();
  await prisma.externalSyncLog.deleteMany();
  await prisma.courseLookupCache.deleteMany();
  await prisma.matchAuditLog.deleteMany();
  await prisma.holeScore.deleteMany();
  await prisma.matchPlayer.deleteMany();
  await prisma.match.deleteMany();
  await prisma.bracketRound.deleteMany();
  await prisma.bracket.deleteMany();
  await prisma.podTeam.deleteMany();
  await prisma.teamPlayer.deleteMany();
  await prisma.pod.deleteMany();
  await prisma.team.deleteMany();
  await prisma.player.deleteMany();
  await prisma.courseHole.deleteMany();
  await prisma.courseTee.deleteMany();
  await prisma.course.deleteMany();
  await prisma.tournament.deleteMany();

  await prisma.tournament.create({
    data: {
      id: "tournament-2026",
      name: "The Two Man",
      slug: "the-two-man-2026",
      seasonYear: 2026,
      status: "ACTIVE",
      startDate: new Date("2026-05-01T00:00:00.000Z"),
      endDate: new Date("2026-10-01T00:00:00.000Z")
    }
  });

  const createdTeams: Array<{ id: string; name: string }> = [];

  for (const [podIndex, pod] of pods.entries()) {
    const podId = `pod-${podIndex + 1}`;

    await prisma.pod.create({
      data: {
        id: podId,
        tournamentId: "tournament-2026",
        name: pod.name,
        podOrder: podIndex + 1
      }
    });

    for (const [slotIndex, teamName] of pod.teams.entries()) {
      const canonicalTeamName = resolveRegistrationKey(teamName);
      const response = responses.get(canonicalTeamName);

      if (!response) {
        throw new Error(`Could not find registration row for team "${teamName}".`);
      }

      const teamId = `team-${String(createdTeams.length + 1).padStart(2, "0")}`;

      await prisma.team.create({
        data: {
          id: teamId,
          tournamentId: "tournament-2026",
          name: response.teamName,
          seedNumber: null
        }
      });

      createdTeams.push({
        id: teamId,
        name: response.teamName
      });

      await prisma.podTeam.create({
        data: {
          podId,
          teamId,
          slotNumber: slotIndex + 1
        }
      });

      for (const [playerIndex, player] of response.players.entries()) {
        const parts = player.fullName.split(" ");
        const firstName = parts.slice(0, -1).join(" ") || parts[0] || "";
        const lastName = parts[parts.length - 1] || "";

        const playerId = `${teamId}-player-${playerIndex + 1}`;

        await prisma.player.create({
          data: {
            id: playerId,
            tournamentId: "tournament-2026",
            firstName,
            lastName,
            displayName: player.fullName,
            email: null,
            phoneNumber: null,
            handicapIndex: null,
            ghinNumber: null,
            handicapSyncStatus: "MANUAL"
          }
        });

        await prisma.teamPlayer.create({
          data: {
            teamId,
            playerId,
            rosterPosition: playerIndex + 1
          }
        });
      }
    }
  }

  const bracketId = nanoid();

  await prisma.bracket.create({
    data: {
      id: bracketId,
      tournamentId: "tournament-2026",
      label: "Championship Bracket",
      qualifierCount: 8
    }
  });

  await prisma.bracketRound.createMany({
    data: [
      {
        id: nanoid(),
        bracketId,
        label: "Quarterfinals",
        stage: "QUARTERFINAL",
        roundOrder: 1
      },
      {
        id: nanoid(),
        bracketId,
        label: "Semifinals",
        stage: "SEMIFINAL",
        roundOrder: 2
      },
      {
        id: nanoid(),
        bracketId,
        label: "Championship",
        stage: "CHAMPIONSHIP",
        roundOrder: 3
      }
    ]
  });

  console.log(`Imported ${createdTeams.length} teams and ${createdTeams.length * 2} players.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
