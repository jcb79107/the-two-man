import { resolve } from "node:path";

export const TOURNAMENT_RULES_MARKDOWN_PATH = resolve(process.cwd(), "docs/tournament-rules.md");

export const TOURNAMENT_RULES_TEXT = `Overview
Format: 2-Man Team Tournament
Teams: 18
Structure: Pod Play -> Playoffs -> Champion
Season: May 1 - October 1

Timeline
May - June: Pod Match 1 & 2
July: Quarterfinals
August: Semifinals
September: Championship

Tournament Structure
18 teams are divided into 6 pods of 3 teams
Each team plays 2 pod matches
6 pod winners + 2 wild cards = 8-team playoff

Match Format
2-Man Net Better-Ball Match Play
Matches are 18 holes
Each player uses 90% of their Course Handicap
Course Handicap is based on:
Tee played
Course rating
Slope rating

Handicap Rules
Lowest handicap player plays off 0
Other players receive strokes based on the difference
Strokes are applied per scorecard handicap allocation

Stroke Limitation
Maximum of 1 stroke per hole per player

Pod Scoring System
Each hole is worth:
Win = 1 point
Tie = 0.5 points (each team)
Loss = 0 points
Teams accumulate points across both pod matches.

Pod Standings
Teams are ranked by:
Match Record
Total Hole Points
Total Holes Won
Lowest Cumulative Net Better-Ball Score
Coin flip

Wild Card Qualification
The top 2 non-pod winners advance to playoffs.

Playoff Seeding
Seeds 1-6 (Pod Winners)
Seeds 7-8 (Wild Cards)
Bracket: 1 vs 8, 2 vs 7, 3 vs 6, 4 vs 5
Higher seed picks the playoff course.

Playoff Match Tiebreaker
Sudden death playoff if feasible, otherwise net scorecard playoff from hole 18 backward, then coin flip.

Forfeit Policy
Win awarded to opponent
Winning team receives 12 hole points and +6 holes won
No best-ball score recorded

Score Submission
Teams must submit the match result, total hole points, total holes won, net better-ball score, scorecard, and post the match score to GHIN.`;

export const TOURNAMENT_RULE_HIGHLIGHTS = {
  fieldSize: 18,
  pods: 6,
  teamsPerPod: 3,
  handicapAllowancePct: 0.9,
  maxStrokesPerHole: 1,
  playoffBracket: ["1 vs 8", "2 vs 7", "3 vs 6", "4 vs 5"],
  podTiebreakers: [
    "Match Record",
    "Total Hole Points",
    "Total Holes Won",
    "Lowest Cumulative Net Better-Ball Score",
    "Coin flip"
  ],
  wildcardTiebreakers: [
    "Match Record",
    "Total Hole Points",
    "Total Holes Won",
    "Net Better-Ball Score",
    "Coin flip"
  ],
  playoffNotes: {
    higherSeedPicksCourse: true,
    tiedAfter18: [
      "Sudden death playoff (if feasible)",
      "Net scorecard playoff (holes 18 backward)",
      "Coin flip"
    ]
  },
  forfeit: {
    holePointsAwarded: 12,
    holesWonAwarded: 6,
    recordsBestBallScore: false
  },
  scoreSubmission: {
    requiresMatchResult: true,
    requiresHolePoints: true,
    requiresHolesWon: true,
    requiresNetBetterBallScore: true,
    requiresScorecard: true,
    requiresGhinPosting: true
  }
} as const;
