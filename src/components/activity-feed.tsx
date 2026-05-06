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

function getFeedEventStyles(type: ActivityFeedEvent["type"]) {
  switch (type) {
    case "MATCH_COMPLETED":
      return {
        chipClassName:
          "bg-[linear-gradient(135deg,#143d2d_0%,#1f6b4f_100%)] text-white",
        timestampClassName: "bg-[rgba(31,107,79,0.12)] text-fairway/90",
        ctaClassName:
          "border-fairway/18 bg-[rgba(31,107,79,0.09)] text-fairway hover:bg-[rgba(31,107,79,0.14)]",
        railClassName: "from-fairway/35 to-transparent"
      };
    case "MATCH_IN_PROGRESS":
      return {
        chipClassName:
          "bg-[linear-gradient(135deg,#8f6b00_0%,#d1a01a_100%)] text-white",
        timestampClassName: "bg-[rgba(217,184,108,0.22)] text-[#916b00]",
        ctaClassName:
          "border-[#d7c28d] bg-[rgba(217,184,108,0.18)] text-[#7a5a00] hover:bg-[rgba(217,184,108,0.26)]",
        railClassName: "from-[#d9b86c]/45 to-transparent"
      };
    case "BRACKET_UPDATED":
    case "SEMIFINAL_LOCKED":
    case "CHAMPIONSHIP_SET":
    case "PLAYOFFS_SET":
      return {
        chipClassName:
          "bg-[linear-gradient(135deg,#56408c_0%,#7c5cc4_100%)] text-white",
        timestampClassName: "bg-[rgba(124,92,196,0.14)] text-[#5d46a0]",
        ctaClassName:
          "border-[#cabaf3] bg-[rgba(124,92,196,0.1)] text-[#5d46a0] hover:bg-[rgba(124,92,196,0.16)]",
        railClassName: "from-[#7c5cc4]/35 to-transparent"
      };
    case "MATCH_SCHEDULED":
    default:
      return {
        chipClassName:
          "bg-[linear-gradient(135deg,#365f7c_0%,#5d95c2_100%)] text-white",
        timestampClassName: "bg-[rgba(93,149,194,0.12)] text-[#365f7c]",
        ctaClassName:
          "border-[#bfd5e7] bg-[rgba(93,149,194,0.1)] text-[#365f7c] hover:bg-[rgba(93,149,194,0.16)]",
        railClassName: "from-[#5d95c2]/35 to-transparent"
      };
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
      <div className="rounded-[26px] border border-dashed border-mist bg-sand px-4 py-6 text-sm leading-6 text-ink/72">
        No tournament activity has been published yet. Once scorecards are finalized, match results
        and bracket movement will show up here.
      </div>
    );
  }

  const renderEvent = (event: ActivityFeedEvent, index: number, isLast: boolean) => {
    const styles = getFeedEventStyles(event.type);
    const bracketShortcutRound = getBracketShortcutRound(event.type);
    const bracketHref =
      bracketShortcutRound && linkForBracket ? linkForBracket(bracketShortcutRound) : null;

    return (
      <div
        key={event.id}
        className="grid grid-cols-[auto_1fr] gap-3 border-b border-mist/75 px-3 py-3.5 last:border-b-0 sm:px-4"
      >
        <div className="flex flex-col items-center">
          <span className={`mt-1 h-2.5 w-2.5 rounded-full ${getFeedEventAccent(event.type)}`} />
          {!isLast ? (
            <span className={`mt-2 h-full min-h-10 w-px bg-gradient-to-b ${styles.railClassName}`} />
          ) : null}
        </div>
        <article className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${styles.timestampClassName}`}
                >
                  {getFeedEventLabel(event.type)}
                </span>
                <span className="text-[10px] uppercase tracking-[0.16em] text-fairway/58">
                  {formatDateTimeLabel(event.occurredAt)}
                </span>
              </div>
              <h3 className="mt-2 text-[0.95rem] font-semibold leading-tight text-ink sm:text-base">
                {event.title}
              </h3>
            </div>
          </div>
          <p className="mt-1.5 text-sm leading-6 text-ink/70">{event.body}</p>
          {event.matchId && event.type === "MATCH_COMPLETED" ? (
            <Link
              href={linkForMatch(event.matchId)}
              className={`mt-3 inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold transition ${styles.ctaClassName}`}
            >
              {getFeedCtaLabel(event.type)}
            </Link>
          ) : bracketHref && bracketShortcutRound ? (
            <Link
              href={bracketHref}
              className={`mt-3 inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold transition ${styles.ctaClassName}`}
            >
              {getBracketCtaLabel(bracketShortcutRound)}
            </Link>
          ) : null}
        </article>
      </div>
    );
  };

  return (
    <div className="overflow-hidden rounded-[22px] border border-mist bg-white">
      <div className="border-b border-mist/75 bg-white px-3 py-3 sm:px-4">
        <p className="text-xs font-medium text-ink/62">
          Showing all {visibleEvents.length} tournament updates
        </p>
      </div>

      {visibleEvents.map((event, index) => renderEvent(event, index, index === visibleEvents.length - 1))}
    </div>
  );
}
