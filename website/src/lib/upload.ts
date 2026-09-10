import { supabase } from "./supabase";
import { resizeImage } from "./image";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Contracts: PDFs and common Office formats so a venue/artist can upload
// the signed agreement and have it travel with the placement record.
const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];

/** Stored contract reference. The value lives in `placement_records.contract_attachment_url`:
 *    - Legacy rows: absolute `https://…supabase.co/storage/v1/object/public/contracts/<path>` URL
 *    - New rows: opaque reference of the form `contract:<bucket>/<path>` so the reader
 *      knows to sign it before displaying.
 *  The reader calls `POST /api/contracts/sign` to exchange the reference for a
 *  short-lived signed URL. Anyone holding only the reference (or the URL on an
 *  old row) still needs to be a party to the placement to read it. */
export const CONTRACT_REF_PREFIX = "contract:";

/**
 * Upload a contract / document file (PDF, Word, or scanned image) and
 * return an opaque reference, not a public URL. The `contracts` bucket
 * MUST be private (set in the Supabase dashboard), if it's public,
 * the returned reference is still safe but the fallback URL would be
 * readable by anyone. See docs/security/AUDIT.md §G.
 */
export async function uploadContract(file: File): Promise<string> {
  if (!ALLOWED_DOC_TYPES.includes(file.type)) {
    throw new Error("Allowed contract formats: PDF, Word, JPEG, PNG.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 10MB`);
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to upload contracts.");

  const ext = file.name.split(".").pop() || "pdf";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60);
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName || `contract.${ext}`}`;

  // The private `contracts` bucket, and only that bucket.
  //
  // This used to fall back to `collections` when `contracts` looked absent.
  // `collections` is PUBLIC, so the fallback's effect was to publish a signed
  // agreement at an open URL on the one code path that fires when the storage
  // configuration is already wrong. A missing bucket is a deployment fault and
  // should read as one; it is not a reason to downgrade the privacy of the
  // most sensitive file the platform accepts. (UK compliance audit, 10 Sep 2026.)
  const { error } = await supabase.storage
    .from("contracts")
    .upload(path, file, { cacheControl: "86400", upsert: false, contentType: file.type });

  if (!error) {
    // Opaque reference. The reader calls `/api/contracts/sign` to exchange this
    // for a short-lived signed URL after checking party permissions. Never
    // return a raw public URL here.
    return `${CONTRACT_REF_PREFIX}contracts/${path}`;
  }

  console.error("Contract upload error:", error);
  if (String(error.message || "").toLowerCase().includes("not found")) {
    throw new Error("Contract storage is not configured yet. Please paste a link instead.");
  }
  throw new Error("Contract upload failed. Please try again.");
}

/** Detect whether a stored value is a post-Phase-0 contract reference. */
export function isContractRef(value: string | null | undefined): boolean {
  return !!value && value.startsWith(CONTRACT_REF_PREFIX);
}

/** Split a reference back into (bucket, path). */
export function parseContractRef(ref: string): { bucket: string; path: string } | null {
  if (!ref.startsWith(CONTRACT_REF_PREFIX)) return null;
  const body = ref.slice(CONTRACT_REF_PREFIX.length);
  const slash = body.indexOf("/");
  if (slash <= 0) return null;
  return { bucket: body.slice(0, slash), path: body.slice(slash + 1) };
}

/**
 * Upload an image to Supabase Storage and return the public URL.
 * Validates file size and MIME type, resizes large images before uploading.
 * Throws on failure, callers should handle errors.
 */
export async function uploadImage(
  file: File,
  bucket: "avatars" | "artworks" | "collections",
  options?: {
    /** Override the per-bucket max dimension. Use 2400 for venue
        gallery / wall reference photos where soft images on the
        public profile read as low-effort. */
    maxDimension?: number;
    /** WebP/JPEG quality 0–1. Default 0.85; bump to 0.92 for venue
        gallery so detail in space + lighting survives compression. */
    quality?: number;
  },
): Promise<string> {
  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF`);
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 10MB`);
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to upload images.");
  }

  // Resize large images before upload (max 2000px, converts to WebP if supported)
  let uploadBlob: Blob = file;
  try {
    const defaultMaxDim =
      bucket === "avatars" ? 800 : bucket === "collections" ? 1800 : 2000;
    const maxDim = options?.maxDimension ?? defaultMaxDim;
    const quality = options?.quality ?? 0.85;
    uploadBlob = await resizeImage(file, maxDim, quality);
  } catch {
    // If resize fails, upload original
    uploadBlob = file;
  }

  // Determine extension from resulting blob type
  const mimeToExt: Record<string, string> = {
    "image/webp": "webp",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
  };
  const ext = mimeToExt[uploadBlob.type] || file.name.split(".").pop() || "jpg";
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, uploadBlob, {
      cacheControl: "86400",
      upsert: false,
      contentType: uploadBlob.type || file.type,
    });

  if (error) {
    console.error("Upload error:", error);
    throw new Error("Image upload failed. Please try again.");
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return urlData.publicUrl;
}

const MESSAGE_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;

export interface MessageAttachment {
  /**
   * The stable reference persisted on `messages.attachments[]`. It has the
   * shape of a public storage URL, but `message-attachments` is a PRIVATE
   * bucket as of migration 140, so fetching it directly 404s. Readers parse
   * the object path back out of it and sign; see
   * src/lib/messages/attachment-urls.ts. Kept in this shape so rows written
   * before 140 and rows written after it read identically.
   */
  url: string;
  /**
   * A short-lived signed URL for the sender's own optimistic render, before
   * the thread reloads and the server hands back signed URLs for everyone.
   * Never persisted: the POST schema in lib/validations.ts strips it.
   */
  previewUrl?: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
}

/**
 * Upload a file attachment for a message. Images get resized to a sane
 * max dimension; PDFs go up as-is. Returns a stable public URL plus the
 * metadata we persist on `messages.attachments[]`.
 */
export async function uploadMessageAttachment(file: File): Promise<MessageAttachment> {
  if (!(MESSAGE_ATTACHMENT_TYPES as readonly string[]).includes(file.type)) {
    throw new Error("Allowed attachments: JPEG, PNG, WebP, GIF, PDF.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 10MB`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to attach files.");

  // Images: pre-resize to keep storage + transit lean. PDFs go up
  // verbatim — we don't transform them.
  let uploadBlob: Blob = file;
  let width: number | undefined;
  let height: number | undefined;
  if (file.type.startsWith("image/")) {
    try {
      uploadBlob = await resizeImage(file, 1800, 0.85);
    } catch {
      uploadBlob = file;
    }
    // Capture intrinsic dimensions for inline rendering.
    try {
      const url = URL.createObjectURL(uploadBlob);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = url;
      });
      width = img.naturalWidth;
      height = img.naturalHeight;
      URL.revokeObjectURL(url);
    } catch { /* swallow — dims are best-effort */ }
  }

  const mimeToExt: Record<string, string> = {
    "image/webp": "webp",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "application/pdf": "pdf",
  };
  const ext = mimeToExt[uploadBlob.type] || file.name.split(".").pop() || "bin";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60);
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName || `attachment.${ext}`}`;

  const { error } = await supabase.storage
    .from("message-attachments")
    .upload(path, uploadBlob, {
      cacheControl: "86400",
      upsert: false,
      contentType: uploadBlob.type || file.type,
    });
  if (error) {
    // E4 (Phase 2.3): surface the underlying Supabase error so a
    // misconfigured bucket / missing storage policy doesn't read as
    // a generic "try again". Migration 065 backfills the policies on
    // message-attachments so this path returns clean in production.
    console.error("Attachment upload error:", error);
    const message = String(error.message || "").toLowerCase();
    if (message.includes("row-level security") || message.includes("rls")) {
      throw new Error(
        "Attachment upload was blocked by storage permissions. Try signing out and back in; if it persists, contact support.",
      );
    }
    if (message.includes("not found") || message.includes("bucket")) {
      throw new Error(
        "Attachment storage isn't set up on this deployment yet. Send the message as text only for now.",
      );
    }
    throw new Error("Attachment upload failed. Please try again.");
  }

  const { data: urlData } = supabase.storage
    .from("message-attachments")
    .getPublicUrl(path);

  // The bucket is private (migration 140), so the sender signs their own
  // object for the optimistic bubble. The owner-read policy added in that
  // migration is what permits this, and it permits nothing else: the folder
  // is named after auth.uid().
  let previewUrl: string | undefined;
  try {
    const { data: signed } = await supabase.storage
      .from("message-attachments")
      .createSignedUrl(path, 60 * 60);
    previewUrl = signed?.signedUrl ?? undefined;
  } catch {
    /* best effort; the thread reload will supply a signed URL either way */
  }

  return {
    url: urlData.publicUrl,
    previewUrl,
    filename: file.name,
    mimeType: file.type,
    sizeBytes: uploadBlob.size,
    width,
    height,
  };
}
