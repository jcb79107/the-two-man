import { NextResponse } from "next/server";
import { getPublicBracketState } from "@/lib/server/public-tournament";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const state = await getPublicBracketState(slug);

  if (!state) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  return NextResponse.json({
    tournamentSlug: slug,
    bracket: state.bracket,
    seeds: state.seeds,
    rounds: state.rounds
  });
}
