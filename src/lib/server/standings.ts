import type { MatchStage, MatchStatus, StandingsRow, TeamProfile } from "@/types/models";
import type { TeamMatchSummary } from "@/lib/scoring/types";

export interface MatchStandingInput {
  id: string;
  podId: string | null;
  stage: MatchStage;
  status: MatchStatus;
  teamSummaries: TeamMatchSummary[];
}

function resultToRecordPoints(resultCode: TeamMatchSummary["resultCode"]): number {
  switch (resultCode) {
    case "WIN":
    case "FORFEIT_WIN":
      return 1;
    case "TIE":
      return 0.5;
    default:
      return 0;
  }
}

export function computePodStandings(
  teams: TeamProfile[],
  matches: MatchStandingInput[]
): StandingsRow[] {
  const rows = new Map<string, StandingsRow>();

  for (const team of teams) {
    rows.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      podId: team.podId,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      matchRecordPoints: 0,
      holePoints: 0,
      holesWon: 0,
      cumulativeNetBetterBall: null
    });
  }

  for (const match of matches) {
    if (match.stage !== "POD_PLAY" || !match.podId) {
      continue;
    }

    if (match.status !== "FINAL" && match.status !== "FORFEIT") {
      continue;
    }

    for (const summary of match.teamSummaries) {
      const row = rows.get(summary.teamId);

      if (!row) {
        continue;
      }

      row.matchesPlayed += 1;
      row.matchRecordPoints += resultToRecordPoints(summary.resultCode);
      row.holePoints += summary.totalPoints;
      row.holesWon += summary.holesWon;

      if (summary.resultCode === "WIN" || summary.resultCode === "FORFEIT_WIN") {
        row.wins += 1;
      } else if (summary.resultCode === "LOSS" || summary.resultCode === "FORFEIT_LOSS") {
        row.losses += 1;
      } else {
        row.ties += 1;
      }

      if (summary.betterBallNetTotal != null) {
        row.cumulativeNetBetterBall =
          row.cumulativeNetBetterBall == null
            ? summary.betterBallNetTotal
            : row.cumulativeNetBetterBall + summary.betterBallNetTotal;
      }
    }
  }

  return [...rows.values()].sort((left, right) => {
    if (right.matchRecordPoints !== left.matchRecordPoints) {
      return right.matchRecordPoints - left.matchRecordPoints;
    }

    if (right.holePoints !== left.holePoints) {
      return right.holePoints - left.holePoints;
    }

    if (right.holesWon !== left.holesWon) {
      return right.holesWon - left.holesWon;
    }

    if (left.cumulativeNetBetterBall == null && right.cumulativeNetBetterBall == null) {
      return left.teamName.localeCompare(right.teamName);
    }

    if (left.cumulativeNetBetterBall == null) {
      return 1;
    }

    if (right.cumulativeNetBetterBall == null) {
      return -1;
    }

    if (left.cumulativeNetBetterBall !== right.cumulativeNetBetterBall) {
      return left.cumulativeNetBetterBall - right.cumulativeNetBetterBall;
    }

    return left.teamName.localeCompare(right.teamName);
  });
}

export function selectWildCards(
  standings: StandingsRow[],
  podWinnerTeamIds: string[],
  count = 2
): StandingsRow[] {
  const winnerIds = new Set(podWinnerTeamIds);

  return standings.filter((row) => !winnerIds.has(row.teamId)).slice(0, count);
}
