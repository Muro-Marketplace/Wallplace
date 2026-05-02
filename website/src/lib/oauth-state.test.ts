import { describe, expect, it, beforeEach } from "vitest";
import { signOAuthState, verifyOAuthState } from "./oauth-state";

beforeEach(() => {
  process.env.OAUTH_STATE_SECRET = "test-secret-not-for-prod";
});

describe("signOAuthState() / verifyOAuthState()", () => {
  it("round-trips a payload", async () => {
    const token = await signOAuthState({ role: "artist", next: "/apply" });
    const payload = await verifyOAuthState(token);
    expect(payload).toEqual({ role: "artist", next: "/apply" });
  });

  it("rejects a tampered token", async () => {
    const token = await signOAuthState({ role: "customer", next: "/browse" });
    const tampered = token.slice(0, -2) + "xx";
    await expect(verifyOAuthState(tampered)).rejects.toThrow();
  });

  it("rejects expired tokens", async () => {
    const token = await signOAuthState({ role: "venue", next: "/v" }, { ttlSeconds: -1 });
    await expect(verifyOAuthState(token)).rejects.toThrow(/expired/i);
  });

  it("throws when secret is unset", async () => {
    delete process.env.OAUTH_STATE_SECRET;
    await expect(signOAuthState({ role: "artist", next: "/apply" })).rejects.toThrow(
      /OAUTH_STATE_SECRET/,
    );
  });
});
