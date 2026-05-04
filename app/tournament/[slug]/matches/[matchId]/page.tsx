import { notFound } from "next/navigation";
import { PublicNav } from "@/components/public-nav";
import { SectionCard } from "@/components/section-card";
import { formatDateTimeLabel } from "@/lib/server/formatting";
import { getPublicMatchState } from "@/lib/server/public-tournament";

export const dynamic = "force-dynamic";

function scoreMarkClass(
  score: number | null | undefined,
  par: number | undefined,
  compact = false
) {
  if (score == null || par == null) {
    return "border-transparent bg-transparent text-ink/35";
  }

  const delta = score - par;

  if (delta <= -2) {
    return compact
      ? "rounded-full border-[1.5px] border-[#7b7b7b] bg-white text-ink shadow-[0_0_0_2px_white,0_0_0_3.5px_#7b7b7b]"
      : "rounded-full border-[3px] border-[#7b7b7b] bg-white text-ink shadow-[inset_0_0_0_4px_white,inset_0_0_0_7px_#7b7b7b]";
  }

  if (delta === -1) {
    return "rounded-full border-[3px] border-[#7b7b7b] bg-white text-ink";
  }

  if (delta === 0) {
    return "rounded-none border-2 border-transparent bg-white text-ink";
  }

  if (delta === 1) {
    return "rounded-none border-[3px] border-[#7b7b7b] bg-white text-ink";
  }

  return compact
    ? "rounded-none border-[1.5px] border-[#7b7b7b] bg-white text-ink shadow-[0_0_0_2px_white,0_0_0_3.5px_#7b7b7b]"
    : "rounded-none border-[3px] border-[#7b7b7b] bg-white text-ink shadow-[inset_0_0_0_4px_white,inset_0_0_0_7px_#7b7b7b]";
}

function formatCourseLocation(course: { city: string | null; state: string | null } | null) {
  if (!course) {
    return "Course TBD";
  }

  return [course.city, course.state].filter(Boolean).join(", ") || "Course TBD";
}

function segmentLabel(start: number) {
  return start === 1 ? "Front 9" : "Back 9";
}

function statusPillClass(status: string) {
  if (status === "FINAL") {
    return "bg-[#e3f1ea] text-[#174f38]";
  }

  if (status === "FORFEIT") {
    return "bg-[#efe7ff] text-[#5f47a6]";
  }

  if (status === "IN_PROGRESS" || status === "READY" || status === "REOPENED") {
    return "bg-[#fff1c9] text-[#8a6b08]";
  }

  return "bg-sand text-ink/72";
}

export default async function PublicMatchPage({
  params
}: {
  params: Promise<{ slug: string; matchId: string }>;
}) {
  const { slug, matchId } = await params;
  const data = await getPublicMatchState(slug, matchId);

  if (!data) {
    notFound();
  }

  const teams = [
    {
      id: data.homeTeam?.id ?? "home",
      name: data.homeTeam?.name ?? data.match.homeSeedLabel ?? "Home team",
      headerClass: "bg-pine text-white",
      rowFillClass: "bg-[rgba(18,76,58,0.5)] text-pine",
      players: (data.scorecard?.players ?? []).filter((player) => player.teamId === data.homeTeam?.id)
    },
    {
      id: data.awayTeam?.id ?? "away",
      name: data.awayTeam?.name ?? data.match.awaySeedLabel ?? "Away team",
      headerClass: "bg-[#5f4b8b] text-white",
      rowFillClass: "bg-[rgba(95,75,139,0.5)] text-[#4f3e75]",
      players: (data.scorecard?.players ?? []).filter((player) => player.teamId === data.awayTeam?.id)
    }
  ];

  const visibleSegments = [
    { start: 1, end: 9 },
    { start: 10, end: 18 }
  ];
  const publishedScorecard = data.scorecard;
  const publicGridClass = (segmentStart: number) =>
    segmentStart === 1
      ? "grid grid-cols-[90px_repeat(9,minmax(28px,1fr))_44px] sm:grid-cols-[220px_repeat(9,minmax(78px,1fr))_96px]"
      : "grid grid-cols-[90px_repeat(9,minmax(28px,1fr))_44px_44px] sm:grid-cols-[220px_repeat(9,minmax(78px,1fr))_96px_96px]";
  const publicMinWidth = (segmentStart: number) => (segmentStart === 1 ? 386 : 442);
  const publicHeaderCellClass =
    "px-1 py-2 text-center text-[13px] font-semibold sm:px-3 sm:py-4 sm:text-xl";
  const publicLabelCellClass =
    "px-1.5 py-1.5 text-[9px] font-semibold leading-3.5 sm:px-4 sm:py-4 sm:text-lg";
  const publicBodyCellClass = "px-0.5 py-1 text-center sm:px-3 sm:py-3";
  const publicScoreCircleClass = "h-5 w-5 text-[11px] leading-none tracking-[-0.02em] sm:h-12 sm:w-12 sm:text-xl";

  return (
    <>
      <PublicNav slug={slug} seasonIsLive={new Date(data.tournamentStartDate) <= new Date()} />
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-4 py-6 pb-24 sm:px-6 lg:px-8">
        {publishedScorecard ? (
          <>
            <SectionCard title={data.match.roundLabel} eyebrow="Match center">
              <div className="rounded-[28px] border border-mist bg-white px-4 py-4 shadow-[0_14px_36px_rgba(17,32,23,0.08)] sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-fairway/70">
                      {data.match.roundLabel}
                    </p>
                    <h2 className="mt-2 text-[1.65rem] font-semibold leading-tight text-ink sm:text-3xl">
                      {teams[0].name} vs {teams[1].name}
                    </h2>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${statusPillClass(
                      data.match.status
                    )}`}
                  >
                    {data.match.status}
                  </span>
                </div>

                <div className="mt-4 rounded-[22px] bg-[linear-gradient(135deg,#faf4e3_0%,#f3ead3_100%)] px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fairway/70">
                    Official result
                  </p>
                  <p className="mt-2 text-2xl font-semibold leading-tight text-ink">
                    {data.match.resultLabel ?? "Pending"}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink/78">
                  <span>{data.course?.name ?? "Course TBD"}</span>
                  <span className="text-ink/38">•</span>
                  <span>{data.playedOn ? formatDateTimeLabel(data.playedOn) : "Date pending"}</span>
                  <span className="text-ink/38">•</span>
                  <span>{formatCourseLocation(data.course)}</span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {publishedScorecard.teamSummaries.map((summary) => {
                    const currentTeamName =
                      summary.teamId === data.homeTeam?.id ? teams[0].name : teams[1].name;

                    return (
                      <div key={summary.teamId} className="rounded-[24px] border border-mist bg-white px-4 py-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-fairway/70">
                          {summary.resultCode}
                        </p>
                        <h3 className="mt-2 text-xl font-semibold text-ink">{currentTeamName}</h3>
                        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <dt className="text-ink/55">Hole pts</dt>
                            <dd className="mt-1 font-semibold text-ink">{summary.totalPoints}</dd>
                          </div>
                          <div>
                            <dt className="text-ink/55">Holes won</dt>
                            <dd className="mt-1 font-semibold text-ink">{summary.holesWon}</dd>
                          </div>
                          <div>
                            <dt className="text-ink/55">Net BB</dt>
                            <dd className="mt-1 font-semibold text-ink">
                              {summary.betterBallNetTotal ?? "-"}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    );
                  })}
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Tee assignments">
              <div className="grid gap-4 lg:grid-cols-2">
                {teams.map((team) => (
                  <div key={team.id} className="rounded-[26px] border border-mist bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold text-ink">{team.name}</h3>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${team.headerClass}`}
                      >
                        2-man side
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3">
                      {team.players.map((player) => (
                        <div key={player.playerId} className="rounded-[20px] bg-sand/55 px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-base font-semibold text-ink">{player.playerName}</p>
                              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-fairway/68">
                                {player.teeName}
                              </p>
                            </div>
                            <div className="text-right text-sm text-ink/78">
                              <p>
                                <span className="font-medium text-ink">{player.handicapIndex.toFixed(1)}</span>{" "}
                                index
                              </p>
                              <p className="mt-1">
                                <span className="font-medium text-ink">{player.matchStrokeCount}</span> strokes
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {visibleSegments.map((segment) => {
              const holes = publishedScorecard.holeMeta.filter(
                (hole) => hole.holeNumber >= segment.start && hole.holeNumber <= segment.end
              );

              return (
                <SectionCard
                  key={`segment-${segment.start}`}
                  title={segmentLabel(segment.start)}
                >
                  <div className="mb-3 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-fairway/68">
                    <span>Full card view</span>
                    <span>
                      {segment.start === 1 ? "Out only" : "In + Tot"}
                    </span>
                  </div>

                  <div className="-mx-2 overflow-x-auto overscroll-x-contain px-2 pb-2">
                    <div
                      style={{ minWidth: publicMinWidth(segment.start) }}
                      className="overflow-hidden rounded-[24px] border border-[#d7c28d] bg-white shadow-[0_12px_28px_rgba(76,58,26,0.08)]"
                    >
                      <div className={publicGridClass(segment.start)}>
                        <div className={`border-b border-r border-[#d7c28d] bg-[#7a766f] text-white ${publicLabelCellClass}`}>
                          Hole
                        </div>
                        {holes.map((hole) => (
                          <div
                            key={`hole-${segment.start}-${hole.holeNumber}`}
                            className={`border-b border-r border-[#d7c28d] bg-[#7a766f] text-white ${publicHeaderCellClass}`}
                          >
                            {hole.holeNumber}
                          </div>
                        ))}
                        {segment.start === 1 ? (
                          <div className={`border-b border-r border-[#d7c28d] bg-[#7a766f] text-white ${publicHeaderCellClass}`}>
                            Out
                          </div>
                        ) : (
                          <>
                            <div className={`border-b border-r border-[#d7c28d] bg-[#7a766f] text-white ${publicHeaderCellClass}`}>
                              In
                            </div>
                            <div className={`border-b border-r border-[#d7c28d] bg-[#7a766f] text-white ${publicHeaderCellClass}`}>
                              Tot
                            </div>
                          </>
                        )}

                        <div className={`border-b border-r border-[#b9c8d9] bg-[linear-gradient(180deg,#dfe9f4_0%,#c8d7e8_100%)] text-[#23405f] ${publicLabelCellClass}`}>
                          HDCP
                        </div>
                        {holes.map((hole) => (
                          <div
                            key={`si-${segment.start}-${hole.holeNumber}`}
                            className={`border-b border-r border-[#b9c8d9] bg-[linear-gradient(180deg,#f3f7fb_0%,#e3edf7_100%)] font-semibold text-[#23405f] ${publicHeaderCellClass}`}
                          >
                            {hole.strokeIndex}
                          </div>
                        ))}
                        {segment.start === 1 ? (
                          <div className={`border-b border-r border-[#b9c8d9] bg-[linear-gradient(180deg,#f3f7fb_0%,#e3edf7_100%)] font-semibold text-[#23405f] ${publicHeaderCellClass}`}>
                            Out
                          </div>
                        ) : (
                          <>
                            <div className={`border-b border-r border-[#b9c8d9] bg-[linear-gradient(180deg,#f3f7fb_0%,#e3edf7_100%)] font-semibold text-[#23405f] ${publicHeaderCellClass}`}>
                              In
                            </div>
                            <div className={`border-b border-r border-[#b9c8d9] bg-[linear-gradient(180deg,#f3f7fb_0%,#e3edf7_100%)] font-semibold text-[#23405f] ${publicHeaderCellClass}`}>
                              Tot
                            </div>
                          </>
                        )}

                        <div className={`border-b border-r border-[#d7c28d] bg-[linear-gradient(180deg,#f4e5b3_0%,#ead28b_100%)] text-ink ${publicLabelCellClass}`}>
                          Par
                        </div>
                        {holes.map((hole) => (
                          <div
                            key={`par-${segment.start}-${hole.holeNumber}`}
                            className={`border-b border-r border-[#d7c28d] bg-[linear-gradient(180deg,#f9edc1_0%,#efdda4_100%)] font-semibold text-ink ${publicHeaderCellClass}`}
                          >
                            {hole.par}
                          </div>
                        ))}
                        {segment.start === 1 ? (
                          <div className={`border-b border-r border-[#d7c28d] bg-[linear-gradient(180deg,#f9edc1_0%,#efdda4_100%)] font-semibold text-ink ${publicHeaderCellClass}`}>
                            {publishedScorecard.holeMeta
                              .filter((hole) => hole.holeNumber <= 9)
                              .reduce((total, hole) => total + hole.par, 0)}
                          </div>
                        ) : (
                          <>
                            <div className={`border-b border-r border-[#d7c28d] bg-[linear-gradient(180deg,#f9edc1_0%,#efdda4_100%)] font-semibold text-ink ${publicHeaderCellClass}`}>
                              {publishedScorecard.holeMeta
                                .filter((hole) => hole.holeNumber >= 10)
                                .reduce((total, hole) => total + hole.par, 0)}
                            </div>
                            <div className={`border-b border-r border-[#d7c28d] bg-[linear-gradient(180deg,#f9edc1_0%,#efdda4_100%)] font-semibold text-ink ${publicHeaderCellClass}`}>
                              {publishedScorecard.holeMeta.reduce((total, hole) => total + hole.par, 0)}
                            </div>
                          </>
                        )}

                        {teams.map((team) => (
                          <div key={`team-${segment.start}-${team.id}`} className="contents">
                            {team.players.map((player) => (
                              <div key={`${segment.start}-${player.playerId}`} className="contents">
                                <div className="border-b border-r border-[#d7c28d] bg-white px-2 py-2 sm:px-4 sm:py-4">
                                  <p className="text-[11px] font-semibold leading-tight text-ink sm:text-sm">{player.playerName}</p>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-ink/56 sm:mt-2 sm:text-xs">
                                    <span className="rounded-full border border-mist px-2 py-0.5 font-medium text-ink/72">
                                      Gross
                                    </span>
                                    <span>{player.teeName}</span>
                                    <span>•</span>
                                    <span>{player.matchStrokeCount} strokes</span>
                                  </div>
                                </div>
                                {holes.map((hole) => {
                                  const gross = player.grossByHole[hole.holeNumber] ?? null;
                                  const strokeCount = player.strokesByHole[hole.holeNumber] ?? 0;

                                  return (
                                    <div
                                      key={`${segment.start}-${player.playerId}-${hole.holeNumber}`}
                                      className={`border-b border-r border-[#d7c28d] bg-white ${publicBodyCellClass}`}
                                    >
                                      <div className="relative mx-auto w-fit">
                                        {strokeCount > 0 ? (
                                          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#a47f12]" />
                                        ) : null}
                                        <span
                                          className={`mx-auto flex items-center justify-center border-2 font-semibold ${publicScoreCircleClass} ${scoreMarkClass(
                                            gross,
                                            hole.par,
                                            true
                                          )}`}
                                        >
                                          {gross ?? ""}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                                {segment.start === 1 ? (
                                  <div className={`border-b border-r border-[#d7c28d] bg-white ${publicBodyCellClass}`}>
                                    <span className={`mx-auto flex items-center justify-center font-semibold text-ink ${publicScoreCircleClass}`}>
                                      {publishedScorecard.holeMeta
                                        .filter((hole) => hole.holeNumber <= 9)
                                        .reduce((total, hole) => {
                                          const net = player.netByHole[hole.holeNumber];
                                          return net != null ? total + net : total;
                                        }, 0)}
                                    </span>
                                  </div>
                                ) : (
                                  <>
                                    <div className={`border-b border-r border-[#d7c28d] bg-white ${publicBodyCellClass}`}>
                                      <span className={`mx-auto flex items-center justify-center font-semibold text-ink ${publicScoreCircleClass}`}>
                                        {publishedScorecard.holeMeta
                                          .filter((hole) => hole.holeNumber >= 10)
                                          .reduce((total, hole) => {
                                            const net = player.netByHole[hole.holeNumber];
                                            return net != null ? total + net : total;
                                          }, 0)}
                                      </span>
                                    </div>
                                    <div className={`border-b border-r border-[#d7c28d] bg-white ${publicBodyCellClass}`}>
                                      <span className={`mx-auto flex items-center justify-center font-semibold text-ink ${publicScoreCircleClass}`}>
                                        {publishedScorecard.holeMeta.reduce((total, hole) => {
                                          const net = player.netByHole[hole.holeNumber];
                                          return net != null ? total + net : total;
                                        }, 0)}
                                      </span>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}

                            <div className={`border-b border-r px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] sm:px-4 sm:py-4 sm:text-sm ${team.headerClass}`}>
                              {team.name} Net
                            </div>
                            {holes.map((hole) => {
                              const holeResult = publishedScorecard.holes.find(
                                (entry) => entry.holeNumber === hole.holeNumber
                              );
                              const teamNet = holeResult?.teamBetterBallNet[team.id] ?? null;

                              return (
                                <div
                                  key={`${segment.start}-${team.id}-net-${hole.holeNumber}`}
                                  className={`border-b border-r text-center ${team.rowFillClass} ${publicBodyCellClass}`}
                                >
                                  <span
                                    className={`mx-auto flex items-center justify-center font-semibold ${publicScoreCircleClass} ${
                                      teamNet == null ? "text-current/35" : "text-current"
                                    }`}
                                  >
                                    {teamNet ?? ""}
                                  </span>
                                </div>
                              );
                            })}
                            {segment.start === 1 ? (
                              <div className={`border-b border-r text-center ${team.rowFillClass} ${publicBodyCellClass}`}>
                                <span className={`mx-auto flex items-center justify-center font-semibold text-current ${publicScoreCircleClass}`}>
                                  {publishedScorecard.holes
                                    .filter((hole) => hole.holeNumber <= 9)
                                    .reduce((total, hole) => {
                                      const teamNet = hole.teamBetterBallNet[team.id] ?? null;

                                      return teamNet != null ? total + teamNet : total;
                                    }, 0)}
                                </span>
                              </div>
                            ) : (
                              <>
                                <div className={`border-b border-r text-center ${team.rowFillClass} ${publicBodyCellClass}`}>
                                  <span className={`mx-auto flex items-center justify-center font-semibold text-current ${publicScoreCircleClass}`}>
                                    {publishedScorecard.holes
                                      .filter((hole) => hole.holeNumber >= 10)
                                      .reduce((total, hole) => {
                                        const teamNet = hole.teamBetterBallNet[team.id] ?? null;

                                        return teamNet != null ? total + teamNet : total;
                                      }, 0)}
                                  </span>
                                </div>
                                <div className={`border-b border-r text-center ${team.rowFillClass} ${publicBodyCellClass}`}>
                                  <span className={`mx-auto flex items-center justify-center font-semibold text-current ${publicScoreCircleClass}`}>
                                    {publishedScorecard.holes.reduce((total, hole) => {
                                      const holeResult = publishedScorecard.holes.find(
                                        (entry) => entry.holeNumber === hole.holeNumber
                                      );
                                      const teamNet = holeResult?.teamBetterBallNet[team.id] ?? null;

                                      return teamNet != null ? total + teamNet : total;
                                    }, 0)}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </SectionCard>
              );
            })}
          </>
        ) : (
          <SectionCard title="Match status">
            <p className="text-sm leading-7 text-ink/80">
              This match is not final yet, so the full public scorecard is still on the way.
            </p>
          </SectionCard>
        )}
      </main>
    </>
  );
}
