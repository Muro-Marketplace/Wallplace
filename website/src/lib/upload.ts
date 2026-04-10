import { supabase } from "./supabase";

/**
 * Upload an image to Supabase Storage and return the public URL.
 * Falls back to base64 data URL if upload fails (e.g. not authenticated).
 */
export async function uploadImage(
  file: File,
  bucket: "avatars" | "artworks"
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Not authenticated — fall back to base64 for local preview
    return fileToBase64(file);
  }

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Upload error:", error);
    // Fall back to base64
    return fileToBase64(file);
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return urlData.publicUrl;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.readAsDataURL(file);
  });
}
