import { notFound } from "next/navigation";
import { BackBreadcrumb } from "@/components/back-breadcrumb";
import { PublicNav } from "@/components/public-nav";
import { RulesJudgeIcon } from "@/components/rules-judge-icon";
import { SectionCard } from "@/components/section-card";
import {
  RULES_JUDGE_LABEL,
  RULES_JUDGE_URL
} from "@/lib/content/rules-judge";
import { getPublicTournamentState } from "@/lib/server/public-tournament";

export const dynamic = "force-dynamic";

const seasonTimeline = [
  { month: "May-June", label: "Pod play", detail: "Every team plays two matches inside its pod." },
  { month: "July", label: "Quarterfinals", detail: "Six pod winners and two wild cards enter the bracket." },
  { month: "August", label: "Semifinals", detail: "Winners advance through the fixed knockout path." },
  { month: "September", label: "Championship", detail: "Final match decides The Two Man champion." }
] as const;

const matchChecklist = [
  "One player submits the scorecard for the group.",
  "Confirm handicap indexes, course, and tees played are correct.",
  "Enter gross scores for every player and submit the card.",
  "Post gross scores to GHIN as competition rounds."
] as const;

const faqGroups = [
  {
    title: "Basics",
    items: [
      {
        question: "What is the format?",
        answer: "2-man net better-ball match play over 18 holes."
      },
      {
        question: "How many teams are in it?",
        answer: "18 teams split into 6 pods of 3."
      },
      {
        question: "How many pod matches does each team play?",
        answer: "Two."
      }
    ]
  },
  {
    title: "Match play etiquette",
    items: [
      {
        question: "Who tees off first?",
        answer: "The team that won the previous hole has the honor on the next tee. If the hole was halved, the order carries over."
      },
      {
        question: "Who plays first after the tee shot?",
        answer: "The side farther from the hole is away and should play first unless both teams agree to ready golf to keep pace."
      },
      {
        question: "Can putts or holes be conceded?",
        answer: "Yes. A side can concede a stroke, hole, or match. Once a concession is clearly made, it cannot be declined or taken back."
      },
      {
        question: "What etiquette should we follow?",
        answer: "Be clear about concessions, mark balls when needed, announce provisional balls, repair the course, keep pace, and settle questions before moving on when possible."
      }
    ]
  },
  {
    title: "Standings",
    items: [
      {
        question: "How are pod standings sorted?",
        answer: "Match record, hole points, holes won, lowest cumulative net better-ball score, then coin flip."
      },
      {
        question: "How do wild cards work?",
        answer: "The top 2 non-pod winners advance to the playoffs."
      },
      {
        question: "What does each hole count for?",
        answer: "Win = 1 point, tie = 0.5 each, loss = 0."
      }
    ]
  },
  {
    title: "Handicaps",
    items: [
      {
        question: "What handicap allowance are we using?",
        answer: "90% of Course Handicap."
      },
      {
        question: "How are strokes allocated?",
        answer: "Lowest handicap player plays off 0. Everyone else gets strokes based on the difference."
      },
      {
        question: "Is there a stroke cap per hole?",
        answer: "Yes. Maximum 1 stroke per hole per player."
      }
    ]
  },
  {
    title: "Playoffs",
    items: [
      {
        question: "Who makes the bracket?",
        answer: "6 pod winners and 2 wild cards."
      },
      {
        question: "How is the bracket seeded?",
        answer: "1 vs 8, 2 vs 7, 3 vs 6, 4 vs 5."
      },
      {
        question: "Who picks the playoff course?",
        answer: "The higher seed."
      }
    ]
  },
  {
    title: "Edge cases",
    items: [
      {
        question: "How are tied playoff matches decided?",
        answer: "Sudden death if feasible, otherwise a net scorecard playoff from hole 18 backward, then coin flip."
      },
      {
        question: "What happens in a forfeit?",
        answer: "Opponent wins, gets 12 hole points and +6 holes won, and no best-ball score is recorded."
      },
      {
        question: "What needs to be submitted after a match?",
        answer: "One player submits the completed scorecard with correct handicap indexes, course, tees, and gross scores for every player. The app handles the match result and scoring math from there."
      }
    ]
  }
] as const;

export default async function TournamentRulesPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const state = await getPublicTournamentState(slug);

  if (!state) {
    notFound();
  }

  return (
    <>
      <PublicNav slug={slug} seasonIsLive={new Date(state.tournament.startDate) <= new Date()} />
      <main className="mx-auto flex min-h-screen w-full max-w-[620px] flex-col gap-4 px-4 py-5 pb-24 sm:px-6">
        <BackBreadcrumb fallbackHref={`/tournament/${slug}`} label="Back to previous page" />

        <SectionCard
          title="Rules"
          eyebrow={state.tournament.name}
          action={
            <a
              href="https://docs.google.com/document/d/1AS89cReNLrBMNwMxIVC8IOPnQM89rN5VFJ85wkCcQvc/edit?usp=sharing"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[#d7c8a8] bg-sand px-3 py-2 text-xs font-semibold text-pine"
            >
              Full doc
            </a>
          }
        >
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-[18px] bg-sand px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fairway/68">Format</p>
              <p className="mt-1 text-sm font-semibold leading-tight text-ink">2-man net better-ball</p>
            </div>
            <div className="rounded-[18px] bg-sand px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fairway/68">Field</p>
              <p className="mt-1 text-sm font-semibold leading-tight text-ink">18 teams, 6 pods</p>
            </div>
            <div className="rounded-[18px] bg-sand px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fairway/68">Allowance</p>
              <p className="mt-1 text-sm font-semibold leading-tight text-ink">
                90% course handicap
              </p>
            </div>
            <div className="rounded-[18px] bg-sand px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fairway/68">Playoffs</p>
              <p className="mt-1 text-sm font-semibold leading-tight text-ink">6 winners + 2 wild cards</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Need a ruling?" className="overflow-hidden">
          <a
            href={RULES_JUDGE_URL}
            target="_blank"
            rel="noreferrer"
            className="grid min-h-20 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[20px] bg-pine px-4 py-4 text-left text-white shadow-[0_14px_28px_rgba(17,32,23,0.18)] transition hover:bg-[#103126]"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/18 bg-white/10 text-white">
              <RulesJudgeIcon className="h-6 w-6" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-white/64">
                {RULES_JUDGE_LABEL}
              </span>
              <span className="mt-1 block text-base font-semibold leading-tight">Launch live rules help</span>
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/78">Open</span>
          </a>
        </SectionCard>

        <section className="grid gap-4 md:grid-cols-2">
          <SectionCard title="Season flow" eyebrow="May to September">
            <div className="space-y-3">
              {seasonTimeline.map((item, index) => (
                <div key={item.month} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3">
                  <div className="flex w-10 shrink-0 flex-col items-center">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d7c28d] bg-[#fff8e8] text-sm font-semibold leading-none text-[#8a6b08]">
                      {index + 1}
                    </span>
                    {index < seasonTimeline.length - 1 ? (
                      <span className="mt-2 h-full min-h-10 w-px shrink-0 bg-[#d7c28d]" />
                    ) : null}
                  </div>
                  <div className="pb-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-base font-semibold leading-tight text-ink">{item.label}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a6b08]">
                        {item.month}
                      </p>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-ink/68">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="After each match" eyebrow="Player checklist">
            <div className="grid gap-2">
              {matchChecklist.map((item, index) => (
                <div
                  key={item}
                  className="grid min-h-16 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-[18px] border border-mist bg-white px-3 py-3"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e3f1ea] text-sm font-semibold text-[#174f38]">
                    {index + 1}
                  </span>
                  <p className="text-sm font-semibold leading-6 text-ink/82">{item}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </section>

        <SectionCard title="Rule book" eyebrow="Quick answers">
          <div className="grid gap-3 xl:grid-cols-2">
            {faqGroups.map((group) => (
              <div key={group.title} className="overflow-hidden rounded-[20px] border border-mist bg-white">
                <div className="border-b border-mist bg-sand px-4 py-3">
                  <h3 className="text-base font-semibold text-ink">{group.title}</h3>
                </div>
                <div className="divide-y divide-mist">
                  {group.items.map((item) => (
                    <details key={item.question} className="group px-4 py-3">
                      <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-sm font-semibold leading-6 text-ink [&::-webkit-details-marker]:hidden">
                        <span>{item.question}</span>
                        <span className="text-lg leading-none text-fairway/62 transition group-open:rotate-45">
                          +
                        </span>
                      </summary>
                      <p className="mt-2 text-sm leading-6 text-ink/70">{item.answer}</p>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </main>
    </>
  );
}
