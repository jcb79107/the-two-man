import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/server/db";

type CsvRow = {
  Name: string;
  Email: string;
};

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const aliasMap = new Map<string, string>([
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

function canonicalName(value: string) {
  const normalized = normalizeName(value);
  return aliasMap.get(normalized) ?? normalized;
}

async function main() {
  const csvPath = process.argv[2];
  const shouldWrite = process.argv.includes("--write");

  if (!csvPath) {
    throw new Error("Usage: tsx scripts/import_player_emails.ts <csv-path> [--write]");
  }

  const resolvedPath = path.resolve(csvPath);
  const csvText = fs.readFileSync(resolvedPath, "utf8");
  const lines = csvText.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length > 0);
  const rows = lines.slice(1).map((line) => {
    const commaIndex = line.indexOf(",");

    if (commaIndex === -1) {
      throw new Error(`Invalid CSV row: ${line}`);
    }

    return {
      Name: line.slice(0, commaIndex).trim().replace(/^"|"$/g, ""),
      Email: line.slice(commaIndex + 1).trim().replace(/^"|"$/g, "")
    } satisfies CsvRow;
  });

  const tournament = await db.tournament.findFirst({
    orderBy: { createdAt: "desc" },
    include: {
      players: {
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
      }
    }
  });

  if (!tournament) {
    throw new Error("No tournament found.");
  }

  const playerByName = new Map(
    tournament.players.map((player) => [canonicalName(player.displayName), player] as const)
  );
  const matchedPlayerIds = new Set<string>();

  const updates: Array<{ id: string; displayName: string; nextEmail: string }> = [];
  const unmatched: Array<{ name: string; email: string }> = [];
  const duplicateEmailRows = new Set<string>();
  const seenEmails = new Set<string>();

  for (const row of rows) {
    const nextEmail = row.Email.trim().replace(/,+$/, "").toLowerCase();
    const csvName = canonicalName(row.Name);

    if (!nextEmail) {
      continue;
    }

    if (seenEmails.has(nextEmail)) {
      duplicateEmailRows.add(nextEmail);
      continue;
    }

    seenEmails.add(nextEmail);

    const player = playerByName.get(csvName);

    if (!player) {
      unmatched.push({ name: row.Name.trim(), email: nextEmail });
      continue;
    }

    updates.push({
      id: player.id,
      displayName: player.displayName,
      nextEmail
    });
    matchedPlayerIds.add(player.id);
  }

  const existingEmailOwners = await db.player.findMany({
    where: {
      tournamentId: tournament.id,
      email: {
        in: updates.map((entry) => entry.nextEmail)
      }
    },
    select: {
      id: true,
      displayName: true,
      email: true
    }
  });

  const conflicts = existingEmailOwners.filter((player) => {
    const desired = updates.find((entry) => entry.nextEmail === player.email)?.id;
    return desired && desired !== player.id;
  });

  console.log(`Tournament: ${tournament.name} (${tournament.slug})`);
  console.log(`CSV rows: ${rows.length}`);
  console.log(`Matched players: ${updates.length}`);
  console.log(`Roster players without CSV row: ${tournament.players.length - matchedPlayerIds.size}`);
  console.log(`Unmatched rows: ${unmatched.length}`);
  console.log(`Duplicate email rows skipped: ${duplicateEmailRows.size}`);
  console.log(`Conflicting existing emails: ${conflicts.length}`);

  if (unmatched.length > 0) {
    console.log("\nUnmatched rows:");
    for (const entry of unmatched) {
      console.log(`- ${entry.name} => ${entry.email}`);
    }
  }

  const rosterWithoutCsv = tournament.players.filter((player) => !matchedPlayerIds.has(player.id));

  if (rosterWithoutCsv.length > 0) {
    console.log("\nRoster players without CSV row:");
    for (const player of rosterWithoutCsv) {
      console.log(`- ${player.displayName}${player.email ? ` (existing: ${player.email})` : ""}`);
    }
  }

  if (conflicts.length > 0) {
    console.log("\nConflicts:");
    for (const entry of conflicts) {
      console.log(`- ${entry.email} already belongs to ${entry.displayName}`);
    }
  }

  console.log("\nPlanned updates:");
  for (const entry of updates) {
    console.log(`- ${entry.displayName} => ${entry.nextEmail}`);
  }

  if (!shouldWrite) {
    console.log("\nDry run only. Re-run with --write to persist.");
    return;
  }

  if (unmatched.length > 0 || conflicts.length > 0) {
    throw new Error("Refusing to write while unmatched rows or email conflicts remain.");
  }

  await db.$transaction(
    updates.map((entry) =>
      db.player.update({
        where: { id: entry.id },
        data: { email: entry.nextEmail }
      })
    )
  );

  console.log(`\nUpdated ${updates.length} player emails.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
