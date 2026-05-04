import type { ReactNode } from "react";

export type ScorecardSegment = "front" | "back";

export function getScorecardSegmentHoles(segment: ScorecardSegment) {
  return segment === "front" ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : [10, 11, 12, 13, 14, 15, 16, 17, 18];
}

export function getScorecardGridClass(segment: ScorecardSegment) {
  return segment === "front"
    ? "grid grid-cols-[132px_repeat(9,56px)_62px] sm:grid-cols-[220px_repeat(9,minmax(78px,1fr))_96px]"
    : "grid grid-cols-[132px_repeat(9,56px)_62px_62px] sm:grid-cols-[220px_repeat(9,minmax(78px,1fr))_96px_96px]";
}

export function getScorecardMinWidthClass(segment: ScorecardSegment) {
  return segment === "front" ? "min-w-[698px] sm:min-w-[1020px]" : "min-w-[760px] sm:min-w-[1116px]";
}

export const scorecardHeaderCellClass =
  "px-1.5 py-2 text-center text-sm font-semibold sm:px-3 sm:py-4 sm:text-xl";

export const scorecardLabelCellClass =
  "px-2 py-2.5 text-[11px] font-semibold sm:px-4 sm:py-4 sm:text-lg";

export const scorecardBodyCellClass = "px-1 py-2 text-center sm:px-3 sm:py-3";

export const scorecardScoreMarkClass =
  "h-8 w-8 text-[15px] leading-none tracking-normal sm:h-12 sm:w-12 sm:text-xl";

export function scorecardScoreStyle(
  score: string | number | null | undefined,
  par: number | undefined,
  compact = true
) {
  const gross = score == null || score === "" ? null : Number(score);

  if (gross == null || !Number.isFinite(gross) || par == null) {
    return "rounded-none border-2 border-[#b9b9b9] bg-white text-ink shadow-none";
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

export function ScorecardTableFrame({
  segment,
  children,
  className = ""
}: {
  segment: ScorecardSegment;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto overscroll-x-contain pb-2 ${className}`}>
      <div
        className={`${getScorecardMinWidthClass(
          segment
        )} overflow-hidden rounded-[24px] border border-mist bg-white shadow-[0_12px_28px_rgba(76,58,26,0.08)]`}
      >
        <div className={getScorecardGridClass(segment)}>{children}</div>
      </div>
    </div>
  );
}
