import type { TeamMatchSummary } from "@/lib/scoring/types";

export interface MatchPlayDecision {
  isComplete: boolean;
  needsTiebreaker: boolean;
  winningTeamId: string | null;
  leaderTeamId: string | null;
  lead: number;
  holesRemaining: number;
  playedHoleCount: number;
}

export function getMatchPlayDecision(input: {
  teamSummaries: TeamMatchSummary[];
  playedHoleCount: number;
  totalHoleCount: number;
  winningTeamId?: string | null;
}): MatchPlayDecision {
  const [first, second] = input.teamSummaries;
  const playedHoleCount = Math.max(0, input.playedHoleCount);
  const totalHoleCount = Math.max(playedHoleCount, input.totalHoleCount);
  const holesRemaining = Math.max(0, totalHoleCount - playedHoleCount);

  if (!first || !second) {
    return {
      isComplete: false,
      needsTiebreaker: false,
      winningTeamId: null,
      leaderTeamId: null,
      lead: 0,
      holesRemaining,
      playedHoleCount
    };
  }

  const lead = Math.abs(first.holesWon - second.holesWon);
  const leaderTeamId =
    first.holesWon === second.holesWon
      ? null
      : first.holesWon > second.holesWon
        ? first.teamId
        : second.teamId;
  const needsTiebreaker = !leaderTeamId && playedHoleCount >= totalHoleCount;
  const tiebreakWinner = needsTiebreaker && input.winningTeamId ? input.winningTeamId : null;
  const isComplete = Boolean(tiebreakWinner) || (Boolean(leaderTeamId) && lead > holesRemaining);

  return {
    isComplete,
    needsTiebreaker: needsTiebreaker && !tiebreakWinner,
    winningTeamId: tiebreakWinner ?? (isComplete ? leaderTeamId : null),
    leaderTeamId,
    lead,
    holesRemaining,
    playedHoleCount
  };
}

export function formatMatchPlayScore(input: {
  lead: number;
  holesRemaining: number;
  isTiebreaker?: boolean;
}) {
  if (input.isTiebreaker) {
    return "TB";
  }

  if (input.holesRemaining <= 0) {
    return `${input.lead} up`;
  }

  return `${input.lead}&${input.holesRemaining}`;
}

export function formatMatchPlayResultLabel(input: {
  teamSummaries: TeamMatchSummary[];
  teamNames: Record<string, string>;
  playedHoleCount: number;
  totalHoleCount: number;
  winningTeamId?: string | null;
}) {
  const decision = getMatchPlayDecision(input);

  if (!decision.winningTeamId) {
    return null;
  }

  const winnerName = input.teamNames[decision.winningTeamId] ?? "Team";

  if (decision.leaderTeamId == null) {
    return `${winnerName} wins in tiebreak`;
  }

  return `${winnerName} wins ${formatMatchPlayScore(decision)}`;
}
