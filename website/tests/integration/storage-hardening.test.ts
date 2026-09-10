import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

// Locks the intent of migration 140 (UK compliance audit, 10 September 2026).
//
// These are file assertions, not database assertions: the repo cannot reach
// production from CI, and the migration is the version-controlled statement of
// what production should be. The value is in stopping a later migration from
// quietly undoing any of it, which is exactly how 070's SELECT-policy drop came
// to be undone in practice by the bucket's own `public` flag.

const here = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(here, "../../supabase/migrations");
const sql = readFileSync(path.join(MIGRATIONS_DIR, "140_storage_hardening.sql"), "utf8");

/** Every migration file, so we can check nothing later re-opens what 140 closed. */
const laterMigrations = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql") && Number(f.slice(0, 3)) > 140)
  .map((f) => ({ name: f, body: readFileSync(path.join(MIGRATIONS_DIR, f), "utf8") }));

const CLIENT_WRITABLE_BUCKETS = ["artworks", "avatars", "collections"] as const;
const ALL_BUCKETS = [
  "artworks",
  "avatars",
  "collections",
  "wall-photos",
  "wall-renders",
  "contracts",
] as const;

describe("140_storage_hardening", () => {
  it("makes message-attachments and wall-renders private", () => {
    const block = sql.match(/set\s+public = false[\s\S]{0,200}?;/i)?.[0] ?? "";
    expect(block).toContain("message-attachments");
    expect(block).toContain("wall-renders");
  });

  it("gives every client-writable bucket a folder-ownership INSERT check", () => {
    for (const bucket of CLIENT_WRITABLE_BUCKETS) {
      const pattern = new RegExp(
        `for insert to authenticated\\s*\\n\\s*with check \\(\\s*\\n\\s*bucket_id = '${bucket}'\\s*\\n\\s*and \\(storage\\.foldername\\(name\\)\\)\\[1\\] = \\(select auth\\.uid\\(\\)\\)::text`,
      );
      expect(sql, `${bucket} has no folder-ownership INSERT policy`).toMatch(pattern);
    }
  });

  it("drops the two always-true upload policies it replaces", () => {
    expect(sql).toContain(`drop policy if exists "Authenticated users can upload artworks"`);
    expect(sql).toContain(`drop policy if exists "Authenticated users can upload avatars"`);
  });

  it("caps type and size on every bucket", () => {
    for (const bucket of ALL_BUCKETS) {
      const stanza = sql.match(
        new RegExp(`update storage\\.buckets[\\s\\S]*?where id (?:in \\([^)]*'${bucket}'[^)]*\\)|= '${bucket}')`),
      );
      expect(stanza, `${bucket} is never given a size or type cap`).toBeTruthy();
      expect(stanza![0]).toContain("file_size_limit");
      expect(stanza![0]).toContain("allowed_mime_types");
    }
  });

  it("never re-opens a bucket in a later migration", () => {
    for (const { name, body } of laterMigrations) {
      const reopens = /set\s+public = true/i.test(body);
      expect(reopens, `${name} sets a bucket back to public; 140 made two of them private on purpose`)
        .toBe(false);
    }
  });
});
