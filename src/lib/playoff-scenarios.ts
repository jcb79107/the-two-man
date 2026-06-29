import type {
  MatchResultCode,
  MatchStage,
  MatchStatus,
  QualifiedTeamSeed,
  StandingsRow
} from "@/types/models";
import { compareStandings } from "@/lib/server/qualification";

export type ScenarioConfidence =
  | "controls"
  | "projected"
  | "needs-help"
  | "no-path"
  | "no-match";

export interface ScenarioPod {
  id: string;
  name: string;
}

export interface ScenarioTeam {
  id: string;
  name: string;
  podId: string;
  podName: string;
}

export interface ScenarioMatch {
  id: string;
  podId: string | null;
  stage: MatchStage;
  status: MatchStatus;
  roundLabel: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
}

export interface ScenarioInput {
  pods: ScenarioPod[];
  teams: ScenarioTeam[];
  standings: StandingsRow[];
  matches: ScenarioMatch[];
}

export interface ScenarioResultInput {
  selectedTeamPoints: number;
  selectedTeamHolesWon?: number;
  selectedTeamNet?: number | null;
  opponentNet?: number | null;
}

export interface ScenarioMatchSummary {
  matchId: string;
  opponentTeamId: string;
  opponentTeamName: string;
  roundLabel: string;
}

export interface ScenarioStatus {
  confidence: ScenarioConfidence;
  label: string;
  detail: string;
}

export interface ScenarioScoreAnalysis {
  selectedTeamId: string;
  selectedTeamName: string;
  selectedTeamPoints: number;
  opponentPoints: number;
  selectedTeamHolesWon: number;
  opponentHolesWon: number;
  currentSeed: number | null;
  simulatedSeed: number | null;
  currentQualifierType: QualifiedTeamSeed["qualifierType"] | null;
  simulatedQualifierType: QualifiedTeamSeed["qualifierType"] | null;
  currentPodRank: number | null;
  simulatedPodRank: number | null;
  currentStatus: ScenarioStatus;
  simulatedStatus: ScenarioStatus;
  controlsFate: boolean;
  projectedIn: boolean;
  canAdvanceWithHelp: boolean;
  tiebreakDependent: boolean;
  helpPods: string[];
  helpTeams: string[];
  simulatedField: QualifiedTeamSeed[];
  simulatedBubble: QualifiedTeamSeed[];
}

export interface ScenarioNeedsSummary {
  selectedTeamId: string;
  nextMatch: ScenarioMatchSummary | null;
  currentStatus: ScenarioStatus;
  currentSeed: number | null;
  currentQualifierType: QualifiedTeamSeed["qualifierType"] | null;
  minProjectedPoints: number | null;
  minControlPoints: number | null;
  minPossiblePoints: number | null;
  tiebreakPoints: number[];
  watchPods: string[];
  watchTeams: string[];
  scoreAnalyses: ScenarioScoreAnalysis[];
}

export type PlayoffClinchType = "POD_WINNER" | "WILD_CARD" | "PLAYOFF_BERTH";

export interface PlayoffClinchTeam {
  teamId: string;
  teamName: string;
  podId: string;
  clinchType: PlayoffClinchType;
  projectedSeedNumber: number | null;
}

export interface PlayoffClinchAnalysis {
  clinchedTeams: PlayoffClinchTeam[];
  remainingBerths: number;
  remainingMatchCount: number;
}

interface ScenarioOutcome {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  homePoints: number;
  awayPoints: number;
  homeHolesWon: number;
  awayHolesWon: number;
  homeNet?: number | null;
  awayNet?: number | null;
}

interface PodOutcome {
  podId: string;
  rows: StandingsRow[];
  winnerTeamId: string | null;
}

interface PodThreatSummary {
  minOutranking: number;
  maxOutranking: number;
  helpTeams: Set<string>;
}

const QUALIFIER_COUNT = 8;
const WILD_CARD_COUNT = 2;
const SCORE_VALUES = Array.from({ length: 37 }, (_, index) => index / 2);
const MAX_POD_OUTCOMES = 60_000;

export function scoreValues() {
  return SCORE_VALUES;
}

export function formatScenarioScore(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function legalHolesWonForPoints(points: number) {
  const min = Math.max(0, Math.ceil(2 * points - 18));
  const max = Math.floor(points);

  return Array.from({ length: Math.max(0, max - min + 1) }, (_, index) => min + index);
}

export function defaultHolesWonForPoints(points: number) {
  return Math.floor(points);
}

export function getNextScenarioMatch(input: ScenarioInput, selectedTeamId: string): ScenarioMatchSummary | null {
  const match = getRemainingMatches(input).find(
    (candidate) => candidate.homeTeamId === selectedTeamId || candidate.awayTeamId === selectedTeamId
  );

  if (!match || !match.homeTeamId || !match.awayTeamId) {
    return null;
  }

  const opponentTeamId = match.homeTeamId === selectedTeamId ? match.awayTeamId : match.homeTeamId;
  const opponent = input.teams.find((team) => team.id === opponentTeamId);

  return {
    matchId: match.id,
    opponentTeamId,
    opponentTeamName: opponent?.name ?? "TBD",
    roundLabel: match.roundLabel
  };
}

export function analyzePlayoffClinches(input: ScenarioInput): PlayoffClinchAnalysis {
  const remainingMatches = getRemainingMatches(input);
  const currentField = projectPlayoffField(input.pods, input.standings);
  const currentSeedByTeamId = new Map(
    currentField.projectedPlayoffField.map((seed) => [seed.teamId, seed.seedNumber])
  );

  if (remainingMatches.length > 2) {
    const clinchedPodWinners = input.pods.flatMap((pod) => {
      const podRows = sortStandings(input.standings.filter((row) => row.podId === pod.id));
      const leader = podRows[0];
      const podHasRemainingMatch = remainingMatches.some((match) => match.podId === pod.id);

      if (!leader || (podHasRemainingMatch && leader.wins < 2)) {
        return [];
      }

      return [{
        teamId: leader.teamId,
        teamName: leader.teamName,
        podId: leader.podId,
        clinchType: "POD_WINNER" as const,
        projectedSeedNumber: currentSeedByTeamId.get(leader.teamId) ?? null
      }];
    }).sort((left, right) =>
      (left.projectedSeedNumber ?? Number.POSITIVE_INFINITY) -
      (right.projectedSeedNumber ?? Number.POSITIVE_INFINITY)
    );

    return {
      clinchedTeams: clinchedPodWinners,
      remainingBerths: Math.max(0, QUALIFIER_COUNT - clinchedPodWinners.length),
      remainingMatchCount: remainingMatches.length
    };
  }

  const outcomeSets = buildPodOutcomeSets(input);
  const clinchedTeams: PlayoffClinchTeam[] = [];

  for (const team of input.teams) {
    const ownPodOutcomes = outcomeSets.get(team.podId) ?? [];
    if (ownPodOutcomes.length === 0) {
      continue;
    }

    const otherPodOutcomeSets = [...outcomeSets.entries()].filter(
      ([podId]) => podId !== team.podId
    );
    const qualificationOutcomes = ownPodOutcomes.map((ownOutcome) => ({
      podWinner: ownOutcome.winnerTeamId === team.id,
      analysis: analyzeOwnPodOutcome(input, ownOutcome, team.id, otherPodOutcomeSets)
    }));
    const clinchedPodWinner = qualificationOutcomes.every((entry) => entry.podWinner);
    const clinchedPlayoffBerth = qualificationOutcomes.every((entry) => entry.analysis.controls);

    if (!clinchedPlayoffBerth) {
      continue;
    }

    const neverPodWinner = qualificationOutcomes.every((entry) => !entry.podWinner);
    clinchedTeams.push({
      teamId: team.id,
      teamName: team.name,
      podId: team.podId,
      clinchType: clinchedPodWinner
        ? "POD_WINNER"
        : neverPodWinner
          ? "WILD_CARD"
          : "PLAYOFF_BERTH",
      projectedSeedNumber: currentSeedByTeamId.get(team.id) ?? null
    });
  }

  clinchedTeams.sort((left, right) => {
    if (left.projectedSeedNumber == null && right.projectedSeedNumber == null) {
      return left.teamName.localeCompare(right.teamName);
    }
    if (left.projectedSeedNumber == null) {
      return 1;
    }
    if (right.projectedSeedNumber == null) {
      return -1;
    }
    return left.projectedSeedNumber - right.projectedSeedNumber;
  });

  return {
    clinchedTeams,
    remainingBerths: Math.max(0, QUALIFIER_COUNT - clinchedTeams.length),
    remainingMatchCount: remainingMatches.length
  };
}

export function analyzeScenarioNeeds(input: ScenarioInput, selectedTeamId: string): ScenarioNeedsSummary {
  const currentField = projectPlayoffField(input.pods, input.standings);
  const currentSeed = getSeed(currentField.projectedPlayoffField, selectedTeamId);
  const currentStatus = statusForSeed(currentSeed);
  const nextMatch = getNextScenarioMatch(input, selectedTeamId);

  if (!nextMatch) {
    return {
      selectedTeamId,
      nextMatch: null,
      currentStatus,
      currentSeed: currentSeed?.seedNumber ?? null,
      currentQualifierType: currentSeed?.qualifierType ?? null,
      minProjectedPoints: null,
      minControlPoints: null,
      minPossiblePoints: null,
      tiebreakPoints: [],
      watchPods: [],
      watchTeams: [],
      scoreAnalyses: []
    };
  }

  const scoreAnalyses = SCORE_VALUES.map((points) =>
    analyzeScenarioScore(input, selectedTeamId, {
      selectedTeamPoints: points,
      selectedTeamHolesWon: defaultHolesWonForPoints(points)
    })
  );
  const tiebreakPoints = SCORE_VALUES.filter((points) => isTiebreakDependent(input, selectedTeamId, points));
  const projected = scoreAnalyses.find((analysis) =>
    analysis.simulatedStatus.confidence === "controls" || analysis.simulatedStatus.confidence === "projected"
  );
  const control = scoreAnalyses.find((analysis) => analysis.simulatedStatus.confidence === "controls");
  const possible = scoreAnalyses.find((analysis) =>
    analysis.simulatedStatus.confidence !== "no-path" && analysis.simulatedStatus.confidence !== "no-match"
  );
  const watchPods = new Set<string>();
  const watchTeams = new Set<string>();

  for (const analysis of scoreAnalyses) {
    for (const pod of analysis.helpPods) {
      watchPods.add(pod);
    }
    for (const team of analysis.helpTeams) {
      watchTeams.add(team);
    }
  }

  return {
    selectedTeamId,
    nextMatch,
    currentStatus,
    currentSeed: currentSeed?.seedNumber ?? null,
    currentQualifierType: currentSeed?.qualifierType ?? null,
    minProjectedPoints: projected?.selectedTeamPoints ?? null,
    minControlPoints: control?.selectedTeamPoints ?? null,
    minPossiblePoints: possible?.selectedTeamPoints ?? null,
    tiebreakPoints,
    watchPods: [...watchPods],
    watchTeams: [...watchTeams],
    scoreAnalyses
  };
}

export function analyzeScenarioScore(
  input: ScenarioInput,
  selectedTeamId: string,
  result: ScenarioResultInput
): ScenarioScoreAnalysis {
  const selectedTeam = input.teams.find((team) => team.id === selectedTeamId);
  const selectedMatch = getRemainingMatches(input).find(
    (match) => match.homeTeamId === selectedTeamId || match.awayTeamId === selectedTeamId
  );
  const currentField = projectPlayoffField(input.pods, input.standings);
  const currentSeed = getSeed(currentField.projectedPlayoffField, selectedTeamId);
  const currentPodRank = podRank(input.standings, selectedTeamId);

  if (!selectedTeam || !selectedMatch || !selectedMatch.homeTeamId || !selectedMatch.awayTeamId) {
    return emptyScoreAnalysis(input, selectedTeamId, result, currentSeed, currentPodRank);
  }

  const selectedPoints = clampScore(result.selectedTeamPoints);
  const selectedHolesWon = clampHolesWon(selectedPoints, result.selectedTeamHolesWon);
  const override = buildSelectedOutcome(selectedMatch, selectedTeamId, {
    selectedTeamPoints: selectedPoints,
    selectedTeamHolesWon: selectedHolesWon,
    selectedTeamNet: result.selectedTeamNet,
    opponentNet: result.opponentNet
  });
  const projectedRows = sortedRowsByPod(
    input.pods,
    applyOutcome(input.standings, override)
  ).flatMap((pod) => pod.rows);
  const projectedField = projectPlayoffField(input.pods, projectedRows);
  const simulatedSeed = getSeed(projectedField.projectedPlayoffField, selectedTeamId);
  const projectedIn = Boolean(simulatedSeed);
  const outcomeSets = buildPodOutcomeSets(input, override);
  const selectedPodOutcomes = outcomeSets.get(selectedTeam.podId) ?? [];
  const otherPodOutcomeSets = [...outcomeSets.entries()].filter(([podId]) => podId !== selectedTeam.podId);
  const ownOutcomeResults = selectedPodOutcomes.map((ownOutcome) =>
    analyzeOwnPodOutcome(input, ownOutcome, selectedTeamId, otherPodOutcomeSets)
  );
  const controlsFate = ownOutcomeResults.length > 0 && ownOutcomeResults.every((entry) => entry.controls);
  const canAdvanceWithHelp = ownOutcomeResults.some((entry) => entry.canAdvance);
  const helpPods = new Set<string>();
  const helpTeams = new Set<string>();

  for (const resultEntry of ownOutcomeResults) {
    for (const pod of resultEntry.helpPods) {
      helpPods.add(pod);
    }
    for (const team of resultEntry.helpTeams) {
      helpTeams.add(team);
    }
  }

  const simulatedStatus = scenarioStatus({
    controlsFate,
    projectedIn,
    canAdvanceWithHelp
  });

  return {
    selectedTeamId,
    selectedTeamName: selectedTeam.name,
    selectedTeamPoints: selectedPoints,
    opponentPoints: 18 - selectedPoints,
    selectedTeamHolesWon: selectedHolesWon,
    opponentHolesWon: opponentHolesWonForScore(selectedPoints, selectedHolesWon),
    currentSeed: currentSeed?.seedNumber ?? null,
    simulatedSeed: simulatedSeed?.seedNumber ?? null,
    currentQualifierType: currentSeed?.qualifierType ?? null,
    simulatedQualifierType: simulatedSeed?.qualifierType ?? null,
    currentPodRank,
    simulatedPodRank: podRank(projectedRows, selectedTeamId),
    currentStatus: statusForSeed(currentSeed),
    simulatedStatus,
    controlsFate,
    projectedIn,
    canAdvanceWithHelp,
    tiebreakDependent: isTiebreakDependent(input, selectedTeamId, selectedPoints),
    helpPods: [...helpPods],
    helpTeams: [...helpTeams],
    simulatedField: projectedField.projectedPlayoffField,
    simulatedBubble: projectedField.wildCardBubble
  };
}

function emptyScoreAnalysis(
  input: ScenarioInput,
  selectedTeamId: string,
  result: ScenarioResultInput,
  currentSeed: QualifiedTeamSeed | undefined,
  currentPodRank: number | null
): ScenarioScoreAnalysis {
  const selectedTeam = input.teams.find((team) => team.id === selectedTeamId);
  const projectedField = projectPlayoffField(input.pods, input.standings);

  return {
    selectedTeamId,
    selectedTeamName: selectedTeam?.name ?? "Selected team",
    selectedTeamPoints: clampScore(result.selectedTeamPoints),
    opponentPoints: 18 - clampScore(result.selectedTeamPoints),
    selectedTeamHolesWon: defaultHolesWonForPoints(clampScore(result.selectedTeamPoints)),
    opponentHolesWon: defaultHolesWonForPoints(18 - clampScore(result.selectedTeamPoints)),
    currentSeed: currentSeed?.seedNumber ?? null,
    simulatedSeed: currentSeed?.seedNumber ?? null,
    currentQualifierType: currentSeed?.qualifierType ?? null,
    simulatedQualifierType: currentSeed?.qualifierType ?? null,
    currentPodRank,
    simulatedPodRank: currentPodRank,
    currentStatus: statusForSeed(currentSeed),
    simulatedStatus: {
      confidence: "no-match",
      label: "No remaining pod-play match",
      detail: "There is no unfinished pod-play match for this team to simulate."
    },
    controlsFate: false,
    projectedIn: Boolean(currentSeed),
    canAdvanceWithHelp: Boolean(currentSeed),
    tiebreakDependent: false,
    helpPods: [],
    helpTeams: [],
    simulatedField: projectedField.projectedPlayoffField,
    simulatedBubble: projectedField.wildCardBubble
  };
}

function isTiebreakDependent(input: ScenarioInput, selectedTeamId: string, points: number) {
  const legal = legalHolesWonForPoints(points);

  if (legal.length <= 1) {
    return false;
  }

  const low = analyzeScenarioScoreWithoutTiebreakCheck(input, selectedTeamId, {
    selectedTeamPoints: points,
    selectedTeamHolesWon: legal[0]
  });
  const high = analyzeScenarioScoreWithoutTiebreakCheck(input, selectedTeamId, {
    selectedTeamPoints: points,
    selectedTeamHolesWon: legal[legal.length - 1]
  });

  return low.simulatedStatus.confidence !== high.simulatedStatus.confidence || low.simulatedSeed !== high.simulatedSeed;
}

function analyzeScenarioScoreWithoutTiebreakCheck(
  input: ScenarioInput,
  selectedTeamId: string,
  result: ScenarioResultInput
) {
  const selectedTeam = input.teams.find((team) => team.id === selectedTeamId);
  const selectedMatch = getRemainingMatches(input).find(
    (match) => match.homeTeamId === selectedTeamId || match.awayTeamId === selectedTeamId
  );
  const currentField = projectPlayoffField(input.pods, input.standings);
  const currentSeed = getSeed(currentField.projectedPlayoffField, selectedTeamId);
  const currentPodRank = podRank(input.standings, selectedTeamId);

  if (!selectedTeam || !selectedMatch || !selectedMatch.homeTeamId || !selectedMatch.awayTeamId) {
    return emptyScoreAnalysis(input, selectedTeamId, result, currentSeed, currentPodRank);
  }

  const selectedPoints = clampScore(result.selectedTeamPoints);
  const selectedHolesWon = clampHolesWon(selectedPoints, result.selectedTeamHolesWon);
  const override = buildSelectedOutcome(selectedMatch, selectedTeamId, {
    selectedTeamPoints: selectedPoints,
    selectedTeamHolesWon: selectedHolesWon
  });
  const projectedRows = sortedRowsByPod(input.pods, applyOutcome(input.standings, override)).flatMap((pod) => pod.rows);
  const projectedField = projectPlayoffField(input.pods, projectedRows);
  const simulatedSeed = getSeed(projectedField.projectedPlayoffField, selectedTeamId);
  const outcomeSets = buildPodOutcomeSets(input, override);
  const selectedPodOutcomes = outcomeSets.get(selectedTeam.podId) ?? [];
  const otherPodOutcomeSets = [...outcomeSets.entries()].filter(([podId]) => podId !== selectedTeam.podId);
  const ownOutcomeResults = selectedPodOutcomes.map((ownOutcome) =>
    analyzeOwnPodOutcome(input, ownOutcome, selectedTeamId, otherPodOutcomeSets)
  );
  const controlsFate = ownOutcomeResults.length > 0 && ownOutcomeResults.every((entry) => entry.controls);
  const canAdvanceWithHelp = ownOutcomeResults.some((entry) => entry.canAdvance);

  return {
    simulatedSeed: simulatedSeed?.seedNumber ?? null,
    simulatedStatus: scenarioStatus({
      controlsFate,
      projectedIn: Boolean(simulatedSeed),
      canAdvanceWithHelp
    })
  };
}

function scenarioStatus(input: {
  controlsFate: boolean;
  projectedIn: boolean;
  canAdvanceWithHelp: boolean;
}): ScenarioStatus {
  if (input.controlsFate) {
    return {
      confidence: "controls",
      label: "Controls fate",
      detail: "This result keeps the team in even if other remaining pod-play matches break against them."
    };
  }

  if (input.projectedIn) {
    return {
      confidence: "projected",
      label: "Projected in",
      detail: "This result has the team in if every other unfinished match stays neutral."
    };
  }

  if (input.canAdvanceWithHelp) {
    return {
      confidence: "needs-help",
      label: "Needs help",
      detail: "This result can still get the team in, but other remaining matches matter."
    };
  }

  return {
    confidence: "no-path",
    label: "No path found",
    detail: "No remaining-match combination in this model gets the team into the projected field."
  };
}

function statusForSeed(seed: QualifiedTeamSeed | undefined): ScenarioStatus {
  if (!seed) {
    return {
      confidence: "needs-help",
      label: "Outside looking in",
      detail: "Not currently in the projected playoff field."
    };
  }

  return {
    confidence: "projected",
    label: seed.qualifierType === "POD_WINNER" ? "Projected pod winner" : "Projected wild card",
    detail: `Currently projected as seed ${seed.seedNumber}.`
  };
}

function analyzeOwnPodOutcome(
  input: ScenarioInput,
  ownOutcome: PodOutcome,
  selectedTeamId: string,
  otherPodOutcomeSets: Array<[string, PodOutcome[]]>
) {
  if (ownOutcome.winnerTeamId === selectedTeamId) {
    return {
      controls: true,
      canAdvance: true,
      helpPods: new Set<string>(),
      helpTeams: new Set<string>()
    };
  }

  const selectedRow = ownOutcome.rows.find((row) => row.teamId === selectedTeamId);
  if (!selectedRow) {
    return {
      controls: false,
      canAdvance: false,
      helpPods: new Set<string>(),
      helpTeams: new Set<string>()
    };
  }

  const ownOutrankingCount = ownOutcome.rows.filter((row) =>
    row.teamId !== selectedTeamId &&
    row.teamId !== ownOutcome.winnerTeamId &&
    outranks(row, selectedRow)
  ).length;
  let bestOutrankingCount = ownOutrankingCount;
  let worstOutrankingCount = ownOutrankingCount;
  const helpPods = new Set<string>();
  const helpTeams = new Set<string>();

  for (const [podId, outcomes] of otherPodOutcomeSets) {
    const threat = summarizePodThreat(input, outcomes, selectedRow);
    bestOutrankingCount += threat.minOutranking;
    worstOutrankingCount += threat.maxOutranking;

    if (threat.maxOutranking > threat.minOutranking) {
      const podName = input.pods.find((pod) => pod.id === podId)?.name ?? podId;
      helpPods.add(podName);
    }

    for (const teamName of threat.helpTeams) {
      helpTeams.add(teamName);
    }
  }

  return {
    controls: worstOutrankingCount <= WILD_CARD_COUNT - 1,
    canAdvance: bestOutrankingCount <= WILD_CARD_COUNT - 1,
    helpPods,
    helpTeams
  };
}

function summarizePodThreat(input: ScenarioInput, outcomes: PodOutcome[], selectedRow: StandingsRow): PodThreatSummary {
  let minOutranking = Number.POSITIVE_INFINITY;
  let maxOutranking = 0;
  const helpTeams = new Set<string>();

  for (const outcome of outcomes) {
    const threats = outcome.rows.filter((row) =>
      row.teamId !== outcome.winnerTeamId && outranks(row, selectedRow)
    );
    minOutranking = Math.min(minOutranking, threats.length);
    maxOutranking = Math.max(maxOutranking, threats.length);

    for (const threat of threats) {
      const team = input.teams.find((candidate) => candidate.id === threat.teamId);
      helpTeams.add(team?.name ?? threat.teamName);
    }
  }

  return {
    minOutranking: Number.isFinite(minOutranking) ? minOutranking : 0,
    maxOutranking,
    helpTeams
  };
}

function buildPodOutcomeSets(input: ScenarioInput, override?: ScenarioOutcome) {
  const byPod = new Map<string, PodOutcome[]>();
  const remainingMatches = getRemainingMatches(input);

  for (const pod of input.pods) {
    const podMatches = remainingMatches.filter((match) => match.podId === pod.id);
    const outcomes = enumeratePodOutcomes(input, pod.id, podMatches, override);
    byPod.set(pod.id, outcomes);
  }

  return byPod;
}

function enumeratePodOutcomes(
  input: ScenarioInput,
  podId: string,
  matches: ScenarioMatch[],
  override?: ScenarioOutcome
): PodOutcome[] {
  const podRows = sortStandings(input.standings.filter((row) => row.podId === podId));
  const podMatches = matches.filter((match) => match.homeTeamId && match.awayTeamId);
  const outcomeChoices = podMatches.map((match) =>
    override && match.id === override.matchId ? [override] : enumerateMatchOutcomes(match)
  );
  const rowsBySignature = new Map<string, StandingsRow[]>();

  function visit(index: number, rows: StandingsRow[]) {
    if (rowsBySignature.size > MAX_POD_OUTCOMES) {
      return;
    }

    if (index >= outcomeChoices.length) {
      const sortedRows = sortStandings(rows);
      rowsBySignature.set(podSignature(sortedRows), sortedRows);
      return;
    }

    for (const outcome of outcomeChoices[index]) {
      visit(index + 1, applyOutcome(rows, outcome));
    }
  }

  visit(0, podRows);

  if (rowsBySignature.size === 0) {
    rowsBySignature.set(podSignature(podRows), podRows);
  }

  return [...rowsBySignature.values()].map((rows) => ({
    podId,
    rows,
    winnerTeamId: rows[0]?.teamId ?? null
  }));
}

function enumerateMatchOutcomes(match: ScenarioMatch): ScenarioOutcome[] {
  if (!match.homeTeamId || !match.awayTeamId) {
    return [];
  }

  return SCORE_VALUES.flatMap((homePoints) => {
    const legalHoles = legalHolesWonForPoints(homePoints);
    return legalHoles.map((homeHolesWon) => ({
      matchId: match.id,
      homeTeamId: match.homeTeamId!,
      awayTeamId: match.awayTeamId!,
      homePoints,
      awayPoints: 18 - homePoints,
      homeHolesWon,
      awayHolesWon: opponentHolesWonForScore(homePoints, homeHolesWon)
    }));
  });
}

function buildSelectedOutcome(
  match: ScenarioMatch,
  selectedTeamId: string,
  result: Required<Pick<ScenarioResultInput, "selectedTeamPoints" | "selectedTeamHolesWon">> &
    Pick<ScenarioResultInput, "selectedTeamNet" | "opponentNet">
): ScenarioOutcome {
  const opponentPoints = 18 - result.selectedTeamPoints;
  const opponentHolesWon = opponentHolesWonForScore(result.selectedTeamPoints, result.selectedTeamHolesWon);
  const selectedIsHome = match.homeTeamId === selectedTeamId;

  return {
    matchId: match.id,
    homeTeamId: match.homeTeamId!,
    awayTeamId: match.awayTeamId!,
    homePoints: selectedIsHome ? result.selectedTeamPoints : opponentPoints,
    awayPoints: selectedIsHome ? opponentPoints : result.selectedTeamPoints,
    homeHolesWon: selectedIsHome ? result.selectedTeamHolesWon : opponentHolesWon,
    awayHolesWon: selectedIsHome ? opponentHolesWon : result.selectedTeamHolesWon,
    homeNet: selectedIsHome ? result.selectedTeamNet : result.opponentNet,
    awayNet: selectedIsHome ? result.opponentNet : result.selectedTeamNet
  };
}

function applyOutcome(rows: StandingsRow[], outcome: ScenarioOutcome): StandingsRow[] {
  const nextRows = rows.map((row) => ({ ...row }));
  const home = nextRows.find((row) => row.teamId === outcome.homeTeamId);
  const away = nextRows.find((row) => row.teamId === outcome.awayTeamId);

  if (!home || !away) {
    return sortStandings(nextRows);
  }

  applyTeamOutcome(home, {
    points: outcome.homePoints,
    holesWon: outcome.homeHolesWon,
    resultCode: resultCodeFor(outcome.homePoints, outcome.awayPoints, true),
    net: outcome.homeNet
  });
  applyTeamOutcome(away, {
    points: outcome.awayPoints,
    holesWon: outcome.awayHolesWon,
    resultCode: resultCodeFor(outcome.awayPoints, outcome.homePoints, true),
    net: outcome.awayNet
  });

  return sortStandings(nextRows);
}

function applyTeamOutcome(
  row: StandingsRow,
  input: { points: number; holesWon: number; resultCode: MatchResultCode; net?: number | null }
) {
  row.matchesPlayed += 1;
  row.holePoints += input.points;
  row.holesWon += input.holesWon;

  if (input.resultCode === "WIN") {
    row.wins += 1;
    row.matchRecordPoints += 1;
  } else if (input.resultCode === "LOSS") {
    row.losses += 1;
  } else {
    row.ties += 1;
    row.matchRecordPoints += 0.5;
  }

  if (input.net != null && Number.isFinite(input.net)) {
    row.cumulativeNetBetterBall =
      row.cumulativeNetBetterBall == null
        ? input.net
        : row.cumulativeNetBetterBall + input.net;
  }
}

function projectPlayoffField(pods: ScenarioPod[], rows: StandingsRow[]) {
  const sortedPods = sortedRowsByPod(pods, rows);
  const podWinners = sortedPods
    .map(({ rows: podRows }) => podRows[0])
    .filter((row): row is StandingsRow => Boolean(row));
  const orderedPodWinners = sortStandings(podWinners);
  const podWinnerIds = new Set(orderedPodWinners.map((row) => row.teamId));
  const wildCardCandidates = sortStandings(rows.filter((row) => !podWinnerIds.has(row.teamId)));
  const projectedPodWinnerSeeds = orderedPodWinners.map((row, index) => seedFromRow(row, index + 1, "POD_WINNER"));
  const wildCardProjection = wildCardCandidates
    .slice(0, WILD_CARD_COUNT)
    .map((row, index) => seedFromRow(row, orderedPodWinners.length + index + 1, "WILD_CARD"));
  const wildCardBubble = wildCardCandidates
    .slice(WILD_CARD_COUNT, WILD_CARD_COUNT + 4)
    .map((row, index) =>
      seedFromRow(row, orderedPodWinners.length + WILD_CARD_COUNT + index + 1, "WILD_CARD")
    );

  return {
    projectedPlayoffField: [...projectedPodWinnerSeeds, ...wildCardProjection].slice(0, QUALIFIER_COUNT),
    wildCardProjection,
    wildCardBubble
  };
}

function seedFromRow(
  row: StandingsRow,
  seedNumber: number,
  qualifierType: QualifiedTeamSeed["qualifierType"]
): QualifiedTeamSeed {
  return {
    seedNumber,
    qualifierType,
    teamId: row.teamId,
    teamName: row.teamName,
    podId: row.podId
  };
}

function sortedRowsByPod(pods: ScenarioPod[], rows: StandingsRow[]) {
  return pods.map((pod) => ({
    pod,
    rows: sortStandings(rows.filter((row) => row.podId === pod.id))
  }));
}

function sortStandings(rows: StandingsRow[]) {
  return [...rows].sort(compareStandings);
}

function podRank(rows: StandingsRow[], teamId: string) {
  const row = rows.find((entry) => entry.teamId === teamId);
  if (!row) {
    return null;
  }

  const podRows = sortStandings(rows.filter((entry) => entry.podId === row.podId));
  const index = podRows.findIndex((entry) => entry.teamId === teamId);

  return index >= 0 ? index + 1 : null;
}

function podSignature(rows: StandingsRow[]) {
  return rows
    .map((row) => [
      row.teamId,
      row.matchesPlayed,
      row.wins,
      row.losses,
      row.ties,
      row.matchRecordPoints,
      row.holePoints,
      row.holesWon,
      row.cumulativeNetBetterBall ?? "x"
    ].join(":"))
    .join("|");
}

function getRemainingMatches(input: ScenarioInput) {
  return input.matches.filter((match) =>
    match.stage === "POD_PLAY" &&
    match.podId &&
    match.homeTeamId &&
    match.awayTeamId &&
    match.status !== "FINAL" &&
    match.status !== "FORFEIT"
  );
}

function getSeed(seeds: QualifiedTeamSeed[], teamId: string) {
  return seeds.find((seed) => seed.teamId === teamId);
}

function outranks(left: StandingsRow, right: StandingsRow) {
  return compareStandings(left, right) < 0;
}

function resultCodeFor(points: number, opponentPoints: number, allowTie: boolean): MatchResultCode {
  if (points > opponentPoints) {
    return "WIN";
  }

  if (points < opponentPoints) {
    return "LOSS";
  }

  return allowTie ? "TIE" : "LOSS";
}

function clampScore(value: number) {
  return Math.min(18, Math.max(0, Math.round(value * 2) / 2));
}

function clampHolesWon(points: number, holesWon?: number) {
  const legal = legalHolesWonForPoints(points);
  const fallback = defaultHolesWonForPoints(points);
  const requested = Number.isFinite(holesWon) ? Number(holesWon) : fallback;

  return Math.min(legal[legal.length - 1] ?? fallback, Math.max(legal[0] ?? 0, Math.round(requested)));
}

function opponentHolesWonForScore(points: number, holesWon: number) {
  return 18 - 2 * points + holesWon;
}
