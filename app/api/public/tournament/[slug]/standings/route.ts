import { NextResponse } from "next/server";
import { getPublicTournamentState } from "@/lib/server/public-tournament";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const state = await getPublicTournamentState(slug);

  if (!state) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  return NextResponse.json({
    tournamentSlug: slug,
    pods: state.podStandings,
    wildCards: state.wildCards
  });
}
