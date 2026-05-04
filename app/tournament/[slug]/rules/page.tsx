import { notFound } from "next/navigation";
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
  { month: "May–June", label: "Pod play" },
  { month: "July", label: "Quarterfinals" },
  { month: "August", label: "Semifinals" },
  { month: "September", label: "Championship" }
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
        answer: "Match result, hole points, holes won, net better-ball score, scorecard, and GHIN posting."
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
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-4 py-5 pb-24 sm:px-6 lg:px-8">
        <SectionCard title={`${state.tournament.name} rules`} className="overflow-hidden">
          <div className="space-y-4">
            <div className="rounded-[22px] border border-mist bg-[linear-gradient(135deg,#f7f3e8_0%,#f1e8d4_100%)] px-4 py-4">
              <p className="text-sm leading-6 text-ink/78">
                Quick answers on format, standings, handicaps, playoffs, and what to do after each match.
              </p>
            </div>

            <div className="rounded-[24px] border border-mist bg-[linear-gradient(135deg,#f7f0df_0%,#f4e8cc_100%)] px-4 py-4 shadow-[0_12px_28px_rgba(76,58,26,0.08)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a6b08]">
                    Season flow
                  </p>
                  <p className="mt-2 text-base font-semibold text-ink">May to September</p>
                </div>
              </div>

              <div className="mt-4">
                <div className="relative grid grid-cols-4 gap-2 sm:gap-3">
                  <div className="absolute left-[12%] right-[12%] top-3 h-px bg-[#d5bf86]" />
                  {seasonTimeline.map((item) => (
                    <div key={item.month} className="relative text-center">
                      <div className="mx-auto flex h-6 w-6 items-center justify-center rounded-full border border-[#d5bf86] bg-white shadow-sm sm:h-7 sm:w-7">
                        <span className="h-2 w-2 rounded-full bg-[#b78d1b] sm:h-2.5 sm:w-2.5" />
                      </div>
                      <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8a6b08] sm:text-[11px]">
                        {item.month}
                      </p>
                      <p className="mt-1 text-[11px] font-medium leading-4 text-ink/80 sm:text-sm sm:leading-5">
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Need a ruling?" className="overflow-hidden">
          <a
            href={RULES_JUDGE_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-[26px] bg-pine px-5 py-5 text-left text-white shadow-[0_16px_32px_rgba(17,32,23,0.18)] transition hover:bg-[#103126]"
          >
            <span className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/18 bg-white/10 text-white">
                <RulesJudgeIcon className="h-7 w-7" />
              </span>
              <span className="block">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">
                  {RULES_JUDGE_LABEL}
                </span>
                <span className="mt-1 block text-lg font-semibold">Launch the live rules judge</span>
              </span>
            </span>
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-white/78">Open</span>
          </a>
        </SectionCard>

        <SectionCard title="After each match">
          <div className="rounded-[24px] border border-mist bg-[linear-gradient(135deg,#eef4f0_0%,#e2eee7_100%)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fairway/70">
              GHIN posting
            </p>
            <p className="mt-2 text-base font-semibold text-ink">
              Post your gross score to GHIN and mark it as competition.
            </p>
          </div>
        </SectionCard>

        <section className="grid gap-4 xl:grid-cols-2">
          {faqGroups.map((group) => (
            <SectionCard key={group.title} title={group.title}>
              <div className="space-y-3">
                {group.items.map((item) => (
                  <details
                    key={item.question}
                    className="rounded-[22px] border border-mist bg-white/80 px-4 py-3"
                  >
                    <summary className="cursor-pointer list-none pr-6 text-base font-semibold text-ink">
                      {item.question}
                    </summary>
                    <p className="mt-3 text-sm leading-6 text-ink/76">{item.answer}</p>
                  </details>
                ))}
              </div>
            </SectionCard>
          ))}
        </section>

        <SectionCard title="Full document">
          <a
            href="https://docs.google.com/document/d/1AS89cReNLrBMNwMxIVC8IOPnQM89rN5VFJ85wkCcQvc/edit?usp=sharing"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-pine underline underline-offset-4"
          >
            Open the official rules document
          </a>
        </SectionCard>
      </main>
    </>
  );
}
