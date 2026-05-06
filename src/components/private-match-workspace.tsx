"use client";

import { Fragment, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ROUTES } from "@/lib/api/routes";
import { MatchScorecardSummary, type MatchScorecardSummaryTeam } from "@/components/match-scorecard-summary";
import { PublicMatchScorecard } from "@/components/public-match-scorecard";
import { RulesJudgeIcon } from "@/components/rules-judge-icon";
import {
  RULES_JUDGE_URL
} from "@/lib/content/rules-judge";
import type { PrivateMatchView } from "@/lib/server/matches";
import {
  ScorecardTableFrame,
  getScorecardSegmentHoles,
  scorecardBodyCellClass,
  scorecardHeaderCellClass,
  scorecardLabelCellClass,
  scorecardScoreMarkClass,
  scorecardScoreStyle
} from "@/components/scorecard-table";

interface PrivateMatchWorkspaceProps {
  initialData: PrivateMatchView;
  pageMode: "setup" | "scorecard";
  adminMode?: boolean;
  adminBackHref?: string;
}

type ManualHoleInput = {
  holeNumber: number;
  par: string;
  strokeIndex: string;
};

const MANUAL_COURSE_ID = "__manual_course__";
const MANUAL_TEE_ID = "__manual_tee__";

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

function buildBlankManualHoleTemplate(): ManualHoleInput[] {
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

function formatEditableVsPar(value: number | null | undefined) {
  if (value == null) {
    return "E";
  }

  if (value === 0) {
    return "E";
  }

  return value > 0 ? `+${value}` : String(value);
}

function scorecardDisplayName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.at(-1) ?? name;
}

function formatScorecardHandicapIndex(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return "Index not set";
  }

  return `Index ${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}`;
}

function scorecardTeamInitials(name: string) {
  return name
    .split(/\s+|&/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function PrivateMatchWorkspace({
  initialData,
  pageMode,
  adminMode = false,
  adminBackHref = "/admin?section=scorecards"
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
  const [courseSearchState, setCourseSearchState] = useState("IL");
  const [courseSearchFailed, setCourseSearchFailed] = useState(false);
  const [manualSetupOpen, setManualSetupOpen] = useState(false);
  const [manualCourseName, setManualCourseName] = useState("");
  const [manualCourseCity, setManualCourseCity] = useState("");
  const [manualCourseState, setManualCourseState] = useState("");
  const [manualTeeName, setManualTeeName] = useState("Men's tees");
  const [manualCourseRating, setManualCourseRating] = useState("");
  const [manualSlope, setManualSlope] = useState("");
  const [manualCourseHoles, setManualCourseHoles] = useState<ManualHoleInput[]>(() =>
    buildBlankManualHoleTemplate()
  );
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
  const [setupConfirmationChecked, setSetupConfirmationChecked] = useState(false);
  const [playerEndorsements, setPlayerEndorsements] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initialData.players.map((player) => [player.playerId, false]))
  );
  const [submittedThisSession, setSubmittedThisSession] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSearchingCourses, startCourseSearchTransition] = useTransition();
  const localDraftStorageKey = `fairway-match:draft:${data.match.privateToken}`;
  const canAdminOverridePostedCard = adminMode && pageMode === "scorecard";
  const isScorecardReadOnly = data.isPublished && !canAdminOverridePostedCard;
  const showSubmittedConfirmation = data.isPublished && submittedThisSession && !canAdminOverridePostedCard;

  const selectedCourse = courseId
    ? data.courses.find((course) => course.id === courseId) ?? null
    : null;
  const manualCourseIsSelected = courseId === MANUAL_COURSE_ID;
  const courseLoaded = selectedCourse != null;
  const selectedCourseHasTeeData = (selectedCourse?.tees.length ?? 0) > 0;
  const selectedGroupTeeId =
    setupPlayers.length > 0 && setupPlayers.every((player) => player.teeId === setupPlayers[0]?.teeId)
      ? setupPlayers[0]?.teeId ?? ""
      : "";
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
  const isScorecardComplete = scoreRows.length > 0 && completedHoleCount === scoreRows.length;
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
  const canProceedToScorecard = canGenerateScorecard && setupConfirmationChecked;
  const holesByPlayerId = new Map(
    data.setupPreview?.players.map((player) => [
      player.playerId,
      selectedCourse?.tees.find((tee) => tee.id === player.teeId)?.holes ?? []
    ]) ?? []
  );
  const visibleHoleNumbers = getScorecardSegmentHoles(scoreSegment);
  const frontNineHoleNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const backNineHoleNumbers = [10, 11, 12, 13, 14, 15, 16, 17, 18];
  const broadcastSaveLabel = data.isPublished && !canAdminOverridePostedCard ? "FINAL" : draftStatus ? "AUTOSAVED" : "LIVE";
  const showRestoredDraftBanner = draftStatus?.startsWith("Restored") ?? false;
  const showScorecardEditHint = !isScorecardReadOnly && !isScoringFieldActive;
  const baseHoleMetaByNumber = new Map(
    (holesByPlayerId.get(data.players[0]?.playerId ?? "") ?? []).map((hole) => [hole.holeNumber, hole])
  );
  const handicapStrokeSummaries =
    data.setupPreview?.players.map((player) => ({
      ...player,
      teamName: data.players.find((entry) => entry.playerId === player.playerId)?.teamName ?? "",
      strokeHoles: Object.entries(player.strokesByHole)
        .filter(([, strokes]) => strokes > 0)
        .map(([holeNumber]) => Number(holeNumber))
        .sort((left, right) => left - right)
    })) ?? [];
  const scorecardTeeNames = Array.from(
    new Set((data.setupPreview?.players ?? []).map((player) => player.teeName).filter(Boolean))
  );
  const scorecardYardageLabel =
    scorecardTeeNames.length === 1
      ? `${scorecardTeeNames[0]} yards`
      : scorecardTeeNames.length > 1
        ? `${scorecardTeeNames.join(" / ")} yards`
        : "Yards";
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
    const betterBallSegmentSummary = (holeNumbers: number[]) =>
      holeNumbers.reduce(
        (summary, holeNumber) => {
          const holeNets = players
            .map((playerCard) => {
              const gross = parseEnteredScore(
                scoreRows.find((hole) => hole.holeNumber === holeNumber)?.scores[playerCard.player.playerId]
              );
              const strokes = playerCard.preview?.strokesByHole[holeNumber] ?? 0;
              return gross != null ? gross - strokes : null;
            })
            .filter((value): value is number => value != null);
          const par =
            players
              .flatMap((playerCard) => playerCard.holes)
              .find((hole) => hole.holeNumber === holeNumber)?.par ??
            baseHoleMetaByNumber.get(holeNumber)?.par ??
            null;

          if (holeNets.length === 0 || par == null) {
            return summary;
          }

          const bestNet = Math.min(...holeNets);

          return {
            holes: summary.holes + 1,
            net: summary.net + bestNet,
            par: summary.par + par
          };
        },
        { holes: 0, net: 0, par: 0 }
      );
    const frontNineBetterBallSummary = betterBallSegmentSummary(frontNineHoleNumbers);
    const backNineBetterBallSummary = betterBallSegmentSummary(backNineHoleNumbers);
    const overallBetterBallSummary = betterBallSegmentSummary(allHoleNumbers);
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
      frontNineToPar:
        frontNineBetterBallSummary.holes > 0
          ? frontNineBetterBallSummary.net - frontNineBetterBallSummary.par
          : null,
      backNineToPar:
        backNineBetterBallSummary.holes > 0
          ? backNineBetterBallSummary.net - backNineBetterBallSummary.par
          : null,
      overallToPar:
        overallBetterBallSummary.holes > 0
          ? overallBetterBallSummary.net - overallBetterBallSummary.par
          : null,
      betterBallToPar:
        enteredBetterBallHoles > 0 ? enteredBetterBallNetTotal - enteredBetterBallParTotal : null
    };
  });
  const editableSummaryTeams: MatchScorecardSummaryTeam[] = teamScorecards.map((teamCard) => ({
    id: teamCard.team.teamId,
    name: teamCard.team.teamName,
    label: "Team net",
    score: formatEditableVsPar(teamCard.betterBallToPar),
    tone: teamCard.teamIndex % 2 === 0 ? "pine" : "purple",
    stats: [
      { label: "Out", value: formatEditableVsPar(teamCard.frontNineToPar) },
      { label: "In", value: formatEditableVsPar(teamCard.backNineToPar) },
      { label: "Total", value: formatEditableVsPar(teamCard.overallToPar) }
    ]
  }));
  const editableStrokeSummaries = handicapStrokeSummaries.map((player) => ({
    playerId: player.playerId,
    playerName: scorecardDisplayName(player.playerName),
    teamName: player.teamName,
    strokeCount: player.matchStrokeCount,
    handicapIndex: formatScorecardHandicapIndex(player.handicapIndex).replace(/^Index\s+/i, ""),
    teeName: player.teeName || "TBD",
    strokeHoles: player.strokeHoles
  }));
  const publishedScorecardView =
    data.scorecard && data.setupPreview
      ? (() => {
          const scoredHolesByNumber = new Map(
            data.scorecard.holes.map((hole) => [hole.holeNumber, hole])
          );
          const allHoleMeta = Array.from(baseHoleMetaByNumber.values()).sort(
            (left, right) => left.holeNumber - right.holeNumber
          );
          const courseLocation = selectedCourse
            ? [selectedCourse.city, selectedCourse.state].filter(Boolean).join(", ") || "Course TBD"
            : "Course TBD";

          return {
            teams: teamGroups.map((team, teamIndex) => ({
              id: team.teamId,
              name: team.teamName,
              tone: (teamIndex % 2 === 0 ? "pine" : "purple") as "pine" | "purple",
              players: team.players.map((player) => {
                const preview = previewByPlayerId.get(player.playerId);

                return {
                  playerId: player.playerId,
                  playerName: player.playerName,
                  teamId: player.teamId,
                  teeName: preview?.teeName ?? "Tee",
                  handicapIndex: preview?.handicapIndex ?? player.handicapIndex ?? 0,
                  matchStrokeCount: preview?.matchStrokeCount ?? 0,
                  strokesByHole: preview?.strokesByHole ?? {},
                  grossByHole: Object.fromEntries(
                    scoreRows.map((hole) => [
                      hole.holeNumber,
                      parseEnteredScore(hole.scores[player.playerId]) ?? 0
                    ])
                  ),
                  netByHole: Object.fromEntries(
                    scoreRows.map((hole) => {
                      const scored = scoredHolesByNumber.get(hole.holeNumber);
                      const gross = parseEnteredScore(hole.scores[player.playerId]);
                      const strokes = preview?.strokesByHole[hole.holeNumber] ?? 0;

                      return [
                        hole.holeNumber,
                        scored?.playerNetScores[player.playerId] ?? (gross != null ? gross - strokes : null)
                      ];
                    })
                  )
                };
              })
            })),
            holes: allHoleMeta.map((hole) => {
              const scored = scoredHolesByNumber.get(hole.holeNumber);

              return {
                holeNumber: hole.holeNumber,
                par: hole.par,
                strokeIndex: hole.strokeIndex,
                yardage: hole.yardage ?? null,
                teamPoints: scored?.teamPoints ?? {},
                teamBetterBallNet: scored?.teamBetterBallNet ?? {},
                winningTeamId: scored?.winningTeamId ?? null
              };
            }),
            courseLocation
          };
        })()
      : null;

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
    if (data.isPublished || !selectedCourse?.tees.length) {
      return;
    }

    const teeIds = new Set(selectedCourse.tees.map((tee) => tee.id));
    const defaultTeeId = selectedCourse.tees[0]?.id ?? "";

    setSetupPlayers((current) => {
      let changed = false;
      const next = current.map((player) => {
        if (player.teeId && teeIds.has(player.teeId)) {
          return player;
        }

        changed = true;
        return {
          ...player,
          teeId: defaultTeeId
        };
      });

      return changed ? next : current;
    });
  }, [data.isPublished, selectedCourse]);

  useEffect(() => {
    setManualTeeHoles((current) => {
      const required = buildMissingTeeHoleState(data.courses, courseId, setupPlayers);
      const next = { ...required };

      for (const [teeId, holes] of Object.entries(required)) {
        next[teeId] = current[teeId]?.length === 18 ? current[teeId] : holes;
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
    setSetupConfirmationChecked(false);
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

  function handleGroupTeeChange(teeId: string) {
    setSetupConfirmationChecked(false);
    setSetupPlayers((current) =>
      current.map((player) => ({
        ...player,
        teeId
      }))
    );
  }

  function clearSelectedCourse() {
    setSetupConfirmationChecked(false);
    setCourseId("");
    setCourseSearchResults([]);
    setManualSetupOpen(false);
    setManualTeeHoles({});
    setSetupPlayers((current) =>
      current.map((player) => ({
        ...player,
        teeId: ""
      }))
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
    setSetupConfirmationChecked(false);
    setManualTeeHoles((current) => ({
      ...current,
      [teeId]: (current[teeId]?.length === 18
        ? current[teeId]
        : buildHoleTemplate(selectedCourse?.tees.find((tee) => tee.id === teeId)?.holes ?? [])
      ).map((hole) =>
        hole.holeNumber === holeNumber
          ? {
              ...hole,
              [field]: value.replace(/\D/g, "").slice(0, 2)
            }
          : hole
      )
    }));
  }

  function handleManualCourseHoleChange(
    holeNumber: number,
    field: "par" | "strokeIndex",
    value: string
  ) {
    setSetupConfirmationChecked(false);
    setManualCourseHoles((current) =>
      current.map((hole) =>
        hole.holeNumber === holeNumber
          ? {
              ...hole,
              [field]: value.replace(/\D/g, "").slice(0, 2)
            }
          : hole
      )
    );
  }

  function applyManualCourse() {
    const normalizedName = manualCourseName.trim();
    const normalizedTeeName = manualTeeName.trim();
    const rating = Number(manualCourseRating);
    const slope = Number(manualSlope);
    const parTotal = manualCourseHoles.reduce((total, hole) => total + Number(hole.par), 0);

    if (!normalizedName) {
      setErrorMessage("Add the course name before using manual setup.");
      return;
    }

    if (!normalizedTeeName) {
      setErrorMessage("Add the tee name before using manual setup.");
      return;
    }

    if (!Number.isFinite(rating) || rating < 50 || rating > 85) {
      setErrorMessage("Manual setup needs a valid course rating.");
      return;
    }

    if (!Number.isInteger(slope) || slope < 55 || slope > 155) {
      setErrorMessage("Manual setup needs a valid slope rating.");
      return;
    }

    if (!hasCompletedManualHoleInputs(manualCourseHoles)) {
      setErrorMessage("Manual setup needs all 18 par values and unique handicap indexes from 1 to 18.");
      return;
    }

    const manualCourse: PrivateMatchView["courses"][number] = {
      id: MANUAL_COURSE_ID,
      name: normalizedName,
      city: manualCourseCity.trim() || null,
      state: manualCourseState.trim().toUpperCase() || null,
      tees: [
        {
          id: MANUAL_TEE_ID,
          name: normalizedTeeName,
          gender: "MEN",
          par: parTotal,
          slope,
          courseRating: rating,
          holes: manualCourseHoles.map((hole) => ({
            holeNumber: hole.holeNumber,
            par: Number(hole.par),
            strokeIndex: Number(hole.strokeIndex)
          }))
        }
      ]
    };

    const nextCourses = mergeCourses(
      data.courses.filter((course) => course.id !== MANUAL_COURSE_ID),
      [manualCourse]
    );

    setData((current) => ({
      ...current,
      courses: nextCourses
    }));
    setCourseSearchResults([]);
    applySelectedCourse(MANUAL_COURSE_ID, nextCourses);
    setManualTeeHoles({});
    setErrorMessage(null);
  }

  function applySelectedCourse(nextCourseId: string, availableCourses: PrivateMatchView["courses"]) {
    setSetupConfirmationChecked(false);
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
    setSetupConfirmationChecked(false);
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
          manualCourse:
            manualCourseIsSelected && selectedCourse
              ? {
                  name: manualCourseName.trim() || selectedCourse.name,
                  city: manualCourseCity.trim(),
                  state: manualCourseState.trim().toUpperCase(),
                  teeName: manualTeeName.trim() || selectedCourse.tees[0]?.name,
                  courseRating: Number(manualCourseRating || selectedCourse.tees[0]?.courseRating),
                  slope: Number(manualSlope || selectedCourse.tees[0]?.slope),
                  holes: manualCourseHoles.map((hole) => ({
                    holeNumber: hole.holeNumber,
                    par: Number(hole.par),
                    strokeIndex: Number(hole.strokeIndex)
                  }))
                }
              : null,
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
          setCourseSearchFailed(true);
          throw new Error("No matching course was found. Try a broader name or add the state.");
        }

        const mergedCourses = mergeCourses(data.courses, courses);
        const shouldAutoSelectCourse =
          !courseId || !mergedCourses.some((course) => course.id === courseId);

        setData((current) => ({
          ...current,
          courses: mergeCourses(current.courses, courses)
        }));

        if (shouldAutoSelectCourse) {
          applySelectedCourse(courses[0].id, mergedCourses);
        }

        setCourseSearchResults(courses);
        setCourseSearchFailed(false);
        setManualSetupOpen(false);
        setErrorMessage(null);
      } catch (error) {
        setCourseSearchFailed(true);
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

      {adminMode ? (
        <div className="flex items-center justify-between gap-3 rounded-[22px] border border-[#d8c07d]/45 bg-white/90 px-3 py-3 text-ink shadow-[0_10px_24px_rgba(17,32,23,0.08)]">
          <a
            href={adminBackHref}
            className="inline-flex min-h-10 items-center rounded-full border border-pine/15 bg-sand px-3 text-xs font-semibold uppercase tracking-[0.12em] text-ink/70"
          >
            Back
          </a>
          <div className="min-w-0 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fairway/70">
              Admin scorecard
            </p>
            <p className="truncate text-xs font-semibold text-ink/68">
              {data.isPublished && pageMode === "scorecard" ? "Editing final card" : "Commissioner mode"}
            </p>
          </div>
        </div>
      ) : null}

      {showSubmittedConfirmation ? (
        <section className="rounded-[28px] border border-pine/15 bg-[linear-gradient(180deg,#f3fbf6_0%,#e6f3ea_100%)] p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-pine/70">
            Submitted
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">The result is locked in.</h2>
          <p className="mt-2 text-sm leading-6 text-ink/70">
            This card now feeds the standings, bracket, and live feed.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => router.push(ROUTES.tournamentHome(data.match.tournamentSlug))}
              className="min-h-12 rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white"
            >
              Back to tournament
            </button>
            <button
              type="button"
              onClick={() => router.push(ROUTES.publicMatch(data.match.tournamentSlug, data.match.id))}
              className="min-h-12 rounded-full border border-pine/20 bg-white px-4 py-2 text-sm font-semibold text-ink"
            >
              View posted round
            </button>
          </div>
        </section>
      ) : null}

      {data.setupComplete && pageMode === "scorecard" && !isScorecardReadOnly && !showSubmittedConfirmation ? (
        <a
          href={RULES_JUDGE_URL}
          target="_blank"
          rel="noreferrer"
          className="grid min-h-16 grid-cols-[44px_1fr_auto] items-center gap-3 rounded-[24px] border border-pine/15 bg-white px-4 py-3 text-ink shadow-[0_10px_24px_rgba(17,32,23,0.08)]"
        >
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-pine text-white">
            <RulesJudgeIcon className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-fairway/72">
              Rules judge
            </span>
            <span className="mt-0.5 block text-sm font-semibold text-ink">Launch live rules help</span>
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-pine">
            Open
          </span>
        </a>
      ) : null}

      {pageMode === "scorecard" && isScorecardReadOnly && publishedScorecardView && !showSubmittedConfirmation ? (
        <PublicMatchScorecard
          roundLabel={data.match.roundLabel}
          status={data.match.status}
          resultLabel={null}
          courseName={selectedCourse?.name ?? "Course TBD"}
          courseLocation={publishedScorecardView.courseLocation}
          playedOnLabel={data.match.playedOn ?? "Date pending"}
          teams={publishedScorecardView.teams}
          summaries={data.scorecard?.teamSummaries ?? []}
          holes={publishedScorecardView.holes}
          backHref={adminMode ? adminBackHref : ROUTES.tournamentHome(data.match.tournamentSlug)}
        />
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
        <section className="rounded-[28px] border border-white/70 bg-[linear-gradient(145deg,rgba(255,252,247,0.98),rgba(247,241,227,0.94))] p-4 shadow-[0_14px_34px_rgba(17,32,23,0.08)]">
          <div className="grid gap-4 sm:grid-cols-[1.25fr_0.75fr]">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-gold">
                {data.match.stageLabel}
              </p>
              <h2 className="mt-2 text-[1.85rem] font-semibold leading-[1.04] text-ink text-balance sm:text-3xl">
                {data.match.homeTeamName} vs {data.match.awayTeamName}
              </h2>
              <p className="mt-3 text-sm font-medium leading-6 text-ink/64">
                {selectedCourse ? selectedCourse.name : "Find the course, set the tees, then open the card."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:content-start">
              <div className="rounded-2xl border border-mist bg-white px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/46">Status</p>
                <p className="mt-1 text-base font-semibold text-ink">
                  {data.isPublished ? "Published" : data.match.status}
                </p>
              </div>
              <div className="rounded-2xl border border-mist bg-white px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/46">Progress</p>
                <p className="mt-1 text-base font-semibold text-ink">{scoreProgressLabel}</p>
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
            </div>
        </div>

        {!courseLoaded ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] border border-mist bg-[#fbf7ec] p-4 sm:col-span-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-fairway/70">
                Find the course
              </p>
              <div className="mt-3 grid grid-cols-[1fr_76px] gap-2 sm:grid-cols-[1.3fr_120px_auto]">
                <input
                  type="text"
                  value={courseSearchQuery}
                  disabled={data.isPublished || isSearchingCourses}
                  onChange={(event) => setCourseSearchQuery(event.target.value)}
                  placeholder="Course name"
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
                  className="col-span-2 min-h-12 rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:col-span-1"
                >
                  {isSearchingCourses ? "Searching..." : "Search courses"}
                </button>
              </div>

              {courseSearchFailed || manualSetupOpen ? (
                <div className="mt-4 rounded-[22px] border border-dashed border-[#d7c28d] bg-white/70 p-3">
                  <button
                    type="button"
                    disabled={data.isPublished}
                    onClick={() => setManualSetupOpen((current) => !current)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <span>
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a6b08]">
                        Plan B
                      </span>
                      <span className="mt-1 block text-sm font-semibold text-ink">
                        Course not found? Use manual setup.
                      </span>
                    </span>
                    <span className="rounded-full border border-[#d7c28d] bg-white px-3 py-1.5 text-xs font-semibold text-[#8a6b08]">
                      {manualSetupOpen ? "Close" : "Manual"}
                    </span>
                  </button>

                  {manualSetupOpen ? (
                <div className="mt-4 space-y-4 border-t border-[#ead59a] pt-4">
                  <p className="text-sm leading-6 text-ink/70">
                    Use this only if search cannot find the course. Copy the course rating, slope,
                    par row, and handicap row from the physical scorecard.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-sm sm:col-span-2">
                      <span className="text-ink/70">Course name</span>
                      <input
                        type="text"
                        value={manualCourseName}
                        disabled={data.isPublished}
                        onChange={(event) => setManualCourseName(event.target.value)}
                        placeholder="Course name"
                        className="rounded-2xl border border-mist bg-white px-4 py-3"
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="text-ink/70">City</span>
                      <input
                        type="text"
                        value={manualCourseCity}
                        disabled={data.isPublished}
                        onChange={(event) => setManualCourseCity(event.target.value)}
                        placeholder="City"
                        className="rounded-2xl border border-mist bg-white px-4 py-3"
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="text-ink/70">State</span>
                      <input
                        type="text"
                        value={manualCourseState}
                        disabled={data.isPublished}
                        onChange={(event) => setManualCourseState(event.target.value.toUpperCase().slice(0, 2))}
                        placeholder="IL"
                        className="rounded-2xl border border-mist bg-white px-4 py-3"
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="text-ink/70">Tee name</span>
                      <input
                        type="text"
                        value={manualTeeName}
                        disabled={data.isPublished}
                        onChange={(event) => setManualTeeName(event.target.value)}
                        placeholder="Blue tees"
                        className="rounded-2xl border border-mist bg-white px-4 py-3"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="grid gap-1 text-sm">
                        <span className="text-ink/70">Rating</span>
                        <input
                          type="number"
                          step="0.1"
                          value={manualCourseRating}
                          disabled={data.isPublished}
                          onChange={(event) => setManualCourseRating(event.target.value)}
                          placeholder="71.6"
                          className="rounded-2xl border border-mist bg-white px-4 py-3"
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        <span className="text-ink/70">Slope</span>
                        <input
                          type="number"
                          value={manualSlope}
                          disabled={data.isPublished}
                          onChange={(event) => setManualSlope(event.target.value.replace(/\D/g, "").slice(0, 3))}
                          placeholder="127"
                          className="rounded-2xl border border-mist bg-white px-4 py-3"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-[#ead59a] bg-white">
                    <div className="grid grid-cols-[64px_1fr_1fr] gap-2 border-b border-[#ead59a] bg-[#f6edd0] px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a6b08]">
                      <span>Hole</span>
                      <span>Par</span>
                      <span>HCP</span>
                    </div>
                    <div className="grid gap-2 px-3 py-3">
                      {manualCourseHoles.map((hole) => (
                        <div
                          key={`manual-course-hole-${hole.holeNumber}`}
                          className="grid grid-cols-[64px_1fr_1fr] items-center gap-2"
                        >
                          <span className="text-sm font-semibold text-ink">{hole.holeNumber}</span>
                          <input
                            type="number"
                            min="3"
                            max="6"
                            value={hole.par}
                            disabled={data.isPublished}
                            onChange={(event) =>
                              handleManualCourseHoleChange(hole.holeNumber, "par", event.target.value)
                            }
                            className="min-w-0 rounded-xl border border-mist bg-white px-3 py-2"
                          />
                          <input
                            type="number"
                            min="1"
                            max="18"
                            value={hole.strokeIndex}
                            disabled={data.isPublished}
                            onChange={(event) =>
                              handleManualCourseHoleChange(hole.holeNumber, "strokeIndex", event.target.value)
                            }
                            className="min-w-0 rounded-xl border border-mist bg-white px-3 py-2"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={data.isPublished}
                    onClick={applyManualCourse}
                    className="min-h-11 w-full rounded-full bg-[#8a6b08] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Use manual course setup
                  </button>
                </div>
                  ) : null}
                </div>
              ) : null}
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
        ) : null}

        {!courseLoaded ? (
          <div className="mt-4 rounded-[24px] border border-dashed border-mist bg-white px-4 py-5 text-sm leading-6 text-ink/68">
            Pick a course to unlock tee selections and handicap indexes.
          </div>
        ) : (
          <>
            <div className="mt-4 rounded-[24px] border border-mist bg-[#fbf7ec] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-fairway/70">
                    Course
                  </p>
                  <p className="mt-1 text-lg font-semibold leading-snug text-ink">{selectedCourse.name}</p>
                  <p className="mt-1 text-sm text-ink/62">
                    {[selectedCourse.city, selectedCourse.state].filter(Boolean).join(", ") || "Course selected"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={data.isPublished}
                  onClick={clearSelectedCourse}
                  className="shrink-0 rounded-full border border-fairway/15 bg-white px-3 py-2 text-xs font-semibold text-ink disabled:opacity-60"
                >
                  Clear
                </button>
              </div>

              {selectedCourseHasTeeData ? (
                <div className="mt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-fairway/70">
                    Group tees
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {selectedCourse.tees.map((tee) => {
                      const isSelected = selectedGroupTeeId === tee.id;

                      return (
                        <button
                          key={tee.id}
                          type="button"
                          disabled={data.isPublished}
                          onClick={() => handleGroupTeeChange(tee.id)}
                          className={
                            isSelected
                              ? "rounded-2xl border border-pine bg-pine px-4 py-3 text-left text-sm font-semibold text-white"
                              : "rounded-2xl border border-mist bg-white px-4 py-3 text-left text-sm font-semibold text-ink"
                          }
                        >
                          <span className="block">{tee.name}</span>
                          <span className={isSelected ? "mt-1 block text-xs text-white/72" : "mt-1 block text-xs text-ink/58"}>
                            {tee.slope} slope • {tee.courseRating} rating
                            {tee.holes.length === 18 ? " • holes loaded" : " • needs hole row"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-4 space-y-3">
              {teamGroups.map((team) => (
                <div key={team.teamId} className="rounded-[24px] border border-mist bg-[#fbf7ec] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-fairway/68">
                        Team
                      </p>
                      <p className="mt-1 text-lg font-semibold text-ink">{team.teamName}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2">
                    {team.players.map((player) => {
                      const setupPlayer = setupPlayers.find((entry) => entry.playerId === player.playerId);
                      const preview = previewByPlayerId.get(player.playerId);

                      return (
                        <div key={player.playerId} className="rounded-2xl border border-mist bg-white p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-base font-semibold text-ink">{player.playerName}</p>
                            {preview ? (
                              <span className="rounded-full bg-[#eef8f1] px-3 py-1 text-[11px] font-semibold text-pine">
                                {preview.matchStrokeCount} strokes
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-3 grid gap-2">
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
              <div className="mt-4 grid gap-3 rounded-[24px] border border-mist bg-[#fbf7ec] px-4 py-4">
                <div className="space-y-2">
                  <label className="flex items-start gap-3 rounded-2xl border border-[#d8c27a] bg-[#fff7dd] px-3 py-3 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={setupConfirmationChecked}
                      onChange={(event) => setSetupConfirmationChecked(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-mist"
                    />
                    <span className="leading-6">
                      We confirmed today&apos;s Handicap Indexes, course, and tees for all four players.
                    </span>
                  </label>
                  {!canGenerateScorecard ? (
                    <div className="space-y-1 text-xs text-ink/65">
                      {setupBlockers.map((blocker) => (
                        <p key={blocker}>{blocker}</p>
                      ))}
                    </div>
                  ) : !setupConfirmationChecked ? (
                    <div className="space-y-1 text-xs text-ink/65">
                      <p>Confirm the day-of indexes and tees above before the scorecard unlocks.</p>
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={isPending || !canProceedToScorecard}
                  onClick={handleSetupSubmit}
                  className="min-h-12 w-full rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {isPending
                    ? "Saving setup..."
                    : data.setupComplete
                      ? "Confirm setup and open scorecard"
                      : "Confirm setup and generate scorecard"}
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

      {data.setupComplete && pageMode === "scorecard" && (!data.isPublished || canAdminOverridePostedCard) && !showSubmittedConfirmation ? (
        <MatchScorecardSummary
          eyebrow={data.match.stageLabel}
          title={`${data.match.homeTeamName} vs ${data.match.awayTeamName}`}
          statusLabel={data.isPublished ? (canAdminOverridePostedCard ? "Admin edit" : "Final") : data.match.status}
          statusPill={(!data.isPublished || canAdminOverridePostedCard) && draftStatus ? broadcastSaveLabel : null}
          statusActions={
            !data.isPublished ? (
              <button
                type="button"
                onClick={() => navigateToPage("setup")}
                className="rounded-full border border-pine/15 bg-white px-3 py-2 text-xs font-semibold text-ink"
              >
                Edit setup
              </button>
            ) : null
          }
          courseName={selectedCourse?.name ?? "Course not set"}
          courseMeta={scoreProgressLabel}
          teams={editableSummaryTeams}
          strokes={editableStrokeSummaries}
        >

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

          <div className="mt-5 space-y-4">
            <div className="rounded-[28px] border border-[#bfa66a] bg-white shadow-[0_12px_28px_rgba(76,58,26,0.08)]">
              <div className="border-b border-[#c8b77f] bg-[#fbf5e6] px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
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
                  </div>
                  {!isScorecardReadOnly ? (
                    showScorecardEditHint ? (
                      <span className="rounded-full bg-white/70 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/46">
                        Tap a score to edit
                      </span>
                    ) : null
                  ) : null}
                </div>
              </div>

              <ScorecardTableFrame segment={scoreSegment}>
                    <div className={`sticky left-0 z-10 border-b border-r border-[#bfa66a] bg-[#f2ead9] text-ink/58 ${scorecardLabelCellClass}`}>
                      Hole
                    </div>
                    {visibleHoleNumbers.map((holeNumber) => (
                      <button
                        key={`hole-heading-${holeNumber}`}
                        type="button"
                        onClick={() => setSelectedHoleNumber(holeNumber)}
                        className={`border-b border-r border-[#c8b77f] bg-[#f2ead9] transition ${scorecardHeaderCellClass}`}
                      >
                        <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-pine/10 text-sm font-semibold text-ink">
                          {holeNumber}
                        </span>
                      </button>
                    ))}
                    {scoreSegment === "front" ? (
                      <div className={`border-b border-r border-[#c8b77f] bg-[#f2ead9] text-ink ${scorecardHeaderCellClass}`}>
                        Out
                      </div>
                    ) : (
                      <>
                        <div className={`border-b border-r border-[#c8b77f] bg-[#f2ead9] text-ink ${scorecardHeaderCellClass}`}>
                          In
                        </div>
                        <div className={`border-b border-r border-[#c8b77f] bg-[#f2ead9] text-ink ${scorecardHeaderCellClass}`}>
                          Total
                        </div>
                      </>
                    )}

                    {[
                      {
                        label: "HCP",
                        labelNote: null,
                        values: visibleHoleNumbers.map((holeNumber) => baseHoleMetaByNumber.get(holeNumber)?.strokeIndex ?? "—"),
                        segmentTotal: "",
                        roundTotal: "",
                        rowSurface: "bg-[#f5eddc]",
                        totalSurface: "bg-[#eee1c6]"
                      },
                      {
                        label: "Yards",
                        labelNote: scorecardYardageLabel === "Yards" ? null : scorecardYardageLabel.replace(/\s+yards$/i, ""),
                        values: visibleHoleNumbers.map((holeNumber) => baseHoleMetaByNumber.get(holeNumber)?.yardage ?? "—"),
                        segmentTotal: visibleHoleNumbers.reduce(
                          (total, holeNumber) => total + (baseHoleMetaByNumber.get(holeNumber)?.yardage ?? 0),
                          0
                        ),
                        roundTotal: Array.from(baseHoleMetaByNumber.values()).reduce(
                          (total, hole) => total + (hole.yardage ?? 0),
                          0
                        ),
                        rowSurface: "bg-[#f3ecd9]",
                        totalSurface: "bg-[#eadbb7]"
                      },
                      {
                        label: "Par",
                        labelNote: null,
                        values: visibleHoleNumbers.map((holeNumber) => baseHoleMetaByNumber.get(holeNumber)?.par ?? "—"),
                        segmentTotal: visibleHoleNumbers.reduce(
                          (total, holeNumber) => total + (baseHoleMetaByNumber.get(holeNumber)?.par ?? 0),
                          0
                        ),
                        roundTotal: Array.from(baseHoleMetaByNumber.values()).reduce(
                          (total, hole) => total + (hole.par ?? 0),
                          0
                        ),
                        rowSurface: "bg-[#f7df8b]",
                        totalSurface: "bg-[#efd16c]"
                      }
                    ].map(({ label, labelNote, values, segmentTotal, roundTotal, rowSurface, totalSurface }) => (
                      <Fragment key={`meta-${label}`}>
                        <div className={`sticky left-0 z-10 border-b border-r border-[#bfa66a] px-3 py-3 text-sm font-semibold text-ink ${rowSurface}`}>
                          <span className="block">{label}</span>
                          {labelNote ? (
                            <span className="mt-1 block max-w-[11rem] truncate text-[9px] uppercase tracking-[0.14em] text-ink/54">
                              {labelNote}
                            </span>
                          ) : null}
                        </div>
                        {values.map((value, index) => (
                          <button
                            key={`meta-${label}-${visibleHoleNumbers[index]}`}
                            type="button"
                            onClick={() => setSelectedHoleNumber(visibleHoleNumbers[index] ?? 1)}
                            className={`border-b border-r border-[#c8b77f] px-1 py-3 text-center text-sm font-semibold text-ink/72 ${rowSurface}`}
                          >
                            {value}
                          </button>
                        ))}
                        <div className={`border-b border-r border-[#c8b77f] px-2 py-3 text-center text-sm font-semibold text-ink ${totalSurface}`}>
                          {segmentTotal}
                        </div>
                        {scoreSegment === "back" ? (
                          <div className={`border-b border-r border-[#c8b77f] px-2 py-3 text-center text-sm font-semibold text-ink ${totalSurface}`}>
                            {roundTotal}
                          </div>
                        ) : null}
                      </Fragment>
                    ))}

                    {teamScorecards.map((teamCard) => (
                      <Fragment key={`team-block-${teamCard.team.teamId}`}>
                        {teamCard.players.map((playerCard) => (
                          <Fragment key={`${teamCard.team.teamId}-${playerCard.player.playerId}`}>
                            <div className="sticky left-0 z-10 border-b border-r border-[#bfa66a] bg-[#fffaf0] px-3 py-3">
                              <p className="truncate text-sm font-semibold leading-tight text-ink">
                                {scorecardDisplayName(playerCard.player.playerName)}
                              </p>
                              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/54">
                                Gross
                              </p>
                              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/42">
                                {playerCard.preview?.matchStrokeCount ?? 0} stroke
                                {(playerCard.preview?.matchStrokeCount ?? 0) === 1 ? "" : "s"}
                              </p>
                            </div>
                            {visibleHoleNumbers.map((holeNumber) => {
                              const holeMeta = playerCard.holes.find((hole) => hole.holeNumber === holeNumber);
                              const score = scoreRows.find((hole) => hole.holeNumber === holeNumber)?.scores[playerCard.player.playerId] ?? "";
                              const strokeCount = playerCard.preview?.strokesByHole[holeNumber] ?? 0;

                              return (
                                <div
                                  key={`${playerCard.player.playerId}-gross-${holeNumber}`}
                                  className={`border-b border-r border-[#c8b77f] bg-white ${scorecardBodyCellClass}`}
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
                                      className={`mx-auto flex items-center justify-center border-2 text-center font-semibold outline-none transition focus:ring-2 focus:ring-pine/35 ${scorecardScoreMarkClass} ${scorecardScoreStyle(
                                        String(score),
                                        holeMeta?.par,
                                        true
                                      )}`}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                            {scoreSegment === "front" ? (
                              <div className={`border-b border-r border-[#c8b77f] bg-[#f7f1e3] ${scorecardBodyCellClass}`}>
                                <span className={`mx-auto flex items-center justify-center font-semibold text-ink ${scorecardScoreMarkClass}`}>
                                  {playerCard.frontNineNetTotal}
                                </span>
                              </div>
                            ) : (
                              <>
                                <div className={`border-b border-r border-[#c8b77f] bg-[#f7f1e3] ${scorecardBodyCellClass}`}>
                                  <span className={`mx-auto flex items-center justify-center font-semibold text-ink ${scorecardScoreMarkClass}`}>
                                    {playerCard.backNineNetTotal}
                                  </span>
                                </div>
                                <div className={`border-b border-r border-[#c8b77f] bg-[#efe7d6] ${scorecardBodyCellClass}`}>
                                  <span className={`mx-auto flex items-center justify-center font-semibold text-ink ${scorecardScoreMarkClass}`}>
                                    {playerCard.netTotal}
                                  </span>
                                </div>
                              </>
                            )}
                          </Fragment>
                        ))}

                        <div className={`sticky left-0 z-10 border-b border-r border-[#bfa66a] px-3 py-3 ${teamCard.styles.accentSurface}`}>
                          <p className="truncate text-sm font-semibold text-ink">
                            {scorecardTeamInitials(teamCard.team.teamName)} best ball
                          </p>
                          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/54">
                            Team net used
                          </p>
                        </div>
                        {teamCard.holeSummaries.map((holeSummary) => (
                          <div
                            key={`${teamCard.team.teamId}-team-net-${holeSummary.holeNumber}`}
                            className={`border-b border-r border-[#c8b77f] bg-white text-center ${scorecardBodyCellClass}`}
                          >
                            <span
                              className={`mx-auto flex items-center justify-center border-2 font-semibold ${scorecardScoreMarkClass} ${
                                holeSummary.bestNet == null ? "text-current/35" : "text-current"
                              } ${scorecardScoreStyle(holeSummary.bestNet, holeSummary.par ?? undefined, true)}`}
                            >
                              {holeSummary.bestNet ?? ""}
                            </span>
                          </div>
                        ))}
                        {scoreSegment === "front" ? (
                          <div className={`border-b border-r border-[#c8b77f] text-center ${teamCard.styles.accentSurface} ${scorecardBodyCellClass}`}>
                            <span className={`mx-auto flex items-center justify-center font-semibold text-ink ${scorecardScoreMarkClass}`}>
                              {teamCard.frontNineBetterBallNetTotal}
                            </span>
                          </div>
                        ) : (
                          <>
                            <div className={`border-b border-r border-[#c8b77f] text-center ${teamCard.styles.accentSurface} ${scorecardBodyCellClass}`}>
                              <span className={`mx-auto flex items-center justify-center font-semibold text-ink ${scorecardScoreMarkClass}`}>
                                {teamCard.backNineBetterBallNetTotal}
                              </span>
                            </div>
                            <div className={`border-b border-r border-[#c8b77f] text-center ${teamCard.styles.accentSurface} ${scorecardBodyCellClass}`}>
                              <span className={`mx-auto flex items-center justify-center font-semibold text-ink ${scorecardScoreMarkClass}`}>
                                {teamCard.overallBetterBallNetTotal}
                              </span>
                            </div>
                          </>
                        )}
                      </Fragment>
                    ))}
              </ScorecardTableFrame>
            </div>
          </div>

          {!isScorecardReadOnly && (canAdminOverridePostedCard || isScorecardComplete) ? (
            <div className="mt-8">
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
        </MatchScorecardSummary>
      ) : null}

      {data.isPublished && submittedThisSession && canAdminOverridePostedCard ? (
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

      {data.scorecard && !publishedScorecardView && !showSubmittedConfirmation ? (
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
