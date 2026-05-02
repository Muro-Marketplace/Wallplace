import { describe, expect, it, vi, beforeEach } from "vitest";

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock("@/lib/admin-auth", () => ({
  getAdminUser: vi.fn(async () => ({
    user: { id: "u-admin", email: "admin@x.com", user_metadata: { user_type: "admin" } },
    error: null,
  })),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: fromMock, auth: { admin: { getUserById: vi.fn() } } }),
}));

vi.mock("@/lib/email/send", () => ({
  sendEmail: vi.fn(async () => ({})),
}));

import { PUT } from "./route";

beforeEach(() => fromMock.mockReset());

function req(body: unknown): Request {
  return new Request("http://localhost/api/admin/applications/123", {
    method: "PUT",
    headers: { authorization: "Bearer x", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/admin/applications/[id] state guard", () => {
  it("refuses to act on an already-accepted application", async () => {
    fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: { id: "123", status: "accepted" } }) }),
      }),
    }));
    const res = await PUT(req({ action: "reject", feedback: "x" }), {
      params: Promise.resolve({ id: "123" }),
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already/i);
  });

  it("refuses to act on a rejected application", async () => {
    fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: { id: "123", status: "rejected" } }) }),
      }),
    }));
    const res = await PUT(req({ action: "accept" }), {
      params: Promise.resolve({ id: "123" }),
    });
    expect(res.status).toBe(409);
  });
});
