import { beforeEach, describe, expect, it, vi } from "vitest";

const isAdminAuthenticatedMock = vi.fn();
const getAdminDashboardDataMock = vi.fn();

vi.mock("@/lib/server/admin-auth", () => ({
  isAdminAuthenticated: isAdminAuthenticatedMock
}));

vi.mock("@/lib/server/admin", () => ({
  getAdminDashboardData: getAdminDashboardDataMock
}));

describe("admin bootstrap route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns 401 when admin is not authenticated", async () => {
    isAdminAuthenticatedMock.mockResolvedValue(false);
    const { POST } = await import("../app/api/admin/tournament/bootstrap/route");

    const response = await POST({} as never);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(getAdminDashboardDataMock).not.toHaveBeenCalled();
  });

  it("returns dashboard data when admin is authenticated", async () => {
    isAdminAuthenticatedMock.mockResolvedValue(true);
    getAdminDashboardDataMock.mockResolvedValue({
      databaseReady: true,
      tournament: { id: "t1", slug: "the-two-man-2026", name: "The Two Man" },
      summary: { teams: 18, matches: 27 },
      teams: [],
      matches: [],
      scheduleMatches: [],
      commissionerNotes: [],
      playersMissingEmails: []
    });

    const { POST } = await import("../app/api/admin/tournament/bootstrap/route");
    const response = await POST({} as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      tournament: { slug: "the-two-man-2026", name: "The Two Man" }
    });
  });
});
