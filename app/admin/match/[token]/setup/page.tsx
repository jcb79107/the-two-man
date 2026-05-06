import { notFound, redirect } from "next/navigation";
import { PrivateMatchWorkspace } from "@/components/private-match-workspace";
import { SectionCard } from "@/components/section-card";
import { isAdminAuthenticated } from "@/lib/server/admin-auth";
import { getPrivateMatchRecordByToken } from "@/lib/server/matches";
import { ROUTES } from "@/lib/api/routes";

export default async function AdminMatchSetupPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    redirect("/admin?section=scorecards");
  }

  const { token } = await params;
  const dbData = await getPrivateMatchRecordByToken(token);

  if (!dbData) {
    notFound();
  }

  if (dbData.isPublished) {
    redirect(ROUTES.adminMatchScorecard(token));
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[620px] flex-col gap-4 px-4 py-4 pb-28 sm:px-6">
      <SectionCard title="Admin setup">
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
          <p className="text-sm leading-6 text-ink/76">
            Enter current indexes, pick the course and tees, then generate the live card from admin.
          </p>
        </div>
      </SectionCard>
      <PrivateMatchWorkspace
        initialData={dbData}
        pageMode="setup"
        adminMode
        adminBackHref="/admin?section=scorecards"
      />
    </main>
  );
}
