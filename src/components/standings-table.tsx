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
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#d4bf83] bg-[#fff6dd] text-[#8a6a09] shadow-[0_6px_14px_rgba(138,106,9,0.12)]"
    >
      <WildcardHatIcon className="h-3.5 w-3.5" />
    </span>
  );
}

function PodWinnerMarker({ label }: { label: string }) {
  return (
    <span
      title={label}
      aria-label={label}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#d4bf83] bg-[#fff6dd] text-[#8a6a09] shadow-[0_6px_14px_rgba(138,106,9,0.12)]"
    >
      <PodWinnerIcon className="h-3.5 w-3.5" />
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
    <div className="overflow-hidden rounded-2xl border border-mist bg-white">
      <div className="divide-y divide-mist/80 md:hidden">
        {rows.map((row, index) => (
          <article key={row.teamId} className="px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex shrink-0 items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pine text-[11px] font-semibold text-white">
                    {positions[index]}
                  </span>
                  {winnerIds.has(row.teamId) ? <PodWinnerMarker label={winnerLabel} /> : null}
                  {markedIds.has(row.teamId) ? <WildCardMarker label={markerLabel} /> : null}
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold leading-tight text-ink">{row.teamName}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-fairway/72">
                    Record {row.wins}-{row.losses}-{row.ties}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-sand px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fairway/72">
                  Hole Pts
                </p>
                <p className="mt-1 text-base font-semibold text-ink">{row.holePoints}</p>
              </div>
              <div className="rounded-2xl bg-sand px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fairway/72">
                  Holes Won
                </p>
                <p className="mt-1 text-base font-semibold text-ink">{row.holesWon}</p>
              </div>
              <div className="rounded-2xl bg-sand px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fairway/72">
                  Total Net BB
                </p>
                <p className="mt-1 text-base font-semibold text-ink">
                  {row.cumulativeNetBetterBall ?? "-"}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <table className="hidden min-w-full text-left text-sm md:table">
        <thead className="bg-sand text-xs uppercase tracking-[0.22em] text-fairway/80">
          <tr>
            <th className="px-4 py-3">Team</th>
            <th className="px-3 py-3">Record</th>
            <th className="px-3 py-3">Hole Pts</th>
            <th className="px-3 py-3">Holes Won</th>
            <th className="px-3 py-3">Total Net BB</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.teamId} className="border-t border-mist/80">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="flex h-8 min-h-8 w-8 min-w-8 items-center justify-center rounded-full bg-pine text-[11px] font-semibold text-white">
                      {positions[index]}
                    </span>
                    {winnerIds.has(row.teamId) ? <PodWinnerMarker label={winnerLabel} /> : null}
                    {markedIds.has(row.teamId) ? <WildCardMarker label={markerLabel} /> : null}
                  </div>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="font-medium text-ink">{row.teamName}</span>
                  </div>
                </div>
              </td>
              <td className="px-3 py-3 text-ink/80">
                {row.wins}-{row.losses}-{row.ties}
              </td>
              <td className="px-3 py-3 text-ink/80">{row.holePoints}</td>
              <td className="px-3 py-3 text-ink/80">{row.holesWon}</td>
              <td className="px-3 py-3 text-ink/80">{row.cumulativeNetBetterBall ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
