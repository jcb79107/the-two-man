import type { MatchResultCode } from "@/types/models";

export interface ScoringHole {
  holeNumber: number;
  par: number;
  strokeIndex: number;
}

export interface MatchPlayerInput {
  playerId: string;
  playerName: string;
  teamId: string;
  handicapIndex: number;
  teeId: string;
  teeName: string;
  slope: number;
  courseRating: number;
  par: number;
  holes: ScoringHole[];
}

export interface HoleScoreInput {
  holeNumber: number;
  scores: Record<string, number | null>;
}

export interface MatchScoringInput {
  allowancePct?: number;
  maxStrokesPerHole?: number;
  players: MatchPlayerInput[];
  holeScores: HoleScoreInput[];
}

export interface PlayerHandicapSnapshot {
  playerId: string;
  playerName: string;
  teamId: string;
  teeId: string;
  teeName: string;
  handicapIndex: number;
  courseHandicap: number;
  playingHandicap: number;
  matchStrokeCount: number;
  strokesByHole: Record<number, number>;
}

export interface MatchHoleResult {
  holeNumber: number;
  teamPoints: Record<string, number>;
  teamBetterBallGross: Record<string, number>;
  teamBetterBallNet: Record<string, number>;
  winningTeamId: string | null;
  playerNetScores: Record<string, number>;
}

export interface TeamMatchSummary {
  teamId: string;
  totalPoints: number;
  holesWon: number;
  betterBallGrossTotal: number | null;
  betterBallNetTotal: number | null;
  resultCode: MatchResultCode;
}

export interface MatchScoringResult {
  allowancePct: number;
  maxStrokesPerHole: number;
  lowPlayerId: string;
  winningTeamId: string | null;
  players: PlayerHandicapSnapshot[];
  holes: MatchHoleResult[];
  teamSummaries: TeamMatchSummary[];
}

export interface ForfeitScoringInput {
  winnerTeamId: string;
  loserTeamId: string;
  awardedPoints?: number;
  awardedHolesWon?: number;
}
