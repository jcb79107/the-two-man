import { notFound, redirect } from "next/navigation";
import { PrivateMatchWorkspace } from "@/components/private-match-workspace";
import { isAdminAuthenticated } from "@/lib/server/admin-auth";
import { getPrivateMatchRecordByToken } from "@/lib/server/matches";
import { ROUTES } from "@/lib/api/routes";

export default async function AdminMatchScorecardPage({
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

  if (!dbData.setupComplete) {
    redirect(ROUTES.adminMatchSetup(token));
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[620px] flex-col gap-4 px-4 py-4 pb-28 sm:px-6">
      <PrivateMatchWorkspace
        initialData={dbData}
        pageMode="scorecard"
        adminMode
        adminBackHref="/admin?section=scorecards"
      />
    </main>
  );
}
