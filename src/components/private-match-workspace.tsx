"use client";

import { Fragment, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ROUTES } from "@/lib/api/routes";
import {
  RULES_JUDGE_LABEL,
  RULES_JUDGE_URL
} from "@/lib/content/rules-judge";
import type { PrivateMatchView } from "@/lib/server/matches";

interface PrivateMatchWorkspaceProps {
  initialData: PrivateMatchView;
  pageMode: "setup" | "scorecard";
  adminMode?: boolean;
}

type ManualHoleInput = {
  holeNumber: number;
  par: string;
  strokeIndex: string;
};

type LocalDraftPayload = {
  courseId: string;
  setupPlayers: Array<{ playerId: string; handicapIndex: string; teeId: string }>;
  manualTeeHoles: Record<string, ManualHoleInput[]>;
  scoreRows: Array<{
    holeNumber: number;
    scores: Record<string, string>;
  }>;
  savedAt: string;
};

function buildHoleTemplate(
  existingHoles: Array<{ holeNumber: number; par: number; strokeIndex: number; yardage?: number }>
): ManualHoleInput[] {
  if (existingHoles.length === 18) {
    return existingHoles.map((hole) => ({
      holeNumber: hole.holeNumber,
      par: String(hole.par),
      strokeIndex: String(hole.strokeIndex)
    }));
  }

  return Array.from({ length: 18 }, (_, index) => ({
    holeNumber: index + 1,
    par: "",
    strokeIndex: ""
  }));
}

function mergeCourses(
  currentCourses: PrivateMatchView["courses"],
  incomingCourses: PrivateMatchView["courses"]
) {
  const merged = new Map(currentCourses.map((course) => [course.id, course]));

  for (const course of incomingCourses) {
    merged.set(course.id, course);
  }

  return Array.from(merged.values()).sort((left, right) => left.name.localeCompare(right.name));
}

function buildMissingTeeHoleState(
  courses: PrivateMatchView["courses"],
  courseId: string,
  setupPlayers: Array<{ playerId: string; handicapIndex: string; teeId: string }>
) {
  const course = courses.find((entry) => entry.id === courseId);

  if (!course) {
    return {} as Record<string, ManualHoleInput[]>;
  }

  const requiredTeeIds = new Set(setupPlayers.map((player) => player.teeId).filter(Boolean));

  return Object.fromEntries(
    course.tees
      .filter((tee) => requiredTeeIds.has(tee.id) && tee.holes.length !== 18)
      .map((tee) => [tee.id, buildHoleTemplate(tee.holes)])
  );
}

function hasCompletedManualHoleInputs(holes: ManualHoleInput[] | undefined) {
  if (!holes || holes.length !== 18) {
    return false;
  }

  const pars = holes.map((hole) => Number(hole.par));
  const strokeIndexes = holes.map((hole) => Number(hole.strokeIndex));

  if (
    pars.some((value) => !Number.isInteger(value) || value < 3 || value > 6) ||
    strokeIndexes.some((value) => !Number.isInteger(value) || value < 1 || value > 18)
  ) {
    return false;
  }

  return new Set(strokeIndexes).size === 18;
}

function scoreStyleForValue(score: string, par: number | undefined, compact = false) {
  const gross = Number(score);

  if (!score || !Number.isFinite(gross) || par == null) {
    return "rounded-none border-2 border-[#b9b9b9] bg-white text-ink";
  }

  const delta = gross - par;

  if (delta <= -2) {
    return compact
      ? "rounded-full border-[1.5px] border-[#7b7b7b] bg-white text-ink shadow-[0_0_0_2px_white,0_0_0_3.5px_#7b7b7b]"
      : "rounded-full border-[3px] border-[#7b7b7b] bg-white text-ink shadow-[inset_0_0_0_4px_white,inset_0_0_0_7px_#7b7b7b]";
  }

  if (delta === -1) {
    return "rounded-full border-[3px] border-[#7b7b7b] bg-white text-ink";
  }

  if (delta === 0) {
    return "rounded-none border-2 border-transparent bg-white text-ink shadow-none";
  }

  if (delta === 1) {
    return "rounded-none border-[3px] border-[#7b7b7b] bg-white text-ink";
  }

  return compact
    ? "rounded-none border-[1.5px] border-[#7b7b7b] bg-white text-ink shadow-[0_0_0_2px_white,0_0_0_3.5px_#7b7b7b]"
    : "rounded-none border-[3px] border-[#7b7b7b] bg-white text-ink shadow-[inset_0_0_0_4px_white,inset_0_0_0_7px_#7b7b7b]";
}

function getTeamBroadcastStyles(teamIndex: number) {
  return teamIndex % 2 === 0
    ? {
        header: "bg-pine text-white",
        mutedHeader: "bg-[#edf5ef] text-pine border-pine/20",
        accentText: "text-pine",
        accentBorder: "border-pine/25",
        accentSurface: "bg-[#edf5ef]",
        bestBall: "bg-white border-pine text-pine",
        bestBallStrong: "bg-pine text-white border-pine",
        teamNetRowFill: "bg-[rgba(18,76,58,0.5)] text-pine"
      }
    : {
        header: "bg-[#5f4b8b] text-white",
        mutedHeader: "bg-[#f0ebfb] text-[#4f3e75] border-[#cfc3ea]",
        accentText: "text-[#4f3e75]",
        accentBorder: "border-[#cfc3ea]",
        accentSurface: "bg-[#f7f4fd]",
        bestBall: "bg-white border-[#5f4b8b] text-[#4f3e75]",
        bestBallStrong: "bg-[#5f4b8b] text-white border-[#5f4b8b]",
        teamNetRowFill: "bg-[rgba(95,75,139,0.5)] text-[#4f3e75]"
      };
}

function parseEnteredScore(score: string | null | undefined) {
  if (score == null || score === "") {
    return null;
  }

  const parsed = Number(score);

  return Number.isFinite(parsed) ? parsed : null;
}

export function PrivateMatchWorkspace({
  initialData,
  pageMode,
  adminMode = false
}: PrivateMatchWorkspaceProps) {
  const initialSerializedScoreRows = JSON.stringify(
    initialData.holeInputs.map((hole) => ({
      holeNumber: hole.holeNumber,
      scores: Object.fromEntries(
        Object.entries(hole.scores).map(([playerId, value]) => [playerId, value == null ? "" : String(value)])
      )
    }))
  );
  const router = useRouter();
  const pathname = usePathname();
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastServerSavedScoreRowsRef = useRef(initialSerializedScoreRows);
  const hasRestoredDraftRef = useRef(false);
  const [data, setData] = useState(initialData);
  const [courseId, setCourseId] = useState(
    initialData.match.courseId ?? initialData.courses[0]?.id ?? ""
  );
  const [courseSearchResults, setCourseSearchResults] = useState<PrivateMatchView["courses"]>([]);
  const [setupPlayers, setSetupPlayers] = useState(
    initialData.players.map((player) => ({
      playerId: player.playerId,
      handicapIndex: player.teeId ? (player.handicapIndex != null ? String(player.handicapIndex) : "") : "",
      teeId:
        player.teeId ??
        initialData.courses.find((course) => course.id === (initialData.match.courseId ?? courseId))?.tees[0]?.id ??
        initialData.courses[0]?.tees[0]?.id ??
        ""
    }))
  );
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [courseSearchState, setCourseSearchState] = useState("");
  const [playoffWinnerTeamId, setPlayoffWinnerTeamId] = useState(
    initialData.match.winningTeamId ?? ""
  );
  const [manualTeeHoles, setManualTeeHoles] = useState(() =>
    buildMissingTeeHoleState(
      initialData.courses,
      initialData.match.courseId ?? initialData.courses[0]?.id ?? "",
      initialData.players.map((player) => ({
        playerId: player.playerId,
        handicapIndex: player.teeId ? (player.handicapIndex != null ? String(player.handicapIndex) : "") : "",
        teeId:
          player.teeId ??
          initialData.courses.find(
            (course) => course.id === (initialData.match.courseId ?? initialData.courses[0]?.id)
          )?.tees[0]?.id ??
          initialData.courses[0]?.tees[0]?.id ??
          ""
      }))
    )
  );
  const [scoreRows, setScoreRows] = useState(() =>
    initialData.holeInputs.map((hole) => ({
      holeNumber: hole.holeNumber,
      scores: Object.fromEntries(
        Object.entries(hole.scores).map(([playerId, value]) => [playerId, value == null ? "" : String(value)])
      )
    }))
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<string | null>(null);
  const [scoreSegment, setScoreSegment] = useState<"front" | "back">("front");
  const [selectedHoleNumber, setSelectedHoleNumber] = useState(1);
  const [isScoringFieldActive, setIsScoringFieldActive] = useState(false);
  const [playerEndorsements, setPlayerEndorsements] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initialData.players.map((player) => [player.playerId, false]))
  );
  const [submittedThisSession, setSubmittedThisSession] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSearchingCourses, startCourseSearchTransition] = useTransition();
  const localDraftStorageKey = `fairway-match:draft:${data.match.privateToken}`;
  const canAdminOverridePostedCard = adminMode && pageMode === "scorecard";
  const isScorecardReadOnly = data.isPublished && !canAdminOverridePostedCard;

  const selectedCourse =
    data.courses.find((course) => course.id === courseId) ?? data.courses[0] ?? null;
  const courseLoaded = selectedCourse != null;
  const selectedCourseHasTeeData = (selectedCourse?.tees.length ?? 0) > 0;
  const teamGroups = Array.from(
    new Map(data.players.map((player) => [player.teamId, player.teamName]))
  ).map(([teamId, teamName]) => ({
    teamId,
    teamName,
    players: data.players.filter((player) => player.teamId === teamId)
  }));
  const previewByPlayerId = new Map(
    (data.setupPreview?.players ?? []).map((player) => [player.playerId, player])
  );
  const completedHoleCount = scoreRows.filter((hole) =>
    data.players.every((player) => hole.scores[player.playerId] !== "")
  ).length;
  const scoreProgressLabel =
    scoreRows.length > 0 ? `${completedHoleCount}/${scoreRows.length} holes filled` : "No holes yet";
  const resolvedWinningTeamId = data.match.winningTeamId ?? data.scorecard?.winningTeamId ?? null;
  const winningSummary = data.scorecard?.teamSummaries.find(
    (summary) => summary.teamId === resolvedWinningTeamId || summary.resultCode === "WIN"
  );
  const requiresPlayoffWinnerSelection =
    data.match.stage !== "POD_PLAY" && data.scorecard != null && data.scorecard.winningTeamId == null;
  const allPlayersEndorsed = data.players.every((player) => playerEndorsements[player.playerId]);
  const missingHoleTees = (selectedCourse?.tees ?? []).filter(
    (tee) => setupPlayers.some((player) => player.teeId === tee.id) && tee.holes.length !== 18
  );
  const missingHoleInputsAreReady = missingHoleTees.every((tee) =>
    hasCompletedManualHoleInputs(manualTeeHoles[tee.id])
  );
  const setupBlockers = [
    !courseLoaded ? "Select a course." : null,
    courseLoaded && !selectedCourseHasTeeData ? "Choose a course with tee data." : null,
    ...setupPlayers.flatMap((player) => {
      const rosterPlayer = data.players.find((entry) => entry.playerId === player.playerId);
      const playerLabel = rosterPlayer?.playerName ?? "Player";
      return [
        player.handicapIndex === "" ? `${playerLabel}: add Handicap Index.` : null,
        player.teeId === "" ? `${playerLabel}: choose a tee.` : null
      ];
    }),
    ...missingHoleTees.flatMap((tee) =>
      hasCompletedManualHoleInputs(manualTeeHoles[tee.id])
        ? []
        : [`${tee.name}: complete all 18 par and handicap values.`]
    )
  ].filter((value): value is string => Boolean(value));
  const canGenerateScorecard =
    courseLoaded &&
    selectedCourseHasTeeData &&
    setupPlayers.every((player) => player.handicapIndex !== "" && player.teeId !== "") &&
    missingHoleInputsAreReady;
  const holesByPlayerId = new Map(
    data.setupPreview?.players.map((player) => [
      player.playerId,
      selectedCourse?.tees.find((tee) => tee.id === player.teeId)?.holes ?? []
    ]) ?? []
  );
  const visibleHoleNumbers = scoreSegment === "front" ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : [10, 11, 12, 13, 14, 15, 16, 17, 18];
  const frontNineHoleNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const backNineHoleNumbers = [10, 11, 12, 13, 14, 15, 16, 17, 18];
  const broadcastSaveLabel = data.isPublished && !canAdminOverridePostedCard ? "FINAL" : draftStatus ? "AUTOSAVED" : "LIVE";
  const showRestoredDraftBanner = draftStatus?.startsWith("Restored") ?? false;
  const isCompactScorecard = isScorecardReadOnly || !isScoringFieldActive;
  const scorecardGridClass =
    scoreSegment === "front"
      ? isCompactScorecard
        ? "grid grid-cols-[92px_repeat(9,minmax(24px,1fr))_38px] sm:grid-cols-[160px_repeat(9,minmax(78px,1fr))_96px]"
        : "grid grid-cols-[160px_repeat(9,minmax(78px,1fr))_96px]"
      : isCompactScorecard
        ? "grid grid-cols-[92px_repeat(9,minmax(24px,1fr))_38px_38px] sm:grid-cols-[160px_repeat(9,minmax(78px,1fr))_96px_96px]"
        : "grid grid-cols-[160px_repeat(9,minmax(78px,1fr))_96px_96px]";
  const scorecardMinWidth =
    scoreSegment === "front"
      ? isCompactScorecard
        ? 346
        : 1000
      : isCompactScorecard
        ? 384
        : 1096;
  const tableHeaderCellClass = isCompactScorecard
    ? "px-1.5 py-2 text-center text-sm font-semibold sm:px-3 sm:py-4 sm:text-xl"
    : "px-3 py-4 text-center text-xl font-semibold";
  const tableLabelCellClass = isCompactScorecard
    ? "px-2 py-2.5 text-[11px] sm:px-4 sm:py-4 sm:text-lg"
    : "px-4 py-4 text-lg";
  const tableBodyCellClass = isCompactScorecard
    ? "px-1.5 py-2 text-center sm:px-3 sm:py-3"
    : "px-3 py-3 text-center";
  const scoreCircleSizeClass = isCompactScorecard
    ? "h-7 w-7 text-[14px] leading-none tracking-[-0.02em] sm:h-12 sm:w-12 sm:text-xl"
    : "h-12 w-12 text-xl";
  const baseHoleMetaByNumber = new Map(
    (holesByPlayerId.get(data.players[0]?.playerId ?? "") ?? []).map((hole) => [hole.holeNumber, hole])
  );
  const teamScorecards = teamGroups.map((team, teamIndex) => {
    const styles = getTeamBroadcastStyles(teamIndex);
    const players = team.players.map((player) => {
      const preview = previewByPlayerId.get(player.playerId);
      const holes = holesByPlayerId.get(player.playerId) ?? [];
      const grossTotal = scoreRows.reduce((total, hole) => {
        const gross = parseEnteredScore(hole.scores[player.playerId]);
        return gross != null ? total + gross : total;
      }, 0);
      const netTotal = scoreRows.reduce((total, hole) => {
        const gross = parseEnteredScore(hole.scores[player.playerId]);
        const strokes = preview?.strokesByHole[hole.holeNumber] ?? 0;
        return gross != null ? total + gross - strokes : total;
      }, 0);
      const completedHoles = scoreRows.filter((hole) => hole.scores[player.playerId] !== "").length;
      const completedParTotal = scoreRows.reduce((total, hole) => {
        const gross = parseEnteredScore(hole.scores[player.playerId]);
        const holeMeta = holes.find((entry) => entry.holeNumber === hole.holeNumber);
        return gross != null ? total + (holeMeta?.par ?? 0) : total;
      }, 0);

      return {
        player,
        preview,
        holes,
        grossTotal,
        netTotal,
        frontNineNetTotal: holes
          .filter((hole) => frontNineHoleNumbers.includes(hole.holeNumber))
          .reduce((total, hole) => {
            const gross = parseEnteredScore(
              scoreRows.find((row) => row.holeNumber === hole.holeNumber)?.scores[player.playerId]
            );
            const strokes = preview?.strokesByHole[hole.holeNumber] ?? 0;
            return gross != null ? total + gross - strokes : total;
          }, 0),
        backNineNetTotal: holes
          .filter((hole) => backNineHoleNumbers.includes(hole.holeNumber))
          .reduce((total, hole) => {
            const gross = parseEnteredScore(
              scoreRows.find((row) => row.holeNumber === hole.holeNumber)?.scores[player.playerId]
            );
            const strokes = preview?.strokesByHole[hole.holeNumber] ?? 0;
            return gross != null ? total + gross - strokes : total;
          }, 0),
        completedHoles,
        toPar: completedHoles > 0 ? netTotal - completedParTotal : null
      };
    });

    const holeSummaries = visibleHoleNumbers.map((holeNumber) => {
      const playerScores = players.map((playerCard) => {
        const gross = parseEnteredScore(
          scoreRows.find((hole) => hole.holeNumber === holeNumber)?.scores[playerCard.player.playerId]
        );
        const strokes = playerCard.preview?.strokesByHole[holeNumber] ?? 0;

        return {
          playerId: playerCard.player.playerId,
          gross,
          net: gross != null ? gross - strokes : null,
          strokes,
          holeMeta: playerCard.holes.find((hole) => hole.holeNumber === holeNumber)
        };
      });

      const enteredNetScores = playerScores
        .map((playerScore) => playerScore.net)
        .filter((value): value is number => value != null);
      const bestNet = enteredNetScores.length > 0 ? Math.min(...enteredNetScores) : null;
      const bestPlayerIds =
        bestNet == null
          ? []
          : playerScores
              .filter((playerScore) => playerScore.net === bestNet)
              .map((playerScore) => playerScore.playerId);
      const par =
        playerScores.find((playerScore) => playerScore.holeMeta?.par != null)?.holeMeta?.par ??
        baseHoleMetaByNumber.get(holeNumber)?.par ??
        null;

      return {
        holeNumber,
        bestNet,
        bestPlayerIds,
        par,
        playerScores
      };
    });

    const enteredBetterBallNetTotal = holeSummaries.reduce(
      (total, hole) => (hole.bestNet != null ? total + hole.bestNet : total),
      0
    );
    const enteredBetterBallParTotal = holeSummaries.reduce(
      (total, hole) => (hole.bestNet != null ? total + (hole.par ?? 0) : total),
      0
    );
    const enteredBetterBallHoles = holeSummaries.filter((hole) => hole.bestNet != null).length;
    const allHoleNumbers = Array.from(
      new Set(players.flatMap((playerCard) => playerCard.holes.map((hole) => hole.holeNumber)))
    ).sort((left, right) => left - right);
    const overallBetterBallNetTotal = allHoleNumbers.reduce((total, holeNumber) => {
      const holeNets = players
        .map((playerCard) => {
          const gross = parseEnteredScore(
            scoreRows.find((hole) => hole.holeNumber === holeNumber)?.scores[playerCard.player.playerId]
          );
          const strokes = playerCard.preview?.strokesByHole[holeNumber] ?? 0;

          return gross != null ? gross - strokes : null;
        })
        .filter((value): value is number => value != null);

      return holeNets.length > 0 ? total + Math.min(...holeNets) : total;
    }, 0);
    const frontNineBetterBallNetTotal = frontNineHoleNumbers.reduce((total, holeNumber) => {
      const holeNets = players
        .map((playerCard) => {
          const gross = parseEnteredScore(
            scoreRows.find((hole) => hole.holeNumber === holeNumber)?.scores[playerCard.player.playerId]
          );
          const strokes = playerCard.preview?.strokesByHole[holeNumber] ?? 0;
          return gross != null ? gross - strokes : null;
        })
        .filter((value): value is number => value != null);

      return holeNets.length > 0 ? total + Math.min(...holeNets) : total;
    }, 0);
    const backNineBetterBallNetTotal = backNineHoleNumbers.reduce((total, holeNumber) => {
      const holeNets = players
        .map((playerCard) => {
          const gross = parseEnteredScore(
            scoreRows.find((hole) => hole.holeNumber === holeNumber)?.scores[playerCard.player.playerId]
          );
          const strokes = playerCard.preview?.strokesByHole[holeNumber] ?? 0;
          return gross != null ? gross - strokes : null;
        })
        .filter((value): value is number => value != null);

      return holeNets.length > 0 ? total + Math.min(...holeNets) : total;
    }, 0);

    return {
      team,
      teamIndex,
      styles,
      players,
      holeSummaries,
      enteredBetterBallHoles,
      frontNineBetterBallNetTotal,
      backNineBetterBallNetTotal,
      overallBetterBallNetTotal,
      betterBallToPar:
        enteredBetterBallHoles > 0 ? enteredBetterBallNetTotal - enteredBetterBallParTotal : null
    };
  });

  useEffect(() => {
    if (hasRestoredDraftRef.current || (data.isPublished && !canAdminOverridePostedCard) || typeof window === "undefined") {
      return;
    }

    hasRestoredDraftRef.current = true;

    const saved = window.localStorage.getItem(localDraftStorageKey);

    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as LocalDraftPayload;

      if (parsed.courseId) {
        setCourseId(parsed.courseId);
      }

      if (Array.isArray(parsed.setupPlayers) && parsed.setupPlayers.length === setupPlayers.length) {
        setSetupPlayers(parsed.setupPlayers);
      }

      if (parsed.manualTeeHoles && typeof parsed.manualTeeHoles === "object") {
        setManualTeeHoles(parsed.manualTeeHoles);
      }

      if (Array.isArray(parsed.scoreRows) && parsed.scoreRows.length === scoreRows.length) {
        setScoreRows(parsed.scoreRows);
      }

      setDraftStatus("Restored your in-progress draft on this device.");
    } catch {
      window.localStorage.removeItem(localDraftStorageKey);
    }
  }, [canAdminOverridePostedCard, data.isPublished, localDraftStorageKey, scoreRows.length, setupPlayers.length]);

  function navigateToPage(nextPage: "setup" | "scorecard") {
    const basePath = pathname.replace(/\/(setup|scorecard)$/, "");
    router.replace(`${basePath}/${nextPage}`, {
      scroll: true
    });
  }

  useEffect(() => {
    setManualTeeHoles((current) => {
      const required = buildMissingTeeHoleState(data.courses, courseId, setupPlayers);
      const next = { ...required };

      for (const [teeId, holes] of Object.entries(required)) {
        next[teeId] = current[teeId] ?? holes;
      }

      return next;
    });
  }, [courseId, data.courses, setupPlayers]);

  useEffect(() => {
    if (data.isPublished || typeof window === "undefined") {
      return;
    }

    const payload: LocalDraftPayload = {
      courseId,
      setupPlayers,
      manualTeeHoles,
      scoreRows,
      savedAt: new Date().toISOString()
    };

    window.localStorage.setItem(localDraftStorageKey, JSON.stringify(payload));

    if (pageMode === "scorecard") {
      setDraftStatus("Protected on this device.");
    }
  }, [courseId, data.isPublished, localDraftStorageKey, manualTeeHoles, pageMode, scoreRows, setupPlayers]);

  useEffect(() => {
    if (!data.isPublished || typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(localDraftStorageKey);
    setDraftStatus("Published and locked.");
  }, [data.isPublished, localDraftStorageKey]);

  useEffect(() => {
    setPlayerEndorsements((current) =>
      Object.fromEntries(data.players.map((player) => [player.playerId, current[player.playerId] ?? false]))
    );
  }, [data.players]);

  function handleSetupPlayerChange(playerId: string, field: "handicapIndex" | "teeId", value: string) {
    setSetupPlayers((current) =>
      current.map((player) =>
        player.playerId === playerId
          ? {
              ...player,
              [field]: value
            }
          : player
      )
    );
  }

  function handleScoreChange(holeNumber: number, playerId: string, value: string) {
    const sanitized = value.replace(/\D/g, "").slice(0, 2);

    if (sanitized !== "" && Number(sanitized) > 20) {
      return;
    }

    setScoreRows((current) =>
      current.map((hole) =>
        hole.holeNumber === holeNumber
          ? {
              ...hole,
              scores: {
                ...hole.scores,
                [playerId]: sanitized
              }
            }
          : hole
      )
    );
  }

  function handleManualHoleChange(
    teeId: string,
    holeNumber: number,
    field: "par" | "strokeIndex",
    value: string
  ) {
    setManualTeeHoles((current) => ({
      ...current,
      [teeId]: (current[teeId] ?? []).map((hole) =>
        hole.holeNumber === holeNumber
          ? {
              ...hole,
              [field]: value.replace(/\D/g, "").slice(0, 2)
            }
          : hole
      )
    }));
  }

  function applySelectedCourse(nextCourseId: string, availableCourses: PrivateMatchView["courses"]) {
    setCourseId(nextCourseId);
    setSetupPlayers((current) =>
      current.map((player) => ({
        ...player,
        teeId:
          availableCourses.find((course) => course.id === nextCourseId)?.tees[0]?.id ?? ""
      }))
    );
  }

  function refreshFromResponse(nextData: PrivateMatchView) {
    const nextSetupPlayers = nextData.players.map((player) => ({
      playerId: player.playerId,
      handicapIndex: player.handicapIndex != null ? String(player.handicapIndex) : "",
      teeId:
        player.teeId ??
        nextData.courses.find((course) => course.id === (nextData.match.courseId ?? nextData.courses[0]?.id))
          ?.tees[0]?.id ??
        nextData.courses[0]?.tees[0]?.id ??
        ""
    }));

    setData(nextData);
    setCourseId(nextData.match.courseId ?? nextData.courses[0]?.id ?? "");
    setSetupPlayers(nextSetupPlayers);
    setPlayoffWinnerTeamId(nextData.match.winningTeamId ?? "");
    setCourseSearchResults([]);
    setManualTeeHoles(
      buildMissingTeeHoleState(nextData.courses, nextData.match.courseId ?? "", nextSetupPlayers)
    );
    setScoreRows(
      nextData.holeInputs.map((hole) => ({
        holeNumber: hole.holeNumber,
        scores: Object.fromEntries(
          Object.entries(hole.scores).map(([playerId, value]) => [playerId, value == null ? "" : String(value)])
        )
      }))
    );
    lastServerSavedScoreRowsRef.current = JSON.stringify(
      nextData.holeInputs.map((hole) => ({
        holeNumber: hole.holeNumber,
        scores: Object.fromEntries(
          Object.entries(hole.scores).map(([playerId, value]) => [playerId, value == null ? "" : String(value)])
        )
      }))
    );
    setErrorMessage(null);
  }

  function handleEndorsementChange(playerId: string, checked: boolean) {
    setPlayerEndorsements((current) => ({
      ...current,
      [playerId]: checked
    }));
  }

  const submitPayload = useCallback(async (payload: unknown) => {
    const response = await fetch(ROUTES.privateScorecardApi(data.match.privateToken), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...((payload ?? {}) as Record<string, unknown>),
        adminOverride: canAdminOverridePostedCard
      })
    });

    const next = await response.json();

    if (!response.ok) {
      throw new Error(next?.error ?? "Failed to update the scorecard.");
    }

    return next as PrivateMatchView;
  }, [canAdminOverridePostedCard, data.match.privateToken]);

  function handleSetupSubmit() {
    startTransition(async () => {
      try {
        const next = await submitPayload({
          action: "setup",
          courseId,
          players: setupPlayers.map((player) => ({
            playerId: player.playerId,
            handicapIndex: Number(player.handicapIndex),
            teeId: player.teeId
          })),
          teeHoleOverrides: missingHoleTees.map((tee) => ({
            teeId: tee.id,
            holes: (manualTeeHoles[tee.id] ?? buildHoleTemplate(tee.holes)).map((hole) => ({
              holeNumber: hole.holeNumber,
              par: Number(hole.par),
              strokeIndex: Number(hole.strokeIndex)
            }))
          }))
        });

        refreshFromResponse(next);
        navigateToPage("scorecard");
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to save match setup.");
      }
    });
  }

  function handleSaveDraft() {
    startTransition(async () => {
      try {
        const next = await submitPayload({
          action: "saveDraft",
          scores: scoreRows
        });

        refreshFromResponse(next);
        setDraftStatus("Draft saved.");
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to save draft.");
      }
    });
  }

  function handleCourseSearch() {
    if (!courseSearchQuery.trim()) {
      setErrorMessage("Enter a course name to search the course directory.");
      return;
    }

    startCourseSearchTransition(async () => {
      try {
        const response = await fetch(ROUTES.courseSearchApi(courseSearchQuery, courseSearchState), {
          method: "GET"
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error ?? "Course search failed.");
        }

        const courses = Array.isArray(payload?.courses) ? payload.courses : [];

        if (courses.length === 0) {
          throw new Error("No matching course was found. Try a broader name or add the state.");
        }

        setData((current) => ({
          ...current,
          courses: mergeCourses(current.courses, courses)
        }));
        setCourseSearchResults(courses);
        setErrorMessage(null);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Course search failed.");
      }
    });
  }

  useEffect(() => {
    if ((data.isPublished && !canAdminOverridePostedCard) || !data.setupComplete || typeof window === "undefined") {
      return;
    }

    const serializedScoreRows = JSON.stringify(scoreRows);

    if (serializedScoreRows === lastServerSavedScoreRowsRef.current) {
      return;
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(async () => {
      try {
        const next = await submitPayload({
          action: "saveDraft",
          scores: scoreRows
        });

        refreshFromResponse(next);
        setDraftStatus("Draft saved automatically.");
      } catch {
        setDraftStatus("Saved on this device. Server draft will retry.");
      }
    }, 1200);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [canAdminOverridePostedCard, data.isPublished, data.setupComplete, scoreRows, submitPayload]);

  function handlePublish() {
    if (requiresPlayoffWinnerSelection && !playoffWinnerTeamId) {
      setErrorMessage("Pick the playoff winner after the tiebreak before publishing.");
      return;
    }

    if (!canAdminOverridePostedCard && !allPlayersEndorsed) {
      setErrorMessage("Every player in the group needs to endorse the official card before you publish it.");
      return;
    }

    startTransition(async () => {
      try {
        const next = await submitPayload({
          action: "publish",
          scores: scoreRows,
          playoffWinnerTeamId: requiresPlayoffWinnerSelection ? playoffWinnerTeamId : null
        });

        refreshFromResponse(next);
        setSubmittedThisSession(true);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to publish scorecard.");
      }
    });
  }

  function goToPreviousHole() {
    setSelectedHoleNumber((current) => {
      if (current <= 1) {
        setScoreSegment("front");
        return 1;
      }

      const nextHole = current - 1;
      setScoreSegment(nextHole <= 9 ? "front" : "back");
      return nextHole;
    });
  }

  function goToNextHole() {
    setSelectedHoleNumber((current) => {
      if (current >= 18) {
        setScoreSegment("back");
        return 18;
      }

      const nextHole = current + 1;
      setScoreSegment(nextHole <= 9 ? "front" : "back");
      return nextHole;
    });
  }

  function handleScoreFieldFocus(holeNumber: number) {
    setSelectedHoleNumber(holeNumber);
    setIsScoringFieldActive(true);
  }

  function handleScoreFieldBlur() {
    window.setTimeout(() => {
      const activeElement = document.activeElement as HTMLElement | null;

      if (activeElement?.dataset.scoreField === "true") {
        return;
      }

      setIsScoringFieldActive(false);
    }, 0);
  }

  return (
    <div className="space-y-4">
      {errorMessage ? (
        <div className="rounded-2xl border border-[#f4b8b8] bg-[#fff1f1] px-4 py-3 text-sm text-[#a33b3b]">
          {errorMessage}
        </div>
      ) : null}

      {showRestoredDraftBanner ? (
        <div className="rounded-2xl border border-pine/20 bg-[#eef8f1] px-4 py-3 text-sm text-pine">
          {draftStatus}
        </div>
      ) : null}

      {pageMode === "setup" ? (
        <details className="rounded-2xl border border-mist bg-white px-4 py-2.5 text-sm text-ink/72">
          <summary className="cursor-pointer list-none text-sm font-semibold text-ink">
            Setup help
          </summary>
          <div className="mt-2 space-y-1.5 leading-6">
            <p>Use each golfer&apos;s current Handicap Index for this round before you generate the card.</p>
            <p>If the wrong course, tee, or index gets entered, fix it here before scoring starts.</p>
            <p>If the round has already been posted, ask the commissioner to reopen or reset the card from admin.</p>
          </div>
        </details>
      ) : null}

      {pageMode === "setup" ? (
        <section className="overflow-hidden rounded-[28px] border border-white/60 bg-pine text-white shadow-[0_18px_42px_rgba(17,32,23,0.16)]">
          <div className="grid gap-4 px-4 py-4 sm:grid-cols-[1.2fr_0.8fr] sm:px-5 sm:py-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-gold">
                {data.match.stageLabel}
              </p>
              <h2 className="mt-2 text-[1.7rem] font-semibold leading-tight text-balance sm:text-2xl">
                {data.match.homeTeamName} vs {data.match.awayTeamName}
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/78">
                {selectedCourse ? selectedCourse.name : "Choose a course and tees to unlock the card."}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 sm:content-start">
              <div className="rounded-2xl border border-white/12 bg-white/8 p-4">
                <p className="text-xs text-white/62">Status</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {data.isPublished ? "Published" : data.match.status}
                </p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/8 p-4">
                <p className="text-xs text-white/62">Progress</p>
                <p className="mt-2 text-lg font-semibold text-white">{scoreProgressLabel}</p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {pageMode === "setup" ? (
        <section className="rounded-[28px] border border-mist bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-fairway/70">
                Step 1
              </p>
            <h2 className="mt-1.5 text-[1.6rem] font-semibold text-ink sm:text-2xl">Round setup</h2>
            <p className="mt-2 text-sm leading-6 text-ink/72">Enter all four current indexes, then pick the course and tees.</p>
            </div>
          {data.setupComplete ? (
            <button
              type="button"
              onClick={() => navigateToPage("scorecard")}
              className="rounded-full border border-fairway/15 bg-white px-4 py-2 text-sm font-medium text-ink"
            >
              Open scorecard
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[24px] border border-dashed border-fairway/16 bg-sand p-4 sm:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-fairway/70">
              Course lookup
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1.3fr_120px_auto]">
              <input
                type="text"
                value={courseSearchQuery}
                disabled={data.isPublished || isSearchingCourses}
                onChange={(event) => setCourseSearchQuery(event.target.value)}
                placeholder="Search any course"
                className="rounded-2xl border border-mist bg-white px-4 py-3"
              />
              <input
                type="text"
                value={courseSearchState}
                disabled={data.isPublished || isSearchingCourses}
                onChange={(event) => setCourseSearchState(event.target.value.toUpperCase().slice(0, 2))}
                placeholder="State"
                className="rounded-2xl border border-mist bg-white px-4 py-3"
              />
              <button
                type="button"
                disabled={data.isPublished || isSearchingCourses}
                onClick={handleCourseSearch}
                className="rounded-full bg-pine px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {isSearchingCourses ? "Searching..." : "Search courses"}
              </button>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink/68">
              Search pulls course, tee, rating, slope, and scorecard-row data into Fairway Match.
              If hole-by-hole rows are still missing, you can enter them once from the physical card
              below as a fallback.
            </p>
            {courseSearchResults.length > 0 ? (
              <div className="mt-4 space-y-3">
                {courseSearchResults.map((course) => (
                  <button
                    key={course.id}
                    type="button"
                    disabled={data.isPublished || isSearchingCourses}
                    onClick={() => {
                      applySelectedCourse(course.id, mergeCourses(data.courses, courseSearchResults));
                      setCourseSearchResults([]);
                    }}
                    className="block w-full rounded-[22px] border border-mist bg-white px-4 py-4 text-left transition hover:border-fairway/30"
                  >
                    <span className="block text-sm font-semibold text-ink">{course.name}</span>
                    <span className="mt-1 block text-sm text-ink/65">
                      {[course.city, course.state].filter(Boolean).join(", ") || "Course directory result"}
                    </span>
                    <span className="mt-2 block text-xs uppercase tracking-[0.18em] text-fairway/70">
                      {course.tees.length} tees loaded
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {!courseLoaded ? (
          <div className="mt-4 rounded-[24px] border border-dashed border-mist bg-white px-4 py-6 text-sm leading-6 text-ink/72">
            Search and select a course first. Once course and tee data are loaded, the round
            setup fields and scorecard generator will unlock.
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-ink/70">Course</span>
                <select
                  value={courseId}
                  disabled={data.isPublished}
                  onChange={(event) => {
                    applySelectedCourse(event.target.value, data.courses);
                  }}
                  className="rounded-2xl border border-mist bg-white px-4 py-3"
                >
                  {data.courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                      {course.state ? `, ${course.state}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 space-y-4">
              {teamGroups.map((team) => (
                <div key={team.teamId} className="rounded-[26px] border border-mist bg-sand p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-fairway/68">
                        Team
                      </p>
                      <p className="mt-2 text-xl font-semibold text-ink">{team.teamName}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {team.players.map((player) => {
                      const setupPlayer = setupPlayers.find((entry) => entry.playerId === player.playerId);
                      const preview = previewByPlayerId.get(player.playerId);

                      return (
                        <div key={player.playerId} className="rounded-2xl border border-mist bg-white p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-lg font-semibold text-ink">{player.playerName}</p>
                              <p className="text-sm text-ink/62">
                                {preview
                                  ? `${preview.matchStrokeCount} strokes in match`
                                  : "Set index + tee to preview strokes"}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <label className="grid gap-1 text-sm">
                              <span className="text-ink/70">Handicap Index</span>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="54"
                                value={setupPlayer?.handicapIndex ?? ""}
                                disabled={data.isPublished}
                                onChange={(event) =>
                                  handleSetupPlayerChange(
                                    player.playerId,
                                    "handicapIndex",
                                    event.target.value
                                  )
                                }
                                className="rounded-2xl border border-mist bg-white px-4 py-3"
                              />
                            </label>
                            <label className="grid gap-1 text-sm">
                              <span className="text-ink/70">Tees</span>
                              <select
                                value={setupPlayer?.teeId ?? ""}
                                disabled={data.isPublished}
                                onChange={(event) =>
                                  handleSetupPlayerChange(player.playerId, "teeId", event.target.value)
                                }
                                className="rounded-2xl border border-mist bg-white px-4 py-3"
                              >
                                {(selectedCourse?.tees ?? []).map((tee) => (
                                  <option key={tee.id} value={tee.id}>
                                    {tee.name} • {tee.slope} slope • {tee.courseRating}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {!selectedCourseHasTeeData ? (
              <div className="mt-4 rounded-[24px] border border-[#d8c27a] bg-[#fff7dd] px-4 py-4 text-sm leading-6 text-ink/72">
                This course loaded without tee data, so the scorecard cannot be generated yet. Search
                again or choose a different result.
              </div>
            ) : null}

            {missingHoleTees.length > 0 ? (
              <div className="mt-4 space-y-4">
                {missingHoleTees.map((tee) => (
                  <div key={tee.id} className="rounded-[26px] border border-[#d8c27a] bg-[#fff7dd] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a6a09]">
                      Manual hole setup
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-ink">{tee.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink/72">
                      Enter the par and scorecard handicap row from the tee card once so strokes can
                      be allocated correctly.
                    </p>
                    <div className="mt-4 overflow-hidden rounded-2xl border border-[#ead59a] bg-white">
                      <div className="grid grid-cols-[70px_1fr_1fr] gap-3 border-b border-[#ead59a] bg-[#f6edd0] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a6a09]">
                        <span>Hole</span>
                        <span>Par</span>
                        <span>Hdcp</span>
                      </div>
                      <div className="grid gap-2 px-4 py-4">
                        {(manualTeeHoles[tee.id] ?? buildHoleTemplate(tee.holes)).map((hole) => (
                          <div
                            key={`${tee.id}-${hole.holeNumber}`}
                            className="grid grid-cols-[70px_1fr_1fr] items-center gap-3"
                          >
                            <span className="text-sm font-medium text-ink">Hole {hole.holeNumber}</span>
                            <input
                              type="number"
                              min="3"
                              max="6"
                              value={hole.par}
                              disabled={data.isPublished}
                              onChange={(event) =>
                                handleManualHoleChange(tee.id, hole.holeNumber, "par", event.target.value)
                              }
                              className="rounded-2xl border border-mist bg-white px-4 py-3"
                            />
                            <input
                              type="number"
                              min="1"
                              max="18"
                              value={hole.strokeIndex}
                              disabled={data.isPublished}
                              onChange={(event) =>
                                handleManualHoleChange(
                                  tee.id,
                                  hole.holeNumber,
                                  "strokeIndex",
                                  event.target.value
                                )
                              }
                              className="rounded-2xl border border-mist bg-white px-4 py-3"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {!data.isPublished ? (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-sand px-4 py-3">
                <div className="space-y-2">
                  <p className="text-sm text-ink/72">
                    Save this once the foursome agrees on the four current indexes, course, and tees.
                  </p>
                  {!canGenerateScorecard ? (
                    <div className="space-y-1 text-xs text-ink/65">
                      {setupBlockers.map((blocker) => (
                        <p key={blocker}>{blocker}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={isPending || !canGenerateScorecard}
                  onClick={handleSetupSubmit}
                  className="rounded-full bg-pine px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {isPending ? "Saving setup..." : data.setupComplete ? "Update setup" : "Generate scorecard"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>
      ) : null}

      {data.setupPreview && pageMode === "setup" ? (
        <section className="rounded-[28px] border border-mist bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-fairway/70">
            Step 2
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">Handicap snapshot</h2>
          <div className="mt-4 space-y-3">
            {data.setupPreview.players.map((player) => (
              <div key={player.playerId} className="rounded-2xl border border-mist bg-sand p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-ink">{player.playerName}</p>
                    <p className="text-sm text-ink/65">{player.teeName} tees</p>
                  </div>
                  <span className="rounded-full bg-pine px-3 py-1 text-xs font-medium text-white">
                    {player.matchStrokeCount} strokes
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-ink/55">Index</p>
                    <p className="mt-1 font-semibold text-ink">{player.handicapIndex}</p>
                  </div>
                  <div>
                    <p className="text-ink/55">Course</p>
                    <p className="mt-1 font-semibold text-ink">{player.courseHandicap}</p>
                  </div>
                  <div>
                    <p className="text-ink/55">Playing</p>
                    <p className="mt-1 font-semibold text-ink">{player.playingHandicap}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(player.strokesByHole)
                    .filter(([, strokes]) => strokes > 0)
                    .map(([holeNumber]) => (
                      <span
                        key={holeNumber}
                        className="rounded-full border border-fairway/12 bg-white px-3 py-1 text-xs font-medium text-ink/72"
                      >
                        Stroke on {holeNumber}
                      </span>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {data.setupComplete && pageMode === "scorecard" ? (
        <section className="overflow-hidden rounded-[28px] border border-[#d7c28d] bg-[#f7efd8] shadow-[0_18px_40px_rgba(76,58,26,0.14)]">
          <div className="border-b border-[#5c574f] bg-[#6b6760] px-4 py-3 text-white">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/60">
                  {data.match.stageLabel}
                </p>
                <h2 className="mt-1.5 text-[1.6rem] font-semibold text-white sm:text-2xl">
                  {data.match.homeTeamName} vs {data.match.awayTeamName}
                </h2>
                <p className="mt-1.5 text-sm text-white/78">
                  {selectedCourse?.name ?? "Course not set"} • {scoreProgressLabel}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-xl border border-white/10 bg-black/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/78">
                    {data.isPublished ? (canAdminOverridePostedCard ? "Admin override" : "Final") : data.match.status}
                  </span>
                  {(!data.isPublished || canAdminOverridePostedCard) && draftStatus ? (
                    <span className="rounded-xl border border-white/10 bg-black/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/78">
                      {broadcastSaveLabel}
                    </span>
                  ) : null}
                </div>
                {!data.isPublished ? (
                  <button
                    type="button"
                    onClick={() => navigateToPage("setup")}
                    className="rounded-full border border-white/18 bg-white px-4 py-2 text-sm font-semibold text-ink"
                  >
                    Edit setup
                  </button>
                ) : null}
              </div>
            </div>

          </div>

          {requiresPlayoffWinnerSelection ? (
            <div className="mx-4 mt-4 rounded-[24px] border border-[#d8c27a] bg-[#fff7dd] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a6a09]">
                Playoff tiebreak
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {teamGroups.map((team) => (
                  <button
                    key={team.teamId}
                    type="button"
                    onClick={() => setPlayoffWinnerTeamId(team.teamId)}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                      playoffWinnerTeamId === team.teamId
                        ? "border-pine bg-pine text-white"
                        : "border-mist bg-white text-ink"
                    }`}
                  >
                    <span className="block text-xs uppercase tracking-[0.18em] opacity-70">Winner</span>
                    <span className="mt-1 block font-semibold">{team.teamName}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-4 px-4 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {teamScorecards.map((teamCard) => (
                <div
                  key={`summary-${teamCard.team.teamId}`}
                  className={`rounded-[22px] border p-4 ${teamCard.styles.accentBorder} ${teamCard.styles.accentSurface}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${teamCard.styles.accentText}`}>
                        {teamCard.team.teamName}
                      </p>
                      <p className="mt-1 text-sm text-ink/70">
                        {teamCard.enteredBetterBallHoles || 0} holes posted
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Team net</p>
                      <p className="mt-1 text-3xl font-semibold text-ink leading-none">
                        {teamCard.betterBallToPar == null
                          ? "E"
                          : `${teamCard.betterBallToPar >= 0 ? "+" : ""}${teamCard.betterBallToPar}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-[28px] border border-[#d7c28d] bg-white shadow-[0_12px_28px_rgba(76,58,26,0.08)]">
              <div className="border-b border-[#e9d8ac] bg-[#fbf5e6] px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setScoreSegment("front");
                      setSelectedHoleNumber((current) => (current > 9 ? 1 : current));
                    }}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      scoreSegment === "front"
                        ? "bg-pine text-white"
                        : "border border-[#d7c28d] bg-white text-ink"
                    }`}
                  >
                    Front 9
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScoreSegment("back");
                      setSelectedHoleNumber((current) => (current < 10 ? 10 : current));
                    }}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      scoreSegment === "back"
                        ? "bg-pine text-white"
                        : "border border-[#d7c28d] bg-white text-ink"
                    }`}
                  >
                    Back 9
                  </button>
                  {!isScorecardReadOnly ? (
                    <div className="ml-auto flex flex-wrap gap-2">
                      {isCompactScorecard ? (
                        <span className="rounded-full border border-[#d7c28d] bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/62">
                          Tap a score to edit
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={goToPreviousHole}
                        className="rounded-full border border-[#d7c28d] bg-white px-4 py-2 text-sm font-semibold text-ink"
                      >
                        Previous hole
                      </button>
                      <button
                        type="button"
                        onClick={goToNextHole}
                        className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white"
                      >
                        Next hole
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="overflow-x-auto overscroll-x-contain pb-2">
                <div style={{ minWidth: scorecardMinWidth }}>
                  <div className={scorecardGridClass}>
                    <div className={`border-b border-r border-[#d7c28d] bg-[#7a766f] font-semibold text-white ${tableLabelCellClass}`}>
                      Hole
                    </div>
                    {visibleHoleNumbers.map((holeNumber) => (
                      <button
                        key={`hole-heading-${holeNumber}`}
                        type="button"
                        onClick={() => setSelectedHoleNumber(holeNumber)}
                        className={`border-b border-r border-[#d7c28d] bg-[#7a766f] text-white transition ${tableHeaderCellClass}`}
                      >
                        {holeNumber}
                      </button>
                    ))}
                    {scoreSegment === "front" ? (
                      <div className={`border-b border-r border-[#d7c28d] bg-[#7a766f] text-white ${tableHeaderCellClass}`}>
                        Out
                      </div>
                    ) : (
                      <>
                        <div className={`border-b border-r border-[#d7c28d] bg-[#7a766f] text-white ${tableHeaderCellClass}`}>
                          In
                        </div>
                        <div className={`border-b border-r border-[#d7c28d] bg-[#7a766f] text-white ${tableHeaderCellClass}`}>
                          Tot
                        </div>
                      </>
                    )}

                    {teamScorecards.map((teamCard, teamCardIndex) => (
                      <Fragment key={`team-block-${teamCard.team.teamId}`}>
                        {teamCard.players.map((playerCard) => (
                          <Fragment key={`${teamCard.team.teamId}-${playerCard.player.playerId}`}>
                            <div className={`border-b border-r border-[#d7c28d] bg-white ${isCompactScorecard ? "px-2 py-2 sm:px-4 sm:py-4" : "px-4 py-4"}`}>
                              <p className={`${isCompactScorecard ? "text-[11px] leading-tight sm:text-sm" : "text-sm"} font-semibold text-ink`}>
                                {playerCard.player.playerName}
                              </p>
                              <div className={`mt-1.5 flex items-center gap-2 text-ink/56 ${isCompactScorecard ? "text-[10px] sm:text-xs" : "text-xs"}`}>
                                <span className="rounded-full border border-mist px-2 py-0.5 font-medium text-ink/72">
                                  Gross
                                </span>
                                <span>{playerCard.preview?.matchStrokeCount ?? 0} strokes</span>
                              </div>
                            </div>
                            {visibleHoleNumbers.map((holeNumber) => {
                              const holeMeta = playerCard.holes.find((hole) => hole.holeNumber === holeNumber);
                              const score = scoreRows.find((hole) => hole.holeNumber === holeNumber)?.scores[playerCard.player.playerId] ?? "";
                              const strokeCount = playerCard.preview?.strokesByHole[holeNumber] ?? 0;

                              return (
                                <div
                                  key={`${playerCard.player.playerId}-gross-${holeNumber}`}
                                  className={`border-b border-r border-[#d7c28d] bg-white ${tableBodyCellClass}`}
                                >
                                  <div className="relative mx-auto w-fit">
                                    {strokeCount > 0 ? (
                                      <span
                                        className={`absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full ${
                                          teamCard.teamIndex % 2 === 0 ? "bg-pine" : "bg-[#8a6a09]"
                                        }`}
                                      />
                                    ) : null}
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      maxLength={2}
                                      data-score-field="true"
                                      value={score}
                                      disabled={isScorecardReadOnly}
                                      onFocus={() => handleScoreFieldFocus(holeNumber)}
                                      onBlur={handleScoreFieldBlur}
                                      onChange={(event) =>
                                        handleScoreChange(holeNumber, playerCard.player.playerId, event.target.value)
                                      }
                                      className={`mx-auto flex items-center justify-center border-2 text-center font-semibold outline-none ${scoreCircleSizeClass} ${scoreStyleForValue(
                                        String(score),
                                        holeMeta?.par,
                                        isCompactScorecard
                                      )}`}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                            {scoreSegment === "front" ? (
                              <div className={`border-b border-r border-[#d7c28d] bg-white ${tableBodyCellClass}`}>
                                <span className={`mx-auto flex items-center justify-center font-semibold text-ink ${scoreCircleSizeClass}`}>
                                  {playerCard.frontNineNetTotal}
                                </span>
                              </div>
                            ) : (
                              <>
                                <div className={`border-b border-r border-[#d7c28d] bg-white ${tableBodyCellClass}`}>
                                  <span className={`mx-auto flex items-center justify-center font-semibold text-ink ${scoreCircleSizeClass}`}>
                                    {playerCard.backNineNetTotal}
                                  </span>
                                </div>
                                <div className={`border-b border-r border-[#d7c28d] bg-white ${tableBodyCellClass}`}>
                                  <span className={`mx-auto flex items-center justify-center font-semibold text-ink ${scoreCircleSizeClass}`}>
                                    {playerCard.netTotal}
                                  </span>
                                </div>
                              </>
                            )}
                          </Fragment>
                        ))}

                        <div className={`border-b border-r font-semibold uppercase tracking-[0.18em] ${teamCard.styles.bestBallStrong} ${isCompactScorecard ? "px-2 py-2 text-[11px] sm:px-4 sm:py-4 sm:text-sm" : "px-4 py-4 text-sm"}`}>
                          {teamCard.team.teamName} Net
                        </div>
                        {teamCard.holeSummaries.map((holeSummary) => (
                          <div
                            key={`${teamCard.team.teamId}-team-net-${holeSummary.holeNumber}`}
                            className={`border-b border-r text-center ${teamCard.styles.teamNetRowFill} ${tableBodyCellClass}`}
                          >
                            <span
                              className={`mx-auto flex items-center justify-center font-semibold ${scoreCircleSizeClass} ${
                                holeSummary.bestNet == null ? "text-current/35" : "text-current"
                              }`}
                            >
                              {holeSummary.bestNet ?? ""}
                            </span>
                          </div>
                        ))}
                        {scoreSegment === "front" ? (
                          <div className={`border-b border-r text-center ${teamCard.styles.teamNetRowFill} ${tableBodyCellClass}`}>
                            <span className={`mx-auto flex items-center justify-center font-semibold text-current ${scoreCircleSizeClass}`}>
                              {teamCard.frontNineBetterBallNetTotal}
                            </span>
                          </div>
                        ) : (
                          <>
                            <div className={`border-b border-r text-center ${teamCard.styles.teamNetRowFill} ${tableBodyCellClass}`}>
                              <span className={`mx-auto flex items-center justify-center font-semibold text-current ${scoreCircleSizeClass}`}>
                                {teamCard.backNineBetterBallNetTotal}
                              </span>
                            </div>
                            <div className={`border-b border-r text-center ${teamCard.styles.teamNetRowFill} ${tableBodyCellClass}`}>
                              <span className={`mx-auto flex items-center justify-center font-semibold text-current ${scoreCircleSizeClass}`}>
                                {teamCard.overallBetterBallNetTotal}
                              </span>
                            </div>
                          </>
                        )}

                        {teamCardIndex === 0 ? (
                          <Fragment>
                            <div className={`border-b border-r border-[#b9c8d9] bg-[linear-gradient(180deg,#dfe9f4_0%,#c8d7e8_100%)] font-semibold text-[#23405f] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),inset_0_-1px_0_rgba(35,64,95,0.12)] ${tableLabelCellClass}`}>
                              HDCP
                            </div>
                            {visibleHoleNumbers.map((holeNumber) => (
                              <button
                                key={`hdcp-${holeNumber}`}
                                type="button"
                                onClick={() => setSelectedHoleNumber(holeNumber)}
                                className={`border-b border-r border-[#b9c8d9] bg-[linear-gradient(180deg,#f3f7fb_0%,#e3edf7_100%)] font-semibold text-[#23405f] ${tableHeaderCellClass}`}
                              >
                                {baseHoleMetaByNumber.get(holeNumber)?.strokeIndex ?? "—"}
                              </button>
                            ))}
                            {scoreSegment === "front" ? (
                              <div className={`border-b border-r border-[#b9c8d9] bg-[linear-gradient(180deg,#f3f7fb_0%,#e3edf7_100%)] font-semibold text-[#23405f] ${tableHeaderCellClass}`}>
                                Out
                              </div>
                            ) : (
                              <>
                                <div className={`border-b border-r border-[#b9c8d9] bg-[linear-gradient(180deg,#f3f7fb_0%,#e3edf7_100%)] font-semibold text-[#23405f] ${tableHeaderCellClass}`}>
                                  In
                                </div>
                                <div className={`border-b border-r border-[#b9c8d9] bg-[linear-gradient(180deg,#f3f7fb_0%,#e3edf7_100%)] font-semibold text-[#23405f] ${tableHeaderCellClass}`}>
                                  Tot
                                </div>
                              </>
                            )}

                            <div className={`border-b border-r border-[#d7c28d] bg-[linear-gradient(180deg,#f4e5b3_0%,#ead28b_100%)] font-semibold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-1px_0_rgba(138,106,9,0.12)] ${tableLabelCellClass}`}>
                              Par
                            </div>
                            {visibleHoleNumbers.map((holeNumber) => (
                              <button
                                key={`par-${holeNumber}`}
                                type="button"
                                onClick={() => setSelectedHoleNumber(holeNumber)}
                                className={`border-b border-r border-[#d7c28d] bg-[linear-gradient(180deg,#f9edc1_0%,#efdda4_100%)] font-semibold text-ink ${tableHeaderCellClass}`}
                              >
                                {baseHoleMetaByNumber.get(holeNumber)?.par ?? "—"}
                              </button>
                            ))}
                            {scoreSegment === "front" ? (
                              <div className={`border-b border-r border-[#d7c28d] bg-[linear-gradient(180deg,#f9edc1_0%,#efdda4_100%)] font-semibold text-ink ${tableHeaderCellClass}`}>
                                {frontNineHoleNumbers.reduce(
                                  (total, holeNumber) => total + (baseHoleMetaByNumber.get(holeNumber)?.par ?? 0),
                                  0
                                )}
                              </div>
                            ) : (
                              <>
                                <div className={`border-b border-r border-[#d7c28d] bg-[linear-gradient(180deg,#f9edc1_0%,#efdda4_100%)] font-semibold text-ink ${tableHeaderCellClass}`}>
                                  {backNineHoleNumbers.reduce(
                                    (total, holeNumber) => total + (baseHoleMetaByNumber.get(holeNumber)?.par ?? 0),
                                    0
                                  )}
                                </div>
                                <div className={`border-b border-r border-[#d7c28d] bg-[linear-gradient(180deg,#f9edc1_0%,#efdda4_100%)] font-semibold text-ink ${tableHeaderCellClass}`}>
                                  {Array.from(baseHoleMetaByNumber.values()).reduce(
                                    (total, hole) => total + (hole.par ?? 0),
                                    0
                                  )}
                                </div>
                              </>
                            )}
                          </Fragment>
                        ) : null}
                      </Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {!isScorecardReadOnly ? (
            <div className="sticky bottom-4 mt-4">
              <div className="flex flex-col gap-3 rounded-[24px] border border-white/70 bg-[rgba(255,252,247,0.96)] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-[0_18px_40px_rgba(17,32,23,0.14)] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:pb-4">
                {canAdminOverridePostedCard ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink/58">
                      Commissioner edit
                    </p>
                    <p className="text-sm text-ink/72">
                      You are editing a posted card from admin. Save a draft or submit an override when the correction is complete.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink/58">
                      Player approvals
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {data.players.map((player) => (
                        <label
                          key={`endorsement-${player.playerId}`}
                          className="flex items-center gap-3 rounded-2xl border border-[#d7c28d] bg-white px-3 py-3 text-sm text-ink"
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(playerEndorsements[player.playerId])}
                            onChange={(event) =>
                              handleEndorsementChange(player.playerId, event.target.checked)
                            }
                            className="h-4 w-4 rounded border-[#c7b37f] text-pine focus:ring-pine"
                          />
                          <span>
                            {player.playerName} approves this official card
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {canAdminOverridePostedCard ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={handleSaveDraft}
                      className="rounded-full border border-pine/20 bg-white px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
                    >
                      {isPending ? "Saving..." : "Save draft"}
                    </button>
                  ) : null}
                <button
                  type="button"
                  disabled={isPending || (!canAdminOverridePostedCard && !allPlayersEndorsed)}
                  onClick={handlePublish}
                  className="rounded-full bg-pine px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {isPending ? "Publishing..." : canAdminOverridePostedCard ? "Submit override" : "Submit official scorecard"}
                </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {data.setupComplete && pageMode === "scorecard" && !isScorecardReadOnly ? (
        <a
          href={RULES_JUDGE_URL}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] left-4 z-30 rounded-full bg-[#183f31] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(17,32,23,0.22)] sm:left-auto sm:right-4"
        >
          {RULES_JUDGE_LABEL}
        </a>
      ) : null}

      {data.isPublished && submittedThisSession ? (
        <section className="rounded-[28px] border border-pine/15 bg-[linear-gradient(180deg,#f3fbf6_0%,#e6f3ea_100%)] p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-pine/70">
            {canAdminOverridePostedCard ? "Override saved" : "Submitted"}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">
            {canAdminOverridePostedCard ? "The admin correction is live." : "The result is locked in."}
          </h2>
          <p className="mt-2 text-sm text-ink/70">
            {canAdminOverridePostedCard
              ? "The corrected scorecard has been republished from the commissioner desk."
              : "This card now feeds the standings, bracket, and live feed."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push(ROUTES.tournamentHome(data.match.tournamentSlug))}
              className="rounded-full bg-pine px-4 py-2 text-sm font-medium text-white"
            >
              Back to tournament
            </button>
            <button
              type="button"
              onClick={() => router.push(ROUTES.publicMatch(data.match.tournamentSlug, data.match.id))}
              className="rounded-full border border-pine/20 bg-white px-4 py-2 text-sm font-medium text-ink"
            >
              View posted round
            </button>
          </div>
        </section>
      ) : null}

      {data.scorecard ? (
        <section className="rounded-[28px] border border-mist bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-fairway/70">
            Result
          </p>
          {winningSummary ? (
            <div className="mt-3 rounded-[22px] border border-fairway/12 bg-sand px-4 py-3">
              <p className="text-sm font-semibold text-ink">
                {data.players.find((player) => player.teamId === winningSummary.teamId)?.teamName ?? "Team"}
              </p>
              <p className="mt-1 text-sm text-ink/72">
                {winningSummary.totalPoints} points • {winningSummary.holesWon} holes won
              </p>
            </div>
          ) : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {data.scorecard.teamSummaries.map((summary) => {
              const team = data.players.find((player) => player.teamId === summary.teamId);

              return (
                <div key={summary.teamId} className="rounded-[22px] border border-mist bg-sand p-4">
                  <p className="text-base font-semibold text-ink">{team?.teamName ?? "Team"}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-ink/50">Pts</p>
                      <p className="font-semibold text-ink">{summary.totalPoints}</p>
                    </div>
                    <div>
                      <p className="text-ink/50">Won</p>
                      <p className="font-semibold text-ink">{summary.holesWon}</p>
                    </div>
                    <div>
                      <p className="text-ink/50">Net BB</p>
                      <p className="font-semibold text-ink">{summary.betterBallNetTotal ?? "—"}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
