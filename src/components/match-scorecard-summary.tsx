import type { ReactNode } from "react";

export type MatchScorecardTeamTone = "pine" | "purple" | "neutral";

export interface MatchScorecardSummaryTeam {
  id: string;
  name: string;
  label: string;
  score: string;
  tone: MatchScorecardTeamTone;
  stats: Array<{
    label: string;
    value: string;
  }>;
}

export interface MatchScorecardStrokeSummary {
  playerId: string;
  playerName: string;
  teamName: string;
  strokeCount: number;
  handicapIndex: string;
  teeName: string;
  strokeHoles: number[];
}

interface MatchScorecardSummaryProps {
  eyebrow: string;
  title: string;
  headingLevel?: "h1" | "h2";
  statusLabel?: string;
  statusPill?: string | null;
  statusActions?: ReactNode;
  courseName: string;
  courseHref?: string;
  courseMeta?: string;
  courseDetails?: string[];
  teams: MatchScorecardSummaryTeam[];
  strokes: MatchScorecardStrokeSummary[];
  children?: ReactNode;
}

function teamToneClass(tone: MatchScorecardTeamTone) {
  switch (tone) {
    case "pine":
      return "border-[#b4d4c5] bg-[#e3f1ea]";
    case "purple":
      return "border-[#d7cdf1] bg-[#f0ebfb]";
    default:
      return "border-mist bg-white";
  }
}

export function MatchScorecardSummary({
  eyebrow,
  title,
  headingLevel = "h2",
  statusLabel,
  statusPill,
  statusActions,
  courseName,
  courseHref,
  courseMeta,
  courseDetails = [],
  teams,
  strokes,
  children
}: MatchScorecardSummaryProps) {
  const Heading = headingLevel;

  return (
    <section className="overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(145deg,rgba(255,252,247,0.98),rgba(247,241,227,0.94))] p-4 shadow-[0_14px_34px_rgba(17,32,23,0.09)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c5a250]">
            {eyebrow}
          </p>
          <Heading className="mt-3 text-[2.05rem] font-semibold leading-[1.02] tracking-normal text-ink sm:text-[2.5rem]">
            {title}
          </Heading>
          <div className="mt-3 text-sm font-medium leading-6 text-ink/64">
            {courseHref ? (
              <a
                href={courseHref}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-pine underline decoration-pine/30 underline-offset-4"
              >
                {courseName}
              </a>
            ) : (
              <span className="font-semibold text-ink/78">{courseName}</span>
            )}
            {courseMeta ? <span> • {courseMeta}</span> : null}
            {courseDetails.map((detail) => (
              <span key={detail} className="block">
                {detail}
              </span>
            ))}
          </div>
        </div>

        {statusLabel || statusPill || statusActions ? (
          <div className="flex shrink-0 flex-col items-end gap-2">
            {statusLabel ? (
              <span className="px-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-ink/54">
                {statusLabel}
              </span>
            ) : null}
            {statusPill ? (
              <span className="rounded-full bg-[#eef8f1] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-pine">
                {statusPill}
              </span>
            ) : null}
            {statusActions}
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-2 items-stretch gap-2">
        {teams.map((team) => (
          <article
            key={team.id}
            className={`grid min-h-[11.5rem] grid-rows-[auto_auto_1fr_auto] justify-items-center rounded-[20px] border p-3 text-center ${teamToneClass(team.tone)}`}
          >
            <p className="max-w-full text-base font-semibold leading-tight text-ink">{team.name}</p>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/54">
              {team.label}
            </p>
            <p className="self-end text-[2.55rem] font-semibold leading-none text-ink">
              {team.score}
            </p>
            <div className="mt-3 grid w-full grid-cols-3 gap-1">
              {team.stats.map((stat) => (
                <span key={`${team.id}-${stat.label}`} className="rounded-xl bg-white/70 px-1.5 py-1.5 text-center">
                  <span className="block text-[8px] font-semibold uppercase tracking-[0.12em] text-ink/46">
                    {stat.label}
                  </span>
                  <strong className="mt-0.5 block text-xs text-ink">{stat.value}</strong>
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>

      {strokes.length > 0 ? (
        <div className="mt-4 rounded-[22px] border border-[#c8b77f] bg-white/82 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fairway/72">
            Handicap strokes
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {strokes.map((player) => (
              <div
                key={`summary-strokes-${player.playerId}`}
                className="rounded-2xl border border-[#d3bd83] bg-[#fffaf0] px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{player.playerName}</p>
                  <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/48">
                    {player.teamName}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-[18px] border border-[#ead9ad] bg-white/72 text-xs">
                  <span className="border-r border-[#ead9ad] px-3 py-2.5">
                    <span className="block text-[8px] font-semibold uppercase tracking-[0.16em] text-fairway/62">
                      Strokes
                    </span>
                    <strong className="mt-0.5 block text-sm leading-none text-pine">
                      {player.strokeCount}
                    </strong>
                  </span>
                  <span className="border-r border-[#ead9ad] px-3 py-2.5">
                    <span className="block text-[8px] font-semibold uppercase tracking-[0.16em] text-ink/42">
                      Index
                    </span>
                    <strong className="mt-0.5 block truncate text-sm leading-none text-ink">
                      {player.handicapIndex}
                    </strong>
                  </span>
                  <span className="px-3 py-2.5">
                    <span className="block text-[8px] font-semibold uppercase tracking-[0.16em] text-ink/42">
                      Tee
                    </span>
                    <strong className="mt-0.5 block truncate text-sm leading-none text-ink">
                      {player.teeName}
                    </strong>
                  </span>
                </div>
                <p className="mt-2 rounded-xl bg-white/55 px-3 py-2 text-xs leading-5 text-ink/64">
                  {player.strokeHoles.length > 0
                    ? `Stroke holes: ${player.strokeHoles.join(", ")}`
                    : "No strokes allotted"}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {children}
    </section>
  );
}
