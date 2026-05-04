"use client";

import { useState } from "react";

export interface AllTeamsRow {
  teamId: string;
  teamName: string;
  podName: string;
  podRank: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  matchRecordPoints: number;
  holePoints: number;
  holesWon: number;
  totalNetBetterBall: number | null;
  markerCode: "Y" | "X" | "PB" | "E" | null;
  markerLabel: string | null;
}

interface AllTeamsTableProps {
  rows: AllTeamsRow[];
}

type SortKey =
  | "teamName"
  | "podName"
  | "wins"
  | "losses"
  | "ties"
  | "holePoints"
  | "holesWon"
  | "totalNetBetterBall";

function markerClasses(markerCode: AllTeamsRow["markerCode"]) {
  if (markerCode === "Y") {
    return "bg-[#e3f1ea] text-[#174f38]";
  }

  if (markerCode === "X") {
    return "bg-[#dff0ea] text-[#123f2d]";
  }

  if (markerCode === "PB") {
    return "bg-[#efe7ff] text-[#5f47a6]";
  }

  if (markerCode === "E") {
    return "bg-[#f8e5e0] text-[#8f4b3b]";
  }

  return "bg-sand text-fairway/72";
}

function compareRows(left: AllTeamsRow, right: AllTeamsRow, sortKey: SortKey, direction: "asc" | "desc") {
  const multiplier = direction === "asc" ? 1 : -1;

  if (sortKey === "teamName" || sortKey === "podName") {
    return left[sortKey].localeCompare(right[sortKey]) * multiplier;
  }

  const leftValue = left[sortKey] ?? -9999;
  const rightValue = right[sortKey] ?? -9999;

  if (leftValue === rightValue) {
    return left.teamName.localeCompare(right.teamName);
  }

  return (leftValue - rightValue) * multiplier;
}

export function AllTeamsTable({ rows }: AllTeamsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("wins");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const sortedRows = [...rows].sort((left, right) => compareRows(left, right, sortKey, sortDirection));

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "teamName" || nextKey === "podName" ? "asc" : "desc");
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-[20px] border border-mist/80 bg-white/70 p-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-fairway/74 sm:grid-cols-4">
        {[
          ["Y", "Clinched pod", "bg-[#e3f1ea] text-[#174f38]"],
          ["X", "Clinched wildcard", "bg-[#dff0ea] text-[#123f2d]"],
          ["PB", "Projected", "bg-[#efe7ff] text-[#5f47a6]"],
          ["E", "Eliminated", "bg-[#f8e5e0] text-[#8f4b3b]"]
        ].map(([code, label, classes]) => (
          <div key={code} className="flex min-h-10 items-center gap-2 rounded-[16px] bg-white px-2.5 py-2">
            <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 ${classes}`}>
              {code}
            </span>
            <span className="min-w-0 leading-tight">{label}</span>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-mist bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[820px] text-left text-sm">
            <thead className="bg-sand text-[11px] uppercase tracking-[0.18em] text-fairway/80">
              <tr>
                {[
                  ["Team", "teamName"],
                  ["Pod", "podName"],
                  ["W", "wins"],
                  ["L", "losses"],
                  ["T", "ties"],
                  ["Hole Pts", "holePoints"],
                  ["Holes Won", "holesWon"],
                  ["Net BB", "totalNetBetterBall"]
                ].map(([label, key]) => (
                  <th key={key} className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleSort(key as SortKey)}
                      className="inline-flex items-center gap-1 text-left transition hover:text-ink"
                    >
                      <span>{label}</span>
                      {sortKey === key ? <span>{sortDirection === "asc" ? "↑" : "↓"}</span> : null}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.teamId} className="border-t border-mist/80">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {row.markerCode ? (
                        <span
                          title={row.markerLabel ?? row.markerCode}
                          className={`inline-flex min-w-[34px] justify-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${markerClasses(row.markerCode)}`}
                        >
                          {row.markerCode}
                        </span>
                      ) : null}
                      <span className="font-medium text-ink">{row.teamName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink/78">{row.podName}</td>
                  <td className="px-4 py-3 text-ink/78">{row.wins}</td>
                  <td className="px-4 py-3 text-ink/78">{row.losses}</td>
                  <td className="px-4 py-3 text-ink/78">{row.ties}</td>
                  <td className="px-4 py-3 text-ink/78">{row.holePoints}</td>
                  <td className="px-4 py-3 text-ink/78">{row.holesWon}</td>
                  <td className="px-4 py-3 text-ink/78">{row.totalNetBetterBall ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedRows.length === 0 ? (
          <div className="border-t border-mist/80 px-4 py-6 text-sm text-ink/66">
            No teams are available yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
