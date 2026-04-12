/**
 * Client-side image resizing using Canvas API.
 * No external dependencies needed.
 */

const MAX_DIMENSION = 2000;

/**
 * Resize an image file if it exceeds maxDimension in either direction.
 * Returns a new Blob (WebP if supported, otherwise JPEG).
 */
export async function resizeImage(
  file: File,
  maxDimension: number = MAX_DIMENSION
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // No resize needed
      if (width <= maxDimension && height <= maxDimension) {
        resolve(file);
        return;
      }

      // Scale down maintaining aspect ratio
      if (width > height) {
        height = Math.round((height / width) * maxDimension);
        width = maxDimension;
      } else {
        width = Math.round((width / height) * maxDimension);
        height = maxDimension;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Try WebP first, fall back to JPEG
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            // WebP not supported, try JPEG
            canvas.toBlob(
              (jpegBlob) => {
                resolve(jpegBlob || file);
              },
              "image/jpeg",
              0.85
            );
          }
        },
        "image/webp",
        0.85
      );
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Get an optimised URL for a Supabase storage image.
 * On Free plan, just returns the URL as-is.
 * On Pro plan, could append ?width=X&quality=Y transform params.
 */
export function getOptimizedUrl(
  url: string,
  width?: number,
  quality?: number
): string {
  // On Supabase Free plan, no transforms available.
  // Just return the raw URL — Next.js Image component handles optimisation.
  return url;
}

export function getThumbnailUrl(url: string): string {
  return getOptimizedUrl(url, 400, 60);
}

export function getPreviewUrl(url: string): string {
  return getOptimizedUrl(url, 800, 75);
}
