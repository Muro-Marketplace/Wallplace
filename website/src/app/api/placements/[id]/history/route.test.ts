// Owner report 13 September 2026: the negotiation log read "From fin-coles".
// messages.sender_name holds the sender's SLUG on purpose, because conversations
// are matched on it, so the log has to be given the names people actually go by.

import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, tables } = vi.hoisted(() => ({
  authMock: vi.fn(async () => ({ user: { id: "u-artist", email: "a@x.com" }, error: null })),
  tables: {
    placement: null as Record<string, unknown> | null,
    messages: [] as Array<Record<string, unknown>>,
    artistProfiles: [] as Array<{ slug: string; name: string | null }>,
    venueProfiles: [] as Array<{ slug: string; name: string | null }>,
  },
}));

vi.mock("@/lib/api-auth", () => ({ getAuthenticatedUser: authMock }));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "placements") {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: tables.placement }) }) }) };
      }
      if (table === "messages") {
        return {
          select: () => ({
            in: () => ({
              contains: () => ({
                order: () => ({ limit: async () => ({ data: tables.messages, error: null }) }),
              }),
            }),
          }),
        };
      }
      const rows = table === "artist_profiles" ? tables.artistProfiles : tables.venueProfiles;
      return {
        select: () => ({
          in: async (_column: string, slugs: string[]) => ({
            data: rows.filter((r) => slugs.includes(r.slug)),
            error: null,
          }),
        }),
      };
    },
  }),
}));

import { GET } from "./route";

function get() {
  return GET(new Request("http://localhost/api/placements/p1/history", { headers: { authorization: "Bearer t" } }), {
    params: Promise.resolve({ id: "p1" }),
  });
}

const ARTIST_REQUEST = {
  id: 1,
  created_at: "2026-09-01T10:00:00Z",
  message_type: "placement_request",
  sender_name: "fin-coles",
  sender_type: "artist",
  content: null,
  metadata: { placementId: "p1" },
};

const VENUE_RESPONSE = {
  id: 2,
  created_at: "2026-09-01T11:00:00Z",
  message_type: "placement_response",
  sender_name: "the-curzon",
  sender_type: "venue",
  content: null,
  metadata: { placementId: "p1", status: "active" },
};

describe("GET /api/placements/[id]/history names the senders (owner report 13 September 2026)", () => {
  beforeEach(() => {
    tables.placement = { artist_user_id: "u-artist", venue_user_id: "u-venue" };
    tables.artistProfiles = [{ slug: "fin-coles", name: "Fin Coles" }];
    tables.venueProfiles = [{ slug: "the-curzon", name: "The Curzon Soho" }];
    tables.messages = [ARTIST_REQUEST, VENUE_RESPONSE];
  });

  it("gives each entry the artist's or the venue's name, not the slug", async () => {
    const res = await get();
    expect(res.status).toBe(200);
    const { entries } = (await res.json()) as { entries: Array<{ sender_display_name?: string }> };
    expect(entries.map((e) => e.sender_display_name)).toEqual(["Fin Coles", "The Curzon Soho"]);
  });

  it("falls back to a readable name, never the slug, when the profile has no name", async () => {
    tables.artistProfiles = [];
    tables.messages = [{ ...ARTIST_REQUEST, sender_name: "maya-chen" }];
    const { entries } = (await (await get()).json()) as { entries: Array<{ sender_display_name?: string }> };
    expect(entries[0].sender_display_name).toBe("Maya Chen");
  });

  it("still refuses someone who is not a party to the placement", async () => {
    tables.placement = { artist_user_id: "u-someone", venue_user_id: "u-else" };
    const res = await get();
    expect(res.status).toBe(403);
  });
});
