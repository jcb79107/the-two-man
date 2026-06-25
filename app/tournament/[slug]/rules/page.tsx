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

const ruleSummaryCards = [
  { label: "Format", value: "2-man net better-ball" },
  { label: "Match", value: "18 holes" },
  { label: "Pods", value: "6 pods of 3 teams" },
  { label: "Playoffs", value: "6 winners + 2 wild cards" }
] as const;

const scoringCards = [
  {
    title: "Win a hole",
    eyebrow: "Hole scoring",
    body: "Compare each team's lowest net score on the hole. Lower team net wins the hole.",
    points: ["Win = 1 point", "Tie = 0.5 points each", "Loss = 0 points"]
  },
  {
    title: "Win a match",
    eyebrow: "Pod play",
    body: "Most hole points after 18 holes wins the match. All hole points still matter for standings.",
    points: ["Pod matches may finish tied", "Every team plays two pod matches", "The app calculates the result from gross scores"]
  },
  {
    title: "Win a pod",
    eyebrow: "Advance",
    body: "A 2-0 team wins its pod. If teams are tied, standings tiebreakers decide the pod winner.",
    points: ["Match record first", "Then hole points and holes won", "Then lowest cumulative net better-ball"]
  },
  {
    title: "Win a playoff match",
    eyebrow: "Bracket",
    body: "Playoff matches use the same scoring, but they cannot end tied.",
    points: ["Sudden death if feasible", "Otherwise net scorecard playoff from 18 backward", "Coin flip only if still tied"]
  }
] as const;

const handicapRules = [
  "Each player uses 90% of Course Handicap.",
  "Lowest handicap player plays off 0.",
  "Other players receive strokes from the difference.",
  "Strokes follow the scorecard handicap row.",
  "Maximum 1 stroke per hole per player."
] as const;

const matchChecklist = [
  "One player submits the scorecard for the group.",
  "Confirm handicap indexes, course, and tees played are correct.",
  "Enter gross scores for every player and submit the card.",
  "Post gross scores to GHIN as competition rounds."
] as const;

const matchProcedures = [
  "The side that won the previous hole has the honor. If the hole was halved, the order carries over.",
  "After tee shots, the side farther from the hole is away unless both teams agree to ready golf.",
  "A side may concede a stroke, hole, or match. A clear concession cannot be declined or taken back.",
  "Resolve rules questions before moving on when possible. Use the live rules judge for on-course disputes."
] as const;

const faqGroups = [
  {
    title: "Common questions",
    items: [
      {
        question: "How are wild cards picked?",
        answer: "The top 2 non-pod winners advance. Wild cards are ranked by match record, hole points, holes won, lowest net better-ball score, then coin flip."
      },
      {
        question: "How is the bracket seeded?",
        answer: "Pod winners are seeds 1-6 using the same standings criteria. Wild cards are seeds 7-8."
      },
      {
        question: "Who picks the playoff course?",
        answer: "The higher seed gets to pick the course."
      },
      {
        question: "What happens in a forfeit?",
        answer: "The opponent wins, receives 12 hole points and +6 holes won, and no best-ball score is recorded."
      },
      {
        question: "What needs to be submitted after a match?",
        answer: "One player submits the completed scorecard with correct handicap indexes, course, tees, and gross scores. The app handles the result and scoring math."
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
          <p className="mt-3 text-sm leading-6 text-ink/72">
            The Two Man is 2-man net better-ball match play. Use this page to score the match,
            understand advancement, and handle common on-course questions.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {ruleSummaryCards.map((item) => (
              <div key={item.label} className="rounded-[18px] bg-sand px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fairway/68">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-semibold leading-tight text-ink">{item.value}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Need a ruling?" className="overflow-hidden">
          <a
            href={RULES_JUDGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open the rules judge"
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

        <SectionCard title="Scoring & advancement" eyebrow="How to win">
          <div className="grid gap-3">
            {scoringCards.map((item) => (
              <article key={item.title} className="rounded-[20px] border border-mist bg-white px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-fairway/68">
                  {item.eyebrow}
                </p>
                <h2 className="mt-1 text-xl font-semibold leading-tight text-ink">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-ink/70">{item.body}</p>
                <div className="mt-3 grid gap-2">
                  {item.points.map((point) => (
                    <div
                      key={point}
                      className="rounded-[16px] border border-fairway/10 bg-[#f7faf7] px-3 py-2 text-sm font-semibold leading-5 text-ink/82"
                    >
                      {point}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

        <section className="grid gap-4 md:grid-cols-2">
          <SectionCard title="Handicaps & tees" eyebrow="Before play">
            <div className="grid gap-2">
              {handicapRules.map((item) => (
                <div
                  key={item}
                  className="rounded-[18px] border border-mist bg-white px-3 py-3 text-sm font-semibold leading-6 text-ink/82"
                >
                  {item}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Match procedures" eyebrow="During play">
            <div className="grid gap-2">
              {matchProcedures.map((item) => (
                <div
                  key={item}
                  className="rounded-[18px] border border-mist bg-white px-3 py-3 text-sm font-semibold leading-6 text-ink/82"
                >
                  {item}
                </div>
              ))}
            </div>
          </SectionCard>
        </section>

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

        <SectionCard title="Quick answers" eyebrow="Reference">
          <div className="grid gap-3">
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
