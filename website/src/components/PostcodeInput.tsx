// Dynamic postcode input (#11). Formats as the user types (uppercase
// + auto-inserted space before the inward code) and auto-attempts a
// geocode lookup once the value matches the UK postcode pattern. The
// "Go" button stays as an explicit fallback for users who don't want
// to wait for the debounce.
//
// The component is purposefully presentational — geocoding is owned
// by the caller via `onGeocoded`. Keeps it reusable across the
// browse, spaces, and any future location-aware filter surfaces.

"use client";

import { useEffect, useRef, useState } from "react";
import { geocodePostcode } from "@/lib/geocode";

interface PostcodeInputProps {
  /** Initial value — a previously-entered postcode if any. */
  initial?: string;
  placeholder?: string;
  /** Fired when the postcode resolves to coordinates. */
  onGeocoded: (coords: { lat: number; lng: number }, postcode: string) => void;
  /** Fired with `true` when the postcode looked valid but the geocoder
   *  rejected it; `false` when the user is typing again or the value
   *  resolves cleanly. The caller can use this to display an inline
   *  error message in their preferred style. */
  onError?: (failed: boolean) => void;
  /** Optional className for the wrapping flex row. */
  className?: string;
  /** Visual size — "sm" matches the filter sidebar; "md" matches the
   *  marketplace hero. Defaults to "sm". */
  size?: "sm" | "md";
}

/** Strict UK postcode pattern (after formatting). */
const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s\d[A-Z]{2}$/;

/** Format raw input → uppercase, single-spaced UK postcode form. */
function formatPostcode(raw: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (cleaned.length <= 4) return cleaned;
  return `${cleaned.slice(0, -3)} ${cleaned.slice(-3)}`;
}

export default function PostcodeInput({
  initial = "",
  placeholder = "e.g. EC1A 1BB",
  onGeocoded,
  onError,
  className = "",
  size = "sm",
}: PostcodeInputProps) {
  const [value, setValue] = useState(formatPostcode(initial));
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced auto-lookup once the value matches the full UK postcode
  // pattern. The user doesn't have to click Go — they just type.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!UK_POSTCODE.test(value)) return;
    debounceRef.current = setTimeout(async () => {
      setBusy(true);
      const coords = await geocodePostcode(value);
      setBusy(false);
      if (coords) {
        onError?.(false);
        onGeocoded(coords, value);
      } else if (touched) {
        onError?.(true);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, onGeocoded, onError, touched]);

  async function submit() {
    if (!value.trim()) return;
    setBusy(true);
    const coords = await geocodePostcode(value);
    setBusy(false);
    if (coords) {
      onError?.(false);
      onGeocoded(coords, value);
    } else {
      onError?.(true);
    }
  }

  const inputClass =
    size === "sm"
      ? "flex-1 px-2 py-1.5 bg-surface border border-border rounded-sm text-xs text-foreground focus:outline-none focus:border-accent/50 uppercase tracking-wide"
      : "flex-1 px-3 py-2.5 bg-surface border border-border rounded-sm text-sm text-foreground focus:outline-none focus:border-accent/50 uppercase tracking-wide";
  const buttonClass =
    size === "sm"
      ? "px-3 py-1.5 bg-accent text-white text-xs rounded-sm hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50"
      : "px-4 py-2.5 bg-accent text-white text-sm rounded-sm hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-50";

  return (
    <div className={`flex gap-1.5 ${className}`}>
      <input
        type="text"
        autoComplete="postal-code"
        inputMode="text"
        value={value}
        onChange={(e) => {
          setValue(formatPostcode(e.target.value));
          setTouched(true);
          onError?.(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        className={inputClass}
        aria-label="Postcode"
      />
      <button
        type="button"
        onClick={submit}
        disabled={busy || !UK_POSTCODE.test(value)}
        className={buttonClass}
      >
        {busy ? "…" : "Go"}
      </button>
    </div>
  );
}
