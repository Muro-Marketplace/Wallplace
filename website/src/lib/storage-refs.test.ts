import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  objectPathFromStoredValue,
  ownerIdFromPath,
  signedUrlFor,
  SIGNED_URL_TTL_SECONDS,
} from "./storage-refs";

const BUCKET = "message-attachments";
const PUBLIC = `https://uwkuhygwvasdzwsusiym.supabase.co/storage/v1/object/public/${BUCKET}/u-1/1756.png`;
const SIGNED = `https://uwkuhygwvasdzwsusiym.supabase.co/storage/v1/object/sign/${BUCKET}/u-1/1756.png?token=abc`;

describe("objectPathFromStoredValue", () => {
  it("reads the path out of a public URL", () => {
    expect(objectPathFromStoredValue(PUBLIC, BUCKET)).toBe("u-1/1756.png");
  });

  it("reads the path out of an already-signed URL", () => {
    // Re-signing a stale signed link is harmless and beats a hard error when a
    // client re-sends a URL it was handed an hour ago.
    expect(objectPathFromStoredValue(SIGNED, BUCKET)).toBe("u-1/1756.png");
  });

  it("accepts a bare path, with or without the bucket prefix", () => {
    expect(objectPathFromStoredValue("u-1/1756.png", BUCKET)).toBe("u-1/1756.png");
    expect(objectPathFromStoredValue(`${BUCKET}/u-1/1756.png`, BUCKET)).toBe("u-1/1756.png");
  });

  it("percent-decodes a path with a space in the filename", () => {
    const url = `https://x.supabase.co/storage/v1/object/public/${BUCKET}/u-1/my%20file.pdf`;
    expect(objectPathFromStoredValue(url, BUCKET)).toBe("u-1/my file.pdf");
  });

  it("refuses a URL naming a different bucket", () => {
    // The whole reason the bucket is an argument: a caller authorised on one
    // bucket must not be able to sign an object in another by passing its URL.
    const other = `https://x.supabase.co/storage/v1/object/public/contracts/u-1/deal.pdf`;
    expect(objectPathFromStoredValue(other, BUCKET)).toBeNull();
  });

  it("refuses traversal, absolute paths and backslashes", () => {
    expect(objectPathFromStoredValue("../contracts/secret.pdf", BUCKET)).toBeNull();
    expect(objectPathFromStoredValue("/u-1/x.png", BUCKET)).toBeNull();
    expect(objectPathFromStoredValue("u-1\\..\\x.png", BUCKET)).toBeNull();
  });

  it("refuses empty, whitespace and non-storage URLs", () => {
    expect(objectPathFromStoredValue("", BUCKET)).toBeNull();
    expect(objectPathFromStoredValue("   ", BUCKET)).toBeNull();
    expect(objectPathFromStoredValue("https://evil.com/u-1/x.png", BUCKET)).toBeNull();
    expect(objectPathFromStoredValue("https://", BUCKET)).toBeNull();
  });
});

describe("ownerIdFromPath", () => {
  it("returns the first segment, which is the uploader by convention", () => {
    expect(ownerIdFromPath("u-1/1756.png")).toBe("u-1");
  });

  it("returns null for an empty path", () => {
    expect(ownerIdFromPath("")).toBeNull();
  });
});

describe("signedUrlFor", () => {
  const clientWith = (impl: () => unknown) =>
    ({ storage: { from: () => ({ createSignedUrl: impl }) } }) as unknown as SupabaseClient;

  it("returns the signed URL and uses the shared TTL by default", async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: "https://signed" }, error: null });
    const db = { storage: { from: () => ({ createSignedUrl }) } } as unknown as SupabaseClient;

    await expect(signedUrlFor(db, BUCKET, "u-1/x.png")).resolves.toBe("https://signed");
    expect(createSignedUrl).toHaveBeenCalledWith("u-1/x.png", SIGNED_URL_TTL_SECONDS);
  });

  it("returns null rather than throwing when the signer errors", async () => {
    const db = clientWith(() => Promise.resolve({ data: null, error: { message: "nope" } }));
    await expect(signedUrlFor(db, BUCKET, "u-1/x.png")).resolves.toBeNull();
  });

  it("returns null rather than throwing when the signer rejects", async () => {
    // A missing image must degrade to a placeholder, never a 500 on a read path.
    const db = clientWith(() => Promise.reject(new Error("network")));
    await expect(signedUrlFor(db, BUCKET, "u-1/x.png")).resolves.toBeNull();
  });
});
