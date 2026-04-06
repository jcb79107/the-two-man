import { z } from "zod";

export const BULK_ROSTER_TEMPLATE = [
  "teamName,seedNumber,podName,podSlot,player1FirstName,player1LastName,player1Email,player1Ghin,player1HandicapIndex,player2FirstName,player2LastName,player2Email,player2Ghin,player2HandicapIndex",
  "Cedar & Co,1,Pod A,1,Jason,White,jason@example.com,100001,7.4,Sam,Green,sam@example.com,100002,11.2",
  "Pin Seekers,2,Pod A,2,Alex,Blue,alex@example.com,,5.9,Tyler,Gold,tyler@example.com,,10.1"
].join("\n");

const bulkRowSchema = z.object({
  teamName: z.string().min(1),
  seedNumber: z.number().int().positive().nullable(),
  podName: z.string().min(1).nullable(),
  podSlot: z.number().int().positive().max(3).nullable(),
  player1FirstName: z.string().min(1),
  player1LastName: z.string().min(1),
  player1Email: z.string().email(),
  player1Ghin: z.string().min(1).nullable(),
  player1HandicapIndex: z.number().min(0).max(54),
  player2FirstName: z.string().min(1),
  player2LastName: z.string().min(1),
  player2Email: z.string().email(),
  player2Ghin: z.string().min(1).nullable(),
  player2HandicapIndex: z.number().min(0).max(54)
});

export type BulkRosterRow = z.infer<typeof bulkRowSchema>;

const EXPECTED_HEADERS = [
  "teamName",
  "seedNumber",
  "podName",
  "podSlot",
  "player1FirstName",
  "player1LastName",
  "player1Email",
  "player1Ghin",
  "player1HandicapIndex",
  "player2FirstName",
  "player2LastName",
  "player2Email",
  "player2Ghin",
  "player2HandicapIndex"
] as const;

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

function parseOptionalInt(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Expected a whole number but received "${value}".`);
  }

  return parsed;
}

function parseRequiredFloat(value: string): number {
  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Expected a number but received "${value}".`);
  }

  return parsed;
}

function normalizeHeader(header: string) {
  return header.trim();
}

export function parseBulkRosterCsv(csvText: string): BulkRosterRow[] {
  const normalizedText = csvText.trim();

  if (!normalizedText) {
    throw new Error("Paste roster rows or upload a CSV file.");
  }

  const lines = normalizedText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("Bulk import needs a header row and at least one team row.");
  }

  const headerRow = splitCsvLine(lines[0]).map(normalizeHeader);

  for (const header of EXPECTED_HEADERS) {
    if (!headerRow.includes(header)) {
      throw new Error(`Missing required column "${header}" in bulk roster CSV.`);
    }
  }

  const rows = lines.slice(1).map((line, lineIndex) => {
    const values = splitCsvLine(line);

    if (values.length !== headerRow.length) {
      throw new Error(`Row ${lineIndex + 2} does not match the header column count.`);
    }

    const record = Object.fromEntries(headerRow.map((header, index) => [header, values[index] ?? ""]));

    try {
      return bulkRowSchema.parse({
        teamName: String(record.teamName ?? "").trim(),
        seedNumber: parseOptionalInt(String(record.seedNumber ?? "")),
        podName: String(record.podName ?? "").trim() || null,
        podSlot: parseOptionalInt(String(record.podSlot ?? "")),
        player1FirstName: String(record.player1FirstName ?? "").trim(),
        player1LastName: String(record.player1LastName ?? "").trim(),
        player1Email: String(record.player1Email ?? "").trim().toLowerCase(),
        player1Ghin: String(record.player1Ghin ?? "").trim() || null,
        player1HandicapIndex: parseRequiredFloat(String(record.player1HandicapIndex ?? "")),
        player2FirstName: String(record.player2FirstName ?? "").trim(),
        player2LastName: String(record.player2LastName ?? "").trim(),
        player2Email: String(record.player2Email ?? "").trim().toLowerCase(),
        player2Ghin: String(record.player2Ghin ?? "").trim() || null,
        player2HandicapIndex: parseRequiredFloat(String(record.player2HandicapIndex ?? ""))
      });
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : `Row ${lineIndex + 2} could not be parsed.`;
      throw new Error(`Bulk import row ${lineIndex + 2}: ${detail}`);
    }
  });

  const duplicateTeamNames = new Set<string>();
  const seenTeamNames = new Set<string>();
  const seenEmails = new Set<string>();

  for (const row of rows) {
    const teamKey = row.teamName.toLowerCase();

    if (seenTeamNames.has(teamKey)) {
      duplicateTeamNames.add(row.teamName);
    }

    seenTeamNames.add(teamKey);

    for (const email of [row.player1Email, row.player2Email]) {
      if (seenEmails.has(email)) {
        throw new Error(`Bulk import contains the same player email more than once: ${email}`);
      }

      seenEmails.add(email);
    }
  }

  if (duplicateTeamNames.size > 0) {
    throw new Error(
      `Bulk import contains duplicate team names: ${Array.from(duplicateTeamNames).join(", ")}`
    );
  }

  return rows;
}

export async function readBulkRosterText(formData: FormData): Promise<string> {
  const pastedText = String(formData.get("bulkRosterText") ?? "").trim();
  const file = formData.get("bulkRosterFile");

  if (pastedText) {
    return pastedText;
  }

  if (file instanceof File && file.size > 0) {
    return await file.text();
  }

  throw new Error("Paste roster rows or upload a CSV file.");
}
