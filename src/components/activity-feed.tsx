import Link from "next/link";
import { formatDateTimeLabel } from "@/lib/server/formatting";
import type { ActivityFeedEvent } from "@/types/models";

interface ActivityFeedProps {
  events: ActivityFeedEvent[];
  linkForMatch: (matchId: string) => string;
  linkForBracket?: (round: BracketShortcutRound) => string;
}

type BracketShortcutRound = "quarterfinals" | "semifinals" | "championship";

function getBracketShortcutRound(type: ActivityFeedEvent["type"]): BracketShortcutRound | null {
  switch (type) {
    case "PLAYOFFS_SET":
    case "BRACKET_UPDATED":
      return "quarterfinals";
    case "SEMIFINAL_LOCKED":
      return "semifinals";
    case "CHAMPIONSHIP_SET":
      return "championship";
    default:
      return null;
  }
}

function getMatchBracketShortcutRound(event: ActivityFeedEvent): BracketShortcutRound | null {
  if (event.type !== "MATCH_COMPLETED") {
    return null;
  }

  switch (event.metadata?.stage) {
    case "QUARTERFINAL":
      return "quarterfinals";
    case "SEMIFINAL":
      return "semifinals";
    case "CHAMPIONSHIP":
      return "championship";
    default:
      return null;
  }
}

function getFeedEventLabel(type: ActivityFeedEvent["type"]) {
  switch (type) {
    case "MATCH_COMPLETED":
      return "Final";
    case "MATCH_IN_PROGRESS":
      return "Live";
    case "MATCH_SCHEDULED":
      return "Ready";
    case "PLAYOFFS_SET":
      return "Field set";
    case "BRACKET_UPDATED":
      return "Bracket";
    case "SEMIFINAL_LOCKED":
      return "Final four";
    case "CHAMPIONSHIP_SET":
      return "Final set";
    default:
      return "Update";
  }
}

function getFeedEventAccent(type: ActivityFeedEvent["type"]) {
  switch (type) {
    case "MATCH_COMPLETED":
      return "bg-fairway";
    case "MATCH_IN_PROGRESS":
      return "bg-gold";
    case "PLAYOFFS_SET":
    case "BRACKET_UPDATED":
    case "SEMIFINAL_LOCKED":
    case "CHAMPIONSHIP_SET":
      return "bg-[#7c5cc4]";
    case "MATCH_SCHEDULED":
    default:
      return "bg-[#5d95c2]";
  }
}

function getFeedCtaLabel(type: ActivityFeedEvent["type"]) {
  switch (type) {
    case "MATCH_COMPLETED":
      return "View result";
    default:
      return "Open scorecard";
  }
}

function getBracketCtaLabel(round: BracketShortcutRound) {
  switch (round) {
    case "semifinals":
      return "View semifinals";
    case "championship":
      return "View championship";
    case "quarterfinals":
    default:
      return "View bracket";
  }
}

export function ActivityFeed({ events, linkForMatch, linkForBracket }: ActivityFeedProps) {
  const visibleEvents = events.reduce<ActivityFeedEvent[]>((items, event) => {
    const previous = items[items.length - 1];

    if (
      previous &&
      previous.type === event.type &&
      previous.title === event.title &&
      previous.body === event.body
    ) {
      return items;
    }

    return [...items, event];
  }, []);
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-mist bg-[#f4f5f1] px-4 py-6 text-sm leading-6 text-ink/72">
        No tournament activity has been published yet. Once scorecards are finalized, match results
        and bracket movement will show up here.
      </div>
    );
  }

  const renderEvent = (event: ActivityFeedEvent, index: number, isLast: boolean) => {
    const bracketShortcutRound = getMatchBracketShortcutRound(event) ?? getBracketShortcutRound(event.type);
    const bracketHref =
      bracketShortcutRound && linkForBracket ? linkForBracket(bracketShortcutRound) : null;

    return (
      <div
        key={event.id}
        className="grid grid-cols-[auto_1fr] gap-3 border-b border-mist/75 px-3 py-4 last:border-b-0 sm:px-4"
      >
        <div className="flex flex-col items-center">
          <span className={`mt-1 h-2 w-2 rounded-full ${getFeedEventAccent(event.type)}`} />
          {!isLast ? (
            <span className="mt-2 h-full min-h-10 w-px bg-mist" />
          ) : null}
        </div>
        <article className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="text-xs font-medium text-pine"
                >
                  {getFeedEventLabel(event.type)}
                </span>
                <span className="text-xs tabular-nums text-[#526057]">
                  {formatDateTimeLabel(event.occurredAt)}
                </span>
              </div>
              <h3 className="mt-2 text-[0.95rem] font-semibold leading-tight text-ink sm:text-base">
                {event.title}
              </h3>
            </div>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#526057]">{event.body}</p>
          {event.matchId && event.type === "MATCH_COMPLETED" && bracketHref && bracketShortcutRound ? (
            <Link
              href={bracketHref}
              className="focus-ring mt-2 inline-flex min-h-11 items-center rounded-lg border border-mist px-3 py-2 text-sm font-medium text-pine transition-colors hover:bg-[#eef1ec]"
            >
              {getBracketCtaLabel(bracketShortcutRound)}
            </Link>
          ) : event.matchId && event.type === "MATCH_COMPLETED" ? (
            <Link
              href={linkForMatch(event.matchId)}
              className="focus-ring mt-2 inline-flex min-h-11 items-center rounded-lg border border-mist px-3 py-2 text-sm font-medium text-pine transition-colors hover:bg-[#eef1ec]"
            >
              {getFeedCtaLabel(event.type)}
            </Link>
          ) : bracketHref && bracketShortcutRound ? (
            <Link
              href={bracketHref}
              className="focus-ring mt-2 inline-flex min-h-11 items-center rounded-lg border border-mist px-3 py-2 text-sm font-medium text-pine transition-colors hover:bg-[#eef1ec]"
            >
              {getBracketCtaLabel(bracketShortcutRound)}
            </Link>
          ) : null}
        </article>
      </div>
    );
  };

  return (
    <div className="overflow-hidden rounded-lg border border-mist bg-white">
      <div className="border-b border-mist/75 bg-white px-3 py-3 sm:px-4">
        <p className="text-xs tabular-nums text-[#526057]">
          Showing all {visibleEvents.length} tournament updates
        </p>
      </div>

      {visibleEvents.map((event, index) => renderEvent(event, index, index === visibleEvents.length - 1))}
    </div>
  );
}
