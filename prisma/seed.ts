import { Prisma, PrismaClient } from "@prisma/client";
import {
  demoActivityFeed,
  demoBracket,
  demoCourses,
  demoDetailedMatchInput,
  demoDetailedMatchResult,
  demoMatches,
  demoPods,
  demoTeams,
  demoTournament
} from "../src/lib/demo/mock-data";

const prisma = new PrismaClient();

function decimal(value: number) {
  return new Prisma.Decimal(value.toFixed(1));
}

async function main() {
  await prisma.activityFeedEvent.deleteMany();
  await prisma.matchInvitation.deleteMany();
  await prisma.externalSyncLog.deleteMany();
  await prisma.courseLookupCache.deleteMany();
  await prisma.matchAuditLog.deleteMany();
  await prisma.holeScore.deleteMany();
  await prisma.matchPlayer.deleteMany();
  await prisma.match.deleteMany();
  await prisma.bracketRound.deleteMany();
  await prisma.bracket.deleteMany();
  await prisma.podTeam.deleteMany();
  await prisma.teamPlayer.deleteMany();
  await prisma.pod.deleteMany();
  await prisma.team.deleteMany();
  await prisma.player.deleteMany();
  await prisma.courseHole.deleteMany();
  await prisma.courseTee.deleteMany();
  await prisma.course.deleteMany();
  await prisma.tournament.deleteMany();

  await prisma.tournament.create({
    data: {
      id: demoTournament.id,
      name: demoTournament.name,
      slug: demoTournament.slug,
      seasonYear: demoTournament.seasonYear,
      status: demoTournament.status,
      startDate: new Date(demoTournament.startDate),
      endDate: new Date(demoTournament.endDate),
      handicapAllowancePct: demoTournament.rules.handicapAllowancePct,
      maxStrokesPerHole: demoTournament.rules.maxStrokesPerHole,
      forfeitPointsAwarded: demoTournament.rules.forfeitPointsAwarded,
      forfeitHolesWonAwarded: demoTournament.rules.forfeitHolesWonAwarded
    }
  });

  await prisma.player.createMany({
    data: demoTeams.flatMap((team) =>
      team.players.map((player) => ({
        id: player.id,
        tournamentId: demoTournament.id,
        firstName: player.firstName,
        lastName: player.lastName,
        displayName: player.displayName,
        email: player.email ?? null,
        handicapIndex: decimal(player.handicapIndex),
        ghinNumber: player.ghinNumber,
        handicapSyncStatus: player.handicapSyncStatus ?? "MANUAL",
        lastHandicapSyncAt: player.lastHandicapSyncAt ? new Date(player.lastHandicapSyncAt) : null
      }))
    )
  });

  await prisma.team.createMany({
    data: demoTeams.map((team, index) => ({
      id: team.id,
      tournamentId: demoTournament.id,
      name: team.name,
      seedNumber: index + 1
    }))
  });

  await prisma.teamPlayer.createMany({
    data: demoTeams.flatMap((team) =>
      team.players.map((player, index) => ({
        teamId: team.id,
        playerId: player.id,
        rosterPosition: index + 1
      }))
    )
  });

  await prisma.pod.createMany({
    data: demoPods.map((pod) => ({
      id: pod.id,
      tournamentId: demoTournament.id,
      name: pod.name,
      podOrder: pod.order
    }))
  });

  await prisma.podTeam.createMany({
    data: demoPods.flatMap((pod) =>
      pod.teamIds.map((teamId, index) => ({
        podId: pod.id,
        teamId,
        slotNumber: index + 1
      }))
    )
  });

  for (const course of demoCourses) {
    await prisma.course.create({
      data: {
        id: course.id,
        name: course.name,
        city: course.city,
        state: course.state
      }
    });

    for (const tee of course.tees) {
      await prisma.courseTee.create({
        data: {
          id: tee.id,
          courseId: tee.courseId,
          name: tee.name,
          gender: tee.gender,
          par: tee.par,
          slope: tee.slope,
          courseRating: decimal(tee.courseRating)
        }
      });

      await prisma.courseHole.createMany({
        data: tee.holes.map((hole) => ({
          id: `${tee.id}-hole-${hole.holeNumber}`,
          courseTeeId: tee.id,
          holeNumber: hole.holeNumber,
          par: hole.par,
          strokeIndex: hole.strokeIndex
        }))
      });
    }
  }

  await prisma.bracket.create({
    data: {
      id: demoBracket.id,
      tournamentId: demoTournament.id,
      label: demoBracket.label,
      qualifierCount: demoBracket.qualifierCount
    }
  });

  await prisma.bracketRound.createMany({
    data: demoBracket.rounds.map((round) => ({
      id: round.id,
      bracketId: round.bracketId,
      label: round.label,
      stage: round.stage,
      roundOrder: round.roundOrder
    }))
  });

  await prisma.match.createMany({
    data: demoMatches.map((match) => ({
      id: match.id,
      tournamentId: match.tournamentId,
      podId: match.podId ?? null,
      bracketId: match.bracketId ?? null,
      bracketRoundId: match.bracketRoundId ?? null,
      courseId: match.courseId ?? null,
      stage: match.stage,
      status: match.status,
      roundLabel: match.roundLabel,
      scheduledAt: new Date(match.scheduledAt),
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      winningTeamId: match.winningTeamId ?? null,
      privateToken: match.privateToken,
      publicScorecardSlug: match.publicScorecardSlug,
      homeSeedNumber: match.homeSeedNumber ?? null,
      awaySeedNumber: match.awaySeedNumber ?? null,
      homeSeedLabel: match.homeSeedLabel ?? null,
      awaySeedLabel: match.awaySeedLabel ?? null,
      advancesToMatchId: match.advancesToMatchId ?? null,
      advancesToSlot: match.advancesToSlot ?? null,
      submittedAt:
        match.status === "FINAL" || match.status === "FORFEIT"
          ? new Date(match.scheduledAt)
          : null,
      finalizedAt:
        match.status === "FINAL" || match.status === "FORFEIT"
          ? new Date(match.scheduledAt)
          : null
    }))
  });

  await prisma.matchPlayer.createMany({
    data: demoDetailedMatchResult.players.map((player) => {
      const input = demoDetailedMatchInput.players.find(
        (candidate) => candidate.playerId === player.playerId
      );

      return {
        id: `${player.playerId}-selection`,
        matchId: "pod-a-match-1",
        playerId: player.playerId,
        teamId: player.teamId,
        teeId: player.teeId,
        teeNameSnapshot: player.teeName,
        handicapIndexSnapshot: decimal(player.handicapIndex),
        slopeSnapshot: input?.slope ?? 113,
        courseRatingSnapshot: decimal(input?.courseRating ?? 72),
        parSnapshot: input?.par ?? 72,
        courseHandicap: player.courseHandicap,
        playingHandicap: player.playingHandicap,
        matchStrokeCount: player.matchStrokeCount,
        strokesByHole: player.strokesByHole
      };
    })
  });

  await prisma.holeScore.createMany({
    data: demoDetailedMatchInput.holeScores.flatMap((hole) =>
      Object.entries(hole.scores).map(([playerId, grossScore]) => ({
        id: `${playerId}-hole-${hole.holeNumber}`,
        matchId: "pod-a-match-1",
        playerId,
        holeNumber: hole.holeNumber,
        grossScore: grossScore ?? 0
      }))
    )
  });

  await prisma.matchAuditLog.createMany({
    data: [
      {
        id: "audit-pod-a-final",
        matchId: "pod-a-match-1",
        action: "FINALIZED",
        actorLabel: "System seed",
        note: "Seeded official scorecard for local development."
      },
      {
        id: "audit-playoffs-set",
        matchId: "qf-1",
        action: "BRACKET_LOCKED",
        actorLabel: "System seed",
        note: "Seeded seeded quarterfinal bracket for local development."
      }
    ]
  });

  await prisma.matchInvitation.createMany({
    data: demoMatches.flatMap((match) => {
      const recipients = [match.homeTeamId, match.awayTeamId]
        .filter((teamId): teamId is string => Boolean(teamId))
        .flatMap((teamId) => (demoTeams.find((team) => team.id === teamId)?.players ?? []));

      return recipients.map((player) => ({
        id: `${match.id}-${player.id}-invite`,
        matchId: match.id,
        recipientPlayerId: player.id,
        claimedByPlayerId: null,
        recipientEmail: player.email ?? `${player.id}@fairwaymatch.dev`,
        token: `${match.privateToken}-${player.id}`
      }));
    })
  });

  await prisma.activityFeedEvent.createMany({
    data: demoActivityFeed.map((event) => ({
      id: event.id,
      tournamentId: event.tournamentId,
      matchId: event.matchId ?? null,
      type: event.type as any,
      occurredAt: new Date(event.occurredAt),
      visibility: "PUBLIC",
      icon: event.icon,
      title: event.title,
      body: event.body,
      teamIds: event.teamIds,
      metadata: event.metadata ?? Prisma.JsonNull
    }))
  });

  await prisma.externalSyncLog.createMany({
    data: demoTeams.flatMap((team) =>
      team.players.map((player) => ({
        id: `sync-${player.id}`,
        provider: "ghin-scrape",
        syncType: "HANDICAP_INDEX_LOOKUP",
        entityType: "PLAYER",
        entityId: player.id,
        status: "PENDING",
        requestPayload: { ghinNumber: player.ghinNumber ?? null },
        responsePayload: Prisma.JsonNull,
        errorMessage: null
      }))
    )
  });

  console.log("Seeded Fairway Match tournament foundation with bracket + feed data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
