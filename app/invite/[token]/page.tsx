import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/server/db";

export default async function MatchInvitePage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invitation = await db.matchInvitation.findUnique({
    where: {
      token
    },
    include: {
      match: {
        select: {
          privateToken: true
        }
      }
    }
  });

  if (!invitation?.match) {
    notFound();
  }

  if (!invitation.openedAt) {
    await db.matchInvitation.update({
      where: {
        id: invitation.id
      },
      data: {
        openedAt: new Date()
      }
    });
  }

  redirect(`/match/${invitation.match.privateToken}`);
}
