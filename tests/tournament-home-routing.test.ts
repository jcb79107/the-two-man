import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { React?: typeof React }).React = React;

const notFoundMock = vi.fn(() => {
  throw new Error("NOT_FOUND");
});

const tournamentHomeViewMock = vi.fn(() => null);
const getPublicTournamentStateMock = vi.fn();
const getPreviewFallbackTournamentStateMock = vi.fn();

vi.mock("next/navigation", () => ({
  notFound: notFoundMock
}));

vi.mock("@/components/tournament-home-view", () => ({
  TournamentHomeView: tournamentHomeViewMock
}));

vi.mock("@/lib/server/public-tournament", () => ({
  getPublicTournamentState: getPublicTournamentStateMock,
  getPreviewFallbackTournamentState: getPreviewFallbackTournamentStateMock
}));

describe("tournament home routing", () => {
  const originalVercelEnv = process.env.VERCEL_ENV;
  const originalPreviewDemoFlag = process.env.FAIRWAY_ENABLE_PREVIEW_DEMO;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.VERCEL_ENV = originalVercelEnv;
    process.env.FAIRWAY_ENABLE_PREVIEW_DEMO = originalPreviewDemoFlag;
  });

  it("uses imported tournament data in preview when the explicit preview fallback flag is enabled", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.FAIRWAY_ENABLE_PREVIEW_DEMO = "1";
    getPublicTournamentStateMock.mockResolvedValue(null);
    getPreviewFallbackTournamentStateMock.mockResolvedValue({
      tournament: {
        slug: "two-match-2026",
        name: "The Two Man",
        startDate: new Date(Date.now() - 48 * 60 * 60 * 1000)
      },
      feed: []
    });

    const { default: TournamentPage } = await import("../app/tournament/[slug]/page");

    const view = await TournamentPage({
      params: Promise.resolve({ slug: "the-two-man-2026" })
    });

    expect(getPreviewFallbackTournamentStateMock).toHaveBeenCalledWith("the-two-man-2026");
    expect(view).toMatchObject({
      props: expect.objectContaining({
        slug: "two-match-2026",
        tournamentName: "The Two Man",
        seasonIsLive: true
      })
    });
  });

  it("404s in preview when live data is unavailable and demo mode is not explicitly enabled", async () => {
    process.env.VERCEL_ENV = "preview";
    delete process.env.FAIRWAY_ENABLE_PREVIEW_DEMO;
    getPublicTournamentStateMock.mockResolvedValue(null);

    const { default: TournamentPage } = await import("../app/tournament/[slug]/page");

    await expect(
      TournamentPage({
        params: Promise.resolve({ slug: "the-two-man-2026" })
      })
    ).rejects.toThrow("NOT_FOUND");

    expect(notFoundMock).toHaveBeenCalled();
  });

  it("marks the season live only after the tournament start date arrives", async () => {
    process.env.VERCEL_ENV = "production";
    getPublicTournamentStateMock.mockResolvedValue({
      tournament: {
        slug: "pilot-cup",
        name: "Pilot Cup",
        startDate: new Date(Date.now() + 48 * 60 * 60 * 1000)
      },
      feed: []
    });

    const { default: TournamentPage } = await import("../app/tournament/[slug]/page");

    const view = await TournamentPage({
      params: Promise.resolve({ slug: "pilot-cup" })
    });

    expect(view).toMatchObject({
      props: expect.objectContaining({
        slug: "pilot-cup",
        tournamentName: "Pilot Cup",
        seasonIsLive: false
      })
    });
  });

  it("404s when the tournament slug is missing outside preview demo mode", async () => {
    process.env.VERCEL_ENV = "production";
    getPublicTournamentStateMock.mockResolvedValue(null);

    const { default: TournamentPage } = await import("../app/tournament/[slug]/page");

    await expect(
      TournamentPage({
        params: Promise.resolve({ slug: "missing-event" })
      })
    ).rejects.toThrow("NOT_FOUND");

    expect(notFoundMock).toHaveBeenCalled();
  });
});
