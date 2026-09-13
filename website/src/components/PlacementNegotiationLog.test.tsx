// @vitest-environment jsdom
// Owner report 13 September 2026: the negotiation log read "From fin-coles".
// messages.sender_name is the sender's slug, kept as the stored identity, so the
// log shows the name the history route resolves, and never the slug itself.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const { authFetchMock } = vi.hoisted(() => ({ authFetchMock: vi.fn() }));

// api-client imports the real Supabase client at load time, which throws
// without env vars.
vi.mock("@/lib/supabase", () => ({ supabase: { auth: {}, from: () => ({}) } }));
vi.mock("@/lib/api-client", async (orig) => {
  const actual = await orig<typeof import("@/lib/api-client")>();
  return { ...actual, authFetch: authFetchMock };
});

import PlacementNegotiationLog from "./PlacementNegotiationLog";

afterEach(() => cleanup());
beforeEach(() => authFetchMock.mockReset());

function serve(entries: unknown[]) {
  authFetchMock.mockResolvedValue(new Response(JSON.stringify({ entries }), { status: 200 }));
}

const REQUEST = {
  id: 1,
  created_at: "2026-09-01T10:00:00Z",
  message_type: "placement_request",
  sender_name: "fin-coles",
  sender_type: "artist",
  content: null,
  metadata: { placementId: "p1" },
};

describe("<PlacementNegotiationLog /> sender names (owner report 13 September 2026)", () => {
  it("shows who each entry is from by name, never by slug", async () => {
    serve([{ ...REQUEST, sender_display_name: "Fin Coles" }]);
    render(<PlacementNegotiationLog placementId="p1" />);

    expect(await screen.findByText("From Fin Coles")).toBeTruthy();
    expect(screen.queryByText(/fin-coles/)).toBeNull();
  });

  it("still reads as a name when the server sends no display name", async () => {
    serve([REQUEST]);
    render(<PlacementNegotiationLog placementId="p1" />);

    expect(await screen.findByText("From Fin Coles")).toBeTruthy();
    expect(screen.queryByText(/fin-coles/)).toBeNull();
  });
});
