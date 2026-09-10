import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { signMessageAttachments } from "./attachment-urls";

const BUCKET = "message-attachments";
const publicUrl = (path: string) =>
  `https://uwkuhygwvasdzwsusiym.supabase.co/storage/v1/object/public/${BUCKET}/${path}`;

type SignResult = { data: { signedUrl: string } | null; error: { message: string } | null };
type Signer = (path: string) => Promise<SignResult>;

const okSigner: Signer = async (path) => ({ data: { signedUrl: `https://signed/${path}` }, error: null });

function fakeDb(signer: Signer = okSigner) {
  const createSignedUrl = vi.fn(signer);
  const db = { storage: { from: vi.fn(() => ({ createSignedUrl })) } };
  return { db: db as unknown as SupabaseClient, createSignedUrl, from: db.storage.from };
}

describe("signMessageAttachments", () => {
  it("replaces a legacy public URL with a signed one", async () => {
    const { db } = fakeDb();
    const out = await signMessageAttachments(
      [{ id: "m1", attachments: [{ url: publicUrl("u-1/a.png"), filename: "a.png" }] }],
      db,
    );
    expect(out[0].attachments).toEqual([
      { url: "https://signed/u-1/a.png", filename: "a.png" },
    ]);
  });

  it("leaves messages with no attachments untouched, by identity", async () => {
    const { db, from } = fakeDb();
    const input = [{ id: "m1", content: "hello", attachments: [] }];
    const out = await signMessageAttachments(input, db);
    expect(out).toBe(input);
    expect(from).not.toHaveBeenCalled();
  });

  it("signs a file quoted twice in a thread only once", async () => {
    const { db, createSignedUrl } = fakeDb();
    await signMessageAttachments(
      [
        { id: "m1", attachments: [{ url: publicUrl("u-1/a.png") }] },
        { id: "m2", attachments: [{ url: publicUrl("u-1/a.png") }] },
      ],
      db,
    );
    expect(createSignedUrl).toHaveBeenCalledTimes(1);
  });

  it("keeps the stored URL when signing fails, rather than dropping the attachment", async () => {
    // A broken image beats a message that silently loses the file it carried.
    const { db } = fakeDb(async () => ({ data: null, error: { message: "gone" } }));
    const stored = publicUrl("u-1/a.png");
    const out = await signMessageAttachments([{ id: "m1", attachments: [{ url: stored }] }], db);
    expect(out[0].attachments).toEqual([{ url: stored }]);
  });

  it("ignores an attachment naming a different bucket", async () => {
    // Nothing writes these, but a signer that trusted the URL's own bucket
    // would let a message row address an object in `contracts`.
    const { db, createSignedUrl } = fakeDb();
    const foreign =
      "https://uwkuhygwvasdzwsusiym.supabase.co/storage/v1/object/public/contracts/u-2/deal.pdf";
    const out = await signMessageAttachments([{ id: "m1", attachments: [{ url: foreign }] }], db);
    expect(createSignedUrl).not.toHaveBeenCalled();
    expect(out[0].attachments).toEqual([{ url: foreign }]);
  });

  it("survives a malformed attachments value", async () => {
    const { db } = fakeDb();
    const input = [
      { id: "m1", attachments: "not-an-array" },
      { id: "m2", attachments: [null, { url: 42 }] },
    ];
    await expect(signMessageAttachments(input, db)).resolves.toBe(input);
  });

  it("preserves every other field on the message and the attachment", async () => {
    const { db } = fakeDb();
    const out = await signMessageAttachments(
      [
        {
          id: "m1",
          content: "here it is",
          created_at: "2026-09-10T09:00:00Z",
          attachments: [
            { url: publicUrl("u-1/a.pdf"), filename: "a.pdf", mimeType: "application/pdf", sizeBytes: 12 },
          ],
        },
      ],
      db,
    );
    expect(out[0]).toMatchObject({ id: "m1", content: "here it is", created_at: "2026-09-10T09:00:00Z" });
    expect(out[0].attachments).toEqual([
      { url: "https://signed/u-1/a.pdf", filename: "a.pdf", mimeType: "application/pdf", sizeBytes: 12 },
    ]);
  });
});
