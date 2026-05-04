import React from "react";
import { notFound } from "next/navigation";
import { TournamentHomeView } from "@/components/tournament-home-view";
import {
  getPreviewFallbackTournamentState,
  getPublicTournamentState
} from "@/lib/server/public-tournament";

export const dynamic = "force-dynamic";

function shouldUsePreviewDemoData() {
  return process.env.VERCEL_ENV === "preview" && process.env.FAIRWAY_ENABLE_PREVIEW_DEMO === "1";
}

export default async function TournamentPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const state = (await getPublicTournamentState(slug)) ??
    (shouldUsePreviewDemoData() ? await getPreviewFallbackTournamentState(slug) : null);

  if (!state) {
    notFound();
  }

  return (
    <TournamentHomeView
      slug={state.tournament.slug}
      tournamentName={state.tournament.name}
      feed={state.feed}
      seasonIsLive={new Date(state.tournament.startDate) <= new Date()}
    />
  );
}
