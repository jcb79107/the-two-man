import { notFound, redirect } from "next/navigation";
import { PrivateMatchWorkspace } from "@/components/private-match-workspace";
import { SectionCard } from "@/components/section-card";
import { getPrivateMatchRecordByToken } from "@/lib/server/matches";

export default async function PrivateMatchSetupPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const dbData = await getPrivateMatchRecordByToken(token);

  if (!dbData) {
    notFound();
  }

  if (dbData.isPublished) {
    redirect(`/match/${token}/scorecard`);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 px-4 py-4 pb-28 sm:gap-5 sm:px-6 md:gap-6 md:py-6">
      <section className="overflow-hidden rounded-[28px] border border-[#d8dfd9] bg-[linear-gradient(180deg,#f7f8f6_0%,#eef2ee_100%)] shadow-[0_18px_44px_rgba(18,32,25,0.08)]">
        <div className="border-b border-[#d8dfd9] px-5 py-5 sm:px-6 sm:py-6">
          <div className="mb-3 flex flex-wrap items-center gap-2.5">
            <span className="rounded-full border border-pine/10 bg-pine px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
              {dbData.match.homeTeamName}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/45">vs</span>
            <span className="rounded-full border border-[#5f4b8b]/10 bg-[#5f4b8b] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
              {dbData.match.awayTeamName}
            </span>
          </div>
          <div className="max-w-2xl space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fairway/68">
              Match setup
            </p>
            <h1 className="text-[1.6rem] font-semibold tracking-[-0.03em] text-ink sm:text-[2rem]">
              Lock in today’s course, tees, and Handicap Indexes.
            </h1>
            <p className="text-sm leading-6 text-ink/72 sm:text-[15px]">
              Confirm the live playing conditions first, then open the scorecard with a setup the players can trust.
            </p>
          </div>
        </div>
        <div className="grid gap-3 border-t border-white/70 bg-white/55 px-5 py-4 text-[13px] text-ink/72 sm:grid-cols-3 sm:px-6">
          <div>
            <p className="font-semibold text-ink">Today-first inputs</p>
            <p className="mt-1">Use the Handicap Indexes and tee selections for this round, not stale defaults.</p>
          </div>
          <div>
            <p className="font-semibold text-ink">Mobile-ready flow</p>
            <p className="mt-1">Keep setup fast and obvious so the scorecard opens cleanly on the first try.</p>
          </div>
          <div>
            <p className="font-semibold text-ink">Live-card guardrail</p>
            <p className="mt-1">Nothing goes live until the setup is explicitly confirmed.</p>
          </div>
        </div>
      </section>

      <SectionCard title="Setup checklist" eyebrow="Before you open the live card">
        <p className="max-w-2xl text-sm leading-6 text-ink/76">
          Enter today’s Handicap Indexes, choose the course and tees, review any missing hole details, then confirm the setup before generating the scorecard.
        </p>
      </SectionCard>

      <PrivateMatchWorkspace initialData={dbData} pageMode="setup" />
    </main>
  );
}
