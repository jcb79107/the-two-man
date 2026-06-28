import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { syncTournamentBracketTx } from "@/lib/server/bracket-sync";
import { db } from "@/lib/server/db";
import {
  OFFICIAL_RESULT_SNAPSHOT_VERSION,
  officialResultSnapshotToJson,
  type OfficialResultSnapshot
} from "@/lib/server/official-result-snapshot";

export const dynamic = "force-dynamic";

const MATCH_ID = "3f6fddaab09d4fc6801dc";
const COURSE_ID = `manual-course-${MATCH_ID}`;
const TEE_ID = `${COURSE_ID}-tee`;
const PLAYED_AT = new Date("2026-06-27T17:00:00.000Z");

const HOLES = [
  { holeNumber: 1, course: "Blue", par: 4, yardage: 390, strokeIndex: 9 },
  { holeNumber: 2, course: "Blue", par: 4, yardage: 360, strokeIndex: 11 },
  { holeNumber: 3, course: "Blue", par: 4, yardage: 398, strokeIndex: 5 },
  { holeNumber: 4, course: "Blue", par: 3, yardage: 213, strokeIndex: 15 },
  { holeNumber: 5, course: "Blue", par: 4, yardage: 380, strokeIndex: 7 },
  { holeNumber: 6, course: "Blue", par: 4, yardage: 310, strokeIndex: 13 },
  { holeNumber: 7, course: "Blue", par: 5, yardage: 521, strokeIndex: 1 },
  { holeNumber: 8, course: "Blue", par: 3, yardage: 182, strokeIndex: 17 },
  { holeNumber: 9, course: "Blue", par: 4, yardage: 422, strokeIndex: 3 },
  { holeNumber: 10, course: "White", par: 4, yardage: 390, strokeIndex: 10 },
  { holeNumber: 11, course: "White", par: 4, yardage: 392, strokeIndex: 6 },
  { holeNumber: 12, course: "White", par: 3, yardage: 196, strokeIndex: 14 },
  { holeNumber: 13, course: "White", par: 5, yardage: 502, strokeIndex: 8 },
  { holeNumber: 14, course: "White", par: 4, yardage: 341, strokeIndex: 12 },
  { holeNumber: 15, course: "White", par: 4, yardage: 418, strokeIndex: 2 },
  { holeNumber: 16, course: "White", par: 4, yardage: 291, strokeIndex: 18 },
  { holeNumber: 17, course: "White", par: 3, yardage: 203, strokeIndex: 16 },
  { holeNumber: 18, course: "White", par: 5, yardage: 548, strokeIndex: 4 }
];

const PLAYER_INPUT = {
  JB: {
    nameMatchers: ["jason", "baer"],
    handicapIndex: 10.3,
    courseHandicap: 12,
    playingHandicap: 0,
    matchStrokeCount: 0,
    strokeHoles: [],
    scores: [4, 5, 5, 5, 5, 7, 6, 3, 5, 5, 4, 4, 7, 4, 4, 3, 5, 6]
  },
  JC: {
    nameMatchers: ["jack", "cadden"],
    handicapIndex: 14.0,
    courseHandicap: 17,
    playingHandicap: 4,
    matchStrokeCount: 4,
    strokeHoles: [7, 9, 15, 18],
    scores: [6, 5, 5, 5, 5, 5, 8, 5, 7, 5, 6, 5, 8, 5, 5, 4, 5, 8]
  },
  ND: {
    nameMatchers: ["noah", "deutsch"],
    handicapIndex: 13.7,
    courseHandicap: 16,
    playingHandicap: 4,
    matchStrokeCount: 4,
    strokeHoles: [7, 9, 15, 18],
    scores: [6, 6, 6, 5, 6, 4, 6, 4, 5, 6, 6, 4, 8, 6, 7, 5, 5, 6]
  },
  RA: {
    nameMatchers: ["ross", "agins"],
    handicapIndex: 20.0,
    courseHandicap: 24,
    playingHandicap: 10,
    matchStrokeCount: 10,
    strokeHoles: [1, 3, 5, 7, 9, 10, 11, 13, 15, 18],
    scores: [5, 5, 7, 4, 5, 6, 6, 5, 6, 4, 6, 4, 8, 6, 6, 6, 5, 7]
  }
} as const;

type PlayerKey = keyof typeof PLAYER_INPUT;

function strokesByHole(strokeHoles: readonly number[] = []) {
  return Object.fromEntries(HOLES.map((hole) => [hole.holeNumber, strokeHoles.includes(hole.holeNumber) ? 1 : 0]));
}

function findRosterPlayer(
  roster: Array<{ player: { id: string; displayName: string } }>,
  key: PlayerKey
) {
  const matchers = PLAYER_INPUT[key].nameMatchers;
  return roster.find((entry) => {
    const name = entry.player.displayName.toLowerCase();
    return matchers.some((matcher) => name.includes(matcher));
  })?.player;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function resultCode(points: number, opponentPoints: number) {
  if (points > opponentPoints) return "WIN";
  if (points < opponentPoints) return "LOSS";
  return "TIE";
}

export async function POST() {
  const match = await db.match.findUnique({
    where: { id: MATCH_ID },
    include: {
      tournament: {
        select: {
          handicapAllowancePct: true,
          maxStrokesPerHole: true,
          forfeitPointsAwarded: true,
          forfeitHolesWonAwarded: true
        }
      },
      homeTeam: {
        include: {
          roster: {
            include: { player: true }
          }
        }
      },
      awayTeam: {
        include: {
          roster: {
            include: { player: true }
          }
        }
      }
    }
  });

  if (!match || !match.homeTeam || !match.awayTeam) {
    return NextResponse.json({ error: "Pod 1 Match 2 was not found or is missing teams." }, { status: 404 });
  }

  const homeTeamName = match.homeTeam.name;
  const awayTeamName = match.awayTeam.name;
  const jb = findRosterPlayer(match.homeTeam.roster, "JB");
  const jc = findRosterPlayer(match.homeTeam.roster, "JC");
  const nd = findRosterPlayer(match.awayTeam.roster, "ND");
  const ra = findRosterPlayer(match.awayTeam.roster, "RA");

  if (!jb || !jc || !nd || !ra) {
    return NextResponse.json({ error: "Could not resolve all four Pod 1 Match 2 players." }, { status: 409 });
  }

  const playerIds: Record<PlayerKey, string> = {
    JB: jb.id,
    JC: jc.id,
    ND: nd.id,
    RA: ra.id
  };
  const playerNames: Record<PlayerKey, string> = {
    JB: jb.displayName,
    JC: jc.displayName,
    ND: nd.displayName,
    RA: ra.displayName
  };
  const teamIds = {
    JB_JC: match.homeTeam.id,
    ND_RA: match.awayTeam.id
  };
  const winningTeamId = teamIds.ND_RA;

  const playerNetScoresByKey = Object.fromEntries(
    (Object.keys(PLAYER_INPUT) as PlayerKey[]).map((key) => {
      const input = PLAYER_INPUT[key];
      const strokes = strokesByHole(input.strokeHoles);
      return [
        key,
        input.scores.map((gross, index) => gross - (strokes[HOLES[index].holeNumber] ?? 0))
      ];
    })
  ) as Record<PlayerKey, number[]>;

  const homeGrossByHole = HOLES.map((_, index) => Math.min(PLAYER_INPUT.JB.scores[index], PLAYER_INPUT.JC.scores[index]));
  const awayGrossByHole = HOLES.map((_, index) => Math.min(PLAYER_INPUT.ND.scores[index], PLAYER_INPUT.RA.scores[index]));
  const homeNetByHole = HOLES.map((_, index) => Math.min(playerNetScoresByKey.JB[index], playerNetScoresByKey.JC[index]));
  const awayNetByHole = HOLES.map((_, index) => Math.min(playerNetScoresByKey.ND[index], playerNetScoresByKey.RA[index]));
  const holePoints = HOLES.map((hole, index) => {
    const homeWon = homeNetByHole[index] < awayNetByHole[index];
    const awayWon = awayNetByHole[index] < homeNetByHole[index];

    return {
      holeNumber: hole.holeNumber,
      teamPoints: {
        [teamIds.JB_JC]: homeWon ? 1 : awayWon ? 0 : 0.5,
        [teamIds.ND_RA]: awayWon ? 1 : homeWon ? 0 : 0.5
      },
      teamBetterBallGross: {
        [teamIds.JB_JC]: homeGrossByHole[index],
        [teamIds.ND_RA]: awayGrossByHole[index]
      },
      teamBetterBallNet: {
        [teamIds.JB_JC]: homeNetByHole[index],
        [teamIds.ND_RA]: awayNetByHole[index]
      },
      winningTeamId: homeWon ? teamIds.JB_JC : awayWon ? teamIds.ND_RA : null,
      playerNetScores: {
        [playerIds.JB]: playerNetScoresByKey.JB[index],
        [playerIds.JC]: playerNetScoresByKey.JC[index],
        [playerIds.ND]: playerNetScoresByKey.ND[index],
        [playerIds.RA]: playerNetScoresByKey.RA[index]
      },
      par: hole.par,
      strokeIndex: hole.strokeIndex,
      yardage: hole.yardage
    };
  });

  const homePoints = sum(holePoints.map((hole) => hole.teamPoints[teamIds.JB_JC]));
  const awayPoints = sum(holePoints.map((hole) => hole.teamPoints[teamIds.ND_RA]));
  const homeHolesWon = holePoints.filter((hole) => hole.winningTeamId === teamIds.JB_JC).length;
  const awayHolesWon = holePoints.filter((hole) => hole.winningTeamId === teamIds.ND_RA).length;

  const snapshot: OfficialResultSnapshot = {
    version: OFFICIAL_RESULT_SNAPSHOT_VERSION,
    generatedAt: new Date().toISOString(),
    winningTeamId,
    allowancePct: Number(match.tournament.handicapAllowancePct),
    maxStrokesPerHole: match.tournament.maxStrokesPerHole,
    lowPlayerId: playerIds.JB,
    teamSummaries: [
      {
        teamId: teamIds.JB_JC,
        totalPoints: homePoints,
        holesWon: homeHolesWon,
        betterBallGrossTotal: sum(homeGrossByHole),
        betterBallNetTotal: sum(homeNetByHole),
        resultCode: resultCode(homePoints, awayPoints)
      },
      {
        teamId: teamIds.ND_RA,
        totalPoints: awayPoints,
        holesWon: awayHolesWon,
        betterBallGrossTotal: sum(awayGrossByHole),
        betterBallNetTotal: sum(awayNetByHole),
        resultCode: resultCode(awayPoints, homePoints)
      }
    ],
    holes: holePoints,
    players: (Object.keys(PLAYER_INPUT) as PlayerKey[]).map((key) => {
      const input = PLAYER_INPUT[key];
      const strokes = strokesByHole(input.strokeHoles);
      return {
        playerId: playerIds[key],
        playerName: playerNames[key],
        teamId: key === "JB" || key === "JC" ? teamIds.JB_JC : teamIds.ND_RA,
        teeId: TEE_ID,
        teeName: "Blue/White",
        handicapIndex: input.handicapIndex,
        courseHandicap: input.courseHandicap,
        playingHandicap: input.playingHandicap,
        matchStrokeCount: input.matchStrokeCount,
        strokesByHole: strokes,
        grossByHole: Object.fromEntries(HOLES.map((hole, index) => [hole.holeNumber, input.scores[index]])),
        netByHole: Object.fromEntries(HOLES.map((hole, index) => [hole.holeNumber, playerNetScoresByKey[key][index]]))
      };
    }),
    holeMeta: HOLES.map((hole) => ({
      holeNumber: hole.holeNumber,
      par: hole.par,
      strokeIndex: hole.strokeIndex,
      yardage: hole.yardage
    }))
  };

  await db.$transaction(async (tx) => {
    await tx.course.upsert({
      where: { id: COURSE_ID },
      update: {
        name: "Northmoor Country Club",
        city: "Highland Park",
        state: "IL"
      },
      create: {
        id: COURSE_ID,
        providerKey: `manual:${MATCH_ID}`,
        name: "Northmoor Country Club",
        city: "Highland Park",
        state: "IL",
        country: "US"
      }
    });

    await tx.courseTee.upsert({
      where: {
        courseId_name: {
          courseId: COURSE_ID,
          name: "Blue/White"
        }
      },
      update: {
        gender: "MEN",
        par: 71,
        slope: 113,
        courseRating: new Prisma.Decimal("71.0")
      },
      create: {
        id: TEE_ID,
        courseId: COURSE_ID,
        providerKey: `manual:${MATCH_ID}:blue-white`,
        name: "Blue/White",
        gender: "MEN",
        par: 71,
        slope: 113,
        courseRating: new Prisma.Decimal("71.0")
      }
    });

    await tx.courseHole.deleteMany({
      where: { courseTeeId: TEE_ID }
    });
    await tx.courseHole.createMany({
      data: HOLES.map((hole) => ({
        id: `${TEE_ID}-hole-${hole.holeNumber}`,
        courseTeeId: TEE_ID,
        holeNumber: hole.holeNumber,
        par: hole.par,
        strokeIndex: hole.strokeIndex,
        yardage: hole.yardage
      }))
    });

    await tx.holeScore.deleteMany({
      where: { matchId: MATCH_ID }
    });
    await tx.matchPlayer.deleteMany({
      where: { matchId: MATCH_ID }
    });

    await tx.matchPlayer.createMany({
      data: (Object.keys(PLAYER_INPUT) as PlayerKey[]).map((key) => {
        const input = PLAYER_INPUT[key];
        return {
          id: `${MATCH_ID}-${playerIds[key]}`,
          matchId: MATCH_ID,
          playerId: playerIds[key],
          teamId: key === "JB" || key === "JC" ? teamIds.JB_JC : teamIds.ND_RA,
          teeId: TEE_ID,
          teeNameSnapshot: "Blue/White",
          handicapIndexSnapshot: new Prisma.Decimal(input.handicapIndex.toFixed(1)),
          slopeSnapshot: 113,
          courseRatingSnapshot: new Prisma.Decimal("71.0"),
          parSnapshot: 71,
          courseHandicap: input.courseHandicap,
          playingHandicap: input.playingHandicap,
          matchStrokeCount: input.matchStrokeCount,
          strokesByHole: strokesByHole(input.strokeHoles)
        };
      })
    });

    await tx.holeScore.createMany({
      data: (Object.keys(PLAYER_INPUT) as PlayerKey[]).flatMap((key) =>
        HOLES.map((hole, index) => ({
          id: `${MATCH_ID}-${playerIds[key]}-hole-${hole.holeNumber}`,
          matchId: MATCH_ID,
          playerId: playerIds[key],
          holeNumber: hole.holeNumber,
          grossScore: PLAYER_INPUT[key].scores[index]
        }))
      )
    });

    await tx.match.update({
      where: { id: MATCH_ID },
      data: {
        courseId: COURSE_ID,
        scheduledAt: PLAYED_AT,
        status: "FINAL",
        winningTeamId,
        submittedAt: new Date(),
        finalizedAt: new Date(),
        reopenedAt: null,
        isOverride: true,
        overrideNote: "Posted from commissioner-provided Pod 1 Match 2 scorecard on 2026-06-27.",
        officialResultSnapshot: officialResultSnapshotToJson(snapshot),
        officialResultSnapshotVersion: OFFICIAL_RESULT_SNAPSHOT_VERSION,
        officialResultSnapshotAt: new Date(snapshot.generatedAt)
      }
    });

    await tx.matchAuditLog.create({
      data: {
        id: nanoid(),
        matchId: MATCH_ID,
        action: "ADMIN_SCORECARD_OVERRIDE",
        actorLabel: "Commissioner",
        note: "Posted Pod 1 Match 2 from commissioner-provided scorecard JSON."
      }
    });

    await tx.activityFeedEvent.upsert({
      where: { id: `posted-${MATCH_ID}` },
      update: {
        occurredAt: new Date(),
        title: "Match completed",
        body: `${homeTeamName} vs ${awayTeamName} is now official.`,
        teamIds: [teamIds.JB_JC, teamIds.ND_RA],
        metadata: {
          roundLabel: match.roundLabel
        }
      },
      create: {
        id: `posted-${MATCH_ID}`,
        tournamentId: match.tournamentId,
        matchId: MATCH_ID,
        type: "MATCH_COMPLETED",
        occurredAt: new Date(),
        visibility: "PUBLIC",
        icon: "golf",
        title: "Match completed",
        body: `${homeTeamName} vs ${awayTeamName} is now official.`,
        teamIds: [teamIds.JB_JC, teamIds.ND_RA],
        metadata: {
          roundLabel: match.roundLabel
        }
      }
    });

    await syncTournamentBracketTx(tx, match.tournamentId);
  });

  return NextResponse.json({
    ok: true,
    matchId: MATCH_ID,
    roundLabel: match.roundLabel,
    result: `${awayTeamName} def. ${homeTeamName}, ${awayPoints}-${homePoints}`,
    winningTeamId,
    teamSummaries: snapshot.teamSummaries,
    publicUrl: `/tournament/the-two-man-2026/matches/${match.publicScorecardSlug}`
  });
}
