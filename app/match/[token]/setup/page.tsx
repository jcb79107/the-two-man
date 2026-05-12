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
    <main className="mx-auto flex min-h-screen w-full max-w-[620px] flex-col gap-4 px-4 py-4 pb-28 sm:px-6">
      <SectionCard title="Setup">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-full bg-pine px-3 py-1.5 text-[11px] font-medium text-white">
              {dbData.match.homeTeamName}
            </span>
            <span className="text-sm text-ink/55">vs</span>
            <span className="rounded-full bg-[#5f4b8b] px-3 py-1.5 text-[11px] font-medium text-white">
              {dbData.match.awayTeamName}
            </span>
          </div>
        </div>
      </SectionCard>
      <PrivateMatchWorkspace initialData={dbData} pageMode="setup" />
    </main>
  );
}
