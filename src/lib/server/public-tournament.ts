import "server-only";

import { scoreForfeit, scoreMatch } from "@/lib/scoring/engine";
import type { TeamMatchSummary } from "@/lib/scoring/types";
import { decorateBracketRounds } from "@/lib/server/bracket";
import { db } from "@/lib/server/db";
import { computeQualifiedSeeds } from "@/lib/server/qualification";
import {
  computePodStandings,
  type MatchStandingInput
} from "@/lib/server/standings";
import type { PlayerHandicapSnapshot } from "@/lib/scoring/types";
import type {
  ActivityFeedEvent,
  ActivityFeedEventType,
  BracketStage,
  BracketSummary,
  MatchShell,
  QualifiedTeamSeed,
  StandingsRow,
  TeamProfile
} from "@/types/models";

function decimalToNumber(value: unknown): number | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  return Number(value);
}

function buildResultLabel(
  teamSummaries: TeamMatchSummary[],
  teamNames: Record<string, string>,
  winningTeamId?: string | null
) {
  if (teamSummaries.length !== 2) {
    return null;
  }

  const [first, second] = teamSummaries;
  if (
    winningTeamId &&
    first.totalPoints === second.totalPoints &&
    (first.teamId === winningTeamId || second.teamId === winningTeamId)
  ) {
    const winner = first.teamId === winningTeamId ? first : second;
    const loser = winner.teamId === first.teamId ? second : first;

    return `${teamNames[winner.teamId] ?? "Team"} won tiebreak after ${winner.totalPoints}-${loser.totalPoints}`;
  }

  return `${teamNames[first.teamId] ?? "Team"} ${first.totalPoints} - ${second.totalPoints} ${teamNames[second.teamId] ?? "Team"}`;
}

function buildComputedFeedEvent(input: {
  id: string;
  tournamentId: string;
  type: ActivityFeedEventType;
  occurredAt: Date;
  icon: string;
  title: string;
  body: string;
  matchId?: string | null;
  teamIds?: string[];
  metadata?: Record<string, string | number | boolean | null>;
}): ActivityFeedEvent {
  return {
    id: input.id,
    tournamentId: input.tournamentId,
    type: input.type,
    occurredAt: input.occurredAt.toISOString(),
    icon: input.icon,
    title: input.title,
    body: input.body,
    matchId: input.matchId ?? null,
    teamIds: input.teamIds ?? [],
    metadata: input.metadata
  };
}

function buildTeamSummariesFromMatch(match: {
  status: string;
  winningTeamId: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  tournament: {
    forfeitPointsAwarded: number;
    forfeitHolesWonAwarded: number;
  };
  playerSelections: Array<{
    playerId: string;
    teamId: string;
    teeId: string;
    teeNameSnapshot: string;
    handicapIndexSnapshot: unknown;
    slopeSnapshot: number;
    courseRatingSnapshot: unknown;
    parSnapshot: number;
    tee: {
      holes: Array<{
        holeNumber: number;
        par: number;
        strokeIndex: number;
      }>;
    };
    player: {
      displayName: string;
    };
  }>;
  holeScores: Array<{
    holeNumber: number;
    playerId: string;
    grossScore: number;
  }>;
}): {
  teamSummaries: TeamMatchSummary[];
  holes: ReturnType<typeof scoreMatch>["holes"];
  players: PlayerHandicapSnapshot[];
} | null {
  if (match.status === "FORFEIT" && match.winningTeamId && match.homeTeamId && match.awayTeamId) {
    const loserTeamId = match.winningTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;

    return {
      teamSummaries: scoreForfeit({
        winnerTeamId: match.winningTeamId,
        loserTeamId,
        awardedPoints: match.tournament.forfeitPointsAwarded,
        awardedHolesWon: match.tournament.forfeitHolesWonAwarded
      }),
      holes: [],
      players: []
    };
  }

  if (match.playerSelections.length !== 4) {
    return null;
  }

  const holesTemplate = match.playerSelections[0]?.tee.holes ?? [];
  const scoresByHole = new Map<number, Record<string, number | null>>();

  for (const hole of holesTemplate) {
    scoresByHole.set(
      hole.holeNumber,
      Object.fromEntries(match.playerSelections.map((selection) => [selection.playerId, null]))
    );
  }

  for (const holeScore of match.holeScores) {
    const scores = scoresByHole.get(holeScore.holeNumber);

    if (scores) {
      scores[holeScore.playerId] = holeScore.grossScore;
    }
  }

  const hasCompleteScores = Array.from(scoresByHole.values()).every((scores) =>
    match.playerSelections.every((selection) => typeof scores[selection.playerId] === "number")
  );

  if (!hasCompleteScores) {
    return null;
  }

  const scorecard = scoreMatch({
    players: match.playerSelections.map((selection) => ({
      playerId: selection.playerId,
      playerName: selection.player.displayName,
      teamId: selection.teamId,
      handicapIndex: Number(selection.handicapIndexSnapshot),
      teeId: selection.teeId,
      teeName: selection.teeNameSnapshot,
      slope: selection.slopeSnapshot,
      courseRating: Number(selection.courseRatingSnapshot),
      par: selection.parSnapshot,
      holes: selection.tee.holes.map((hole) => ({
        holeNumber: hole.holeNumber,
        par: hole.par,
        strokeIndex: hole.strokeIndex
      }))
    })),
    holeScores: holesTemplate.map((hole) => ({
      holeNumber: hole.holeNumber,
      scores: scoresByHole.get(hole.holeNumber) ?? {}
    }))
  });

  return {
    teamSummaries: scorecard.teamSummaries,
    holes: scorecard.holes,
    players: scorecard.players
  };
}

function buildMatchShell(input: {
  match: {
    id: string;
    tournamentId: string;
    stage: MatchShell["stage"];
    status: MatchShell["status"];
    podId: string | null;
    bracketId: string | null;
    bracketRoundId: string | null;
    roundLabel: string;
    scheduledAt: Date | null;
    homeTeamId: string | null;
    awayTeamId: string | null;
    winningTeamId: string | null;
    courseId: string | null;
    privateToken: string;
    publicScorecardSlug: string;
    homeSeedNumber: number | null;
    awaySeedNumber: number | null;
    homeSeedLabel: string | null;
    awaySeedLabel: string | null;
    advancesToMatchId: string | null;
    advancesToSlot: MatchShell["advancesToSlot"];
  };
  courseName: string | null;
  resultLabel: string | null;
}): MatchShell {
  return {
    id: input.match.id,
    tournamentId: input.match.tournamentId,
    stage: input.match.stage,
    status: input.match.status,
    podId: input.match.podId,
    bracketId: input.match.bracketId,
    bracketRoundId: input.match.bracketRoundId,
    roundLabel: input.match.roundLabel,
    scheduledAt: input.match.scheduledAt?.toISOString() ?? "",
    homeTeamId: input.match.homeTeamId,
    awayTeamId: input.match.awayTeamId,
    winningTeamId: input.match.winningTeamId,
    courseId: input.match.courseId,
    courseName: input.courseName,
    privateToken: input.match.privateToken,
    publicScorecardSlug: input.match.publicScorecardSlug,
    homeSeedNumber: input.match.homeSeedNumber,
    awaySeedNumber: input.match.awaySeedNumber,
    homeSeedLabel: input.match.homeSeedLabel,
    awaySeedLabel: input.match.awaySeedLabel,
    advancesToMatchId: input.match.advancesToMatchId,
    advancesToSlot: input.match.advancesToSlot,
    resultLabel: input.resultLabel
  };
}

function buildComputedFeed(input: {
  tournamentId: string;
  matches: Array<{
    id: string;
    stage: string;
    status: string;
    roundLabel: string;
    homeTeamId: string | null;
    awayTeamId: string | null;
    winningTeamId: string | null;
    course: { name: string } | null;
    createdAt: Date;
    updatedAt: Date;
    finalizedAt: Date | null;
    submittedAt: Date | null;
    homeSeedNumber: number | null;
    awaySeedNumber: number | null;
    homeSeedLabel: string | null;
    awaySeedLabel: string | null;
  }>;
  teamNames: Record<string, string>;
  summariesByMatchId: Map<string, ReturnType<typeof buildTeamSummariesFromMatch>>;
  bracketLabel: string | null;
  seeds: QualifiedTeamSeed[];
}): ActivityFeedEvent[] {
  const events: ActivityFeedEvent[] = [];

  for (const match of input.matches) {
    const homeTeamName =
      (match.homeTeamId ? input.teamNames[match.homeTeamId] : null) ??
      match.homeSeedLabel ??
      (match.homeSeedNumber ? `Seed ${match.homeSeedNumber}` : "TBD");
    const awayTeamName =
      (match.awayTeamId ? input.teamNames[match.awayTeamId] : null) ??
      match.awaySeedLabel ??
      (match.awaySeedNumber ? `Seed ${match.awaySeedNumber}` : "TBD");

    if (match.status === "FINAL" || match.status === "FORFEIT") {
      const computed = input.summariesByMatchId.get(match.id);
      const orderedSummaries = [...(computed?.teamSummaries ?? [])].sort(
        (left, right) => right.totalPoints - left.totalPoints
      );
      const winner =
        orderedSummaries.find((summary) => summary.teamId === match.winningTeamId) ?? orderedSummaries[0];
      const loser =
        orderedSummaries.find((summary) => summary.teamId !== winner?.teamId) ?? orderedSummaries[1];
      const winnerTeamName = winner ? input.teamNames[winner.teamId] ?? "Winning team" : homeTeamName;
      const loserTeamName = loser ? input.teamNames[loser.teamId] ?? "Opponent" : awayTeamName;
      const scoreLine =
        winner && loser ? `${winner.totalPoints}-${loser.totalPoints}` : `${homeTeamName} vs ${awayTeamName}`;
      const courseLabel = match.course?.name ? ` at ${match.course.name}` : "";

      events.push(
        buildComputedFeedEvent({
          id: `computed-final-${match.id}`,
          tournamentId: input.tournamentId,
          type: "MATCH_COMPLETED",
          occurredAt: match.finalizedAt ?? match.submittedAt ?? match.updatedAt,
          icon: match.stage === "POD_PLAY" ? "🏌️" : "🏆",
          title: `${winnerTeamName} def. ${loserTeamName} ${scoreLine}`,
          body: `${match.roundLabel}${courseLabel}`,
          matchId: match.id,
          teamIds: [match.homeTeamId, match.awayTeamId].filter((value): value is string => Boolean(value)),
          metadata: {
            stage: match.stage,
            courseName: match.course?.name ?? null
          }
        })
      );

      continue;
    }

    if (match.status === "READY") {
      const courseLabel = match.course?.name ? ` • ${match.course.name}` : "";

      events.push(
        buildComputedFeedEvent({
          id: `computed-ready-${match.id}`,
          tournamentId: input.tournamentId,
          type: "MATCH_SCHEDULED",
          occurredAt: match.updatedAt,
          icon: "📨",
          title: `${match.roundLabel} matchup ready`,
          body: `${homeTeamName} vs ${awayTeamName}${courseLabel} • Date of play pending`,
          matchId: match.id,
          teamIds: [match.homeTeamId, match.awayTeamId].filter((value): value is string => Boolean(value))
        })
      );

      continue;
    }

    if (["IN_PROGRESS", "REOPENED"].includes(match.status)) {
      const courseLabel = match.course?.name ? ` at ${match.course.name}` : "";

      events.push(
        buildComputedFeedEvent({
          id: `computed-progress-${match.id}`,
          tournamentId: input.tournamentId,
          type: "MATCH_IN_PROGRESS",
          occurredAt: match.updatedAt,
          icon: "⛳",
          title: "Match in progress",
          body: `${homeTeamName} vs ${awayTeamName} • ${match.roundLabel}${courseLabel}`,
          matchId: match.id,
          teamIds: [match.homeTeamId, match.awayTeamId].filter((value): value is string => Boolean(value))
        })
      );
    }
  }

  if (input.seeds.length === 8) {
    const podPlayEventTimes = input.matches
      .filter((match) => match.stage === "POD_PLAY")
      .map((match) => (match.finalizedAt ?? match.submittedAt ?? match.updatedAt).getTime());
    const latestPodPlayEventTime =
      podPlayEventTimes.length > 0
        ? Math.max(...podPlayEventTimes)
        : input.matches.length > 0
          ? Math.max(...input.matches.map((match) => match.updatedAt.getTime()))
          : 0;

    events.push(
      buildComputedFeedEvent({
        id: "computed-playoffs-set",
        tournamentId: input.tournamentId,
        type: "PLAYOFFS_SET",
        occurredAt: new Date(latestPodPlayEventTime),
        icon: "🏆",
        title: `${input.bracketLabel ?? "Playoffs"} set`,
        body: `${input.seeds[0]?.teamName ?? "Seed 1"} leads the eight-team knockout field.`
      })
    );
  }

  const semifinalReady = input.matches
    .filter((match) => match.stage === "SEMIFINAL")
    .every((match) => match.homeTeamId && match.awayTeamId);

  if (semifinalReady && input.matches.some((match) => match.stage === "SEMIFINAL")) {
    const latestSemifinalUpdate = input.matches
      .filter((match) => match.stage === "SEMIFINAL")
      .reduce((latest, match) =>
        (match.updatedAt > latest ? match.updatedAt : latest), new Date(0)
      );

    events.push(
      buildComputedFeedEvent({
        id: "computed-semifinals-locked",
        tournamentId: input.tournamentId,
        type: "SEMIFINAL_LOCKED",
        occurredAt: latestSemifinalUpdate,
        icon: "🔥",
        title: "Semifinal matchup locked",
        body: "The final four is set and the bracket path is live."
      })
    );
  }

  const championshipMatch = input.matches.find((match) => match.stage === "CHAMPIONSHIP");
  if (championshipMatch?.homeTeamId && championshipMatch.awayTeamId) {
    events.push(
      buildComputedFeedEvent({
        id: "computed-championship-set",
        tournamentId: input.tournamentId,
        type: "CHAMPIONSHIP_SET",
        occurredAt: championshipMatch.updatedAt,
        icon: "🏆",
        title: "Championship match set",
        body: `${input.teamNames[championshipMatch.homeTeamId] ?? "TBD"} vs ${input.teamNames[championshipMatch.awayTeamId] ?? "TBD"}`
      })
    );
  }

  return events
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());
}

export async function getPublicTournamentState(slug: string) {
  const tournament = await db.tournament.findUnique({
    where: {
      slug
    },
    include: {
      teams: {
        include: {
          roster: {
            orderBy: {
              rosterPosition: "asc"
            },
            include: {
              player: true
            }
          },
          podMemberships: {
            include: {
              pod: true
            }
          }
        }
      },
      pods: {
        orderBy: {
          podOrder: "asc"
        }
      },
      brackets: {
        orderBy: {
          createdAt: "asc"
        },
        include: {
          rounds: {
            orderBy: {
              roundOrder: "asc"
            }
          }
        }
      },
      matches: {
        orderBy: [{ stage: "asc" }, { roundLabel: "asc" }],
        include: {
          tournament: {
            select: {
              forfeitPointsAwarded: true,
              forfeitHolesWonAwarded: true
            }
          },
          course: true,
          homeTeam: true,
          awayTeam: true,
          playerSelections: {
            include: {
              player: true,
              tee: {
                include: {
                  holes: {
                    orderBy: {
                      holeNumber: "asc"
                    }
                  }
                }
              }
            }
          },
          holeScores: {
            orderBy: [{ holeNumber: "asc" }, { playerId: "asc" }]
          }
        }
      },
    }
  });

  if (!tournament) {
    return null;
  }

  const teamProfiles: TeamProfile[] = tournament.teams.map((team) => ({
    id: team.id,
    name: team.name,
    podId: team.podMemberships[0]?.podId ?? "",
    players: team.roster.map((entry) => ({
      id: entry.player.id,
      firstName: entry.player.firstName,
      lastName: entry.player.lastName,
      displayName: entry.player.displayName,
      handicapIndex: decimalToNumber(entry.player.handicapIndex) ?? 0,
      ghinNumber: entry.player.ghinNumber,
      handicapSyncStatus: entry.player.handicapSyncStatus
    }))
  }));

  const teamNames = Object.fromEntries(tournament.teams.map((team) => [team.id, team.name]));
  const summariesByMatchId = new Map<string, ReturnType<typeof buildTeamSummariesFromMatch>>();

  for (const match of tournament.matches) {
    summariesByMatchId.set(match.id, buildTeamSummariesFromMatch(match));
  }

  const standingsInputs: MatchStandingInput[] = tournament.matches.map((match) => ({
    id: match.id,
    podId: match.podId,
    stage: match.stage,
    status: match.status,
    teamSummaries: summariesByMatchId.get(match.id)?.teamSummaries ?? []
  }));

  const standings = computePodStandings(teamProfiles, standingsInputs);
  const podStandings = tournament.pods.map((pod) => ({
    pod,
    rows: standings.filter((row) => row.podId === pod.id)
  }));
  const podWinners = podStandings
    .map(({ pod, rows }) => {
      const winner = rows[0];

      if (!winner) {
        return null;
      }

      return {
        podId: pod.name,
        teamId: winner.teamId,
        teamName: winner.teamName,
        wins: winner.wins,
        losses: winner.losses,
        ties: winner.ties
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));
  const matches = tournament.matches.map((match) =>
    buildMatchShell({
      match,
      courseName: match.course?.name ?? null,
      resultLabel: buildResultLabel(
        summariesByMatchId.get(match.id)?.teamSummaries ?? [],
        teamNames,
        match.winningTeamId
      )
    })
  );
  const computedSeeds = computeQualifiedSeeds({
    pods: tournament.pods.map((pod) => ({ id: pod.id, name: pod.name })),
    standings,
    podStandings,
    matches: tournament.matches
  });
  const wildCards = computedSeeds
    .filter((entry) => entry.qualifierType === "WILD_CARD")
    .map((entry) => {
      const standing = standings.find((row) => row.teamId === entry.teamId);

      return {
        teamId: entry.teamId,
        teamName: entry.teamName,
        holePoints: standing?.holePoints ?? 0
      };
    });
  const upcomingMatches = matches.filter((match) =>
    !["FINAL", "FORFEIT"].includes(match.status)
  );
  const feed = buildComputedFeed({
    tournamentId: tournament.id,
    matches: tournament.matches,
    teamNames,
    summariesByMatchId,
    bracketLabel: tournament.brackets[0]?.label ?? null,
    seeds: computedSeeds
  });

  return {
    tournament,
    standings,
    podStandings,
    podWinners,
    wildCards,
    computedSeeds,
    matches,
    upcomingMatches,
    feed,
    teamNames,
    summariesByMatchId
  };
}

export async function getLatestTournamentSlug() {
  const tournament = await db.tournament.findFirst({
    orderBy: {
      createdAt: "desc"
    },
    select: {
      slug: true
    }
  });

  return tournament?.slug ?? null;
}

export async function getPublicBracketState(slug: string) {
  const state = await getPublicTournamentState(slug);

  if (!state) {
    return null;
  }

  const bracketRecord = state.tournament.brackets[0];

  if (!bracketRecord) {
    return {
      tournamentName: state.tournament.name,
      tournamentStartDate: state.tournament.startDate.toISOString(),
      officialThrough:
        state.tournament.matches
          .map((match) => match.finalizedAt ?? match.submittedAt ?? null)
          .filter((value): value is Date => Boolean(value))
          .sort((left, right) => right.getTime() - left.getTime())[0]
          ?.toISOString() ?? null,
      bracket: null,
      seeds: [],
      podLeaders: state.podStandings.map(({ pod, rows }) => {
        const leader = rows[0];
        return {
          podId: pod.id,
          podName: pod.name,
          teamId: leader?.teamId ?? null,
          teamName: leader?.teamName ?? "TBD",
          wins: leader?.wins ?? 0,
          losses: leader?.losses ?? 0,
          ties: leader?.ties ?? 0,
          holePoints: leader?.holePoints ?? 0,
          holesWon: leader?.holesWon ?? 0,
          totalNetBetterBall: leader?.cumulativeNetBetterBall ?? null
        };
      }),
      wildCardProjection: state.wildCards.map((entry) => {
        const standing = state.standings.find((row) => row.teamId === entry.teamId);
        const pod = state.tournament.pods.find((candidate) => candidate.id === standing?.podId);
        return {
          teamId: entry.teamId,
          teamName: entry.teamName,
          podName: pod?.name ?? "Wildcard",
          wins: standing?.wins ?? 0,
          losses: standing?.losses ?? 0,
          ties: standing?.ties ?? 0,
          holePoints: standing?.holePoints ?? 0,
          holesWon: standing?.holesWon ?? 0,
          totalNetBetterBall: standing?.cumulativeNetBetterBall ?? null
        };
      }),
      playoffField: [],
      rounds: []
    };
  }

  const bracket: BracketSummary = {
    id: bracketRecord.id,
    tournamentId: state.tournament.id,
    label: bracketRecord.label,
    qualifierCount: bracketRecord.qualifierCount,
    rounds: bracketRecord.rounds.map((round) => ({
      id: round.id,
      bracketId: bracketRecord.id,
      label: round.label,
      stage: round.stage as BracketStage,
      roundOrder: round.roundOrder,
      matchIds: state.matches
        .filter((match) => match.bracketRoundId === round.id)
        .map((match) => match.id)
    }))
  };

  const seeds: QualifiedTeamSeed[] =
    state.computedSeeds.length === bracket.qualifierCount
      ? state.computedSeeds
      : state.tournament.teams
          .filter((team) => team.seedNumber != null)
          .sort((left, right) => (left.seedNumber ?? 999) - (right.seedNumber ?? 999))
          .slice(0, bracket.qualifierCount)
          .map((team, index) => ({
            seedNumber: team.seedNumber ?? index + 1,
            qualifierType: index < 6 ? "POD_WINNER" : "WILD_CARD",
            teamId: team.id,
            teamName: team.name,
            podId: team.podMemberships[0]?.podId ?? ""
          }));

  const playoffField = seeds.map((seed) => {
    const standing = state.standings.find((row) => row.teamId === seed.teamId);
    const pod = state.tournament.pods.find((candidate) => candidate.id === seed.podId);

    return {
      ...seed,
      podName: pod?.name ?? "Wildcard",
      wins: standing?.wins ?? 0,
      losses: standing?.losses ?? 0,
      ties: standing?.ties ?? 0,
      holePoints: standing?.holePoints ?? 0,
      holesWon: standing?.holesWon ?? 0,
      totalNetBetterBall: standing?.cumulativeNetBetterBall ?? null
    };
  });

  const podLeaders = state.podStandings.map(({ pod, rows }) => {
    const leader = rows[0];
    return {
      podId: pod.id,
      podName: pod.name,
      teamId: leader?.teamId ?? null,
      teamName: leader?.teamName ?? "TBD",
      wins: leader?.wins ?? 0,
      losses: leader?.losses ?? 0,
      ties: leader?.ties ?? 0,
      holePoints: leader?.holePoints ?? 0,
      holesWon: leader?.holesWon ?? 0,
      totalNetBetterBall: leader?.cumulativeNetBetterBall ?? null
    };
  });

  const wildCardProjection = state.wildCards.map((entry) => {
    const standing = state.standings.find((row) => row.teamId === entry.teamId);
    const pod = state.tournament.pods.find((candidate) => candidate.id === standing?.podId);
    return {
      teamId: entry.teamId,
      teamName: entry.teamName,
      podName: pod?.name ?? "Wildcard",
      wins: standing?.wins ?? 0,
      losses: standing?.losses ?? 0,
      ties: standing?.ties ?? 0,
      holePoints: standing?.holePoints ?? 0,
      holesWon: standing?.holesWon ?? 0,
      totalNetBetterBall: standing?.cumulativeNetBetterBall ?? null
    };
  });

  return {
    tournamentName: state.tournament.name,
    tournamentStartDate: state.tournament.startDate.toISOString(),
    officialThrough:
      state.tournament.matches
        .map((match) => match.finalizedAt ?? match.submittedAt ?? null)
        .filter((value): value is Date => Boolean(value))
        .sort((left, right) => right.getTime() - left.getTime())[0]
        ?.toISOString() ?? null,
    bracket,
    seeds,
    podLeaders,
    wildCardProjection,
    playoffField,
    rounds: decorateBracketRounds(bracket, state.matches, state.tournament.teams.map((team) => ({
      id: team.id,
      name: team.name,
      podId: team.podMemberships[0]?.podId ?? "",
      players: team.roster.map((entry) => ({
        id: entry.player.id,
        firstName: entry.player.firstName,
        lastName: entry.player.lastName,
        displayName: entry.player.displayName,
        handicapIndex: decimalToNumber(entry.player.handicapIndex) ?? 0,
        ghinNumber: entry.player.ghinNumber,
        handicapSyncStatus: entry.player.handicapSyncStatus
      }))
    })), seeds)
  };
}

export async function getPublicMatchState(slug: string, matchId: string) {
  const tournamentState = await getPublicTournamentState(slug);

  if (!tournamentState) {
    return null;
  }

  const match = tournamentState.tournament.matches.find(
    (candidate) => candidate.id === matchId || candidate.publicScorecardSlug === matchId
  );

  if (!match) {
    return null;
  }

  const computed = tournamentState.summariesByMatchId.get(match.id);
  const matchCourse = "course" in match ? match.course : null;
  const homeTeam = "homeTeam" in match ? match.homeTeam : null;
  const awayTeam = "awayTeam" in match ? match.awayTeam : null;
  const playerSelections = "playerSelections" in match ? match.playerSelections : [];
  const holeScores = "holeScores" in match ? match.holeScores : [];
  const playedOn =
    match.finalizedAt instanceof Date
      ? match.finalizedAt.toISOString()
      : match.submittedAt instanceof Date
        ? match.submittedAt.toISOString()
        : match.scheduledAt instanceof Date
          ? match.scheduledAt.toISOString()
          : typeof match.scheduledAt === "string"
            ? match.scheduledAt
            : null;

  return {
    tournamentName: tournamentState.tournament.name,
    tournamentStartDate: tournamentState.tournament.startDate.toISOString(),
    match: buildMatchShell({
      match: {
        ...match,
        podId: match.podId ?? null,
        bracketId: match.bracketId ?? null,
        bracketRoundId: match.bracketRoundId ?? null,
        scheduledAt: match.scheduledAt instanceof Date
          ? match.scheduledAt
          : match.scheduledAt
            ? new Date(match.scheduledAt)
            : null,
        winningTeamId: match.winningTeamId ?? null,
        courseId: match.courseId ?? null,
        homeSeedNumber: match.homeSeedNumber ?? null,
        awaySeedNumber: match.awaySeedNumber ?? null,
        homeSeedLabel: match.homeSeedLabel ?? null,
        awaySeedLabel: match.awaySeedLabel ?? null,
        advancesToMatchId: match.advancesToMatchId ?? null,
        advancesToSlot: match.advancesToSlot ?? null
      },
      courseName: matchCourse?.name ?? null,
      resultLabel: buildResultLabel(computed?.teamSummaries ?? [], tournamentState.teamNames, match.winningTeamId)
    }),
    playedOn,
    course: matchCourse
      ? {
          id: matchCourse.id,
          name: matchCourse.name,
          city: matchCourse.city,
          state: matchCourse.state
        }
      : null,
    homeTeam,
    awayTeam,
    scorecard: computed
      ? {
          ...computed,
          holeMeta: (playerSelections[0]?.tee.holes ?? []).map((hole) => ({
            holeNumber: hole.holeNumber,
            par: hole.par,
            strokeIndex: hole.strokeIndex,
            yardage: hole.yardage ?? null
          })),
          players: playerSelections.map((selection) => {
            const grossByHole = Object.fromEntries(
              holeScores
                .filter((holeScore) => holeScore.playerId === selection.playerId)
                .map((holeScore) => [holeScore.holeNumber, holeScore.grossScore])
            );
            const snapshot = computed.players.find(
              (player: {
                playerId: string;
                matchStrokeCount?: number;
                strokesByHole?: Record<number, number>;
              }) => player.playerId === selection.playerId
            );

            return {
              playerId: selection.playerId,
              playerName: selection.player.displayName,
              teamId: selection.teamId,
              teeName: selection.teeNameSnapshot,
              handicapIndex: Number(selection.handicapIndexSnapshot),
              matchStrokeCount: snapshot?.matchStrokeCount ?? 0,
              strokesByHole: snapshot?.strokesByHole ?? {},
              grossByHole,
              netByHole: Object.fromEntries(
                computed.holes.map(
                  (hole: { holeNumber: number; playerNetScores: Record<string, number | null> }) => [
                    hole.holeNumber,
                    hole.playerNetScores[selection.playerId] ?? null
                  ]
                )
              )
            };
          })
        }
      : null
  };
}
