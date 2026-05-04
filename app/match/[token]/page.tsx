import { notFound, redirect } from "next/navigation";
import { getPrivateMatchRecordByToken } from "@/lib/server/matches";

export default async function PrivateMatchEntryPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const dbData = await getPrivateMatchRecordByToken(token);

  if (!dbData) {
    notFound();
  }

  redirect(`/match/${token}/${dbData.setupComplete ? "scorecard" : "setup"}`);
}
