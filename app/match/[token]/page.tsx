import { notFound, redirect } from "next/navigation";
import { getMatchByToken } from "@/lib/demo/mock-data";
import { getPrivateMatchRecordByToken } from "@/lib/server/matches";

export default async function PrivateMatchEntryPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const dbData = await getPrivateMatchRecordByToken(token);

  if (dbData) {
    redirect(`/match/${token}/${dbData.setupComplete ? "scorecard" : "setup"}`);
  }

  const demoData = getMatchByToken(token);

  if (!demoData) {
    notFound();
  }

  redirect(`/match/${token}/${demoData.scorecard ? "scorecard" : "setup"}`);
}
