import type {
  MatchStage,
  MatchStatus,
  QualifiedTeamSeed,
  StandingsRow
} from "@/types/models";

interface PodSummaryInput {
  id: string;
  name: string;
}

interface PodStandingInput {
  pod: PodSummaryInput;
  rows: StandingsRow[];
}

interface MatchQualificationInput {
  podId: string | null;
  stage: MatchStage;
  status: MatchStatus;
}

export function compareStandings(left: StandingsRow, right: StandingsRow) {
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
}

export function computeQualifiedSeeds(input: {
  pods: PodSummaryInput[];
  standings: StandingsRow[];
  podStandings: PodStandingInput[];
  matches: MatchQualificationInput[];
}): QualifiedTeamSeed[] {
  const confirmedWinners: StandingsRow[] = [];

  for (const { pod, rows } of input.podStandings) {
    const podMatches = input.matches.filter((match) => match.stage === "POD_PLAY" && match.podId === pod.id);
    const finalizedPodMatches = podMatches.filter((match) =>
      match.status === "FINAL" || match.status === "FORFEIT"
    );
    const leader = rows[0];

    if (!leader) {
      continue;
    }

    const leaderClinched = leader.wins >= 2;
    const podComplete = podMatches.length > 0 && finalizedPodMatches.length === podMatches.length;

    if (leaderClinched || podComplete) {
      confirmedWinners.push(leader);
    }
  }

  if (confirmedWinners.length !== input.pods.length) {
    return [];
  }

  const podWinnerIds = confirmedWinners.map((winner) => winner.teamId);
  const orderedPodWinners = [...confirmedWinners].sort(compareStandings);
  const wildCards = input.standings
    .filter((row) => !podWinnerIds.includes(row.teamId))
    .sort(compareStandings)
    .slice(0, 2);

  return [
    ...orderedPodWinners.map((row, index) => ({
      seedNumber: index + 1,
      qualifierType: "POD_WINNER" as const,
      teamId: row.teamId,
      teamName: row.teamName,
      podId: row.podId
    })),
    ...wildCards.map((row, index) => ({
      seedNumber: orderedPodWinners.length + index + 1,
      qualifierType: "WILD_CARD" as const,
      teamId: row.teamId,
      teamName: row.teamName,
      podId: row.podId
    }))
  ];
}
