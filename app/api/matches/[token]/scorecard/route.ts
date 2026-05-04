import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { buildMatchPlayerSnapshots, scoreMatch } from "@/lib/scoring/engine";
import type { MatchPlayerInput } from "@/lib/scoring/types";
import { isAdminAuthenticated } from "@/lib/server/admin-auth";
import { syncTournamentBracketTx } from "@/lib/server/bracket-sync";
import { hydrateTeeHolesFromSiblings } from "@/lib/server/course-catalog";
import { db } from "@/lib/server/db";
import { getPrivateMatchRecordByToken } from "@/lib/server/matches";

function decimal(value: number) {
  return new Prisma.Decimal(value.toFixed(1));
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

const MANUAL_COURSE_ID = "__manual_course__";
const MANUAL_TEE_ID = "__manual_tee__";

function validateHoleOverrides(
  input: unknown
): Array<{
  teeId: string;
  holes: Array<{
    holeNumber: number;
    par: number;
    strokeIndex: number;
  }>;
}> {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.map((entry) => {
    const teeId = String((entry as { teeId?: unknown })?.teeId ?? "");
    const holesRaw = Array.isArray((entry as { holes?: unknown[] })?.holes)
      ? ((entry as { holes?: unknown[] }).holes ?? [])
      : [];
    const holes = holesRaw.map((hole) => ({
      holeNumber: Number((hole as { holeNumber?: unknown })?.holeNumber),
      par: Number((hole as { par?: unknown })?.par),
      strokeIndex: Number((hole as { strokeIndex?: unknown })?.strokeIndex)
    }));

    if (!teeId || holes.length !== 18) {
      throw new Error("Each tee must include 18 manual hole entries.");
    }

    const holeNumbers = new Set(holes.map((hole) => hole.holeNumber));
    const strokeIndexes = new Set(holes.map((hole) => hole.strokeIndex));

    if (holeNumbers.size !== 18 || strokeIndexes.size !== 18) {
      throw new Error("Manual hole setup must include unique hole numbers and stroke indexes from 1 to 18.");
    }

    for (const hole of holes) {
      if (
        !Number.isInteger(hole.holeNumber) ||
        hole.holeNumber < 1 ||
        hole.holeNumber > 18 ||
        !Number.isInteger(hole.par) ||
        hole.par < 3 ||
        hole.par > 6 ||
        !Number.isInteger(hole.strokeIndex) ||
        hole.strokeIndex < 1 ||
        hole.strokeIndex > 18
      ) {
        throw new Error("Manual hole setup must use valid par values and stroke indexes.");
      }
    }

    return {
      teeId,
      holes: holes.sort((left, right) => left.holeNumber - right.holeNumber)
    };
  });
}

function validateManualCourse(input: unknown) {
  if (!input || typeof input !== "object") {
    throw new Error("Manual course setup is missing.");
  }

  const source = input as {
    name?: unknown;
    city?: unknown;
    state?: unknown;
    teeName?: unknown;
    courseRating?: unknown;
    slope?: unknown;
    holes?: unknown;
  };
  const name = String(source.name ?? "").trim();
  const city = String(source.city ?? "").trim();
  const state = String(source.state ?? "").trim().toUpperCase().slice(0, 2);
  const teeName = String(source.teeName ?? "").trim();
  const courseRating = Number(source.courseRating);
  const slope = Number(source.slope);
  const holes = validateHoleOverrides([
    {
      teeId: MANUAL_TEE_ID,
      holes: source.holes
    }
  ])[0]?.holes;

  if (!name) {
    throw new Error("Manual course setup needs a course name.");
  }

  if (!teeName) {
    throw new Error("Manual course setup needs a tee name.");
  }

  if (!Number.isFinite(courseRating) || courseRating < 50 || courseRating > 85) {
    throw new Error("Manual course setup needs a valid course rating.");
  }

  if (!Number.isInteger(slope) || slope < 55 || slope > 155) {
    throw new Error("Manual course setup needs a valid slope rating.");
  }

  const par = holes.reduce((total, hole) => total + hole.par, 0);

  return {
    name,
    city: city || null,
    state: state || null,
    teeName,
    courseRating,
    slope,
    par,
    holes
  };
}

async function loadMatchForUpdate(token: string) {
  return db.match.findUnique({
    where: {
      privateToken: token
    },
    include: {
      homeTeam: {
        include: {
          roster: {
            include: {
              player: true
            }
          }
        }
      },
      awayTeam: {
        include: {
          roster: {
            include: {
              player: true
            }
          }
        }
      },
      playerSelections: {
        include: {
          tee: {
            include: {
              holes: {
                orderBy: {
                  holeNumber: "asc"
                }
              }
            }
          },
          player: true
        }
      }
    }
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const data = await getPrivateMatchRecordByToken(token);

  if (!data) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;

  try {
    const body = await request.json();
    const action = String(body?.action ?? "");
    const requestedAdminOverride = body?.adminOverride === true;
    const playoffWinnerTeamId =
      typeof body?.playoffWinnerTeamId === "string" ? body.playoffWinnerTeamId : null;
    const match = await loadMatchForUpdate(token);

    if (!match || !match.homeTeam || !match.awayTeam) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const homeTeam = match.homeTeam;
    const awayTeam = match.awayTeam;
    const isPublishedStatus =
      match.status === "FINAL" || match.status === "SUBMITTED" || match.status === "FORFEIT";
    const hasAdminSession = requestedAdminOverride ? await isAdminAuthenticated() : false;
    const isAdminOverrideSession =
      requestedAdminOverride &&
      hasAdminSession &&
      (isPublishedStatus || (match.status === "REOPENED" && match.isOverride));

    if (isPublishedStatus && action !== "read" && !isAdminOverrideSession) {
      return badRequest("This scorecard has already been published. Only the admin can reopen it.");
    }

    const rosterPlayers = [
      ...homeTeam.roster.map((entry) => ({
        playerId: entry.player.id,
        playerName: entry.player.displayName,
        teamId: homeTeam.id
      })),
      ...awayTeam.roster.map((entry) => ({
        playerId: entry.player.id,
        playerName: entry.player.displayName,
        teamId: awayTeam.id
      }))
    ];
    const rosterIds = new Set(rosterPlayers.map((player) => player.playerId));

    if (action === "setup") {
      let courseId = String(body?.courseId ?? "").trim();
      let players = Array.isArray(body?.players)
        ? (body.players as Array<{ playerId?: unknown; handicapIndex?: unknown; teeId?: unknown }>)
        : [];
      const teeHoleOverrides = validateHoleOverrides(body?.teeHoleOverrides);

      if (!courseId) {
        return badRequest("Course is required.");
      }

      if (players.length !== 4) {
        return badRequest("All four players must be configured.");
      }

      const uniquePlayerIds = new Set(players.map((player) => String(player?.playerId ?? "")));

      if (uniquePlayerIds.size !== 4) {
        return badRequest("Setup must include four distinct players.");
      }

      if (players.some((player) => !rosterIds.has(String(player?.playerId ?? "")))) {
        return badRequest("Setup contains a player who is not part of this match.");
      }

      if (courseId === MANUAL_COURSE_ID) {
        const manualCourse = validateManualCourse(body?.manualCourse);
        const manualCourseId = `manual-course-${match.id}`;
        const manualTeeId = `${manualCourseId}-tee`;

        await db.course.upsert({
          where: {
            id: manualCourseId
          },
          update: {
            name: manualCourse.name,
            city: manualCourse.city,
            state: manualCourse.state
          },
          create: {
            id: manualCourseId,
            providerKey: `manual:${match.id}`,
            name: manualCourse.name,
            city: manualCourse.city,
            state: manualCourse.state,
            country: "US"
          }
        });

        await db.courseTee.upsert({
          where: {
            courseId_name: {
              courseId: manualCourseId,
              name: manualCourse.teeName
            }
          },
          update: {
            gender: "MEN",
            par: manualCourse.par,
            slope: manualCourse.slope,
            courseRating: decimal(manualCourse.courseRating)
          },
          create: {
            id: manualTeeId,
            courseId: manualCourseId,
            providerKey: `manual:${match.id}:tee`,
            name: manualCourse.teeName,
            gender: "MEN",
            par: manualCourse.par,
            slope: manualCourse.slope,
            courseRating: decimal(manualCourse.courseRating)
          }
        });

        await db.courseHole.deleteMany({
          where: {
            courseTeeId: manualTeeId
          }
        });

        await db.courseHole.createMany({
          data: manualCourse.holes.map((hole) => ({
            id: `${manualTeeId}-hole-${hole.holeNumber}`,
            courseTeeId: manualTeeId,
            holeNumber: hole.holeNumber,
            par: hole.par,
            strokeIndex: hole.strokeIndex
          }))
        });

        courseId = manualCourseId;
        players = players.map((player) => ({
          ...player,
          teeId: String(player?.teeId ?? "") === MANUAL_TEE_ID ? manualTeeId : player.teeId
        }));
      }

      const teeIds = players.map((player) => String(player?.teeId ?? ""));

      const course = await db.course.findUnique({
        where: {
          id: courseId
        },
        include: {
          tees: {
            where: {
              id: {
                in: teeIds
              }
            },
            include: {
              holes: {
                orderBy: {
                  holeNumber: "asc"
                }
              }
            }
          }
        }
      });

      if (!course) {
        return badRequest("Selected course was not found.");
      }

      const teeById = new Map(course.tees.map((tee) => [tee.id, tee]));
      const resolvedHolesByTeeId = new Map(
        course.tees.map((tee) => [tee.id, hydrateTeeHolesFromSiblings(tee, course.tees)])
      );
      const overrideByTeeId = new Map(teeHoleOverrides.map((entry) => [entry.teeId, entry.holes]));
      const inputPlayers: MatchPlayerInput[] = players.map((player) => {
        const playerId = String(player?.playerId ?? "");
        const teeId = String(player?.teeId ?? "");
        const handicapIndex = Number(player?.handicapIndex);
        const rosterPlayer = rosterPlayers.find((entry) => entry.playerId === playerId);
        const tee = teeById.get(teeId);

        if (!rosterPlayer || !tee) {
          throw new Error("Every player must have a valid tee selected.");
        }

        if (!Number.isFinite(handicapIndex) || handicapIndex < 0 || handicapIndex > 54) {
          throw new Error(`Handicap Index for ${rosterPlayer.playerName} must be between 0 and 54.`);
        }

        const hydratedHoles = resolvedHolesByTeeId.get(tee.id) ?? [];
        const holes =
          hydratedHoles.length === 18
            ? hydratedHoles.map((hole) => ({
                holeNumber: hole.holeNumber,
                par: hole.par,
                strokeIndex: hole.strokeIndex
              }))
            : overrideByTeeId.get(tee.id) ?? [];

        if (holes.length !== 18) {
          throw new Error(
            `Enter the 18 hole pars and handicap allocations for the ${tee.name} tee set before generating the scorecard.`
          );
        }

        return {
          playerId,
          playerName: rosterPlayer.playerName,
          teamId: rosterPlayer.teamId,
          handicapIndex,
          teeId: tee.id,
          teeName: tee.name,
          slope: tee.slope,
          courseRating: Number(tee.courseRating),
          par: tee.par,
          holes
        };
      });

      const preview = buildMatchPlayerSnapshots({
        players: inputPlayers
      });

      await db.$transaction(async (tx) => {
        for (const override of teeHoleOverrides) {
          const tee = teeById.get(override.teeId);

          const teeHoles = resolvedHolesByTeeId.get(override.teeId) ?? tee?.holes ?? [];

          if (!tee || teeHoles.length === 18) {
            continue;
          }

          await tx.courseHole.deleteMany({
            where: {
              courseTeeId: tee.id
            }
          });

          await tx.courseHole.createMany({
            data: override.holes.map((hole) => ({
              id: `${tee.id}-hole-${hole.holeNumber}`,
              courseTeeId: tee.id,
              holeNumber: hole.holeNumber,
              par: hole.par,
              strokeIndex: hole.strokeIndex
            }))
          });
        }

        await tx.holeScore.deleteMany({
          where: {
            matchId: match.id
          }
        });

        await tx.matchPlayer.deleteMany({
          where: {
            matchId: match.id
          }
        });

        await tx.match.update({
          where: {
            id: match.id
          },
          data: {
            courseId,
            status: "READY",
            winningTeamId: null,
            submittedAt: null,
            finalizedAt: null
          }
        });

        await tx.matchPlayer.createMany({
          data: preview.players.map((playerSnapshot) => {
            const tee = teeById.get(playerSnapshot.teeId);

            if (!tee) {
              throw new Error("A selected tee could not be loaded.");
            }

            return {
              id: `${match.id}-${playerSnapshot.playerId}`,
              matchId: match.id,
              playerId: playerSnapshot.playerId,
              teamId: playerSnapshot.teamId,
              teeId: playerSnapshot.teeId,
              teeNameSnapshot: playerSnapshot.teeName,
              handicapIndexSnapshot: decimal(playerSnapshot.handicapIndex),
              slopeSnapshot: tee.slope,
              courseRatingSnapshot: decimal(Number(tee.courseRating)),
              parSnapshot: tee.par,
              courseHandicap: playerSnapshot.courseHandicap,
              playingHandicap: playerSnapshot.playingHandicap,
              matchStrokeCount: playerSnapshot.matchStrokeCount,
              strokesByHole: playerSnapshot.strokesByHole
            };
          })
        });
      });
    } else if (action === "saveDraft" || action === "publish") {
      if (match.playerSelections.length !== 4) {
        return badRequest("Finish the round setup before entering scores.");
      }

      const scores = Array.isArray(body?.scores)
        ? (body.scores as Array<{ holeNumber?: unknown; scores?: Record<string, unknown> }>)
        : [];
      const playerIds = match.playerSelections.map((selection) => selection.playerId);

      if (scores.length === 0) {
        return badRequest("No scores were submitted.");
      }

      const persistedRows: Array<{
        id: string;
        matchId: string;
        playerId: string;
        holeNumber: number;
        grossScore: number;
      }> = [];

      for (const hole of scores) {
        const holeNumber = Number(hole?.holeNumber);
        const values = hole?.scores ?? {};

        if (!Number.isInteger(holeNumber) || holeNumber < 1) {
          return badRequest("Each score row must include a valid hole number.");
        }

        for (const playerId of playerIds) {
          const rawValue = values[playerId];

          if (rawValue == null || rawValue === "") {
            if (action === "publish") {
              return badRequest("All 18 holes must be filled in before publishing.");
            }

            continue;
          }

          const grossScore = Number(rawValue);

          if (!Number.isInteger(grossScore) || grossScore < 1 || grossScore > 20) {
            return badRequest("Gross scores must be whole numbers between 1 and 20.");
          }

          persistedRows.push({
            id: `${match.id}-${playerId}-hole-${holeNumber}`,
            matchId: match.id,
            playerId,
            holeNumber,
            grossScore
          });
        }
      }

      await db.$transaction(async (tx) => {
        await tx.holeScore.deleteMany({
          where: {
            matchId: match.id
          }
        });

        if (persistedRows.length > 0) {
          await tx.holeScore.createMany({
            data: persistedRows
          });
        }

        if (action === "publish") {
          const inputs: MatchPlayerInput[] = match.playerSelections.map((selection) => ({
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
          }));
          const holeTemplate = match.playerSelections[0]?.tee.holes ?? [];

          const fullScorecard = scoreMatch({
            players: inputs,
            holeScores: holeTemplate.map((hole) => ({
              holeNumber: hole.holeNumber,
              scores: Object.fromEntries(
                playerIds.map((playerId) => {
                  const saved = persistedRows.find(
                    (row) => row.playerId === playerId && row.holeNumber === hole.holeNumber
                  );

                  return [playerId, saved?.grossScore ?? null];
                })
              )
            }))
          });

          const resolvedWinningTeamId = fullScorecard.winningTeamId ?? playoffWinnerTeamId;

          if (
            match.stage !== "POD_PLAY" &&
            (!resolvedWinningTeamId ||
              ![homeTeam.id, awayTeam.id].includes(resolvedWinningTeamId))
          ) {
            throw new Error(
              "Playoff matches cannot finish tied. Use the tiebreaker and then choose the winner before publishing."
            );
          }

          await tx.match.update({
            where: {
              id: match.id
            },
            data: {
              scheduledAt: new Date(),
              status: "FINAL",
              winningTeamId: resolvedWinningTeamId,
              submittedAt: new Date(),
              finalizedAt: new Date(),
              reopenedAt: null,
              isOverride: isAdminOverrideSession,
              overrideNote: isAdminOverrideSession ? "Published as an admin scorecard override." : match.overrideNote
            }
          });

          if (isAdminOverrideSession) {
            await tx.matchAuditLog.create({
              data: {
                id: nanoid(),
                matchId: match.id,
                action: "ADMIN_SCORECARD_OVERRIDE",
                actorLabel: "Commissioner",
                note: "Published corrected scorecard from admin."
              }
            });
          } else {
            await tx.activityFeedEvent.create({
              data: {
                id: nanoid(),
                tournamentId: match.tournamentId,
                matchId: match.id,
                type: "MATCH_COMPLETED",
                occurredAt: new Date(),
                visibility: "PUBLIC",
                icon: "🏌️",
                title: "Match completed",
                body: `${homeTeam.name} vs ${awayTeam.name} is now official.`,
                teamIds: [homeTeam.id, awayTeam.id],
                metadata: {
                  roundLabel: match.roundLabel
                }
              }
            });
          }

          await syncTournamentBracketTx(tx, match.tournamentId);
        } else {
          await tx.match.update({
            where: {
              id: match.id
            },
            data: {
              status: isAdminOverrideSession ? "REOPENED" : "IN_PROGRESS",
              reopenedAt: isAdminOverrideSession ? new Date() : match.reopenedAt,
              finalizedAt: isAdminOverrideSession ? null : match.finalizedAt,
              submittedAt: isAdminOverrideSession ? null : match.submittedAt,
              winningTeamId: isAdminOverrideSession ? null : match.winningTeamId,
              isOverride: isAdminOverrideSession ? true : match.isOverride,
              overrideNote: isAdminOverrideSession ? "Admin override draft in progress." : match.overrideNote
            }
          });

          if (isAdminOverrideSession) {
            await tx.matchAuditLog.create({
              data: {
                id: nanoid(),
                matchId: match.id,
                action: "ADMIN_OVERRIDE_DRAFT",
                actorLabel: "Commissioner",
                note: "Saved scorecard correction draft from admin."
              }
            });
          }
        }
      });
    } else {
      return badRequest("Unsupported scorecard action.");
    }

    const fresh = await getPrivateMatchRecordByToken(token);

    if (!fresh) {
      return NextResponse.json({ error: "Updated match could not be loaded." }, { status: 500 });
    }

    return NextResponse.json(fresh);
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Failed to update scorecard.");
  }
}
