import { scoreForfeit, scoreMatch } from "@/lib/scoring/engine";
import type { MatchScoringInput } from "@/lib/scoring/types";
import { decorateBracketRounds } from "@/lib/server/bracket";
import { computePodStandings, selectWildCards, type MatchStandingInput } from "@/lib/server/standings";
import type {
  ActivityFeedEvent,
  BracketSummary,
  CourseProfile,
  MatchShell,
  PodProfile,
  QualifiedTeamSeed,
  StandingsRow,
  TeamProfile,
  TournamentSummary
} from "@/types/models";

export const DEMO_TOURNAMENT_SLUG = "fairway-match-2026";
export const DEMO_PRIVATE_MATCH_TOKEN = "fm_demo_pod_a_01";

const STANDARD_PARS = [4, 4, 3, 5, 4, 4, 3, 4, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];
const STANDARD_STROKE_INDEX = [11, 17, 13, 1, 3, 15, 9, 5, 7, 12, 18, 14, 2, 4, 16, 10, 6, 8];
const POD_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;
const TEAM_NAMES = [
  "Cedar & Co",
  "Pin Seekers",
  "Match Merchants",
  "Stableford Rejects",
  "Green Jackets",
  "Fairway Finders",
  "Press Box",
  "Dogleg Society",
  "Tap-In Union",
  "Rough Justice",
  "Wedge Issue",
  "Flight Plan",
  "Birdie Dept",
  "Bunker Hill",
  "Flag Hunters",
  "Sand Savers",
  "Sunday Pairing",
  "Back Nine Club"
];
const POD_MATCH_ONE_DAYS = [3, 6, 9, 12, 15, 18];
const POD_MATCH_TWO_DAYS = [7, 10, 13, 16, 19, 22];
const POD_MATCH_THREE_DAYS = [18, 21, 24, 27, 28, 29];

function buildTee(
  courseId: string,
  teeId: string,
  teeName: string,
  slope: number,
  courseRating: number,
  gender: "MEN" | "WOMEN" | "OPEN" = "OPEN"
) {
  return {
    id: teeId,
    courseId,
    name: teeName,
    gender,
    par: 72,
    slope,
    courseRating,
    holes: STANDARD_PARS.map((par, index) => ({
      holeNumber: index + 1,
      par,
      strokeIndex: STANDARD_STROKE_INDEX[index]
    }))
  };
}

function createTeamSummary(
  teamId: string,
  totalPoints: number,
  holesWon: number,
  betterBallGrossTotal: number | null,
  betterBallNetTotal: number | null,
  resultCode: "WIN" | "LOSS" | "TIE" | "FORFEIT_WIN" | "FORFEIT_LOSS"
) {
  return {
    teamId,
    totalPoints,
    holesWon,
    betterBallGrossTotal,
    betterBallNetTotal,
    resultCode
  };
}

export const demoTournament: TournamentSummary = {
  id: "tournament-2026",
  name: "The Two Man",
  slug: DEMO_TOURNAMENT_SLUG,
  seasonYear: 2026,
  status: "ACTIVE",
  startDate: "2026-05-01",
  endDate: "2026-09-30",
  rules: {
    handicapAllowancePct: 0.9,
    maxStrokesPerHole: 1,
    forfeitPointsAwarded: 12,
    forfeitHolesWonAwarded: 6,
    tiebreakers: [
      "Match record",
      "Total hole points",
      "Total holes won",
      "Lowest net better-ball score",
      "Coin flip"
    ]
  }
};

export const demoCourses: CourseProfile[] = [
  {
    id: "course-oak-ridge",
    name: "Oak Ridge Club",
    city: "Chicago",
    state: "IL",
    tees: [
      buildTee("course-oak-ridge", "tee-oak-blue", "Blue", 129, 71.8, "MEN"),
      buildTee("course-oak-ridge", "tee-oak-white", "White", 124, 69.4, "OPEN"),
      buildTee("course-oak-ridge", "tee-oak-gold", "Gold", 118, 67.3, "OPEN")
    ]
  },
  {
    id: "course-lake-vista",
    name: "Lake Vista Golf Club",
    city: "Naperville",
    state: "IL",
    tees: [
      buildTee("course-lake-vista", "tee-lake-blue", "Blue", 131, 72.2, "MEN"),
      buildTee("course-lake-vista", "tee-lake-white", "White", 126, 70.1, "OPEN"),
      buildTee("course-lake-vista", "tee-lake-gold", "Gold", 117, 67.8, "OPEN")
    ]
  }
];

export const demoPods: PodProfile[] = POD_LETTERS.map((letter, index) => ({
  id: `pod-${letter.toLowerCase()}`,
  name: `Pod ${letter}`,
  order: index + 1,
  teamIds: TEAM_NAMES.slice(index * 3, index * 3 + 3).map(
    (_, teamIndex) => `team-${String(index * 3 + teamIndex + 1).padStart(2, "0")}`
  )
}));

export const demoTeams: TeamProfile[] = TEAM_NAMES.map((teamName, index) => {
  const teamNumber = index + 1;
  const podLetter = POD_LETTERS[Math.floor(index / 3)];
  const teamId = `team-${String(teamNumber).padStart(2, "0")}`;

  return {
    id: teamId,
    name: teamName,
    podId: `pod-${podLetter.toLowerCase()}`,
    players: [
      {
        id: `${teamId}-player-a`,
        firstName: "Player",
        lastName: `${String(teamNumber).padStart(2, "0")}A`,
        displayName: `Player ${String(teamNumber).padStart(2, "0")}A`,
        email: `player${String(teamNumber).padStart(2, "0")}a@fairwaymatch.dev`,
        handicapIndex: Number((7.4 + index * 0.8).toFixed(1)),
        ghinNumber: `1000${String(teamNumber).padStart(2, "0")}1`,
        handicapSyncStatus: "PENDING",
        lastHandicapSyncAt: null
      },
      {
        id: `${teamId}-player-b`,
        firstName: "Player",
        lastName: `${String(teamNumber).padStart(2, "0")}B`,
        displayName: `Player ${String(teamNumber).padStart(2, "0")}B`,
        email: `player${String(teamNumber).padStart(2, "0")}b@fairwaymatch.dev`,
        handicapIndex: Number((11.2 + index * 0.7).toFixed(1)),
        ghinNumber: `1000${String(teamNumber).padStart(2, "0")}2`,
        handicapSyncStatus: "PENDING",
        lastHandicapSyncAt: null
      }
    ]
  };
});

const teamById = Object.fromEntries(demoTeams.map((team) => [team.id, team]));

function teamName(teamId: string | null | undefined): string {
  if (!teamId) {
    return "TBD";
  }

  return teamById[teamId]?.name ?? "TBD";
}

export function getTeamNameById(teamId: string | null | undefined): string {
  return teamName(teamId);
}

function buildPodMatches(): MatchShell[] {
  const matches: MatchShell[] = [];

  for (const pod of demoPods) {
    const [teamA, teamB, teamC] = pod.teamIds;
    const podIndex = pod.order - 1;

    matches.push(
      {
        id: `${pod.id}-match-1`,
        tournamentId: demoTournament.id,
        stage: "POD_PLAY",
        status: "FINAL",
        podId: pod.id,
        roundLabel: `${pod.name} Match 1`,
        scheduledAt: `2026-05-${String(POD_MATCH_ONE_DAYS[podIndex] ?? 3).padStart(2, "0")}T13:00:00.000Z`,
        homeTeamId: teamA,
        awayTeamId: teamB,
        courseId: pod.order % 2 === 0 ? "course-lake-vista" : "course-oak-ridge",
        courseName: pod.order % 2 === 0 ? "Lake Vista Golf Club" : "Oak Ridge Club",
        privateToken: pod.id === "pod-a" ? DEMO_PRIVATE_MATCH_TOKEN : `fm_private_${pod.id}_1`,
        publicScorecardSlug: `${pod.id}-match-1`,
        resultLabel:
          pod.id === "pod-a"
            ? `${teamName(teamA)} 10.5 - 7.5 ${teamName(teamB)}`
            : `${teamName(teamA)} ${10 + (pod.order % 2 ? 1 : 0)} - ${8 - (pod.order % 2 ? 1 : 0)} ${teamName(teamB)}`,
        winningTeamId: teamA
      },
      {
        id: `${pod.id}-match-2`,
        tournamentId: demoTournament.id,
        stage: "POD_PLAY",
        status: "FINAL",
        podId: pod.id,
        roundLabel: `${pod.name} Match 2`,
        scheduledAt: `2026-06-${String(POD_MATCH_TWO_DAYS[podIndex] ?? 7).padStart(2, "0")}T13:00:00.000Z`,
        homeTeamId: teamA,
        awayTeamId: teamC,
        courseId: pod.order % 2 === 0 ? "course-oak-ridge" : "course-lake-vista",
        courseName: pod.order % 2 === 0 ? "Oak Ridge Club" : "Lake Vista Golf Club",
        privateToken: `fm_private_${pod.id}_2`,
        publicScorecardSlug: `${pod.id}-match-2`,
        resultLabel:
          pod.id === "pod-a"
            ? `${teamName(teamA)} 9 - 9 ${teamName(teamC)}`
            : pod.id === "pod-c"
              ? `${teamName(teamA)} 10 - 8 ${teamName(teamC)}`
              : pod.id === "pod-e"
                ? `${teamName(teamC)} 10 - 8 ${teamName(teamA)}`
                : `${teamName(teamA)} 10 - 8 ${teamName(teamC)}`,
        winningTeamId:
          pod.id === "pod-a" ? null : pod.id === "pod-e" ? teamC : teamA
      },
      {
        id: `${pod.id}-match-3`,
        tournamentId: demoTournament.id,
        stage: "POD_PLAY",
        status: pod.id === "pod-f" ? "FORFEIT" : "FINAL",
        podId: pod.id,
        roundLabel: `${pod.name} Match 3`,
        scheduledAt: `2026-06-${String(POD_MATCH_THREE_DAYS[podIndex] ?? 18).padStart(2, "0")}T13:00:00.000Z`,
        homeTeamId: teamB,
        awayTeamId: teamC,
        courseId: "course-oak-ridge",
        courseName: "Oak Ridge Club",
        privateToken: `fm_private_${pod.id}_3`,
        publicScorecardSlug: `${pod.id}-match-3`,
        resultLabel:
          pod.id === "pod-f"
            ? `${teamName(teamC)} wins by forfeit`
            : pod.id === "pod-a"
              ? `${teamName(teamC)} 10 - 8 ${teamName(teamB)}`
            : pod.id === "pod-c"
              ? `${teamName(teamB)} 11 - 7 ${teamName(teamC)}`
              : pod.id === "pod-d"
                ? `${teamName(teamB)} 9 - 9 ${teamName(teamC)}`
              : pod.id === "pod-e"
                ? `${teamName(teamB)} 10 - 8 ${teamName(teamC)}`
                : `${teamName(teamB)} 9.5 - 8.5 ${teamName(teamC)}`,
        winningTeamId:
          pod.id === "pod-f"
            ? teamC
            : pod.id === "pod-a"
              ? teamC
              : pod.id === "pod-d"
                ? null
                : teamB
      }
    );
  }

  return matches;
}

const podATeams = demoTeams.filter((team) => team.podId === "pod-a");
const oakBlue = demoCourses[0].tees[0];
const oakWhite = demoCourses[0].tees[1];
const oakGold = demoCourses[0].tees[2];

export const demoDetailedMatchInput: MatchScoringInput = {
  allowancePct: demoTournament.rules.handicapAllowancePct,
  players: [
    {
      playerId: podATeams[0].players[0].id,
      playerName: podATeams[0].players[0].displayName,
      teamId: podATeams[0].id,
      handicapIndex: podATeams[0].players[0].handicapIndex,
      teeId: oakBlue.id,
      teeName: oakBlue.name,
      slope: oakBlue.slope,
      courseRating: oakBlue.courseRating,
      par: oakBlue.par,
      holes: oakBlue.holes
    },
    {
      playerId: podATeams[0].players[1].id,
      playerName: podATeams[0].players[1].displayName,
      teamId: podATeams[0].id,
      handicapIndex: podATeams[0].players[1].handicapIndex,
      teeId: oakWhite.id,
      teeName: oakWhite.name,
      slope: oakWhite.slope,
      courseRating: oakWhite.courseRating,
      par: oakWhite.par,
      holes: oakWhite.holes
    },
    {
      playerId: podATeams[1].players[0].id,
      playerName: podATeams[1].players[0].displayName,
      teamId: podATeams[1].id,
      handicapIndex: podATeams[1].players[0].handicapIndex,
      teeId: oakBlue.id,
      teeName: oakBlue.name,
      slope: oakBlue.slope,
      courseRating: oakBlue.courseRating,
      par: oakBlue.par,
      holes: oakBlue.holes
    },
    {
      playerId: podATeams[1].players[1].id,
      playerName: podATeams[1].players[1].displayName,
      teamId: podATeams[1].id,
      handicapIndex: podATeams[1].players[1].handicapIndex,
      teeId: oakGold.id,
      teeName: oakGold.name,
      slope: oakGold.slope,
      courseRating: oakGold.courseRating,
      par: oakGold.par,
      holes: oakGold.holes
    }
  ],
  holeScores: STANDARD_PARS.map((_, index) => ({
    holeNumber: index + 1,
    scores: {
      [podATeams[0].players[0].id]: [5, 4, 4, 6, 5, 4, 3, 5, 5, 4, 3, 5, 5, 4, 4, 4, 6, 4][index],
      [podATeams[0].players[1].id]: [6, 5, 4, 7, 6, 5, 4, 5, 6, 5, 4, 6, 6, 5, 4, 5, 6, 5][index],
      [podATeams[1].players[0].id]: [5, 4, 5, 5, 5, 4, 4, 5, 5, 4, 3, 5, 6, 4, 3, 4, 5, 5][index],
      [podATeams[1].players[1].id]: [6, 5, 5, 7, 6, 5, 4, 5, 6, 5, 4, 6, 7, 5, 4, 5, 6, 6][index]
    }
  }))
};

export const demoDetailedMatchResult = scoreMatch(demoDetailedMatchInput);

const podMatches = buildPodMatches();

const podStandingInputs: MatchStandingInput[] = [
  {
    id: "pod-a-match-1",
    podId: "pod-a",
    stage: "POD_PLAY",
    status: "FINAL",
    teamSummaries: demoDetailedMatchResult.teamSummaries
  },
  {
    id: "pod-a-match-2",
    podId: "pod-a",
    stage: "POD_PLAY",
    status: "FINAL",
    teamSummaries: [
      createTeamSummary("team-01", 9, 5, 77, 72, "TIE"),
      createTeamSummary("team-03", 9, 5, 78, 72, "TIE")
    ]
  },
  {
    id: "pod-a-match-3",
    podId: "pod-a",
    stage: "POD_PLAY",
    status: "FINAL",
    teamSummaries: [
      createTeamSummary("team-02", 8, 4, 80, 76, "LOSS"),
      createTeamSummary("team-03", 10, 6, 79, 74, "WIN")
    ]
  },
  {
    id: "pod-b-match-1",
    podId: "pod-b",
    stage: "POD_PLAY",
    status: "FINAL",
    teamSummaries: [
      createTeamSummary("team-04", 11, 8, 77, 72, "WIN"),
      createTeamSummary("team-05", 7, 4, 80, 76, "LOSS")
    ]
  },
  {
    id: "pod-b-match-2",
    podId: "pod-b",
    stage: "POD_PLAY",
    status: "FINAL",
    teamSummaries: [
      createTeamSummary("team-04", 10, 6, 78, 73, "WIN"),
      createTeamSummary("team-06", 8, 5, 81, 77, "LOSS")
    ]
  },
  {
    id: "pod-b-match-3",
    podId: "pod-b",
    stage: "POD_PLAY",
    status: "FINAL",
    teamSummaries: [
      createTeamSummary("team-05", 9.5, 6, 78, 74, "WIN"),
      createTeamSummary("team-06", 8.5, 5, 80, 76, "LOSS")
    ]
  },
  {
    id: "pod-c-match-1",
    podId: "pod-c",
    stage: "POD_PLAY",
    status: "FINAL",
    teamSummaries: [
      createTeamSummary("team-07", 9, 5, 78, 73, "TIE"),
      createTeamSummary("team-08", 9, 5, 78, 74, "TIE")
    ]
  },
  {
    id: "pod-c-match-2",
    podId: "pod-c",
    stage: "POD_PLAY",
    status: "FINAL",
    teamSummaries: [
      createTeamSummary("team-07", 10, 6, 79, 73, "WIN"),
      createTeamSummary("team-09", 8, 4, 82, 78, "LOSS")
    ]
  },
  {
    id: "pod-c-match-3",
    podId: "pod-c",
    stage: "POD_PLAY",
    status: "FINAL",
    teamSummaries: [
      createTeamSummary("team-08", 11, 7, 77, 72, "WIN"),
      createTeamSummary("team-09", 7, 4, 83, 79, "LOSS")
    ]
  },
  {
    id: "pod-d-match-1",
    podId: "pod-d",
    stage: "POD_PLAY",
    status: "FINAL",
    teamSummaries: [
      createTeamSummary("team-10", 10.5, 7, 76, 71, "WIN"),
      createTeamSummary("team-11", 7.5, 4, 79, 75, "LOSS")
    ]
  },
  {
    id: "pod-d-match-2",
    podId: "pod-d",
    stage: "POD_PLAY",
    status: "FINAL",
    teamSummaries: [
      createTeamSummary("team-10", 11, 8, 75, 70, "WIN"),
      createTeamSummary("team-12", 7, 4, 81, 77, "LOSS")
    ]
  },
  {
    id: "pod-d-match-3",
    podId: "pod-d",
    stage: "POD_PLAY",
    status: "FINAL",
    teamSummaries: [
      createTeamSummary("team-11", 9, 5, 79, 74, "TIE"),
      createTeamSummary("team-12", 9, 5, 79, 75, "TIE")
    ]
  },
  {
    id: "pod-e-match-1",
    podId: "pod-e",
    stage: "POD_PLAY",
    status: "FINAL",
    teamSummaries: [
      createTeamSummary("team-13", 8, 4, 81, 76, "LOSS"),
      createTeamSummary("team-14", 10, 6, 78, 72, "WIN")
    ]
  },
  {
    id: "pod-e-match-2",
    podId: "pod-e",
    stage: "POD_PLAY",
    status: "FINAL",
    teamSummaries: [
      createTeamSummary("team-13", 8, 4, 82, 77, "LOSS"),
      createTeamSummary("team-15", 10, 6, 79, 73, "WIN")
    ]
  },
  {
    id: "pod-e-match-3",
    podId: "pod-e",
    stage: "POD_PLAY",
    status: "FINAL",
    teamSummaries: [
      createTeamSummary("team-14", 10, 6, 78, 72, "WIN"),
      createTeamSummary("team-15", 8, 4, 80, 74, "LOSS")
    ]
  },
  {
    id: "pod-f-match-1",
    podId: "pod-f",
    stage: "POD_PLAY",
    status: "FINAL",
    teamSummaries: [
      createTeamSummary("team-16", 10, 6, 78, 73, "WIN"),
      createTeamSummary("team-17", 8, 4, 82, 78, "LOSS")
    ]
  },
  {
    id: "pod-f-match-2",
    podId: "pod-f",
    stage: "POD_PLAY",
    status: "FINAL",
    teamSummaries: [
      createTeamSummary("team-16", 8.5, 5, 79, 75, "LOSS"),
      createTeamSummary("team-18", 9.5, 6, 77, 72, "WIN")
    ]
  },
  {
    id: "pod-f-match-3",
    podId: "pod-f",
    stage: "POD_PLAY",
    status: "FORFEIT",
    teamSummaries: scoreForfeit({
      winnerTeamId: "team-18",
      loserTeamId: "team-17",
      awardedPoints: demoTournament.rules.forfeitPointsAwarded,
      awardedHolesWon: demoTournament.rules.forfeitHolesWonAwarded
    })
  }
];

export const demoStandings = computePodStandings(demoTeams, podStandingInputs);

export function getPodStandings(): { pod: PodProfile; rows: StandingsRow[] }[] {
  return demoPods.map((pod) => ({
    pod,
    rows: demoStandings.filter((row) => row.podId === pod.id)
  }));
}

export function getPodWinners(): StandingsRow[] {
  return getPodStandings()
    .map(({ rows }) => rows[0])
    .filter(Boolean);
}

export function getWildCards(): StandingsRow[] {
  const podWinnerIds = getPodWinners().map((row) => row.teamId);

  return selectWildCards(demoStandings, podWinnerIds, 2);
}

export const demoQualifiedSeeds: QualifiedTeamSeed[] = (() => {
  const podWinnerIds = new Set(getPodWinners().map((row) => row.teamId));
  const wildCardIds = new Set(getWildCards().map((row) => row.teamId));
  const orderedQualifiers = demoStandings
    .filter((row) => podWinnerIds.has(row.teamId) || wildCardIds.has(row.teamId))
    .slice(0, 8);

  return orderedQualifiers.map((row, index) => ({
    seedNumber: index + 1,
    qualifierType: podWinnerIds.has(row.teamId) ? "POD_WINNER" : "WILD_CARD",
    teamId: row.teamId,
    teamName: row.teamName,
    podId: row.podId
  }));
})();

function seed(seedNumber: number) {
  return demoQualifiedSeeds.find((entry) => entry.seedNumber === seedNumber) ?? null;
}

const qf1Winner = seed(1)?.teamId ?? null;
const qf2Winner = seed(5)?.teamId ?? null;
const qf3Winner = seed(2)?.teamId ?? null;
const qf4Winner = seed(3)?.teamId ?? null;
const sf1Winner = qf1Winner;
const sf2Winner = qf4Winner;

export const demoBracket: BracketSummary = {
  id: "bracket-2026",
  tournamentId: demoTournament.id,
  label: "Championship Bracket",
  qualifierCount: 8,
  rounds: [
    {
      id: "round-quarterfinals",
      bracketId: "bracket-2026",
      label: "Quarterfinals",
      stage: "QUARTERFINAL",
      roundOrder: 1,
      matchIds: ["qf-1", "qf-2", "qf-3", "qf-4"]
    },
    {
      id: "round-semifinals",
      bracketId: "bracket-2026",
      label: "Semifinals",
      stage: "SEMIFINAL",
      roundOrder: 2,
      matchIds: ["sf-1", "sf-2"]
    },
    {
      id: "round-championship",
      bracketId: "bracket-2026",
      label: "Championship",
      stage: "CHAMPIONSHIP",
      roundOrder: 3,
      matchIds: ["championship"]
    }
  ]
};

const playoffMatches: MatchShell[] = [
  {
    id: "qf-1",
    tournamentId: demoTournament.id,
    stage: "QUARTERFINAL",
    status: "FINAL",
    bracketId: demoBracket.id,
    bracketRoundId: "round-quarterfinals",
    roundLabel: "Quarterfinal 1",
    scheduledAt: "2026-07-11T14:00:00.000Z",
    homeTeamId: seed(1)?.teamId ?? null,
    awayTeamId: seed(8)?.teamId ?? null,
    winningTeamId: qf1Winner,
    courseId: "course-oak-ridge",
    courseName: "Oak Ridge Club",
    privateToken: "private_qf_1",
    publicScorecardSlug: "qf-1",
    homeSeedNumber: 1,
    awaySeedNumber: 8,
    homeSeedLabel: "Seed 1",
    awaySeedLabel: "Seed 8",
    advancesToMatchId: "sf-1",
    advancesToSlot: "HOME",
    resultLabel: `${teamName(seed(1)?.teamId)} 11 - 7 ${teamName(seed(8)?.teamId)}`
  },
  {
    id: "qf-2",
    tournamentId: demoTournament.id,
    stage: "QUARTERFINAL",
    status: "FINAL",
    bracketId: demoBracket.id,
    bracketRoundId: "round-quarterfinals",
    roundLabel: "Quarterfinal 2",
    scheduledAt: "2026-07-18T14:00:00.000Z",
    homeTeamId: seed(4)?.teamId ?? null,
    awayTeamId: seed(5)?.teamId ?? null,
    winningTeamId: qf2Winner,
    courseId: "course-lake-vista",
    courseName: "Lake Vista Golf Club",
    privateToken: "private_qf_2",
    publicScorecardSlug: "qf-2",
    homeSeedNumber: 4,
    awaySeedNumber: 5,
    homeSeedLabel: "Seed 4",
    awaySeedLabel: "Seed 5",
    advancesToMatchId: "sf-1",
    advancesToSlot: "AWAY",
    resultLabel: `${teamName(seed(5)?.teamId)} 10 - 8 ${teamName(seed(4)?.teamId)}`
  },
  {
    id: "qf-3",
    tournamentId: demoTournament.id,
    stage: "QUARTERFINAL",
    status: "FINAL",
    bracketId: demoBracket.id,
    bracketRoundId: "round-quarterfinals",
    roundLabel: "Quarterfinal 3",
    scheduledAt: "2026-07-25T14:00:00.000Z",
    homeTeamId: seed(2)?.teamId ?? null,
    awayTeamId: seed(7)?.teamId ?? null,
    winningTeamId: qf3Winner,
    courseId: "course-oak-ridge",
    courseName: "Oak Ridge Club",
    privateToken: "private_qf_3",
    publicScorecardSlug: "qf-3",
    homeSeedNumber: 2,
    awaySeedNumber: 7,
    homeSeedLabel: "Seed 2",
    awaySeedLabel: "Seed 7",
    advancesToMatchId: "sf-2",
    advancesToSlot: "HOME",
    resultLabel: `${teamName(seed(2)?.teamId)} 9.5 - 8.5 ${teamName(seed(7)?.teamId)}`
  },
  {
    id: "qf-4",
    tournamentId: demoTournament.id,
    stage: "QUARTERFINAL",
    status: "FINAL",
    bracketId: demoBracket.id,
    bracketRoundId: "round-quarterfinals",
    roundLabel: "Quarterfinal 4",
    scheduledAt: "2026-07-25T18:00:00.000Z",
    homeTeamId: seed(3)?.teamId ?? null,
    awayTeamId: seed(6)?.teamId ?? null,
    winningTeamId: qf4Winner,
    courseId: "course-lake-vista",
    courseName: "Lake Vista Golf Club",
    privateToken: "private_qf_4",
    publicScorecardSlug: "qf-4",
    homeSeedNumber: 3,
    awaySeedNumber: 6,
    homeSeedLabel: "Seed 3",
    awaySeedLabel: "Seed 6",
    advancesToMatchId: "sf-2",
    advancesToSlot: "AWAY",
    resultLabel: `${teamName(seed(3)?.teamId)} 10.5 - 7.5 ${teamName(seed(6)?.teamId)}`
  },
  {
    id: "sf-1",
    tournamentId: demoTournament.id,
    stage: "SEMIFINAL",
    status: "FINAL",
    bracketId: demoBracket.id,
    bracketRoundId: "round-semifinals",
    roundLabel: "Semifinal 1",
    scheduledAt: "2026-08-15T14:00:00.000Z",
    homeTeamId: qf1Winner,
    awayTeamId: qf2Winner,
    winningTeamId: sf1Winner,
    courseId: "course-oak-ridge",
    courseName: "Oak Ridge Club",
    privateToken: "private_sf_1",
    publicScorecardSlug: "sf-1",
    homeSeedNumber: seed(1)?.seedNumber ?? null,
    awaySeedNumber: seed(5)?.seedNumber ?? null,
    homeSeedLabel: "Winner QF1",
    awaySeedLabel: "Winner QF2",
    advancesToMatchId: "championship",
    advancesToSlot: "HOME",
    resultLabel: `${teamName(sf1Winner)} 9.5 - 8.5 ${teamName(qf2Winner)}`
  },
  {
    id: "sf-2",
    tournamentId: demoTournament.id,
    stage: "SEMIFINAL",
    status: "FINAL",
    bracketId: demoBracket.id,
    bracketRoundId: "round-semifinals",
    roundLabel: "Semifinal 2",
    scheduledAt: "2026-08-22T14:00:00.000Z",
    homeTeamId: qf3Winner,
    awayTeamId: qf4Winner,
    winningTeamId: sf2Winner,
    courseId: "course-lake-vista",
    courseName: "Lake Vista Golf Club",
    privateToken: "private_sf_2",
    publicScorecardSlug: "sf-2",
    homeSeedNumber: seed(2)?.seedNumber ?? null,
    awaySeedNumber: seed(3)?.seedNumber ?? null,
    homeSeedLabel: "Winner QF3",
    awaySeedLabel: "Winner QF4",
    advancesToMatchId: "championship",
    advancesToSlot: "AWAY",
    resultLabel: `${teamName(sf2Winner)} 10 - 8 ${teamName(qf3Winner)}`
  },
  {
    id: "championship",
    tournamentId: demoTournament.id,
    stage: "CHAMPIONSHIP",
    status: "READY",
    bracketId: demoBracket.id,
    bracketRoundId: "round-championship",
    roundLabel: "Championship",
    scheduledAt: "2026-09-19T15:00:00.000Z",
    homeTeamId: sf1Winner,
    awayTeamId: sf2Winner,
    winningTeamId: null,
    courseId: "course-oak-ridge",
    courseName: "Oak Ridge Club",
    privateToken: "private_championship",
    publicScorecardSlug: "championship",
    homeSeedNumber: demoQualifiedSeeds.find((entry) => entry.teamId === sf1Winner)?.seedNumber ?? null,
    awaySeedNumber: demoQualifiedSeeds.find((entry) => entry.teamId === sf2Winner)?.seedNumber ?? null,
    homeSeedLabel: "Winner SF1",
    awaySeedLabel: "Winner SF2",
    advancesToMatchId: null,
    advancesToSlot: null,
    resultLabel: null
  }
];

export const demoMatches: MatchShell[] = [...podMatches, ...playoffMatches];

export function getBracketRounds() {
  return decorateBracketRounds(demoBracket, demoMatches, demoTeams, demoQualifiedSeeds);
}

export function getUpcomingMatches() {
  return demoMatches
    .filter((match) => match.status === "SCHEDULED" || match.status === "READY")
    .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt));
}

export const demoActivityFeed: ActivityFeedEvent[] = [
  {
    id: "feed-championship-set",
    tournamentId: demoTournament.id,
    type: "CHAMPIONSHIP_SET",
    occurredAt: "2026-08-22T18:30:00.000Z",
    icon: "🏆",
    title: "Championship match set",
    body: `${teamName(sf1Winner)} will face ${teamName(sf2Winner)} at Oak Ridge Club on September 19.`,
    matchId: "championship",
    teamIds: [sf1Winner ?? "", sf2Winner ?? ""]
  },
  {
    id: "feed-semifinal-2",
    tournamentId: demoTournament.id,
    type: "MATCH_COMPLETED",
    occurredAt: "2026-08-22T17:45:00.000Z",
    icon: "🔥",
    title: `${teamName(sf2Winner)} def. ${teamName(qf3Winner)} 10-8`,
    body: `Semifinal 2 is complete at Lake Vista Golf Club. ${teamName(sf2Winner)} punched its ticket to the championship.`,
    matchId: "sf-2",
    teamIds: [sf2Winner ?? "", qf3Winner ?? ""]
  },
  {
    id: "feed-semifinal-1",
    tournamentId: demoTournament.id,
    type: "MATCH_COMPLETED",
    occurredAt: "2026-08-15T17:10:00.000Z",
    icon: "🏌️",
    title: `${teamName(sf1Winner)} def. ${teamName(qf2Winner)} 9.5-8.5`,
    body: `Semifinal 1 finished at Oak Ridge Club and locked the first championship berth.`,
    matchId: "sf-1",
    teamIds: [sf1Winner ?? "", qf2Winner ?? ""]
  },
  {
    id: "feed-semis-locked",
    tournamentId: demoTournament.id,
    type: "SEMIFINAL_LOCKED",
    occurredAt: "2026-07-25T22:00:00.000Z",
    icon: "🧩",
    title: "Semifinal matchups locked",
    body: `Both sides of the semifinal bracket are now set after quarterfinal play wrapped.`,
    matchId: "sf-1",
    teamIds: [qf1Winner ?? "", qf2Winner ?? "", qf3Winner ?? "", qf4Winner ?? ""]
  },
  {
    id: "feed-qf-4",
    tournamentId: demoTournament.id,
    type: "MATCH_COMPLETED",
    occurredAt: "2026-07-25T19:45:00.000Z",
    icon: "🔥",
    title: `${teamName(qf4Winner)} def. ${teamName(seed(6)?.teamId)} 10.5-7.5`,
    body: `Quarterfinal 4 finished at Lake Vista Golf Club.`,
    matchId: "qf-4",
    teamIds: [qf4Winner ?? "", seed(6)?.teamId ?? ""]
  },
  {
    id: "feed-qf-1",
    tournamentId: demoTournament.id,
    type: "MATCH_COMPLETED",
    occurredAt: "2026-07-11T18:10:00.000Z",
    icon: "🏌️",
    title: `${teamName(qf1Winner)} def. ${teamName(seed(8)?.teamId)} 11-7`,
    body: `Quarterfinal 1 opened the knockout stage at Oak Ridge Club.`,
    matchId: "qf-1",
    teamIds: [qf1Winner ?? "", seed(8)?.teamId ?? ""]
  },
  {
    id: "feed-playoffs-set",
    tournamentId: demoTournament.id,
    type: "PLAYOFFS_SET",
    occurredAt: "2026-06-30T21:00:00.000Z",
    icon: "🏆",
    title: "Playoffs set: quarterfinal matchups finalized",
    body: `Six pod winners and two wild cards have been seeded into the bracket.`,
    matchId: "qf-1",
    teamIds: demoQualifiedSeeds.map((entry) => entry.teamId)
  },
  {
    id: "feed-pod-f-forfeit",
    tournamentId: demoTournament.id,
    type: "MATCH_COMPLETED",
    occurredAt: "2026-06-28T16:20:00.000Z",
    icon: "📣",
    title: `${teamName("team-18")} wins by forfeit`,
    body: `Pod F closed with a forfeit, awarding 12 points and +6 holes won to ${teamName("team-18")}.`,
    matchId: "pod-f-match-3",
    teamIds: ["team-18", "team-17"]
  }
];

export function getFeed() {
  return demoActivityFeed;
}

export function getMatchByToken(token: string) {
  const match = demoMatches.find((candidate) => candidate.privateToken === token);

  if (!match) {
    return null;
  }

  const homeTeam = demoTeams.find((team) => team.id === match.homeTeamId) ?? null;
  const awayTeam = demoTeams.find((team) => team.id === match.awayTeamId) ?? null;

  return {
    match,
    homeTeam,
    awayTeam,
    courses: demoCourses,
    scorecard: token === DEMO_PRIVATE_MATCH_TOKEN ? demoDetailedMatchResult : null
  };
}

export function getPublicMatch(matchId: string) {
  const match = demoMatches.find((candidate) => candidate.id === matchId);

  if (!match) {
    return null;
  }

  return {
    match,
    homeTeam: demoTeams.find((team) => team.id === match.homeTeamId) ?? null,
    awayTeam: demoTeams.find((team) => team.id === match.awayTeamId) ?? null,
    scorecard: match.id === "pod-a-match-1" ? demoDetailedMatchResult : null
  };
}

export const demoAdminSummary = {
  teams: demoTeams.length,
  players: demoTeams.length * 2,
  pods: demoPods.length,
  scheduledMatches: getUpcomingMatches().length,
  completedMatches: demoMatches.filter(
    (match) => match.status === "FINAL" || match.status === "FORFEIT"
  ).length
};
