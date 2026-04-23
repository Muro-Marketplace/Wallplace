"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { generateQRDataURL } from "@/lib/qr";

interface Props {
  open: boolean;
  onClose: () => void;
  /** The URL the QR code should resolve to — usually the public artwork page. */
  targetUrl: string;
  /** Placement id so the Labels page can pre-select this row for bulk printing. */
  placementId: string;
  portalBase: "/artist-portal" | "/venue-portal";
  artistName?: string;
  workTitle?: string;
}

/**
 * Lightweight inline QR preview for a single placement. Renders a
 * scannable code pointing at the public artwork page so visitors in the
 * venue can tap through without typing anything. The "Print full label"
 * shortcut deep-links into the venue labels page, which already has the
 * full sticker designer for bulk printing.
 */
export default function PlacementQRModal({
  open,
  onClose,
  targetUrl,
  placementId,
  portalBase,
  artistName,
  workTitle,
}: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    generateQRDataURL(targetUrl)
      .then((url) => { if (!cancelled) setQrDataUrl(url); })
      .catch(() => { if (!cancelled) setQrDataUrl(null); });
    return () => { cancelled = true; };
  }, [open, targetUrl]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-background rounded-sm max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-accent">QR label</p>
            <p className="text-sm text-foreground mt-0.5 truncate">{workTitle || "Placement QR"}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="p-6 flex flex-col items-center gap-4">
          {qrDataUrl ? (
            <>
              <img src={qrDataUrl} alt="Placement QR code" width={220} height={220} className="rounded-sm" />
              <div className="text-center">
                {artistName && <p className="text-xs text-muted">{artistName}</p>}
                <p className="text-[11px] text-muted break-all">{targetUrl}</p>
              </div>
            </>
          ) : (
            <div className="w-[220px] h-[220px] bg-surface rounded-sm flex items-center justify-center text-xs text-muted">
              Generating…
            </div>
          )}
          <div className="w-full flex items-center gap-2 pt-1">
            <a
              href={qrDataUrl || "#"}
              download={`wallplace-qr-${placementId}.png`}
              className="flex-1 text-center px-4 py-2 text-xs font-medium text-accent bg-accent/5 border border-accent/30 hover:bg-accent/10 rounded-sm transition-colors"
            >
              Download PNG
            </a>
            {portalBase === "/venue-portal" && (
              <Link
                href={`/venue-portal/labels?placement=${encodeURIComponent(placementId)}`}
                className="flex-1 text-center px-4 py-2 text-xs font-medium text-foreground border border-border hover:bg-[#F5F3F0] rounded-sm transition-colors"
              >
                Print full label
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
