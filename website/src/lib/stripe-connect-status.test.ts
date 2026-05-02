import { describe, expect, it, vi, beforeEach } from "vitest";

const { accountsRetrieve, fromMock } = vi.hoisted(() => ({
  accountsRetrieve: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: { accounts: { retrieve: accountsRetrieve } },
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: fromMock }),
}));

import { canArtistAcceptOrders } from "./stripe-connect-status";

beforeEach(() => {
  accountsRetrieve.mockReset();
  fromMock.mockReset();
});

function profileRow(stripeId: string | null, charges: boolean | null) {
  return {
    select: () => ({
      eq: () => ({
        single: async () => ({
          data: {
            stripe_connect_account_id: stripeId,
            stripe_charges_enabled: charges,
            stripe_charges_checked_at: charges == null ? null : new Date().toISOString(),
          },
        }),
      }),
    }),
  };
}

describe("canArtistAcceptOrders()", () => {
  it("returns false when artist has no stripe account", async () => {
    fromMock.mockReturnValue(profileRow(null, null));
    const ok = await canArtistAcceptOrders("alice");
    expect(ok).toBe(false);
    expect(accountsRetrieve).not.toHaveBeenCalled();
  });

  it("returns cached charges_enabled when checked recently (<60s)", async () => {
    fromMock.mockReturnValue(profileRow("acct_123", true));
    const ok = await canArtistAcceptOrders("alice");
    expect(ok).toBe(true);
    expect(accountsRetrieve).not.toHaveBeenCalled();
  });

  it("re-checks Stripe when last check was >60s old", async () => {
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: {
              stripe_connect_account_id: "acct_123",
              stripe_charges_enabled: true,
              stripe_charges_checked_at: new Date(Date.now() - 90_000).toISOString(),
            },
          }),
        }),
      }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    });
    accountsRetrieve.mockResolvedValue({ charges_enabled: false });
    const ok = await canArtistAcceptOrders("alice");
    expect(ok).toBe(false);
    expect(accountsRetrieve).toHaveBeenCalledWith("acct_123");
  });
});
