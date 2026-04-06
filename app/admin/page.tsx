import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { AdminMatchOpsList } from "@/components/admin-match-ops-list";
import { FormSubmitButton } from "@/components/form-submit-button";
import { SectionCard } from "@/components/section-card";
import { TwoManLogo } from "@/components/two-man-logo";
import { isAdminAuthConfigured, isAdminAuthenticated } from "@/lib/server/admin-auth";
import { getAdminDashboardData } from "@/lib/server/admin";
import { ROUTES } from "@/lib/api/routes";
import {
  adminLoginAction,
  generatePodMatchLinksAction,
  resetTeamSeedsAction,
  saveBracketSettingsAction,
  saveTournamentAction,
  syncBracketAction,
  updatePlayerAction,
  updateTeamSeedAction
} from "./actions";

export const dynamic = "force-dynamic";

type AdminSectionKey = "overview" | "match-ops" | "field" | "tournament";

function normalizeAdminSection(value?: string): AdminSectionKey {
  switch (value) {
    case "match-ops":
    case "field":
    case "tournament":
      return value;
    default:
      return "overview";
  }
}

function formatStageLabel(stage: string) {
  return stage === "POD_PLAY" ? "Pod Play" : stage.replaceAll("_", " ");
}

function buildMatchInviteMessage(match: {
  roundLabel: string;
  podName: string | null;
  homeTeamName: string | null;
  awayTeamName: string | null;
  playedOn: string | null;
}, privateUrl: string) {
  const matchup = `${match.homeTeamName ?? "TBD"} vs ${match.awayTeamName ?? "TBD"}`;
  const introLine = match.podName ? `${match.roundLabel} • ${match.podName}` : match.roundLabel;
  const detailLine = match.playedOn ? `Scheduled: ${match.playedOn}` : "Please use the private scorecard link below to set up and post the round.";

  return [
    `The Two Man`,
    "",
    introLine,
    matchup,
    detailLine,
    "",
    `Private scorecard: ${privateUrl}`,
    "",
    "One player in your group should open the link, enter current handicap indexes, and post the official card after the match."
  ].join("\n");
}

function buildEmailInviteHref(match: {
  roundLabel: string;
  podName: string | null;
  homeTeamName: string | null;
  awayTeamName: string | null;
  playedOn: string | null;
  recipients: Array<{ email: string | null }>;
}, privateUrl: string) {
  const emails = match.recipients
    .map((recipient) => recipient.email?.trim().toLowerCase() ?? "")
    .filter(Boolean);

  if (emails.length === 0) {
    return null;
  }

  const subject = `${match.roundLabel}: ${match.homeTeamName ?? "TBD"} vs ${match.awayTeamName ?? "TBD"}`;
  const body = buildMatchInviteMessage(match, privateUrl);
  const composeUrl = new URL("https://mail.google.com/mail/u/0/");

  composeUrl.searchParams.set("view", "cm");
  composeUrl.searchParams.set("fs", "1");
  composeUrl.searchParams.set("to", emails.join(","));
  composeUrl.searchParams.set("su", subject);
  composeUrl.searchParams.set("body", body);

  return composeUrl.toString();
}

function formatAuditTimestamp(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatAuditTimestampCompact(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric"
  });
}

function buildAdminMatchLabel(match: {
  homeTeamName: string | null;
  awayTeamName: string | null;
}) {
  return `${match.homeTeamName ?? "TBD"} vs ${match.awayTeamName ?? "TBD"}`;
}

function normalizeActivityLabel(event: string) {
  const value = event.trim().toLowerCase();

  if (value.includes("ready")) return "Ready";
  if (value.includes("progress")) return "Live";
  if (value.includes("submitted")) return "Submitted";
  if (value.includes("reopened")) return "Reopened";
  if (value.includes("admin_scorecard_override")) return "Admin override";
  if (value.includes("admin_override_draft")) return "Admin draft";
  if (value.includes("reset")) return "Reset";
  if (value.includes("forfeit")) return "Forfeit";
  if (value.includes("sync")) return "Bracket sync";
  if (value.includes("generated")) return "Generated";

  return event
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeActivitySource(source?: string | null) {
  const value = source?.trim().toLowerCase() ?? "";

  if (!value) {
    return "Admin";
  }

  if (value === "commissioner" || value === "admin") {
    return "Admin";
  }

  return source!;
}

function statusTone(status: string) {
  switch (status) {
    case "FINAL":
      return "border-fairway/15 bg-[#e7f5ee] text-fairway";
    case "READY":
      return "border-fairway/10 bg-sand text-ink/72";
    case "IN_PROGRESS":
    case "SUBMITTED":
      return "border-[#d5bb70] bg-[#fff4db] text-[#8a6b08]";
    case "REOPENED":
      return "border-[#cab8f2] bg-[#f3ebff] text-[#5b4696]";
    case "FORFEIT":
      return "border-[#e0b6b6] bg-[#fdf0f0] text-[#9a4949]";
    default:
      return "border-fairway/10 bg-sand text-ink/72";
  }
}

function matchesQuery(searchQuery: string, ...values: Array<string | null | undefined>) {
  if (!searchQuery) {
    return true;
  }

  const haystack = values
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

  return haystack.includes(searchQuery);
}

function FlashBanner({
  kind,
  message
}: {
  kind?: string;
  message?: string;
}) {
  if (!kind || !message) {
    return null;
  }

  const tone =
    kind === "success"
      ? "border-fairway/20 bg-[#e7f5ee] text-fairway"
      : "border-[#f4b8b8] bg-[#fff1f1] text-[#a33b3b]";

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${tone}`}>{message}</div>
  );
}

function AdminSectionNav({
  activeSection
}: {
  activeSection: AdminSectionKey;
}) {
  const links = [
    { section: "overview", label: "Activity" },
    { section: "match-ops", label: "Match Ops" },
    { section: "field", label: "Field" },
    { section: "tournament", label: "Tournament" }
  ] satisfies Array<{ section: AdminSectionKey; label: string }>;

  return (
    <nav className="sticky top-[76px] z-20 rounded-[24px] border border-white/70 bg-[#f6efe1]/92 p-2 shadow-[0_16px_34px_rgba(17,32,23,0.08)] backdrop-blur">
      <div className="flex justify-center gap-2 overflow-x-auto pb-0.5">
        {links.map((link) => {
          const active = link.section === activeSection;

          return (
            <a
              key={link.section}
              href={`/admin?section=${link.section}`}
              className={
                active
                  ? "min-w-fit whitespace-nowrap rounded-full bg-pine px-4 py-2 text-center text-sm font-medium text-white shadow-card"
                  : "min-w-fit whitespace-nowrap rounded-full bg-white/88 px-4 py-2 text-center text-sm font-medium text-ink/78 transition hover:text-ink"
              }
            >
              {link.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

function AdminLoginCard({
  kind,
  message,
  configured
}: {
  kind?: string;
  message?: string;
  configured: boolean;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 py-8 sm:px-6">
      {configured ? null : <FlashBanner kind={kind} message={message} />}

      <section className="w-full rounded-[30px] border border-white/70 bg-white/86 p-4 shadow-[0_24px_70px_rgba(17,32,23,0.1)]">
        {configured ? (
          <form action={adminLoginAction} className="flex items-center gap-3">
            <label className="sr-only" htmlFor="admin-password">
              Password
            </label>
            <div className={`flex-1 rounded-[22px] border ${kind === "error" ? "border-[#d48f8f]" : "border-mist"} bg-white`}>
              <input
                id="admin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                aria-label="Password"
                className="w-full rounded-[22px] bg-transparent px-4 py-3 text-sm text-ink outline-none placeholder:text-ink/38"
              />
            </div>
            <FormSubmitButton label="→" pendingLabel="…" />
          </form>
        ) : (
          <div className="rounded-2xl border border-[#e0b6b6] bg-[#fff1f1] px-4 py-4 text-sm leading-6 text-[#8f3f3f]">
            Set `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` in your environment before using the
            commissioner desk.
          </div>
        )}
      </section>
    </main>
  );
}

export default async function AdminPage({
  searchParams
}: {
  searchParams?: Promise<{ kind?: string; message?: string; section?: string; q?: string; panel?: string; limit?: string }>;
}) {
  noStore();

  const params = searchParams ? await searchParams : undefined;
  const authConfigured = isAdminAuthConfigured();
  const authenticated = authConfigured ? await isAdminAuthenticated() : false;

  if (!authenticated) {
    return (
      <AdminLoginCard
        kind={params?.kind}
        message={params?.message}
        configured={authConfigured}
      />
    );
  }

  const data = await getAdminDashboardData();
  const activeSection = normalizeAdminSection(params?.section);
  const fieldPanel = params?.panel === "players" ? "players" : "seeds";
  const searchQuery = (params?.q ?? "").trim().toLowerCase();
  const requestedLimit = Number.parseInt(params?.limit ?? "12", 10);
  const activityVisibleCount = Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 12;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const matchStatusCounts = data.matchLinks.reduce<Record<string, number>>((counts, match) => {
    counts[match.status] = (counts[match.status] ?? 0) + 1;
    return counts;
  }, {});
  const liveCount = matchStatusCounts.IN_PROGRESS ?? 0;
  const finalCount = (matchStatusCounts.FINAL ?? 0) + (matchStatusCounts.FORFEIT ?? 0);
  const attentionCount = (matchStatusCounts.REOPENED ?? 0) + (matchStatusCounts.SUBMITTED ?? 0);
  const filteredMatchLinks = data.matchLinks.filter((match) =>
    matchesQuery(
      searchQuery,
      match.homeTeamName,
      match.awayTeamName,
      match.roundLabel,
      match.podName,
      match.stage,
      match.status,
      match.overrideNote
    )
  );
  const filteredTeams = data.teams.filter((team) =>
    matchesQuery(searchQuery, team.name, team.podName, team.slotNumber ? `slot ${team.slotNumber}` : null)
  );
  const filteredPlayers = data.players.filter((player) =>
    matchesQuery(searchQuery, player.firstName, player.lastName, player.email, player.teamName, player.podName)
  );
  const showTournamentSettings =
    !searchQuery || matchesQuery(searchQuery, "tournament settings", "name", "slug", "season", "start date", "end date");
  const showBracketSettings =
    !searchQuery ||
    matchesQuery(
      searchQuery,
      "bracket settings",
      data.bracket?.label,
      "qualifier count",
      "sync bracket shell",
      "pod field",
      "bracket rounds"
    );
  const searchPlaceholder =
    activeSection === "match-ops"
      ? "Search matches, teams, pods, or status"
      : activeSection === "field"
        ? "Search players, teams, pods, or slots"
        : "Search tournament or bracket settings";
  const activityItems = [
    ...data.recentAuditLog
      .filter((entry) => {
        const actor = entry.actorLabel?.toLowerCase() ?? "";
        const note = entry.note?.toLowerCase() ?? "";
        const action = entry.action.toLowerCase();

        return !actor.includes("dry run") && !note.includes("dry run") && !action.includes("dry_run");
      })
      .map((entry) => ({
        id: `audit-${entry.id}`,
        at: entry.createdAt,
        source: normalizeActivitySource(entry.actorLabel),
        event: normalizeActivityLabel(entry.action),
        matchLabel: buildAdminMatchLabel(entry),
        detail: entry.note ?? entry.roundLabel,
        tone: statusTone(entry.matchStatus)
      })),
    ...data.matchLinks.flatMap((match) => {
      const matchLabel = buildAdminMatchLabel(match);
      const context = [match.roundLabel, match.podName ?? "Playoff"].join(" • ");
      const items: Array<{
        id: string;
        at: string;
        source: string;
        event: string;
        matchLabel: string;
        detail: string;
        tone: string;
      }> = [];

      if (match.homeTeamId && match.awayTeamId && match.status === "READY") {
        items.push({
          id: `ready-${match.id}`,
          at: match.createdAt,
          source: "System",
          event: "Ready",
          matchLabel,
          detail: context,
          tone: "border-fairway/10 bg-sand text-ink/72"
        });
      }

      if (match.status === "IN_PROGRESS") {
        items.push({
          id: `live-${match.id}`,
          at: match.updatedAt,
          source: "Players",
          event: "Live",
          matchLabel,
          detail: context,
          tone: "border-[#d5bb70] bg-[#fff4db] text-[#8a6b08]"
        });
      }

      if (match.submittedAt) {
        items.push({
          id: `submitted-${match.id}`,
          at: match.submittedAt,
          source: "Players",
          event: "Submitted",
          matchLabel,
          detail: context,
          tone: "border-[#d5bb70] bg-[#fff4db] text-[#8a6b08]"
        });
      }

      if (match.reopenedAt) {
        items.push({
          id: `reopened-${match.id}`,
          at: match.reopenedAt,
          source: "Admin",
          event: "Reopened",
          matchLabel,
          detail: context,
          tone: "border-[#cab8f2] bg-[#f3ebff] text-[#5b4696]"
        });
      }

      return items;
    })
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const pagedActivityItems = activityItems.slice(0, activityVisibleCount);
  const hasMoreActivity = activityVisibleCount < activityItems.length;
  const matchOpsRows = filteredMatchLinks.map((match) => {
    const privateUrl = `${appUrl}${ROUTES.privateMatch(match.privateToken)}`;
    const inviteMessage = buildMatchInviteMessage(match, privateUrl);
    const emailInviteHref = buildEmailInviteHref(match, privateUrl);
    const missingRecipientNames = match.recipients
      .filter((recipient) => !recipient.email)
      .map((recipient) => recipient.displayName);
    const hasAssignedTeams = Boolean(match.homeTeamId && match.awayTeamId);

    return {
      id: match.id,
      statusCode: match.status,
      stageLabel: formatStageLabel(match.stage),
      statusLabel: match.status.replaceAll("_", " "),
      statusTone: statusTone(match.status),
      matchup: `${match.homeTeamName ?? "TBD"} vs ${match.awayTeamName ?? "TBD"}`,
      meta: `${match.roundLabel} • ${match.podName ?? "Playoff"}${match.playedOn ? ` • ${match.playedOn}` : ""}`,
      privateUrl,
      inviteMessage,
      emailInviteHref,
      publicUrl:
        match.status === "FINAL" || match.status === "FORFEIT"
          ? `${appUrl}${ROUTES.publicMatch(data.tournament?.slug ?? "fairway-match-2026", match.publicScorecardSlug)}`
          : null,
      hasAssignedTeams,
      missingRecipientNames
    };
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <FlashBanner kind={params?.kind} message={params?.message} />

      <section className="overflow-hidden rounded-[28px] border border-[#d8c07d]/60 bg-[linear-gradient(135deg,#f7f1e3_0%,#efdfb0_100%)] text-ink shadow-[0_20px_50px_rgba(17,32,23,0.12)]">
        <div className="flex flex-col gap-3 px-4 py-4 md:px-6 md:py-5">
          <div className="flex items-center gap-3">
            <TwoManLogo className="h-11 w-11 shrink-0 md:h-12 md:w-12" />
            <div className="min-w-0">
              <h1 className="text-[1.8rem] font-semibold leading-tight text-pine md:text-3xl">
                The Two Man admin
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-full border border-white/70 bg-white/78 px-3 py-1.5 text-sm text-ink/76">
              <span className="mr-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-fairway/62">Live</span>
              <span className="font-semibold text-[#8a6b08]">{liveCount}</span>
            </div>
            <div className="rounded-full border border-white/70 bg-white/78 px-3 py-1.5 text-sm text-ink/76">
              <span className="mr-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-fairway/62">Final</span>
              <span className="font-semibold text-fairway">{finalCount}</span>
            </div>
            <div className="rounded-full border border-white/70 bg-white/78 px-3 py-1.5 text-sm text-ink/76">
              <span className="mr-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-fairway/62">Needs</span>
              <span className="font-semibold text-[#5b4696]">{attentionCount}</span>
            </div>
          </div>

          {!data.databaseReady ? (
            <div className="rounded-2xl border border-[#f4b8b8] bg-[#fff1f1] px-4 py-3 text-sm text-[#a33b3b]">
              Database connection is not ready. Current error: {data.databaseError}
            </div>
          ) : null}
        </div>
      </section>

      <AdminSectionNav activeSection={activeSection} />

      {activeSection !== "overview" ? (
        <form className="grid gap-3 rounded-[24px] border border-white/70 bg-[#f6efe1]/92 p-4 shadow-[0_16px_34px_rgba(17,32,23,0.08)] sm:grid-cols-[1fr_auto_auto]">
          <input type="hidden" name="section" value={activeSection} />
          <input
            name="q"
            defaultValue={params?.q ?? ""}
            placeholder={searchPlaceholder}
            className="rounded-2xl border border-mist bg-white px-4 py-3 text-sm"
          />
          <button
            type="submit"
            className="rounded-full bg-pine px-4 py-2 text-sm font-medium text-white"
          >
            Search
          </button>
          {searchQuery ? (
            <Link
              href={`/admin?section=${activeSection}`}
              className="rounded-full border border-fairway/15 bg-white px-4 py-2 text-center text-sm font-medium text-ink/82"
            >
              Clear
            </Link>
          ) : null}
        </form>
      ) : null}

      <section
        className={
          activeSection === "overview" ? "grid gap-4" : "hidden"
        }
      >
        <SectionCard title="Activity">
          {activityItems.length === 0 ? (
            <div className="text-sm text-ink/62">No app activity yet.</div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-hidden">
                <table className="w-full table-fixed border-collapse text-left">
                <thead>
                  <tr className="border-b border-mist text-[11px] font-semibold uppercase tracking-[0.24em] text-fairway/70">
                    <th className="w-[88px] px-2 py-3 font-semibold sm:w-[120px]">Time</th>
                    <th className="px-2 py-3 font-semibold">Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedActivityItems.map((item) => (
                    <tr key={item.id} className="border-b border-mist/70 align-top last:border-b-0">
                      <td className="px-2 py-3 text-xs text-ink/62 sm:text-sm">
                        <span className="sm:hidden">{formatAuditTimestampCompact(item.at)}</span>
                        <span className="hidden sm:inline">{formatAuditTimestamp(item.at)}</span>
                      </td>
                      <td className="px-2 py-3 text-xs text-ink sm:text-sm">
                        <p className="leading-5">
                          <span className="font-semibold text-ink">{item.event}</span>
                          {" • "}
                          <span className="font-medium text-ink">{item.matchLabel}</span>
                        </p>
                        <p className="mt-1 text-[11px] leading-4 text-ink/58 sm:text-xs">
                          {item.detail}
                          {" • "}
                          {item.source}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
              {hasMoreActivity ? (
                <div className="flex items-center justify-between gap-3 border-t border-mist/70 pt-3">
                  <p className="text-xs text-ink/58">
                    Showing {pagedActivityItems.length} of {activityItems.length}
                  </p>
                  <Link
                    href={`/admin?section=overview&limit=${activityVisibleCount + 12}`}
                    className="rounded-full bg-pine px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Load more
                  </Link>
                </div>
              ) : (
                <p className="border-t border-mist/70 pt-3 text-xs text-ink/58">
                  Showing all {activityItems.length} activity items
                </p>
              )}
            </div>
          )}
        </SectionCard>
      </section>

      <section
        className={
          activeSection === "tournament"
            ? "grid gap-4 2xl:grid-cols-[0.8fr_1.2fr]"
            : "hidden"
        }
      >
        {!showTournamentSettings && !showBracketSettings ? (
          <div className="rounded-[24px] border border-mist bg-white px-4 py-6 text-sm text-ink/62 xl:col-span-2">
            No tournament settings match this search.
          </div>
        ) : null}
        <SectionCard
          className={showTournamentSettings ? "" : "hidden"}
          title="Tournament settings"
          action={
            <Link
              href={ROUTES.home}
              className="rounded-full border border-fairway/15 bg-sand px-3 py-1.5 text-xs font-medium text-ink"
            >
              Preview public side
            </Link>
          }
        >
          <form action={saveTournamentAction} className="grid gap-3">
            <label className="grid gap-1 text-sm">
              <span className="text-ink/70">Tournament name</span>
              <input
                name="name"
                defaultValue={data.tournament?.name ?? "The Two Man"}
                className="rounded-2xl border border-mist bg-white px-4 py-3"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-ink/70">Slug</span>
              <input
                name="slug"
                defaultValue={data.tournament?.slug ?? "fairway-match-2026"}
                className="rounded-2xl border border-mist bg-white px-4 py-3"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1 text-sm">
                <span className="text-ink/70">Season year</span>
                <input
                  name="seasonYear"
                  type="number"
                  defaultValue={data.tournament?.seasonYear ?? 2026}
                  className="rounded-2xl border border-mist bg-white px-4 py-3"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-ink/70">Start date</span>
                <input
                  name="startDate"
                  type="date"
                  defaultValue={data.tournament?.startDate ?? "2026-05-01"}
                  className="rounded-2xl border border-mist bg-white px-4 py-3"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-ink/70">End date</span>
                <input
                  name="endDate"
                  type="date"
                  defaultValue={data.tournament?.endDate ?? "2026-10-01"}
                  className="rounded-2xl border border-mist bg-white px-4 py-3"
                />
              </label>
            </div>
            <div className="pt-2">
              <FormSubmitButton label="Save tournament" pendingLabel="Saving tournament..." />
            </div>
          </form>
        </SectionCard>

        <SectionCard
          className={showBracketSettings ? "" : "hidden"}
          title="Bracket settings"
        >
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <form action={saveBracketSettingsAction} className="grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-ink/70">Bracket label</span>
                <input
                  name="label"
                  defaultValue={data.bracket?.label ?? "Championship Bracket"}
                  className="rounded-2xl border border-mist bg-white px-4 py-3"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-ink/70">Qualifier count</span>
                <input
                  name="qualifierCount"
                  type="number"
                  defaultValue={data.bracket?.qualifierCount ?? 8}
                  className="rounded-2xl border border-mist bg-white px-4 py-3"
                />
              </label>
              <Link
                href={data.tournament ? ROUTES.tournamentBracket(data.tournament.slug) : ROUTES.home}
                className="inline-flex w-fit rounded-full border border-fairway/15 bg-white px-3 py-2 text-xs font-medium text-ink"
              >
                Open public bracket view
              </Link>
              <div className="pt-1">
                <FormSubmitButton label="Save bracket" pendingLabel="Saving bracket..." />
              </div>
            </form>

            <form action={syncBracketAction}>
              <div className="rounded-2xl border border-dashed border-fairway/16 bg-white px-4 py-4">
                <p className="text-sm font-semibold text-ink">Materialize the live playoff board</p>
                <p className="mt-2 text-sm leading-6 text-ink/68">
                  Build or refresh the quarterfinal, semifinal, and championship shells from the
                  latest standings and published results.
                </p>
                <div className="mt-3">
                  <FormSubmitButton label="Sync bracket shell" pendingLabel="Syncing bracket..." />
                </div>
              </div>
            </form>

            <div className="space-y-3">
              <div className="rounded-[24px] border border-mist bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-fairway/68">
                  Bracket rounds
                </p>
                <div className="mt-3 space-y-2">
                  {(data.bracket?.rounds ?? []).filter((round) =>
                    matchesQuery(searchQuery, round.label, round.stage)
                  ).map((round) => (
                    <div
                      key={round.id}
                      className="flex items-center justify-between rounded-2xl bg-sand px-3 py-3 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-ink">{round.label}</p>
                        <p className="text-ink/62">{round.stage}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs text-ink/70">
                        {round.matchCount} matches
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-mist bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-fairway/68">
                  Pod field
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {data.pods.filter((pod) =>
                    matchesQuery(
                      searchQuery,
                      pod.name,
                      ...pod.teams.map((team) => team.teamName)
                    )
                  ).map((pod) => (
                    <div key={pod.id} className="rounded-2xl bg-sand p-3">
                      <p className="font-semibold text-ink">{pod.name}</p>
                      <div className="mt-2 space-y-2">
                        {pod.teams.map((team) => (
                          <div
                            key={team.teamId}
                            className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm"
                          >
                            <span className="font-medium text-ink">{team.teamName}</span>
                            <span className="text-ink/55">Slot {team.slotNumber}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </section>

      <section className={activeSection === "match-ops" ? "grid gap-4" : "hidden"}>
        <SectionCard
          title="Match ops"
          eyebrow="Send and open"
          action={
            <form action={generatePodMatchLinksAction}>
              <FormSubmitButton
                label={data.matchLinks.length > 0 ? "Generate missing links" : "Generate pod match links"}
                pendingLabel="Generating..."
              />
            </form>
          }
        >
          {data.matchLinks.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-mist bg-sand px-4 py-6 text-sm leading-6 text-ink/72">
              No pod match links exist yet. Generate them once and this page will give you a fast
              way to copy links, draft invites, and open a prefilled email for each matchup.
            </div>
          ) : (
            <AdminMatchOpsList rows={matchOpsRows} />
          )}
        </SectionCard>
      </section>

      <>
        <nav
          className={
            activeSection === "field"
              ? "sticky top-[76px] z-20 rounded-[28px] border border-white/70 bg-[#f6efe1]/92 p-3 shadow-[0_16px_34px_rgba(17,32,23,0.08)] backdrop-blur"
              : "hidden"
          }
        >
          <div className="grid grid-cols-2 gap-2">
            <a
              href="/admin?section=field&panel=seeds"
              className={
                fieldPanel === "seeds"
                  ? "rounded-full bg-pine px-4 py-2.5 text-center text-sm font-medium text-white shadow-card"
                  : "rounded-full bg-white/88 px-4 py-2.5 text-center text-sm font-medium text-ink/78 transition hover:text-ink"
              }
            >
              Seed overrides
            </a>
            <a
              href="/admin?section=field&panel=players"
              className={
                fieldPanel === "players"
                  ? "rounded-full bg-pine px-4 py-2.5 text-center text-sm font-medium text-white shadow-card"
                  : "rounded-full bg-white/88 px-4 py-2.5 text-center text-sm font-medium text-ink/78 transition hover:text-ink"
              }
            >
              Player names
            </a>
          </div>
        </nav>

        <SectionCard
          title="Seed overrides"
          className={activeSection === "field" && fieldPanel === "seeds" ? "" : "hidden"}
          action={
            <form action={resetTeamSeedsAction}>
              <button
                type="submit"
                className="rounded-full border border-fairway/15 bg-sand px-3 py-1.5 text-xs font-medium text-ink"
              >
                Reset to auto
              </button>
            </form>
          }
        >
          <div className="overflow-hidden rounded-[26px] border border-mist bg-white">
            <div className="hidden grid-cols-[1.4fr_0.8fr_100px_90px] gap-3 border-b border-mist bg-sand px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-fairway/70 lg:grid">
              <span>Team</span>
              <span>Pod</span>
              <span>Seed</span>
              <span>Save</span>
            </div>

            <div>
              {filteredTeams.length === 0 ? (
                <div className="px-4 py-6 text-sm text-ink/62">No teams match this search.</div>
              ) : (
                filteredTeams.map((team) => (
                  <form
                    key={team.id}
                    action={updateTeamSeedAction}
                    className="grid gap-3 border-t border-mist/70 px-4 py-4 first:border-t-0 lg:grid-cols-[1.4fr_0.8fr_100px_90px] lg:items-center"
                  >
                    <input type="hidden" name="teamId" value={team.id} />

                    <div className="rounded-2xl bg-sand px-3 py-2.5 text-sm font-medium text-ink">
                      {team.name}
                    </div>

                    <div className="rounded-2xl bg-sand px-3 py-2.5 text-sm text-ink/72">
                      {team.podName ?? "No pod"}
                    </div>

                    <label className="grid gap-1 text-sm">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink/50 lg:hidden">
                        Seed
                      </span>
                      <input
                        name="seedNumber"
                        type="number"
                        min="1"
                        max="18"
                        defaultValue={team.seedNumber ?? ""}
                        placeholder="Auto"
                        className="rounded-2xl border border-mist bg-white px-3 py-2.5"
                      />
                    </label>

                    <div className="flex items-center">
                      <FormSubmitButton label="Save" pendingLabel="Saving..." />
                    </div>
                  </form>
                ))
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Player names"
          className={activeSection === "field" && fieldPanel === "players" ? "" : "hidden"}
        >
          <div className="overflow-hidden rounded-[26px] border border-mist bg-white">
            <div className="hidden grid-cols-[140px_140px_1fr_90px] gap-3 border-b border-mist bg-sand px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-fairway/70 lg:grid">
              <span>First</span>
              <span>Last</span>
              <span>Team</span>
              <span>Save</span>
            </div>

            <div>
              {filteredPlayers.length === 0 ? (
                <div className="px-4 py-6 text-sm text-ink/62">No players match this search.</div>
              ) : (
                filteredPlayers.map((player) => (
                  <form
                    key={player.id}
                    action={updatePlayerAction}
                    className="grid gap-3 border-t border-mist/70 px-4 py-4 first:border-t-0 lg:grid-cols-[140px_140px_1fr_90px] lg:items-center"
                  >
                    <input type="hidden" name="playerId" value={player.id} />
                    <input type="hidden" name="email" value={player.email ?? ""} />

                    <label className="grid gap-1 text-sm">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink/50 lg:hidden">
                        First
                      </span>
                      <input
                        name="firstName"
                        defaultValue={player.firstName}
                        className="rounded-2xl border border-mist bg-white px-3 py-2.5"
                      />
                    </label>

                    <label className="grid gap-1 text-sm">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink/50 lg:hidden">
                        Last
                      </span>
                      <input
                        name="lastName"
                        defaultValue={player.lastName}
                        className="rounded-2xl border border-mist bg-white px-3 py-2.5"
                      />
                    </label>

                    <div className="rounded-2xl bg-sand px-3 py-2.5 text-sm text-ink/72">
                      <p className="font-medium text-ink">{player.teamName ?? "No team"}</p>
                      <p>{player.podName ?? "No pod"}</p>
                    </div>

                    <div className="flex items-center">
                      <FormSubmitButton label="Save" pendingLabel="Saving..." />
                    </div>
                  </form>
                ))
              )}
            </div>
          </div>
        </SectionCard>
      </>
    </main>
  );
}
