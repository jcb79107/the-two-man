import { NextResponse } from "next/server";
import { demoAdminSummary, demoTournament } from "@/lib/demo/mock-data";

export async function POST() {
  return NextResponse.json({
    message: "Bootstrap preview response returned.",
    tournament: demoTournament,
    summary: demoAdminSummary
  });
}
