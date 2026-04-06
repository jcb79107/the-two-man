"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { DecoratedBracketRound } from "@/lib/server/bracket";
import { formatDateLabel } from "@/lib/server/formatting";

interface BracketViewProps {
  rounds: Array<
    Omit<DecoratedBracketRound, "matches"> & {
      matches: Array<DecoratedBracketRound["matches"][number] & { href: string }>;
    }
  >;
}

const CARD_WIDTH = 264;
const CARD_HEIGHT = 156;
const COLUMN_GAP = 78;
const BOARD_PADDING_X = 28;
const BOARD_PADDING_TOP = 84;
const FIRST_ROUND_GAP = 28;
const CONNECTOR_STROKE = "#b8923b";
const CONNECTOR_WIDTH = 3;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function statusTone(status: string) {
  if (status === "FINAL") {
    return "bg-[#e3f1ea] text-[#174f38]";
  }

  if (["READY", "IN_PROGRESS", "SUBMITTED", "REOPENED"].includes(status)) {
    return "bg-[#fff1c9] text-[#8a6b08]";
  }

  return "bg-[#f4eee0] text-ink/60";
}

export function BracketView({ rounds }: BracketViewProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [activeRoundIndex, setActiveRoundIndex] = useState(0);

  const layouts = rounds.map((round, roundIndex) => {
    let tops: number[];

    if (roundIndex === 0) {
      tops = round.matches.map((_, matchIndex) => BOARD_PADDING_TOP + matchIndex * (CARD_HEIGHT + FIRST_ROUND_GAP));
    } else {
      const previousCenters = rounds[roundIndex - 1]
        ? layoutsSafe(rounds, roundIndex - 1).centers
        : [];

      tops = round.matches.map((_, matchIndex) => {
        const firstCenter = previousCenters[matchIndex * 2] ?? BOARD_PADDING_TOP + CARD_HEIGHT / 2;
        const secondCenter = previousCenters[matchIndex * 2 + 1] ?? firstCenter;
        return (firstCenter + secondCenter) / 2 - CARD_HEIGHT / 2;
      });
    }

    const centers = tops.map((top) => top + CARD_HEIGHT / 2);

    return {
      roundId: round.id,
      left: BOARD_PADDING_X + roundIndex * (CARD_WIDTH + COLUMN_GAP),
      tops,
      centers
    };
  });

  const boardHeight =
    Math.max(
      ...layouts.flatMap((layout) => layout.tops.map((top) => top + CARD_HEIGHT)),
      BOARD_PADDING_TOP + CARD_HEIGHT
    ) + 36;
  const boardWidth =
    BOARD_PADDING_X * 2 + rounds.length * CARD_WIDTH + Math.max(0, rounds.length - 1) * COLUMN_GAP;

  const connectors = rounds.slice(0, -1).flatMap((_, roundIndex) => {
    const currentLayout = layouts[roundIndex];
    const nextLayout = layouts[roundIndex + 1];
    const currentRight = currentLayout.left + CARD_WIDTH;
    const nextLeft = nextLayout.left;
    const connectorX = currentRight + (nextLeft - currentRight) / 2;

    return nextLayout.centers.map((nextCenter, matchIndex) => {
      const topSource = currentLayout.centers[matchIndex * 2] ?? nextCenter;
      const bottomSource = currentLayout.centers[matchIndex * 2 + 1] ?? topSource;

      return {
        id: `connector-${roundIndex}-${matchIndex}`,
        left: currentRight,
        connectorX,
        nextLeft,
        topSource,
        bottomSource,
        nextCenter
      };
    });
  });

  function jumpToRound(index: number) {
    const track = boardRef.current;
    if (!track) {
      return;
    }

    const nextLeft = BOARD_PADDING_X + index * (CARD_WIDTH + COLUMN_GAP) - 16;
    track.scrollTo({
      left: nextLeft,
      behavior: "smooth"
    });
    setActiveRoundIndex(index);
  }

  function handleBoardScroll(event: React.UIEvent<HTMLDivElement>) {
    const scrollLeft = event.currentTarget.scrollLeft;
    const roundWidth = CARD_WIDTH + COLUMN_GAP;
    const inferredIndex = clamp(Math.round((scrollLeft + 32) / roundWidth), 0, Math.max(0, rounds.length - 1));

    if (inferredIndex !== activeRoundIndex) {
      setActiveRoundIndex(inferredIndex);
    }
  }

  return (
    <div className="rounded-[30px] border border-[#d7c28d] bg-[linear-gradient(180deg,#fbf7ed_0%,#f4ead1_100%)] p-4 text-ink shadow-[0_24px_56px_rgba(76,58,26,0.12)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {rounds.map((round, roundIndex) => (
            <button
              key={round.id}
              type="button"
              onClick={() => jumpToRound(roundIndex)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                roundIndex === activeRoundIndex
                  ? "bg-pine text-white shadow-[0_10px_24px_rgba(18,76,58,0.18)]"
                  : "border border-[#d7c28d] bg-white text-ink/68"
              }`}
            >
              {round.label}
            </button>
          ))}
        </div>
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-fairway/54">
          Swipe bracket
        </span>
      </div>

      <div
        ref={boardRef}
        onScroll={handleBoardScroll}
        className="mt-4 overflow-x-auto rounded-[24px] border border-[#e4d6b5] bg-[linear-gradient(180deg,#f9f3e7_0%,#f4ead7_100%)] p-3 pb-2 snap-x snap-mandatory [scrollbar-color:#44524b_transparent] [scrollbar-width:thin]"
      >
        <div
          className="relative"
          style={{
            width: boardWidth,
            minHeight: boardHeight
          }}
        >
          {rounds.map((round, roundIndex) => {
            const layout = layouts[roundIndex];

            return (
              <section
                key={round.id}
                className="absolute top-0 snap-start"
                style={{
                  left: layout.left,
                  width: CARD_WIDTH
                }}
              >
                <div className="mb-4 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fairway/58">
                    {round.stage}
                  </p>
                  <h2 className="mt-1.5 text-[1.5rem] font-semibold text-ink">{round.label}</h2>
                  <p className="mt-0.5 text-sm text-ink/58">
                    {round.matches.length} matchup{round.matches.length === 1 ? "" : "s"}
                  </p>
                </div>

                {round.matches.map((match, matchIndex) => {
                  const top = layout.tops[matchIndex];
                  const homeWinner = match.winnerTeamId != null && match.winnerTeamId === match.homeTeamId;
                  const awayWinner = match.winnerTeamId != null && match.winnerTeamId === match.awayTeamId;

                  return (
                    <Link
                      key={match.id}
                      href={match.href}
                      className="absolute block rounded-[18px] border border-[#d8cab0] bg-white p-3 shadow-[0_8px_20px_rgba(76,58,26,0.08)] transition hover:-translate-y-0.5 hover:border-[#bca36a] hover:shadow-[0_12px_26px_rgba(76,58,26,0.12)]"
                      style={{
                        top,
                        width: CARD_WIDTH,
                        minHeight: CARD_HEIGHT
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fairway/48">
                            {formatDateLabel(match.scheduledAt)}
                          </p>
                          <h3 className="mt-1 text-[1.3rem] font-semibold leading-tight text-ink">{match.label}</h3>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] ${statusTone(match.status)}`}>
                          {match.status}
                        </span>
                      </div>

                      <div className="mt-3 space-y-2">
                        <div
                          className={`flex items-center justify-between rounded-[14px] border px-3 py-2.5 ${
                            homeWinner
                              ? "border-pine/28 bg-[#e8f3ed] text-pine shadow-[inset_3px_0_0_rgba(18,76,58,0.78),inset_0_0_0_1px_rgba(18,76,58,0.12)]"
                              : "border-[#d6c8a6] bg-white text-ink"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-8 w-8 items-center justify-center rounded-[10px] text-[11px] font-semibold ${
                                homeWinner ? "bg-pine text-white" : "bg-sand text-ink/72"
                              }`}
                            >
                              {match.homeSeedNumber ?? "?"}
                            </span>
                            <span className="text-[0.92rem] font-semibold">{match.homeTeamName}</span>
                          </div>
                          <span className={`text-[11px] uppercase tracking-[0.16em] ${homeWinner ? "text-pine/72" : "text-ink/44"}`}>
                            {homeWinner ? "Adv" : "Home"}
                          </span>
                        </div>

                        <div
                          className={`flex items-center justify-between rounded-[14px] border px-3 py-2.5 ${
                            awayWinner
                              ? "border-[#7b68b4]/28 bg-[#f1edfb] text-[#4f3e75] shadow-[inset_3px_0_0_rgba(95,75,139,0.78),inset_0_0_0_1px_rgba(95,75,139,0.12)]"
                              : "border-[#d6c8a6] bg-white text-ink"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-8 w-8 items-center justify-center rounded-[10px] text-[11px] font-semibold ${
                                awayWinner ? "bg-[#5f4b8b] text-white" : "bg-sand text-ink/72"
                              }`}
                            >
                              {match.awaySeedNumber ?? "?"}
                            </span>
                            <span className="text-[0.92rem] font-semibold">{match.awayTeamName}</span>
                          </div>
                          <span className={`text-[11px] uppercase tracking-[0.16em] ${awayWinner ? "text-[#5f4b8b]/72" : "text-ink/44"}`}>
                            {awayWinner ? "Adv" : "Away"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#e4d7ba] pt-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-fairway/54">Result</p>
                          <p className="mt-1 text-sm font-medium text-ink/82">
                            {match.resultLabel ?? "Awaiting result"}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-pine">Open card</span>
                      </div>
                    </Link>
                  );
                })}
              </section>
            );
          })}

          {connectors.map((connector) => (
            <svg
              key={connector.id}
              className="pointer-events-none absolute inset-0 overflow-visible"
              width={boardWidth}
              height={boardHeight}
              viewBox={`0 0 ${boardWidth} ${boardHeight}`}
              fill="none"
              aria-hidden="true"
            >
              <path
                d={`M ${connector.left} ${connector.topSource} H ${connector.connectorX} V ${connector.nextCenter} H ${connector.nextLeft}`}
                stroke={CONNECTOR_STROKE}
                strokeWidth={CONNECTOR_WIDTH}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.95"
              />
              <path
                d={`M ${connector.left} ${connector.bottomSource} H ${connector.connectorX} V ${connector.nextCenter} H ${connector.nextLeft}`}
                stroke="#d8c28d"
                strokeWidth={CONNECTOR_WIDTH}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.55"
              />
            </svg>
          ))}
        </div>
      </div>
    </div>
  );
}

function layoutsSafe(
  rounds: BracketViewProps["rounds"],
  roundIndex: number
): { tops: number[]; centers: number[] } {
  const tops =
    roundIndex === 0
      ? rounds[0].matches.map((_, matchIndex) => BOARD_PADDING_TOP + matchIndex * (CARD_HEIGHT + FIRST_ROUND_GAP))
      : [];

  if (roundIndex === 0) {
    return {
      tops,
      centers: tops.map((top) => top + CARD_HEIGHT / 2)
    };
  }

  const previous = layoutsSafe(rounds, roundIndex - 1);
  const nextTops = rounds[roundIndex].matches.map((_, matchIndex) => {
    const firstCenter = previous.centers[matchIndex * 2] ?? BOARD_PADDING_TOP + CARD_HEIGHT / 2;
    const secondCenter = previous.centers[matchIndex * 2 + 1] ?? firstCenter;
    return (firstCenter + secondCenter) / 2 - CARD_HEIGHT / 2;
  });

  return {
    tops: nextTops,
    centers: nextTops.map((top) => top + CARD_HEIGHT / 2)
  };
}
