"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useState, useSyncExternalStore } from "react";
import { recordPlayoffResultAction, resetMatchCardAction } from "../../app/admin/actions";
import { CopyButton } from "@/components/copy-button";
import { EmailInviteButton } from "@/components/email-invite-button";
import { LocalTimestamp } from "@/components/local-timestamp";

const SENT_INVITE_STORAGE_KEY = "the-two-man.admin.sent-invite-map";
const EMPTY_INVITE_SNAPSHOT: Record<string, string> = {};
let inviteSnapshotCacheKey: string | null | undefined;
let inviteSnapshotCache: Record<string, string> = {};

export interface AdminMatchOpsRow {
  id: string;
  stageCode: string;
  statusCode: string;
  stageLabel: string;
  statusLabel: string;
  statusTone: string;
  matchup: string;
  meta: string;
  timestamp: string | null;
  homeTeamId: string | null;
  homeTeamName: string | null;
  homeSeedNumber: number | null;
  awayTeamId: string | null;
  awayTeamName: string | null;
  awaySeedNumber: number | null;
  winningTeamId: string | null;
  resultLabel: string | null;
  privateToken: string;
  privateUrl: string;
  inviteMessage: string;
  emailInviteHref: string | null;
  recipientEmails: string[];
  setupComplete: boolean;
  scoreEntryCount: number;
  publicUrl: string | null;
  hasAssignedTeams: boolean;
  missingRecipientNames: string[];
  isPlayoffMatch: boolean;
}

interface AdminMatchOpsListProps {
  rows: AdminMatchOpsRow[];
  mode?: "email" | "scorecards";
}

type AdminMatchOpsFilter =
  | "all"
  | "unsent"
  | "sent"
  | "missing-email"
  | "waiting-field"
  | "playoffs"
  | "needs-setup"
  | "empty"
  | "live"
  | "final";

function subscribeToStorage(onChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (event: Event) => {
    const key = "key" in event ? (event as StorageEvent).key : null;

    if (key === SENT_INVITE_STORAGE_KEY || key == null) {
      onChange();
    }
  };

  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function getInviteSentMapSnapshot() {
  if (typeof window === "undefined") {
    return EMPTY_INVITE_SNAPSHOT;
  }

  try {
    const raw = window.localStorage.getItem(SENT_INVITE_STORAGE_KEY);
    if (raw === inviteSnapshotCacheKey) {
      return inviteSnapshotCache;
    }

    if (!raw) {
      inviteSnapshotCacheKey = raw;
      inviteSnapshotCache = {};
      return inviteSnapshotCache;
    }

    const parsed = JSON.parse(raw);
    inviteSnapshotCacheKey = raw;
    inviteSnapshotCache = parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
    return inviteSnapshotCache;
  } catch {
    inviteSnapshotCacheKey = undefined;
    inviteSnapshotCache = {};
    return inviteSnapshotCache;
  }
}

function isFinalStatus(status: string) {
  return status === "FINAL" || status === "FORFEIT";
}

function isLiveStatus(status: string) {
  return status === "IN_PROGRESS" || status === "SUBMITTED" || status === "REOPENED";
}

function matchPriority(row: AdminMatchOpsRow, sentAt: string | undefined, mode: "email" | "scorecards") {
  if (!row.hasAssignedTeams) return 0;

  if (mode === "email") {
    if (row.missingRecipientNames.length > 0) return 1;
    if (!sentAt) return 2;
    return isFinalStatus(row.statusCode) ? 5 : 4;
  }

  if (row.isPlayoffMatch) {
    return isFinalStatus(row.statusCode) ? 5 : 1;
  }

  if (!row.setupComplete) return 1;
  if (row.statusCode === "READY") return 1;
  if (row.statusCode === "SUBMITTED" || row.statusCode === "REOPENED") return 2;
  if (row.statusCode === "IN_PROGRESS") return 3;
  if (isFinalStatus(row.statusCode)) return 5;
  return 4;
}

export function AdminMatchOpsList({ rows, mode = "scorecards" }: AdminMatchOpsListProps) {
  const inviteSentMap = useSyncExternalStore<Record<string, string>>(
    subscribeToStorage,
    getInviteSentMapSnapshot,
    () => EMPTY_INVITE_SNAPSHOT
  );
  const [filter, setFilter] = useState<AdminMatchOpsFilter>(mode === "email" ? "unsent" : "all");

  function updateInviteSentMap(next: Record<string, string>) {
    try {
      window.localStorage.setItem(SENT_INVITE_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("storage"));
    } catch {
      // Ignore local storage failures and keep in-memory state.
    }
  }

  const activeRows = rows.filter((row) => {
    if (filter === "all") {
      return true;
    }

    if (filter === "unsent") {
      return row.hasAssignedTeams && row.missingRecipientNames.length === 0 && !inviteSentMap[row.id];
    }

    if (filter === "sent") {
      return Boolean(inviteSentMap[row.id]);
    }

    if (filter === "missing-email") {
      return row.hasAssignedTeams && row.missingRecipientNames.length > 0;
    }

    if (filter === "needs-setup") {
      return row.hasAssignedTeams && !row.isPlayoffMatch && !row.setupComplete;
    }

    if (filter === "empty") {
      return !row.isPlayoffMatch && row.setupComplete && row.statusCode === "READY";
    }

    if (filter === "live") {
      return isLiveStatus(row.statusCode);
    }

    if (filter === "final") {
      return isFinalStatus(row.statusCode);
    }

    if (filter === "waiting-field") {
      return !row.hasAssignedTeams;
    }

    if (filter === "playoffs") {
      return row.isPlayoffMatch;
    }
    return true;
  }).sort((left, right) => {
    const priorityDelta = matchPriority(left, inviteSentMap[left.id], mode) - matchPriority(right, inviteSentMap[right.id], mode);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return left.matchup.localeCompare(right.matchup);
  });

  function markInviteSent(matchId: string) {
    updateInviteSentMap({
      ...inviteSentMap,
      [matchId]: new Date().toISOString()
    });
  }

  function confirmReset(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm("Reset this match back to a blank state?")) {
      event.preventDefault();
    }
  }

  const playoffOpenCount = rows.filter(
    (row) => row.isPlayoffMatch && row.hasAssignedTeams && !isFinalStatus(row.statusCode)
  ).length;
  const needsSetupCount = rows.filter((row) => row.hasAssignedTeams && !row.isPlayoffMatch && !row.setupComplete).length;
  const liveCount = rows.filter((row) => isLiveStatus(row.statusCode)).length;
  const missingEmailCount = rows.filter(
    (row) => row.hasAssignedTeams && row.missingRecipientNames.length > 0
  ).length;
  const waitingFieldCount = rows.filter((row) => !row.hasAssignedTeams).length;
  const finalCount = rows.filter((row) => isFinalStatus(row.statusCode)).length;
  const sentCount = rows.filter((row) => Boolean(inviteSentMap[row.id])).length;
  const unsentCount = rows.filter(
    (row) => row.hasAssignedTeams && row.missingRecipientNames.length === 0 && !inviteSentMap[row.id]
  ).length;

  const stats =
    mode === "email"
      ? [
          { label: "Unsent invites", value: unsentCount, tone: "text-[#8a6b08]" },
          { label: "Sent invites", value: sentCount, tone: "text-fairway" },
          { label: "Missing email", value: missingEmailCount, tone: "text-[#8a6b08]" },
          { label: "No matchup", value: waitingFieldCount, tone: "text-[#5b4696]" }
        ]
      : [
          { label: "Playoff open", value: playoffOpenCount, tone: "text-[#5b4696]" },
          { label: "Needs setup", value: needsSetupCount, tone: "text-[#8a6b08]" },
          { label: "Live edits", value: liveCount, tone: "text-[#8a6b08]" },
          { label: "Final cards", value: finalCount, tone: "text-fairway" }
        ];

  const filters =
    mode === "email"
      ? [
          ["unsent", "Needs send"],
          ["sent", "Sent invites"],
          ["missing-email", "Missing email"],
          ["waiting-field", "No matchup"],
          ["all", "All"]
        ]
      : [
          ["all", "All"],
          ["playoffs", "Playoffs"],
          ["needs-setup", "Needs setup"],
          ["empty", "Empty cards"],
          ["live", "Live edits"],
          ["final", "Final cards"],
          ["waiting-field", "Waiting field"]
        ];

  function getScorecardActionLabel(row: AdminMatchOpsRow) {
    if (!row.setupComplete) {
      return "Setup card";
    }

    if (row.statusCode === "READY") {
      return row.scoreEntryCount > 0 ? "Continue card" : "Fill card";
    }

    if (isFinalStatus(row.statusCode)) {
      return "Edit final";
    }

    return "Continue scoring";
  }

  function getCoursePickLabel(row: AdminMatchOpsRow) {
    if (!row.homeSeedNumber && !row.awaySeedNumber) {
      return null;
    }

    if (row.homeSeedNumber && (!row.awaySeedNumber || row.homeSeedNumber < row.awaySeedNumber)) {
      return `#${row.homeSeedNumber} ${row.homeTeamName ?? "Home team"}`;
    }

    if (row.awaySeedNumber) {
      return `#${row.awaySeedNumber} ${row.awayTeamName ?? "Away team"}`;
    }

    return null;
  }

  function renderPlayoffResultForm(row: AdminMatchOpsRow) {
    const coursePickLabel = getCoursePickLabel(row);

    if (!row.hasAssignedTeams || !row.homeTeamId || !row.awayTeamId) {
      return (
        <span className="rounded-full border border-[#cab8f2] bg-[#f3ebff] px-3 py-2 text-xs font-medium text-[#5b4696]">
          Waiting on matchup
        </span>
      );
    }

    return (
      <div className="grid w-full gap-2">
        {coursePickLabel ? (
          <p className="text-xs font-medium text-ink/58">Course pick: {coursePickLabel}</p>
        ) : null}
        <form action={recordPlayoffResultAction} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_7.5rem_auto]">
          <input type="hidden" name="matchId" value={row.id} />
          <label className="sr-only" htmlFor={`winner-${row.id}`}>
            Winner
          </label>
          <select
            id={`winner-${row.id}`}
            name="winnerTeamId"
            defaultValue={row.winningTeamId ?? ""}
            className="min-h-11 rounded-2xl border border-mist bg-white px-3 py-2 text-sm font-medium text-ink"
          >
            <option value="" disabled>
              Winner
            </option>
            <option value={row.homeTeamId}>{row.homeTeamName ?? "Home team"}</option>
            <option value={row.awayTeamId}>{row.awayTeamName ?? "Away team"}</option>
          </select>
          <label className="sr-only" htmlFor={`result-${row.id}`}>
            Result
          </label>
          <input
            id={`result-${row.id}`}
            name="resultScore"
            placeholder="4&3"
            className="min-h-11 rounded-2xl border border-mist bg-white px-3 py-2 text-sm font-medium text-ink placeholder:text-ink/36"
          />
          <button
            type="submit"
            className="min-h-11 rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white"
          >
            {isFinalStatus(row.statusCode) ? "Update" : "Record"}
          </button>
        </form>
        {isFinalStatus(row.statusCode) ? (
          <form action={resetMatchCardAction} onSubmit={confirmReset}>
            <input type="hidden" name="matchId" value={row.id} />
            <input
              type="hidden"
              name="overrideNote"
              value="Reset playoff result from scorecard manager."
            />
            <button
              type="submit"
              className="rounded-full border border-[#d7c28d] bg-white px-4 py-2.5 text-sm font-semibold text-[#7a5a00]"
            >
              Reset result
            </button>
          </form>
        ) : null}
      </div>
    );
  }

  function renderRow(row: AdminMatchOpsRow) {
    const sentAt = inviteSentMap[row.id];
    const adminCardPath = row.setupComplete
      ? `/admin/match/${row.privateToken}/scorecard`
      : `/admin/match/${row.privateToken}/setup`;
    const showEmailWarning = row.hasAssignedTeams && row.missingRecipientNames.length > 0;
    const isWaitingField = !row.hasAssignedTeams;
    const scoreProgressLabel = row.isPlayoffMatch
      ? row.resultLabel ?? "Awaiting winner and match-play score"
      : row.setupComplete
        ? `${Math.min(row.scoreEntryCount, 72)}/72 scores entered`
        : "Needs course, tees, and handicap snapshot";
    const inviteStatusLabel = isWaitingField
      ? "No matchup"
      : showEmailWarning
        ? "Missing email"
        : sentAt
          ? "Sent"
          : "Needs send";

    return (
      <div
        key={row.id}
        className="min-w-0 overflow-hidden rounded-[22px] border border-mist bg-white px-3 py-3.5 sm:px-4 sm:py-4"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {mode === "email" ? (
            <span
              className={
                sentAt
                  ? "rounded-full border border-fairway/12 bg-[#e7f5ee] px-2.5 py-1 text-[10px] font-semibold text-fairway"
                  : showEmailWarning
                    ? "rounded-full border border-[#d7c28d] bg-[#fff4db] px-2.5 py-1 text-[10px] font-semibold text-[#8a6b08]"
                    : isWaitingField
                      ? "rounded-full border border-[#cab8f2] bg-[#f3ebff] px-2.5 py-1 text-[10px] font-semibold text-[#5b4696]"
                      : "rounded-full border border-[#d7c28d] bg-[#fff4db] px-2.5 py-1 text-[10px] font-semibold text-[#8a6b08]"
              }
            >
              {inviteStatusLabel}
            </span>
          ) : (
            <>
              <span className="rounded-full bg-sand px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-ink/70">
                {row.stageLabel}
              </span>
              <span className={`rounded-full border px-3 py-1.5 text-[11px] font-medium ${row.statusTone}`}>
                {row.isPlayoffMatch ? row.statusLabel : row.setupComplete ? row.statusLabel : "SETUP NEEDED"}
              </span>
            </>
          )}
          {mode === "email" ? (
            <span className="rounded-full bg-sand px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/58">
              {row.stageLabel}
            </span>
          ) : null}
          {mode === "email" && row.recipientEmails.length > 0 ? (
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-ink/58">
              {row.recipientEmails.length} recipient{row.recipientEmails.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>

        <div className="mt-3 min-w-0">
          <p className="text-[0.95rem] font-semibold leading-snug text-ink sm:text-base">{row.matchup}</p>
          <p className="mt-1 text-xs leading-5 text-ink/62 sm:text-sm">
            {row.meta}
            {" • "}
            <LocalTimestamp value={row.timestamp} />
          </p>
          {mode === "scorecards" ? (
            <p className="mt-1 text-xs font-medium text-ink/58">{scoreProgressLabel}</p>
          ) : null}
          {mode === "email" && row.recipientEmails.length > 0 ? (
            <p className="mt-1 max-w-full break-words text-[11px] leading-4 text-ink/54">
              To: {row.recipientEmails.join(", ")}
            </p>
          ) : null}
          {mode === "email" && row.missingRecipientNames.length > 0 ? (
            <p className="mt-1 text-xs text-[#8a6b08]">Missing: {row.missingRecipientNames.join(", ")}</p>
          ) : null}
          {mode === "scorecards" && isWaitingField ? (
            <p className="mt-1 text-xs text-[#5b4696]">Waiting on matchup assignment</p>
          ) : null}
          {mode === "email" && sentAt ? (
            <p className="mt-1 text-xs text-fairway/62">
              Invite sent <LocalTimestamp value={sentAt} />
            </p>
          ) : null}
        </div>

        <div className={mode === "email" ? "mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3" : "mt-4 flex flex-wrap items-center gap-2"}>
          {mode === "email" ? (
            <>
              {row.emailInviteHref ? (
                <EmailInviteButton
                  href={row.emailInviteHref}
                  onSend={() => markInviteSent(row.id)}
                  label={sentAt ? "Resend invite" : "Send invite"}
                  className="min-h-11 rounded-full bg-pine px-3 py-2 text-xs font-semibold text-white"
                />
              ) : (
                <span className="flex min-h-11 items-center justify-center rounded-full border border-[#d7c28d] bg-[#fff4db] px-3 py-2 text-center text-xs font-semibold text-[#8a6b08]">
                  {row.hasAssignedTeams ? "Add player emails" : "Waiting on field"}
                </span>
              )}
              <CopyButton
                value={row.inviteMessage}
                label="Copy text"
                className="min-h-11 rounded-full border border-fairway/15 bg-white px-3 py-2 text-xs font-semibold text-ink"
              />
              <CopyButton
                value={row.privateUrl}
                label="Copy link"
                className="col-span-2 min-h-11 rounded-full border border-fairway/15 bg-white px-3 py-2 text-xs font-semibold text-ink sm:col-span-1"
              />
            </>
          ) : (
            <>
              {row.isPlayoffMatch ? (
                renderPlayoffResultForm(row)
              ) : row.hasAssignedTeams ? (
                <Link
                  href={adminCardPath}
                  className="rounded-full bg-pine px-4 py-2.5 text-sm font-semibold text-white"
                >
                  {getScorecardActionLabel(row)}
                </Link>
              ) : (
                <span className="rounded-full border border-[#cab8f2] bg-[#f3ebff] px-3 py-2 text-xs font-medium text-[#5b4696]">
                  Waiting on matchup
                </span>
              )}
              {row.hasAssignedTeams && !row.isPlayoffMatch ? (
                <form action={resetMatchCardAction} onSubmit={confirmReset}>
                  <input type="hidden" name="matchId" value={row.id} />
                  <input
                    type="hidden"
                    name="overrideNote"
                    value="Reset from scorecard manager."
                  />
                  <button
                    type="submit"
                    className="rounded-full border border-[#d7c28d] bg-white px-4 py-2.5 text-sm font-semibold text-[#7a5a00]"
                  >
                    Reset card
                  </button>
                </form>
              ) : null}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={mode === "email" ? "grid min-w-0 grid-cols-3 gap-1.5 sm:gap-2" : "grid min-w-0 grid-cols-2 gap-2 lg:grid-cols-4"}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={mode === "email" ? "min-w-0 rounded-2xl border border-mist bg-white px-2.5 py-2.5" : "min-w-0 rounded-[18px] border border-mist bg-white px-3 py-3"}
          >
            <p className={mode === "email" ? "truncate text-[8px] font-semibold uppercase tracking-[0.1em] text-fairway/62 sm:text-[10px]" : "text-[9px] font-semibold uppercase tracking-[0.14em] text-fairway/62 sm:text-[10px]"}>
              {stat.label}
            </p>
            <p className={mode === "email" ? `mt-1 text-xl font-semibold ${stat.tone}` : `mt-1 text-2xl font-semibold ${stat.tone}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className={mode === "email" ? "grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" : "flex flex-wrap gap-2"}>
        {filters.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value as AdminMatchOpsFilter)}
            className={
              filter === value
                ? "min-h-10 whitespace-nowrap rounded-full bg-pine px-3 py-2 text-xs font-semibold text-white"
                : "min-h-10 whitespace-nowrap rounded-full border border-fairway/15 bg-white px-3 py-2 text-xs font-semibold text-ink/78"
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {activeRows.length === 0 ? (
          <div className="rounded-[22px] border border-mist bg-white px-4 py-5 text-sm text-ink/62">
            {mode === "email" ? "No invites in view." : "No scorecards in view."}
          </div>
        ) : (
          activeRows.map((row) => renderRow(row))
        )}
      </div>

    </div>
  );
}
