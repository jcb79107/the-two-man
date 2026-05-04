import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";
import { readFileSync } from "node:fs";

const DEFAULT_TEAMS_CSV =
  "/Users/jason/Downloads/2026 Individual or Two Man Match Play Bracket Opt-In (Responses) - Teams.csv";
const DEFAULT_PODS_CSV =
  "/Users/jason/Downloads/2026 Individual or Two Man Match Play Bracket Opt-In (Responses) - Pods.csv";
const DEFAULT_EMAILS_CSV =
  "/Users/jason/Downloads/2026 Individual or Two Man Match Play Bracket Opt-In (Responses) - ghin.csv";

const TEAM_NAME_ALIASES = new Map([
  ["jolcolver", "jolc"],
  ["jolcover", "jolc"]
]);

const PLAYER_NAME_ALIASES = new Map([
  ["isaac jolc", "isaac jolcover"],
  ["joanh sacks", "jonah sacks"],
  ["zak lieberman", "zach lieberman"],
  ["brad holway", "bradley holway"],
  ["mike levin", "michael levin"],
  ["sam isaacson", "samuel isaacson"],
  ["tommy sutker", "thomas sutker"],
  ["zack nankin", "zack nankin"],
  ["zach nankin", "zack nankin"]
]);

function splitCsvLine(line) {
  const values = [];
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

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function titleCaseWord(word) {
  if (!word) {
    return word;
  }

  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function normalizePersonName(value) {
  const normalized = normalizeWhitespace(value)
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map(titleCaseWord)
    .join(" ");

  return PLAYER_NAME_ALIASES.get(normalized.toLowerCase()) ?? normalized;
}

function cleanEmail(value) {
  const normalized = normalizeWhitespace(value).replace(/,+$/, "").trim().toLowerCase();
  return normalized || null;
}

function lastNameFromDisplayName(value) {
  const parts = normalizePersonName(value).split(" ").filter(Boolean);
  return parts[parts.length - 1] ?? normalizePersonName(value);
}

function canonicalizeTeamKeyFromPeople(playerOneName, playerTwoName) {
  return [playerOneName, playerTwoName]
    .map(lastNameFromDisplayName)
    .map((part) => TEAM_NAME_ALIASES.get(part.toLowerCase()) ?? part)
    .map((part) => part.toLowerCase())
    .sort((left, right) => left.localeCompare(right))
    .join("&");
}

function canonicalizeTeamKeyFromLabel(teamLabel) {
  return teamLabel
    .split("&")
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)
    .map((part) => TEAM_NAME_ALIASES.get(part.toLowerCase()) ?? part)
    .map((part) => part.toLowerCase())
    .sort((left, right) => left.localeCompare(right))
    .join("&");
}

function parseTeamsCsv(teamsCsvPath) {
  const contents = readFileSync(teamsCsvPath, "utf8");
  const lines = contents
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows = lines.slice(1).map(splitCsvLine);

  return rows.map((row, index) => {
    const sourceLabel = normalizeWhitespace(row[0] ?? `Team ${index + 1}`);
    const playerOneName = normalizePersonName(row[1] ?? "");
    const playerTwoName = normalizePersonName(row[2] ?? "");

    if (!playerOneName || !playerTwoName) {
      throw new Error(`Teams CSV row ${index + 2} is missing a player name.`);
    }

    return {
      sourceLabel,
      playerNames: [playerOneName, playerTwoName],
      teamKey: canonicalizeTeamKeyFromPeople(playerOneName, playerTwoName)
    };
  });
}

function parsePodsCsv(podsCsvPath) {
  const contents = readFileSync(podsCsvPath, "utf8");
  const lines = contents
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows = lines.map(splitCsvLine);
  const podHeaders = rows[0] ?? [];
  const assignments = [];

  for (let slotIndex = 1; slotIndex < rows.length; slotIndex += 1) {
    const row = rows[slotIndex];

    for (let podIndex = 0; podIndex < podHeaders.length; podIndex += 1) {
      const rawTeamName = normalizeWhitespace(row[podIndex] ?? "");

      if (!rawTeamName) {
        continue;
      }

      assignments.push({
        podName: normalizeWhitespace(podHeaders[podIndex] ?? `Pod ${podIndex + 1}`),
        slotNumber: slotIndex,
        displayTeamName: rawTeamName,
        teamKey: canonicalizeTeamKeyFromLabel(rawTeamName)
      });
    }
  }

  return assignments;
}

function parseEmailsCsv(emailsCsvPath) {
  const contents = readFileSync(emailsCsvPath, "utf8");
  const lines = contents
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows = lines.slice(1).map(splitCsvLine);
  const emailByCanonicalName = new Map();

  for (const row of rows) {
    const displayName = normalizePersonName(row[0] ?? "");
    const email = cleanEmail(row[1] ?? "");

    if (!displayName || !email) {
      continue;
    }

    emailByCanonicalName.set(displayName.toLowerCase(), email);
  }

  return emailByCanonicalName;
}

function buildPlayerRecord(name, emailByCanonicalName) {
  const displayName = normalizePersonName(name);
  const parts = displayName.split(" ").filter(Boolean);

  return {
    firstName: parts.slice(0, -1).join(" ") || parts[0] || "",
    lastName: parts[parts.length - 1] || "",
    displayName,
    email: emailByCanonicalName.get(displayName.toLowerCase()) ?? null
  };
}

function buildImportPlan(teamsCsvPath, podsCsvPath, emailsCsvPath) {
  const teams = parseTeamsCsv(teamsCsvPath);
  const pods = parsePodsCsv(podsCsvPath);
  const emailByCanonicalName = parseEmailsCsv(emailsCsvPath);
  const podByTeamKey = new Map(pods.map((pod) => [pod.teamKey, pod]));

  const missingPodAssignments = teams.filter((team) => !podByTeamKey.has(team.teamKey));

  if (missingPodAssignments.length > 0) {
    throw new Error(
      `Missing pod assignments for: ${missingPodAssignments.map((team) => team.sourceLabel).join(", ")}`
    );
  }

  const extraPodAssignments = pods.filter(
    (pod) => !teams.some((team) => team.teamKey === pod.teamKey)
  );

  if (extraPodAssignments.length > 0) {
    throw new Error(
      `Pods CSV contains teams not present in Teams CSV: ${extraPodAssignments
        .map((pod) => pod.displayTeamName)
        .join(", ")}`
    );
  }

  const plannedTeams = teams.map((team, index) => {
    const pod = podByTeamKey.get(team.teamKey);

    if (!pod) {
      throw new Error(`No pod assignment found for ${team.sourceLabel}.`);
    }

    return {
      sourceLabel: team.sourceLabel,
      teamId: `team-${String(index + 1).padStart(2, "0")}`,
      teamName: pod.displayTeamName,
      podName: pod.podName,
      podSlot: pod.slotNumber,
      players: team.playerNames.map((name) => buildPlayerRecord(name, emailByCanonicalName))
    };
  });

  const playersWithoutEmail = plannedTeams
    .flatMap((team) => team.players)
    .filter((player) => !player.email)
    .map((player) => player.displayName);

  return {
    plannedTeams,
    playersWithoutEmail
  };
}

async function importToDatabase(plan) {
  const prisma = new PrismaClient();

  try {
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
        slug: "fairway-match-2026",
        seasonYear: 2026,
        status: "ACTIVE",
        startDate: new Date("2026-05-01T00:00:00.000Z"),
        endDate: new Date("2026-10-01T00:00:00.000Z")
      }
    });

    const distinctPods = Array.from(new Set(plan.plannedTeams.map((team) => team.podName))).sort(
      (left, right) => left.localeCompare(right, undefined, { numeric: true })
    );

    for (const [index, podName] of distinctPods.entries()) {
      await prisma.pod.create({
        data: {
          id: `pod-${index + 1}`,
          tournamentId: "tournament-2026",
          name: podName,
          podOrder: index + 1
        }
      });
    }

    const podIdByName = new Map(distinctPods.map((podName, index) => [podName, `pod-${index + 1}`]));

    for (const team of plan.plannedTeams) {
      const podId = podIdByName.get(team.podName);

      if (!podId) {
        throw new Error(`Missing pod id for ${team.podName}.`);
      }

      await prisma.team.create({
        data: {
          id: team.teamId,
          tournamentId: "tournament-2026",
          name: team.teamName,
          seedNumber: null
        }
      });

      await prisma.podTeam.create({
        data: {
          podId,
          teamId: team.teamId,
          slotNumber: team.podSlot
        }
      });

      for (const [playerIndex, player] of team.players.entries()) {
        const playerId = `${team.teamId}-player-${playerIndex + 1}`;

        await prisma.player.create({
          data: {
            id: playerId,
            tournamentId: "tournament-2026",
            firstName: player.firstName,
            lastName: player.lastName,
            displayName: player.displayName,
            email: player.email,
            phoneNumber: null,
            handicapIndex: null,
            ghinNumber: null,
            handicapSyncStatus: "MANUAL"
          }
        });

        await prisma.teamPlayer.create({
          data: {
            teamId: team.teamId,
            playerId,
            rosterPosition: playerIndex + 1
          }
        });
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
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const dryRun = args.includes("--dry-run");
  const positionalArgs = args.filter((arg) => arg !== "--dry-run");

  const teamsCsvPath = positionalArgs[0] ?? DEFAULT_TEAMS_CSV;
  const podsCsvPath = positionalArgs[1] ?? DEFAULT_PODS_CSV;
  const emailsCsvPath = positionalArgs[2] ?? DEFAULT_EMAILS_CSV;

  const plan = buildImportPlan(teamsCsvPath, podsCsvPath, emailsCsvPath);

  console.log(
    JSON.stringify(
      {
        teamsCsvPath,
        podsCsvPath,
        emailsCsvPath,
        teamCount: plan.plannedTeams.length,
        playerCount: plan.plannedTeams.length * 2,
        podCount: new Set(plan.plannedTeams.map((team) => team.podName)).size,
        playersWithoutEmail: plan.playersWithoutEmail,
        sample: plan.plannedTeams.slice(0, 3)
      },
      null,
      2
    )
  );

  if (dryRun) {
    return;
  }

  await importToDatabase(plan);
  console.log(`Imported ${plan.plannedTeams.length} teams and ${plan.plannedTeams.length * 2} players.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
