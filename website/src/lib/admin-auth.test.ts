import { describe, expect, it, vi, beforeEach } from "vitest";

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ auth: { getUser } }),
}));

import { getAdminUser } from "./admin-auth";

beforeEach(() => {
  getUser.mockReset();
  process.env.ADMIN_EMAILS = "boss@example.com";
});

function req(token: string | null = "Bearer x"): Request {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = token;
  return new Request("http://localhost/api/admin/x", { headers });
}

describe("getAdminUser()", () => {
  it("returns the user when email + role both match", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "u", email: "boss@example.com", user_metadata: { user_type: "admin" } } },
      error: null,
    });
    const result = await getAdminUser(req());
    expect(result.user?.id).toBe("u");
    expect(result.error).toBeNull();
  });

  it("403s when email is allowlisted but user_metadata.user_type !== 'admin'", async () => {
    getUser.mockResolvedValue({
      data: {
        user: { id: "u", email: "boss@example.com", user_metadata: { user_type: "artist" } },
      },
      error: null,
    });
    const result = await getAdminUser(req());
    expect(result.user).toBeNull();
    expect(result.error?.status).toBe(403);
  });

  it("403s when user_metadata.user_type is missing entirely", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "u", email: "boss@example.com", user_metadata: {} } },
      error: null,
    });
    const result = await getAdminUser(req());
    expect(result.error?.status).toBe(403);
  });

  it("503s when ADMIN_EMAILS is unset", async () => {
    delete process.env.ADMIN_EMAILS;
    delete process.env.ADMIN_EMAIL;
    getUser.mockResolvedValue({
      data: { user: { id: "u", email: "boss@example.com" } },
      error: null,
    });
    const result = await getAdminUser(req());
    expect(result.error?.status).toBe(503);
  });
});
