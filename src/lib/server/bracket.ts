import type {
  BracketSummary,
  MatchShell,
  QualifiedTeamSeed,
  TeamProfile
} from "@/types/models";

export interface DecoratedBracketMatch {
  id: string;
  label: string;
  stage: MatchShell["stage"];
  status: MatchShell["status"];
  scheduledAt: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName: string;
  awayTeamName: string;
  homeSeedNumber: number | null;
  awaySeedNumber: number | null;
  resultLabel: string | null;
  winnerTeamId: string | null;
  publicScorecardSlug: string;
}

export interface DecoratedBracketRound {
  id: string;
  label: string;
  stage: string;
  matches: DecoratedBracketMatch[];
}

function findTeamName(teams: TeamProfile[], teamId: string | null): string | null {
  if (!teamId) {
    return null;
  }

  return teams.find((team) => team.id === teamId)?.name ?? null;
}

function findSeed(seeds: QualifiedTeamSeed[], seedNumber: number | null | undefined) {
  if (!seedNumber) {
    return null;
  }

  return seeds.find((seed) => seed.seedNumber === seedNumber) ?? null;
}

export function decorateBracketRounds(
  bracket: BracketSummary,
  matches: MatchShell[],
  teams: TeamProfile[],
  seeds: QualifiedTeamSeed[]
): DecoratedBracketRound[] {
  return bracket.rounds.map((round) => ({
    id: round.id,
    label: round.label,
    stage: round.stage,
    matches: round.matchIds
      .map((matchId) => matches.find((match) => match.id === matchId))
      .filter((match): match is MatchShell => Boolean(match))
      .map((match) => {
        const homeSeed = findSeed(seeds, match.homeSeedNumber);
        const awaySeed = findSeed(seeds, match.awaySeedNumber);

        return {
          id: match.id,
          label: match.roundLabel,
          stage: match.stage,
          status: match.status,
          scheduledAt: match.scheduledAt,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          homeTeamName:
            findTeamName(teams, match.homeTeamId) ??
            homeSeed?.teamName ??
            match.homeSeedLabel ??
            "TBD",
          awayTeamName:
            findTeamName(teams, match.awayTeamId) ??
            awaySeed?.teamName ??
            match.awaySeedLabel ??
            "TBD",
          homeSeedNumber: match.homeSeedNumber ?? homeSeed?.seedNumber ?? null,
          awaySeedNumber: match.awaySeedNumber ?? awaySeed?.seedNumber ?? null,
          resultLabel: match.resultLabel ?? null,
          winnerTeamId: match.winningTeamId ?? null,
          publicScorecardSlug: match.publicScorecardSlug
        };
      })
  }));
}
