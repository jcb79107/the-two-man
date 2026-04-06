"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { CopyButton } from "@/components/copy-button";
import { EmailInviteButton } from "@/components/email-invite-button";

const ARCHIVED_MATCH_STORAGE_KEY = "fairway-match.admin.archived-match-ids";
const SENT_INVITE_STORAGE_KEY = "fairway-match.admin.sent-invite-map";
let archivedSnapshotCacheKey: string | null | undefined;
let archivedSnapshotCache: string[] = [];
let inviteSnapshotCacheKey: string | null | undefined;
let inviteSnapshotCache: Record<string, string> = {};

export interface AdminMatchOpsRow {
  id: string;
  statusCode: string;
  stageLabel: string;
  statusLabel: string;
  statusTone: string;
  matchup: string;
  meta: string;
  privateUrl: string;
  inviteMessage: string;
  emailInviteHref: string | null;
  publicUrl: string | null;
  hasAssignedTeams: boolean;
  missingRecipientNames: string[];
}

interface AdminMatchOpsListProps {
  rows: AdminMatchOpsRow[];
}

function subscribeToStorage(onChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (event: Event) => {
    const key = "key" in event ? (event as StorageEvent).key : null;

    if (key === ARCHIVED_MATCH_STORAGE_KEY || key === SENT_INVITE_STORAGE_KEY || key == null) {
      onChange();
    }
  };

  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function getArchivedMatchIdsSnapshot() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(ARCHIVED_MATCH_STORAGE_KEY);
    if (raw === archivedSnapshotCacheKey) {
      return archivedSnapshotCache;
    }

    if (!raw) {
      archivedSnapshotCacheKey = raw;
      archivedSnapshotCache = [];
      return [];
    }

    const parsed = JSON.parse(raw);
    archivedSnapshotCacheKey = raw;
    archivedSnapshotCache = Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
    return archivedSnapshotCache;
  } catch {
    archivedSnapshotCacheKey = undefined;
    archivedSnapshotCache = [];
    return [];
  }
}

function getInviteSentMapSnapshot() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(SENT_INVITE_STORAGE_KEY);
    if (raw === inviteSnapshotCacheKey) {
      return inviteSnapshotCache;
    }

    if (!raw) {
      inviteSnapshotCacheKey = raw;
      inviteSnapshotCache = {};
      return {};
    }

    const parsed = JSON.parse(raw);
    inviteSnapshotCacheKey = raw;
    inviteSnapshotCache = parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
    return inviteSnapshotCache;
  } catch {
    inviteSnapshotCacheKey = undefined;
    inviteSnapshotCache = {};
    return {};
  }
}

function matchPriority(row: AdminMatchOpsRow, sentAt?: string) {
  if (!row.hasAssignedTeams) return 0;
  if (row.missingRecipientNames.length > 0) return 1;
  if (row.statusCode === "REOPENED") return 2;
  if (row.statusCode === "SUBMITTED") return 3;
  if (row.statusCode === "IN_PROGRESS") return 4;
  if (row.statusCode === "READY" && !sentAt) return 5;
  if (row.statusCode === "READY") return 6;
  if (row.statusCode === "FINAL" || row.statusCode === "FORFEIT") return 8;
  return 7;
}

export function AdminMatchOpsList({ rows }: AdminMatchOpsListProps) {
  const archivedMatchIds = useSyncExternalStore(subscribeToStorage, getArchivedMatchIdsSnapshot, () => []);
  const [showArchived, setShowArchived] = useState(false);
  const inviteSentMap = useSyncExternalStore<Record<string, string>>(
    subscribeToStorage,
    getInviteSentMapSnapshot,
    () => ({})
  );
  const [filter, setFilter] = useState<
    "all" | "ready" | "live" | "final" | "missing-email" | "waiting-field" | "sent" | "unsent"
  >("all");

  function updateArchived(ids: string[]) {
    try {
      window.localStorage.setItem(ARCHIVED_MATCH_STORAGE_KEY, JSON.stringify(ids));
      window.dispatchEvent(new Event("storage"));
    } catch {
      // Ignore local storage failures and keep in-memory state.
    }
  }

  function updateInviteSentMap(next: Record<string, string>) {
    try {
      window.localStorage.setItem(SENT_INVITE_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("storage"));
    } catch {
      // Ignore local storage failures and keep in-memory state.
    }
  }

  const archivedSet = useMemo(() => new Set(archivedMatchIds), [archivedMatchIds]);
  const allActiveRows = rows.filter((row) => !archivedSet.has(row.id));
  const archivedRows = rows.filter((row) => archivedSet.has(row.id));
  const activeRows = allActiveRows.filter((row) => {
    if (filter === "all") {
      return true;
    }

    if (filter === "ready") {
      return row.statusCode === "READY";
    }

    if (filter === "live") {
      return row.statusCode === "IN_PROGRESS" || row.statusCode === "SUBMITTED" || row.statusCode === "REOPENED";
    }

    if (filter === "final") {
      return row.statusCode === "FINAL" || row.statusCode === "FORFEIT";
    }

    if (filter === "missing-email") {
      return row.hasAssignedTeams && row.missingRecipientNames.length > 0;
    }

    if (filter === "waiting-field") {
      return !row.hasAssignedTeams;
    }

    if (filter === "sent") {
      return Boolean(inviteSentMap[row.id]);
    }

    return !inviteSentMap[row.id];
  }).sort((left, right) => {
    const priorityDelta = matchPriority(left, inviteSentMap[left.id]) - matchPriority(right, inviteSentMap[right.id]);
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

  function formatSentAt(value: string) {
    return new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function archiveMatch(matchId: string) {
    if (archivedSet.has(matchId)) {
      return;
    }

    updateArchived([...archivedMatchIds, matchId]);
  }

  function restoreMatch(matchId: string) {
    updateArchived(archivedMatchIds.filter((id) => id !== matchId));
  }

  const readyCount = allActiveRows.filter((row) => row.statusCode === "READY").length;
  const liveCount = allActiveRows.filter(
    (row) => row.statusCode === "IN_PROGRESS" || row.statusCode === "SUBMITTED" || row.statusCode === "REOPENED"
  ).length;
  const missingEmailCount = allActiveRows.filter(
    (row) => row.hasAssignedTeams && row.missingRecipientNames.length > 0
  ).length;
  const waitingFieldCount = allActiveRows.filter((row) => !row.hasAssignedTeams).length;
  const sentCount = allActiveRows.filter((row) => Boolean(inviteSentMap[row.id])).length;

  function renderRow(row: AdminMatchOpsRow, archived = false) {
    const sentAt = inviteSentMap[row.id];
    const isPublishedResult = row.statusCode === "FINAL" || row.statusCode === "FORFEIT";
    const privatePath = row.privateUrl.replace(/^https?:\/\/[^/]+/, "");
    const adminCardPath = isPublishedResult ? `${privatePath}?admin=1` : privatePath;

    return (
      <div
        key={row.id}
        className={`rounded-[22px] border px-4 py-4 ${archived ? "border-mist/70 bg-[#f8f4ea]" : "border-mist bg-white"}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-sand px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-ink/70">
            {row.stageLabel}
          </span>
          <span className={`rounded-full border px-3 py-1.5 text-[11px] font-medium ${row.statusTone}`}>
            {row.statusLabel}
          </span>
          {sentAt ? (
            <span className="rounded-full border border-fairway/12 bg-[#e7f5ee] px-3 py-1.5 text-[11px] font-medium text-fairway">
              Sent
            </span>
          ) : null}
          {archived ? (
            <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-ink/58">
              Archived
            </span>
          ) : null}
        </div>

        <div className="mt-3">
          <p className="text-base font-semibold text-ink">{row.matchup}</p>
          <p className="mt-1 text-sm text-ink/62">{row.meta}</p>
          {row.missingRecipientNames.length > 0 ? (
            <p className="mt-1 text-xs text-[#8a6b08]">Missing: {row.missingRecipientNames.join(", ")}</p>
          ) : null}
          {!row.hasAssignedTeams ? (
            <p className="mt-1 text-xs text-[#5b4696]">Waiting on field</p>
          ) : null}
          {sentAt ? (
            <p className="mt-1 text-xs text-fairway/62">Invite sent {formatSentAt(sentAt)}</p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            href={adminCardPath}
            className="rounded-full bg-pine px-3 py-2 text-xs font-medium text-white"
          >
            {isPublishedResult ? "View card" : "Open"}
          </Link>
          <CopyButton value={row.privateUrl} />
          {row.emailInviteHref ? (
            <EmailInviteButton
              href={row.emailInviteHref}
              onSend={() => markInviteSent(row.id)}
              label={sentAt ? "Resend" : "Email invite"}
            />
          ) : (
            <span className="rounded-full border border-[#d7c28d] bg-[#fff4db] px-3 py-2 text-xs font-medium text-[#8a6b08]">
              {row.hasAssignedTeams ? "Add emails" : "Waiting on field"}
            </span>
          )}
          {archived ? (
            <button
              type="button"
              onClick={() => restoreMatch(row.id)}
              className="rounded-full border border-fairway/15 bg-white px-3 py-2 text-xs font-medium text-ink"
            >
              Restore
            </button>
          ) : (
            <button
              type="button"
              onClick={() => archiveMatch(row.id)}
              className="rounded-full border border-fairway/15 bg-white px-3 py-2 text-xs font-medium text-ink"
            >
              Archive
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <div className="rounded-[20px] border border-mist bg-white px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fairway/62">Active</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{allActiveRows.length}</p>
        </div>
        <div className="rounded-[20px] border border-mist bg-white px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fairway/62">Ready</p>
          <p className="mt-1 text-2xl font-semibold text-[#8a6b08]">{readyCount}</p>
        </div>
        <div className="rounded-[20px] border border-mist bg-white px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fairway/62">Live</p>
          <p className="mt-1 text-2xl font-semibold text-[#8a6b08]">{liveCount}</p>
        </div>
        <div className="rounded-[20px] border border-mist bg-white px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fairway/62">Needs email</p>
          <p className="mt-1 text-2xl font-semibold text-[#8a6b08]">{missingEmailCount}</p>
        </div>
        <div className="rounded-[20px] border border-mist bg-white px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fairway/62">Waiting field</p>
          <p className="mt-1 text-2xl font-semibold text-[#5b4696]">{waitingFieldCount}</p>
        </div>
        <div className="rounded-[20px] border border-mist bg-white px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fairway/62">Sent</p>
          <p className="mt-1 text-2xl font-semibold text-fairway">{sentCount}</p>
        </div>
      </div>

      <div className="rounded-[20px] border border-mist bg-white px-4 py-3 text-xs text-ink/62">
        Sorted by urgency: waiting field, missing email, live edits, unsent ready matches, then completed cards.
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          ["all", "All"],
          ["ready", "Ready"],
          ["live", "Live"],
          ["final", "Final"],
          ["missing-email", "Missing email"],
          ["waiting-field", "Waiting field"],
          ["unsent", "Unsent"],
          ["sent", "Sent"]
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value as typeof filter)}
            className={
              filter === value
                ? "whitespace-nowrap rounded-full bg-pine px-3 py-2 text-xs font-medium text-white"
                : "whitespace-nowrap rounded-full border border-fairway/15 bg-white px-3 py-2 text-xs font-medium text-ink/78"
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {activeRows.length === 0 ? (
          <div className="rounded-[22px] border border-mist bg-white px-4 py-5 text-sm text-ink/62">
            No active matches in view.
          </div>
        ) : (
          activeRows.map((row) => renderRow(row))
        )}
      </div>

      {archivedRows.length > 0 ? (
        <div className="space-y-3 border-t border-mist/70 pt-3">
          <button
            type="button"
            onClick={() => setShowArchived((value) => !value)}
            className="rounded-full border border-fairway/15 bg-white px-3 py-2 text-xs font-medium text-ink"
          >
            {showArchived ? "Hide archived" : `Show archived (${archivedRows.length})`}
          </button>

          {showArchived ? <div className="space-y-3">{archivedRows.map((row) => renderRow(row, true))}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
