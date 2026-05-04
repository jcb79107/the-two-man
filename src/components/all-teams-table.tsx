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
  const [query, setQuery] = useState("");
  const [podFilter, setPodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("wins");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const podOptions = Array.from(new Set(rows.map((row) => row.podName))).sort((left, right) =>
    left.localeCompare(right)
  );

  const filteredRows = rows
    .filter((row) => row.teamName.toLowerCase().includes(query.trim().toLowerCase()))
    .filter((row) => (podFilter === "all" ? true : row.podName === podFilter))
    .filter((row) => {
      if (statusFilter === "all") {
        return true;
      }

      if (statusFilter === "projected") {
        return row.markerCode === "PB";
      }

      if (statusFilter === "clinched") {
        return row.markerCode === "X" || row.markerCode === "Y";
      }

      if (statusFilter === "eliminated") {
        return row.markerCode === "E";
      }

      if (statusFilter === "live-race") {
        return row.markerCode == null;
      }

      return row.markerCode == null;
    })
    .sort((left, right) => compareRows(left, right, sortKey, sortDirection));

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
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
        <label className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fairway/72">Search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search team"
            className="w-full rounded-2xl border border-mist bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/40 focus:border-pine/35"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fairway/72">Pod</span>
          <select
            value={podFilter}
            onChange={(event) => setPodFilter(event.target.value)}
            className="w-full rounded-2xl border border-mist bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-pine/35"
          >
            <option value="all">All pods</option>
            {podOptions.map((podName) => (
              <option key={podName} value={podName}>
                {podName}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fairway/72">Status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full rounded-2xl border border-mist bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-pine/35"
          >
            <option value="all">All teams</option>
            <option value="projected">Projected</option>
            <option value="clinched">Clinched</option>
            <option value="eliminated">Eliminated</option>
            <option value="live-race">Live race</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-fairway/74">
        <span className="rounded-full bg-[#e3f1ea] px-3 py-1 text-[#174f38]">Y clinched pod</span>
        <span className="rounded-full bg-[#dff0ea] px-3 py-1 text-[#123f2d]">X clinched wildcard</span>
        <span className="rounded-full bg-[#efe7ff] px-3 py-1 text-[#5f47a6]">PB projected</span>
        <span className="rounded-full bg-[#f8e5e0] px-3 py-1 text-[#8f4b3b]">E eliminated</span>
        <span className="rounded-full bg-sand px-3 py-1 text-fairway/74">No badge = still in the live race</span>
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
              {filteredRows.map((row) => (
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

        {filteredRows.length === 0 ? (
          <div className="border-t border-mist/80 px-4 py-6 text-sm text-ink/66">
            No teams match the current search or filters.
          </div>
        ) : null}
      </div>
    </div>
  );
}
