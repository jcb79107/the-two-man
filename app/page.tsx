import Link from "next/link";
import { TournamentHomeView } from "@/components/tournament-home-view";
import {
  getLatestTournamentSlug,
  getPreviewFallbackTournamentState,
  getPublicTournamentState
} from "@/lib/server/public-tournament";

export const dynamic = "force-dynamic";

type TournamentHomeState = NonNullable<Awaited<ReturnType<typeof getPublicTournamentState>>>;

type HomePageData = {
  slug: string;
  tournamentName: string;
  feed: TournamentHomeState["feed"];
  seasonIsLive: boolean;
};

function shouldUsePreviewDemoData() {
  return process.env.VERCEL_ENV === "preview" && process.env.FAIRWAY_ENABLE_PREVIEW_DEMO === "1";
}

async function getHomePageData(): Promise<HomePageData | null> {
  try {
    const slug = await getLatestTournamentSlug();

    if (!slug) {
      return null;
    }

    const state = await getPublicTournamentState(slug);

    if (!state) {
      return null;
    }

    return {
      slug,
      tournamentName: state.tournament.name,
      feed: state.feed,
      seasonIsLive: new Date(state.tournament.startDate) <= new Date()
    };
  } catch {
    return null;
  }
}

function LocalPreviewFallback() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-4 py-10 sm:px-6">
      <section className="w-full rounded-[28px] border border-[#d8dfd9] bg-[linear-gradient(180deg,#f7f8f6_0%,#eef2ee_100%)] p-6 shadow-[0_18px_44px_rgba(18,32,25,0.08)] sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fairway/68">
          Local preview
        </p>
        <h1 className="mt-2 text-[1.8rem] font-semibold tracking-[-0.03em] text-ink sm:text-[2.2rem]">
          The Two Man is up, but no public tournament home is ready yet.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/72 sm:text-[15px]">
          The dev server can still be used for direct route preview while local tournament data is missing or incomplete.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1a664f]"
          >
            Open admin
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#d8dfd9] bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-[#f7f8f6]"
          >
            Refresh home
          </Link>
        </div>
      </section>
    </main>
  );
}

export default async function HomePage() {
  const data = await getHomePageData();

  if (!data) {
    if (shouldUsePreviewDemoData()) {
      const previewState = await getPreviewFallbackTournamentState();

      if (previewState) {
        return (
          <TournamentHomeView
            slug={previewState.tournament.slug}
            tournamentName={previewState.tournament.name}
            feed={previewState.feed}
            seasonIsLive={new Date(previewState.tournament.startDate) <= new Date()}
          />
        );
      }
    }

    return <LocalPreviewFallback />;
  }

  return (
    <TournamentHomeView
      slug={data.slug}
      tournamentName={data.tournamentName}
      feed={data.feed}
      seasonIsLive={data.seasonIsLive}
    />
  );
}
