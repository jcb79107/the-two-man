import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/server/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const eventId = Sentry.captureException(
    new Error("The Two Man admin Sentry verification error")
  );

  await Sentry.flush(2000);

  return NextResponse.json({
    ok: true,
    eventId,
    message: "Sent a controlled admin verification error to Sentry."
  });
}
