import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { React?: typeof React }).React = React;

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

const notFoundMock = vi.fn(() => {
  throw new Error("NOT_FOUND");
});

const getPrivateMatchRecordByTokenMock = vi.fn();
const isAdminAuthenticatedMock = vi.fn();
const privateMatchWorkspaceMock = vi.fn(() => null);

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  notFound: notFoundMock
}));

vi.mock("@/lib/server/matches", () => ({
  getPrivateMatchRecordByToken: getPrivateMatchRecordByTokenMock
}));

vi.mock("@/lib/server/admin-auth", () => ({
  isAdminAuthenticated: isAdminAuthenticatedMock
}));

vi.mock("@/components/private-match-workspace", () => ({
  PrivateMatchWorkspace: privateMatchWorkspaceMock
}));

describe("private match routing safeguards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes the private match entry page to setup until setup has been confirmed", async () => {
    getPrivateMatchRecordByTokenMock.mockResolvedValue({
      setupComplete: false,
      isPublished: false
    });

    const { default: PrivateMatchEntryPage } = await import("../app/match/[token]/page");

    await expect(
      PrivateMatchEntryPage({
        params: Promise.resolve({ token: "private-token" })
      })
    ).rejects.toThrow("REDIRECT:/match/private-token/setup");
  });

  it("redirects scorecard access back to setup until setup has been confirmed and saved", async () => {
    getPrivateMatchRecordByTokenMock.mockResolvedValue({
      setupComplete: false,
      isPublished: false
    });

    const { default: PrivateMatchScorecardPage } = await import("../app/match/[token]/scorecard/page");

    await expect(
      PrivateMatchScorecardPage({
        params: Promise.resolve({ token: "private-token" }),
        searchParams: Promise.resolve({})
      })
    ).rejects.toThrow("REDIRECT:/match/private-token/setup");

    expect(getPrivateMatchRecordByTokenMock).toHaveBeenCalledWith("private-token");
    expect(redirectMock).toHaveBeenCalledWith("/match/private-token/setup");
  });

  it("redirects setup access to the scorecard once the match has already been published", async () => {
    getPrivateMatchRecordByTokenMock.mockResolvedValue({
      setupComplete: true,
      isPublished: true,
      match: {
        homeTeamName: "North",
        awayTeamName: "South"
      }
    });

    const { default: PrivateMatchSetupPage } = await import("../app/match/[token]/setup/page");

    await expect(
      PrivateMatchSetupPage({
        params: Promise.resolve({ token: "private-token" })
      })
    ).rejects.toThrow("REDIRECT:/match/private-token/scorecard");
  });

  it("enables admin scorecard mode only for authenticated commissioners", async () => {
    getPrivateMatchRecordByTokenMock.mockResolvedValue({
      setupComplete: true,
      isPublished: false
    });
    isAdminAuthenticatedMock.mockResolvedValue(true);

    const { default: PrivateMatchScorecardPage } = await import("../app/match/[token]/scorecard/page");

    const view = await PrivateMatchScorecardPage({
      params: Promise.resolve({ token: "private-token" }),
      searchParams: Promise.resolve({ admin: "1" })
    });

    expect(view).toMatchObject({
      props: {
        children: expect.objectContaining({
          props: expect.objectContaining({ adminMode: true })
        })
      }
    });
  });

  it("keeps admin scorecard mode off for unauthenticated visitors even if the query flag is present", async () => {
    getPrivateMatchRecordByTokenMock.mockResolvedValue({
      setupComplete: true,
      isPublished: false
    });
    isAdminAuthenticatedMock.mockResolvedValue(false);

    const { default: PrivateMatchScorecardPage } = await import("../app/match/[token]/scorecard/page");

    const view = await PrivateMatchScorecardPage({
      params: Promise.resolve({ token: "private-token" }),
      searchParams: Promise.resolve({ admin: "1" })
    });

    expect(view).toMatchObject({
      props: {
        children: expect.objectContaining({
          props: expect.objectContaining({ adminMode: false })
        })
      }
    });
  });

  it("renders the admin scorecard route in commissioner edit mode", async () => {
    getPrivateMatchRecordByTokenMock.mockResolvedValue({
      setupComplete: true,
      isPublished: true
    });
    isAdminAuthenticatedMock.mockResolvedValue(true);

    const { default: AdminMatchScorecardPage } = await import("../app/admin/match/[token]/scorecard/page");

    const view = await AdminMatchScorecardPage({
      params: Promise.resolve({ token: "private-token" })
    });

    expect(view).toMatchObject({
      props: {
        children: expect.objectContaining({
          props: expect.objectContaining({
            adminMode: true,
            adminBackHref: "/admin?section=scorecards",
            pageMode: "scorecard"
          })
        })
      }
    });
  });

  it("keeps unauthenticated visitors out of the admin scorecard route", async () => {
    isAdminAuthenticatedMock.mockResolvedValue(false);

    const { default: AdminMatchScorecardPage } = await import("../app/admin/match/[token]/scorecard/page");

    await expect(
      AdminMatchScorecardPage({
        params: Promise.resolve({ token: "private-token" })
      })
    ).rejects.toThrow("REDIRECT:/admin?section=scorecards");

    expect(getPrivateMatchRecordByTokenMock).not.toHaveBeenCalled();
  });

  it("routes unfinished admin cards to the admin setup route", async () => {
    getPrivateMatchRecordByTokenMock.mockResolvedValue({
      setupComplete: false,
      isPublished: false
    });
    isAdminAuthenticatedMock.mockResolvedValue(true);

    const { default: AdminMatchScorecardPage } = await import("../app/admin/match/[token]/scorecard/page");

    await expect(
      AdminMatchScorecardPage({
        params: Promise.resolve({ token: "private-token" })
      })
    ).rejects.toThrow("REDIRECT:/admin/match/private-token/setup");
  });
});
