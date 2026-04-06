import { z } from "zod";

function optionalString(value: FormDataEntryValue | null): string | null {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function requiredString(value: FormDataEntryValue | null, fieldName: string): string {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

function parseIntField(value: FormDataEntryValue | null, fieldName: string): number {
  const parsed = Number.parseInt(requiredString(value, fieldName), 10);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a whole number.`);
  }

  return parsed;
}

function parseFloatField(value: FormDataEntryValue | null, fieldName: string): number {
  const parsed = Number.parseFloat(requiredString(value, fieldName));

  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a number.`);
  }

  return parsed;
}

function parseOptionalFloatField(value: FormDataEntryValue | null, fieldName: string): number | null {
  const normalized = optionalString(value);

  if (normalized == null) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a number.`);
  }

  return parsed;
}

export const tournamentFormSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  seasonYear: z.number().int().min(2025).max(2100),
  startDate: z.string().min(1),
  endDate: z.string().min(1)
});

export function parseTournamentForm(formData: FormData) {
  return tournamentFormSchema.parse({
    name: requiredString(formData.get("name"), "Tournament name"),
    slug: requiredString(formData.get("slug"), "Tournament slug").toLowerCase(),
    seasonYear: parseIntField(formData.get("seasonYear"), "Season year"),
    startDate: requiredString(formData.get("startDate"), "Start date"),
    endDate: requiredString(formData.get("endDate"), "End date")
  });
}

export const adminLoginFormSchema = z.object({
  password: z.string().min(1)
});

export function parseAdminLoginForm(formData: FormData) {
  return adminLoginFormSchema.parse({
    password: requiredString(formData.get("password"), "Admin password")
  });
}

export const playerFormSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  ghinNumber: z.string().min(1).nullable(),
  handicapIndex: z.number().min(0).max(54).nullable()
});

export function parsePlayerForm(formData: FormData) {
  return playerFormSchema.parse({
    firstName: requiredString(formData.get("firstName"), "First name"),
    lastName: requiredString(formData.get("lastName"), "Last name"),
    email: requiredString(formData.get("email"), "Email").toLowerCase(),
    ghinNumber: optionalString(formData.get("ghinNumber")),
    handicapIndex: parseOptionalFloatField(formData.get("handicapIndex"), "Handicap Index")
  });
}

export const playerUpdateFormSchema = z.object({
  playerId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email()
});

export function parsePlayerUpdateForm(formData: FormData) {
  return playerUpdateFormSchema.parse({
    playerId: requiredString(formData.get("playerId"), "Player"),
    firstName: requiredString(formData.get("firstName"), "First name"),
    lastName: requiredString(formData.get("lastName"), "Last name"),
    email: requiredString(formData.get("email"), "Email").toLowerCase()
  });
}

export const bracketSettingsFormSchema = z.object({
  label: z.string().min(1),
  qualifierCount: z.number().int().positive().max(16)
});

export function parseBracketSettingsForm(formData: FormData) {
  return bracketSettingsFormSchema.parse({
    label: requiredString(formData.get("label"), "Bracket label"),
    qualifierCount: parseIntField(formData.get("qualifierCount"), "Qualifier count")
  });
}

export const teamSeedUpdateFormSchema = z.object({
  teamId: z.string().min(1),
  seedNumber: z.number().int().positive().max(18).nullable()
});

export function parseTeamSeedUpdateForm(formData: FormData) {
  return teamSeedUpdateFormSchema.parse({
    teamId: requiredString(formData.get("teamId"), "Team"),
    seedNumber: optionalString(formData.get("seedNumber"))
      ? parseIntField(formData.get("seedNumber"), "Seed number")
      : null
  });
}

export const matchReopenFormSchema = z.object({
  matchId: z.string().min(1),
  overrideNote: z.string().nullable()
});

export function parseMatchReopenForm(formData: FormData) {
  return matchReopenFormSchema.parse({
    matchId: requiredString(formData.get("matchId"), "Match"),
    overrideNote: optionalString(formData.get("overrideNote"))
  });
}

export const matchForfeitFormSchema = z.object({
  matchId: z.string().min(1),
  winnerTeamId: z.string().min(1),
  overrideNote: z.string().nullable()
});

export function parseMatchForfeitForm(formData: FormData) {
  return matchForfeitFormSchema.parse({
    matchId: requiredString(formData.get("matchId"), "Match"),
    winnerTeamId: requiredString(formData.get("winnerTeamId"), "Winning team"),
    overrideNote: optionalString(formData.get("overrideNote"))
  });
}

export const teamFormSchema = z
  .object({
    name: z.string().min(1),
    seedNumber: z.number().int().positive().nullable(),
    playerOneId: z.string().min(1),
    playerTwoId: z.string().min(1)
  })
  .refine((value) => value.playerOneId !== value.playerTwoId, {
    message: "Choose two different players for a team."
  });

export function parseTeamForm(formData: FormData) {
  return teamFormSchema.parse({
    name: requiredString(formData.get("name"), "Team name"),
    seedNumber: optionalString(formData.get("seedNumber"))
      ? parseIntField(formData.get("seedNumber"), "Seed number")
      : null,
    playerOneId: requiredString(formData.get("playerOneId"), "Player one"),
    playerTwoId: requiredString(formData.get("playerTwoId"), "Player two")
  });
}

export const podFormSchema = z.object({
  name: z.string().min(1),
  podOrder: z.number().int().positive()
});

export function parsePodForm(formData: FormData) {
  return podFormSchema.parse({
    name: requiredString(formData.get("name"), "Pod name"),
    podOrder: parseIntField(formData.get("podOrder"), "Pod order")
  });
}

export const podAssignmentSchema = z.object({
  teamId: z.string().min(1),
  podId: z.string().min(1),
  slotNumber: z.number().int().positive().max(3)
});

export function parsePodAssignmentForm(formData: FormData) {
  return podAssignmentSchema.parse({
    teamId: requiredString(formData.get("teamId"), "Team"),
    podId: requiredString(formData.get("podId"), "Pod"),
    slotNumber: parseIntField(formData.get("slotNumber"), "Pod slot")
  });
}

export const matchFormSchema = z
  .object({
    roundLabel: z.string().min(1),
    stage: z.enum(["POD_PLAY", "QUARTERFINAL", "SEMIFINAL", "CHAMPIONSHIP"]),
    scheduledAt: z.string().min(1),
    homeTeamId: z.string().min(1),
    awayTeamId: z.string().min(1),
    podId: z.string().nullable()
  })
  .refine((value) => value.homeTeamId !== value.awayTeamId, {
    message: "Home and away teams must be different."
  })
  .refine((value) => (value.stage === "POD_PLAY" ? Boolean(value.podId) : true), {
    message: "Pod play matches require a pod assignment."
  });

export function parseMatchForm(formData: FormData) {
  return matchFormSchema.parse({
    roundLabel: requiredString(formData.get("roundLabel"), "Round label"),
    stage: requiredString(formData.get("stage"), "Stage") as
      | "POD_PLAY"
      | "QUARTERFINAL"
      | "SEMIFINAL"
      | "CHAMPIONSHIP",
    scheduledAt: requiredString(formData.get("scheduledAt"), "Scheduled date/time"),
    homeTeamId: requiredString(formData.get("homeTeamId"), "Home team"),
    awayTeamId: requiredString(formData.get("awayTeamId"), "Away team"),
    podId: optionalString(formData.get("podId"))
  });
}
