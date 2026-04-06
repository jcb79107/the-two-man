import Link from "next/link";
import { formatDateTimeLabel } from "@/lib/server/formatting";
import type { ActivityFeedEvent } from "@/types/models";

interface ActivityFeedProps {
  events: ActivityFeedEvent[];
  linkForMatch: (matchId: string) => string;
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

function getFeedCtaLabel(type: ActivityFeedEvent["type"]) {
  switch (type) {
    case "MATCH_COMPLETED":
      return "View result";
    case "MATCH_IN_PROGRESS":
      return "Track match";
    case "MATCH_SCHEDULED":
      return "Open matchup";
    default:
      return "Open scorecard";
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

export function ActivityFeed({ events, linkForMatch }: ActivityFeedProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-[26px] border border-dashed border-mist bg-sand px-4 py-6 text-sm leading-6 text-ink/72">
        No tournament activity has been published yet. Once scorecards are finalized, match results
        and bracket movement will show up here.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event, index) => {
        const styles = getFeedEventStyles(event.type);

        return (
          <article
            key={event.id}
            className="relative overflow-hidden rounded-[26px] border border-mist/80 bg-white/90 p-4 shadow-[0_20px_45px_rgba(17,32,23,0.1)]"
          >
            <div className="flex items-start gap-4">
              <div className="relative flex shrink-0 flex-col items-center">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl text-[1.35rem] shadow-card ${styles.chipClassName}`}
                >
                  {event.icon}
                </div>
                {index < events.length - 1 ? (
                  <div className={`mt-2 h-10 w-px bg-gradient-to-b ${styles.railClassName}`} />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${styles.timestampClassName}`}
                  >
                    {getFeedEventLabel(event.type)}
                  </span>
                  <h3 className="text-base font-semibold text-ink">{event.title}</h3>
                  <span className="text-[11px] uppercase tracking-[0.18em] text-fairway/60">
                    {formatDateTimeLabel(event.occurredAt)}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-7 text-ink/78">{event.body}</p>
                {event.matchId ? (
                  <Link
                    href={linkForMatch(event.matchId)}
                    className={`mt-3 inline-flex rounded-full border px-3 py-1.5 text-sm font-medium transition ${styles.ctaClassName}`}
                  >
                    {getFeedCtaLabel(event.type)}
                  </Link>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
