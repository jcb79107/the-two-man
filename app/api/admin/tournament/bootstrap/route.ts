import { NextRequest, NextResponse } from "next/server";
import { getAdminDashboardData } from "@/lib/server/admin";
import { isAdminAuthenticated } from "@/lib/server/admin-auth";

export async function POST(_request: NextRequest) {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getAdminDashboardData();

  if (!data.databaseReady || !data.tournament) {
    return NextResponse.json(
      {
        message: "No imported tournament data is available for preview bootstrap.",
        tournament: null,
        summary: data.summary
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    message: "Bootstrap preview response returned from imported tournament data.",
    tournament: data.tournament,
    summary: data.summary
  });
}
