import { notFound, redirect } from "next/navigation";
import { PrivateMatchWorkspace } from "@/components/private-match-workspace";
import { isAdminAuthenticated } from "@/lib/server/admin-auth";
import { getPrivateMatchRecordByToken } from "@/lib/server/matches";

export default async function PrivateMatchScorecardPage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ admin?: string }>;
}) {
  const { token } = await params;
  const query = searchParams ? await searchParams : undefined;
  const dbData = await getPrivateMatchRecordByToken(token);

  if (!dbData) {
    notFound();
  }

  if (!dbData.setupComplete) {
    redirect(`/match/${token}/setup`);
  }

  const adminMode = query?.admin === "1" && (await isAdminAuthenticated());

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[620px] flex-col gap-4 px-4 py-4 pb-28 sm:px-6">
      <PrivateMatchWorkspace initialData={dbData} pageMode="scorecard" adminMode={adminMode} />
    </main>
  );
}
