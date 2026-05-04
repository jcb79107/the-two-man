import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { React?: typeof React }).React = React;

const tournamentHomeViewMock = vi.fn(() => null);
const getLatestTournamentSlugMock = vi.fn();
const getPreviewFallbackTournamentStateMock = vi.fn();
const getPublicTournamentStateMock = vi.fn();

vi.mock("@/components/tournament-home-view", () => ({
  TournamentHomeView: tournamentHomeViewMock
}));

vi.mock("@/lib/server/public-tournament", () => ({
  getLatestTournamentSlug: getLatestTournamentSlugMock,
  getPreviewFallbackTournamentState: getPreviewFallbackTournamentStateMock,
  getPublicTournamentState: getPublicTournamentStateMock
}));

describe("home routing", () => {
  const originalVercelEnv = process.env.VERCEL_ENV;
  const originalPreviewDemoFlag = process.env.FAIRWAY_ENABLE_PREVIEW_DEMO;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.VERCEL_ENV = originalVercelEnv;
    process.env.FAIRWAY_ENABLE_PREVIEW_DEMO = originalPreviewDemoFlag;
  });

  it("uses preview demo data only when the explicit flag is enabled", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.FAIRWAY_ENABLE_PREVIEW_DEMO = "1";
    getLatestTournamentSlugMock.mockResolvedValue(null);
    getPreviewFallbackTournamentStateMock.mockResolvedValue({
      tournament: {
        slug: "the-two-man-2026",
        name: "The Two Man 2026",
        startDate: new Date(Date.now() - 60_000)
      },
      feed: []
    });

    const { default: HomePage } = await import("../app/page");

    const view = await HomePage();

    expect(getPreviewFallbackTournamentStateMock).toHaveBeenCalled();
    expect(view).toMatchObject({
      props: expect.objectContaining({
        slug: "the-two-man-2026",
        seasonIsLive: true
      })
    });
  });

  it("shows the local preview fallback instead of fake tournament data when preview demo mode is off", async () => {
    process.env.VERCEL_ENV = "preview";
    delete process.env.FAIRWAY_ENABLE_PREVIEW_DEMO;
    getLatestTournamentSlugMock.mockResolvedValue(null);
    getPreviewFallbackTournamentStateMock.mockResolvedValue(null);

    const { default: HomePage } = await import("../app/page");

    const view = await HomePage();

    expect(tournamentHomeViewMock).not.toHaveBeenCalled();
    expect(view).toMatchObject({
      type: expect.any(Function)
    });
    expect((view as { type: { name?: string } }).type.name).toBe("LocalPreviewFallback");
  });
});
