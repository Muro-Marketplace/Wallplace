// Owner-reported 2026-08-30: the enquiry alert arrived reading
// "New enquiry for fin-coles". A slug is a lookup key, not a person's name,
// and it should never be what a human reads in an email.

import { beforeEach, describe, expect, it, vi } from "vitest";

const { alertMock, adminFromMock } = vi.hoisted(() => ({
  alertMock: vi.fn(async () => ({ ok: true })),
  adminFromMock: vi.fn(),
}));

vi.mock("@/lib/email/admin-alert", () => ({ sendAdminAlert: alertMock }));
vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdmin: () => ({ from: adminFromMock }) }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn(async () => null) }));
vi.mock("@/lib/email/notifications", () => ({ sendMessageUnreadEmail: vi.fn(async () => {}) }));
// The enquirer's acknowledgement goes through the pipeline; not under test here.
vi.mock("@/lib/email/send", () => ({ sendEmail: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/lib/api-auth", () => ({ getAuthenticatedUser: vi.fn(async () => ({ user: null, error: null })) }));

import { POST } from "./route";

function req(body: Record<string, unknown>) {
  return new Request("http://localhost/api/enquiry", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const BODY = {
  senderName: "Jane Buyer",
  senderEmail: "jane@example.com",
  artistSlug: "fin-coles",
  enquiryType: "general",
  message: "Is this still available in a larger size?",
};

/** `profileName` is what artist_profiles returns for the slug. */
function setup(profileName: string | null) {
  // DP-16: the enquiries insert and the artist-name lookup both moved off the
  // anon client onto the service-role client, so one mock answers everything.
  adminFromMock.mockImplementation((table: string) => {
    if (table === "artist_profiles") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: profileName === null ? null : { name: profileName } }),
            single: async () => ({ data: null }),
          }),
        }),
      };
    }
    return {
      insert: () => {
        const result = { error: null } as unknown as Promise<{ error: null }> & {
          select: () => { single: () => Promise<{ data: { id: string } }> };
        };
        // `enquiries` awaits the insert directly; `messages` chains
        // .select().single(). One shape serves both.
        return Object.assign(Promise.resolve({ error: null }), {
          select: () => ({ single: async () => ({ data: { id: "m-1" } }) }),
        }) as typeof result;
      },
      select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }),
    };
  });
}

beforeEach(() => vi.clearAllMocks());

describe("the enquiry alert names the artist, not their slug", () => {
  it("uses the artist's real name in the subject", async () => {
    setup("Fin Coles");
    await POST(req(BODY));

    const alert = (alertMock.mock.calls as unknown as Array<[{ subject: string }]>)[0][0];
    expect(alert.subject).toBe("New enquiry for Fin Coles");
    // The exact string the owner received.
    expect(alert.subject).not.toContain("fin-coles");
  });

  it("de-slugs as a fallback when the profile has no name", async () => {
    setup(null);
    await POST(req(BODY));

    const alert = (alertMock.mock.calls as unknown as Array<[{ subject: string }]>)[0][0];
    expect(alert.subject).toBe("New enquiry for Fin Coles");
  });

  it("keeps the slug in the body, where it is a useful lookup key", async () => {
    setup("Fin Coles");
    await POST(req(BODY));

    const alert = (alertMock.mock.calls as unknown as Array<[{ fields: Array<{ label: string; value: string }> }]>)[0][0];
    const artistField = alert.fields.find((f) => f.label === "Artist");
    expect(artistField?.value).toBe("Fin Coles (fin-coles)");
  });
});
