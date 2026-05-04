import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

const notFoundMock = vi.fn(() => {
  throw new Error("NOT_FOUND");
});

const findUniqueMock = vi.fn();
const updateMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  notFound: notFoundMock
}));

vi.mock("@/lib/server/db", () => ({
  db: {
    matchInvitation: {
      findUnique: findUniqueMock,
      update: updateMock
    }
  }
}));

describe("invite routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks an unopened invite as opened before redirecting to the private match", async () => {
    findUniqueMock.mockResolvedValue({
      id: "invite-1",
      openedAt: null,
      match: {
        privateToken: "private-123"
      }
    });

    const { default: MatchInvitePage } = await import("../app/invite/[token]/page");

    await expect(
      MatchInvitePage({
        params: Promise.resolve({ token: "invite-token" })
      })
    ).rejects.toThrow("REDIRECT:/match/private-123");

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "invite-1" },
      data: { openedAt: expect.any(Date) }
    });
  });

  it("does not rewrite the invite open timestamp after the first open", async () => {
    findUniqueMock.mockResolvedValue({
      id: "invite-1",
      openedAt: new Date("2026-04-10T15:00:00.000Z"),
      match: {
        privateToken: "private-123"
      }
    });

    const { default: MatchInvitePage } = await import("../app/invite/[token]/page");

    await expect(
      MatchInvitePage({
        params: Promise.resolve({ token: "invite-token" })
      })
    ).rejects.toThrow("REDIRECT:/match/private-123");

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("404s when the invite token is invalid", async () => {
    findUniqueMock.mockResolvedValue(null);

    const { default: MatchInvitePage } = await import("../app/invite/[token]/page");

    await expect(
      MatchInvitePage({
        params: Promise.resolve({ token: "missing-token" })
      })
    ).rejects.toThrow("NOT_FOUND");

    expect(notFoundMock).toHaveBeenCalled();
  });
});
