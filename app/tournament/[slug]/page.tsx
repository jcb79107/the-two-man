import { notFound } from "next/navigation";
import { TournamentHomeView } from "@/components/tournament-home-view";
import { getPublicTournamentState } from "@/lib/server/public-tournament";

export const dynamic = "force-dynamic";

export default async function TournamentPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const state = await getPublicTournamentState(slug);

  if (!state) {
    notFound();
  }

  return (
    <TournamentHomeView
      slug={slug}
      tournamentName={state.tournament.name}
      feed={state.feed}
      seasonIsLive={new Date(state.tournament.startDate) <= new Date()}
    />
  );
}
