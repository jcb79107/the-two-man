import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ configured: vi.fn(), authenticated: vi.fn(), recaps: vi.fn() }));
vi.mock("@/lib/server/admin-auth", () => ({
  isAdminAuthConfigured: auth.configured,
  isAdminAuthenticated: auth.authenticated
}));
vi.mock("@/lib/server/admin-graphics", () => ({ getAdminGraphicRecaps: auth.recaps }));
import { GET } from "../app/api/admin/graphics/[id]/route";

const request = new Request("http://localhost/api/admin/graphics/missing");
const context = { params: Promise.resolve({ id: "missing" }) };

describe("legacy graphic endpoint authorization", () => {
  beforeEach(() => vi.resetAllMocks());

  it.each([false, true])("denies unauthenticated access when auth configured is %s", async (configured) => {
    auth.configured.mockReturnValue(configured);
    auth.authenticated.mockResolvedValue(false);
    const response = await GET(request, context);
    expect(response.status).toBe(401);
    expect(auth.recaps).not.toHaveBeenCalled();
  });

  it("loads recaps only after authentication and returns 404 for an unknown result", async () => {
    auth.authenticated.mockResolvedValue(true);
    auth.recaps.mockResolvedValue([]);
    expect((await GET(request, context)).status).toBe(404);
    expect(auth.recaps).toHaveBeenCalledOnce();
  });
});
