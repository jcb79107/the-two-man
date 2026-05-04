export type TournamentStatus = "DRAFT" | "ACTIVE" | "COMPLETE";
export type MatchStage = "POD_PLAY" | "QUARTERFINAL" | "SEMIFINAL" | "CHAMPIONSHIP";
export type MatchStatus =
  | "SCHEDULED"
  | "READY"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "FINAL"
  | "FORFEIT"
  | "REOPENED";
export type MatchResultCode =
  | "WIN"
  | "LOSS"
  | "TIE"
  | "FORFEIT_WIN"
  | "FORFEIT_LOSS";
export type BracketStage = Extract<
  MatchStage,
  "QUARTERFINAL" | "SEMIFINAL" | "CHAMPIONSHIP"
>;
export type AdvancementSlot = "HOME" | "AWAY";
export type ActivityFeedEventType =
  | "MATCH_COMPLETED"
  | "MATCH_SCHEDULED"
  | "MATCH_IN_PROGRESS"
  | "PLAYOFFS_SET"
  | "BRACKET_UPDATED"
  | "SEMIFINAL_LOCKED"
  | "CHAMPIONSHIP_SET";
export type HandicapSyncStatus =
  | "MANUAL"
  | "PENDING"
  | "SYNCED"
  | "FAILED"
  | "DISABLED";

export interface TournamentRuleSet {
  handicapAllowancePct: number;
  maxStrokesPerHole: number;
  forfeitPointsAwarded: number;
  forfeitHolesWonAwarded: number;
  tiebreakers: string[];
}

export interface TournamentSummary {
  id: string;
  name: string;
  slug: string;
  seasonYear: number;
  status: TournamentStatus;
  startDate: string;
  endDate: string;
  rules: TournamentRuleSet;
}

export interface PlayerProfile {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email?: string | null;
  handicapIndex: number;
  ghinNumber?: string | null;
  handicapSyncStatus?: HandicapSyncStatus;
  lastHandicapSyncAt?: string | null;
}

export interface TeamProfile {
  id: string;
  name: string;
  podId: string;
  players: PlayerProfile[];
}

export interface PodProfile {
  id: string;
  name: string;
  order: number;
  teamIds: string[];
}

export interface CourseHole {
  holeNumber: number;
  par: number;
  strokeIndex: number;
}

export interface CourseTee {
  id: string;
  courseId: string;
  name: string;
  gender: "MEN" | "WOMEN" | "OPEN";
  par: number;
  slope: number;
  courseRating: number;
  holes: CourseHole[];
}

export interface CourseProfile {
  id: string;
  name: string;
  city: string;
  state: string;
  tees: CourseTee[];
}

export interface MatchPlayerSelection {
  playerId: string;
  teamId: string;
  teeId: string;
}

export interface MatchShell {
  id: string;
  tournamentId: string;
  stage: MatchStage;
  status: MatchStatus;
  podId?: string | null;
  bracketId?: string | null;
  bracketRoundId?: string | null;
  roundLabel: string;
  scheduledAt: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  winningTeamId?: string | null;
  courseId?: string | null;
  courseName?: string | null;
  privateToken: string;
  publicScorecardSlug: string;
  homeSeedNumber?: number | null;
  awaySeedNumber?: number | null;
  homeSeedLabel?: string | null;
  awaySeedLabel?: string | null;
  advancesToMatchId?: string | null;
  advancesToSlot?: AdvancementSlot | null;
  resultLabel?: string | null;
}

export interface StandingsRow {
  teamId: string;
  teamName: string;
  podId: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  matchRecordPoints: number;
  holePoints: number;
  holesWon: number;
  cumulativeNetBetterBall: number | null;
}

export interface QualifiedTeamSeed {
  seedNumber: number;
  qualifierType: "POD_WINNER" | "WILD_CARD";
  teamId: string;
  teamName: string;
  podId: string;
}

export interface BracketRound {
  id: string;
  bracketId: string;
  label: string;
  stage: BracketStage;
  roundOrder: number;
  matchIds: string[];
}

export interface BracketSummary {
  id: string;
  tournamentId: string;
  label: string;
  qualifierCount: number;
  rounds: BracketRound[];
}

export interface ActivityFeedEvent {
  id: string;
  tournamentId: string;
  type: ActivityFeedEventType;
  occurredAt: string;
  icon: string;
  title: string;
  body: string;
  matchId?: string | null;
  teamIds: string[];
  metadata?: Record<string, string | number | boolean | null>;
}

export interface MatchInvitation {
  id: string;
  matchId: string;
  recipientEmail: string;
  token: string;
  sentAt?: string | null;
  openedAt?: string | null;
  claimedByPlayerId?: string | null;
}
