import { notFound } from "next/navigation";
import { TournamentHomeView } from "@/components/tournament-home-view";
import {
  getLatestTournamentSlug,
  getPublicTournamentState
} from "@/lib/server/public-tournament";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const slug = await getLatestTournamentSlug();

  if (!slug) {
    notFound();
  }

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
