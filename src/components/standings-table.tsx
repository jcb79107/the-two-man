import type { StandingsRow } from "@/types/models";
import { PodWinnerIcon } from "@/components/pod-winner-icon";
import { WildcardHatIcon } from "@/components/wildcard-hat-icon";

interface StandingsTableProps {
  rows: StandingsRow[];
  markerTeamIds?: string[];
  markerLabel?: string;
  winnerTeamIds?: string[];
  winnerLabel?: string;
}

function WildCardMarker({ label }: { label: string }) {
  return (
    <span
      title={label}
      aria-label={label}
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#cfc2ff] bg-[#efe7ff] text-[#5f47a6]"
    >
      <WildcardHatIcon className="h-3 w-3" />
    </span>
  );
}

function PodWinnerMarker({ label }: { label: string }) {
  return (
    <span
      title={label}
      aria-label={label}
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#d4bf83] bg-[#fff6dd] text-[#8a6a09]"
    >
      <PodWinnerIcon className="h-3 w-3" />
    </span>
  );
}

function standingsTieKey(row: StandingsRow) {
  return [
    row.wins,
    row.losses,
    row.ties,
    row.holePoints,
    row.holesWon,
    row.cumulativeNetBetterBall ?? "null"
  ].join("|");
}

function getLeaderboardPositions(rows: StandingsRow[]) {
  let currentRank = 1;

  return rows.map((row, index) => {
    const currentKey = standingsTieKey(row);
    const prevKey = index > 0 ? standingsTieKey(rows[index - 1]!) : null;
    const nextKey = index < rows.length - 1 ? standingsTieKey(rows[index + 1]!) : null;

    if (index > 0 && currentKey !== prevKey) {
      currentRank = index + 1;
    }

    const isTied = currentKey === prevKey || currentKey === nextKey;
    return isTied ? `T${currentRank}` : String(currentRank);
  });
}

export function StandingsTable({
  rows,
  markerTeamIds = [],
  markerLabel = "WC line",
  winnerTeamIds = [],
  winnerLabel = "Pod leader"
}: StandingsTableProps) {
  const positions = getLeaderboardPositions(rows);
  const markedIds = new Set(markerTeamIds);
  const winnerIds = new Set(winnerTeamIds);

  return (
    <div className="space-y-2">
      {rows.map((row, index) => {
        const isPodWinner = winnerIds.has(row.teamId);
        const isWildCard = markedIds.has(row.teamId);

        return (
          <article
            key={row.teamId}
            className={`overflow-hidden rounded-[22px] border bg-white shadow-[0_10px_24px_rgba(17,32,23,0.05)] ${
              isPodWinner
                ? "border-[#d4bf83] bg-[linear-gradient(135deg,#fffdfa_0%,#fff5d9_100%)]"
                : isWildCard
                  ? "border-[#cfc2ff] bg-[linear-gradient(135deg,#fff_0%,#f7f1ff_100%)]"
                  : "border-mist"
            }`}
          >
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-3.5 sm:px-4">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    isPodWinner
                      ? "bg-pine text-white"
                      : isWildCard
                        ? "bg-[#efe7ff] text-[#5f47a6]"
                        : "bg-sand text-ink"
                  }`}
                >
                  {positions[index]}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  {isPodWinner ? <PodWinnerMarker label={winnerLabel} /> : null}
                  {isWildCard ? <WildCardMarker label={markerLabel} /> : null}
                </div>
              </div>

              <div className="min-w-0">
                <p className="truncate text-base font-semibold leading-tight text-ink">{row.teamName}</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-fairway/68">
                  {isPodWinner ? winnerLabel : isWildCard ? markerLabel : `${row.matchesPlayed} played`}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fairway/62">Rec</p>
                <p className="mt-1 whitespace-nowrap text-base font-semibold text-ink">
                  {row.wins}-{row.losses}-{row.ties}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-px border-t border-mist/80 bg-mist/80">
              <div className="bg-white/82 px-3.5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fairway/66">Hole pts</p>
                <p className="mt-1 text-lg font-semibold text-ink">{row.holePoints}</p>
              </div>
              <div className="bg-white/82 px-3.5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fairway/66">Won</p>
                <p className="mt-1 text-lg font-semibold text-ink">{row.holesWon}</p>
              </div>
              <div className="bg-white/82 px-3.5 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fairway/66">Net BB</p>
                <p className="mt-1 text-lg font-semibold text-ink">{row.cumulativeNetBetterBall ?? "-"}</p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
