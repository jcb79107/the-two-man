import { nanoid } from "nanoid";
import type { MatchInvitation } from "@/types/models";

export function createMatchInvitation(input: {
  matchId: string;
  recipientEmail: string;
  claimedByPlayerId?: string | null;
}): MatchInvitation {
  return {
    id: nanoid(),
    matchId: input.matchId,
    recipientEmail: input.recipientEmail,
    token: nanoid(24),
    sentAt: null,
    openedAt: null,
    claimedByPlayerId: input.claimedByPlayerId ?? null
  };
}
