"use client";

import { useEffect, useState } from "react";
import QRLabel from "./QRLabel";
import { mm, sheetLayout, toLabelSize, type LabelSize, type LabelStyle } from "./label-layout";
import { generateQRDataURL } from "@/lib/qr";

export interface LabelData {
  artistName: string;
  artistSlug: string;
  workTitle?: string;
  /** Real artist_works.id, used to set analytics_events.work_id
   *  correctly when the QR is scanned. Without this, work_id was
   *  being stored as the URL-encoded title and the analytics
   *  top_works lookup couldn't join back to the work row. */
  workId?: string;
  workMedium?: string;
  workDimensions?: string;
  /** The work's own sizes the preview offers to print, physical sizes only
   *  (never an image's pixel size). */
  sizeOptions?: string[];
  workPrice?: string;
  venueName?: string;
  /** Real venue_profiles.slug, used by the QR redirect to look up
   *  venue_user_id and link the scan back to the venue cleanly.
   *  Falls back to venueName when not present. */
  venueSlug?: string;
  quantity: number;
  isPortfolioLabel?: boolean;
  // Source values for restoring toggled-off fields in preview
  _sourceMedium?: string;
  _sourcePrice?: string;
  _sourceDimensions?: string;
  labelSize?: LabelSize;
  labelStyle?: LabelStyle;
  tagline?: string;
}

/** Per-label render flags. Parallel to `labels`, indexed by uniqueIndex
 *  (the position of the label in the user's selection, ignoring quantity
 *  expansion). Optional; absent means render every field that has data. */
export interface LabelVisibility {
  medium: boolean;
  dimensions: boolean;
  price: boolean;
}

interface LabelSheetProps {
  labels: LabelData[];
  labelVisibility?: LabelVisibility[];
  pageIndex?: number; // If provided, render only this page (0-based)
  /** Colour theme id, applied to every label on the sheet. */
  labelTheme?: string;
}

export default function LabelSheet({ labels, labelVisibility, pageIndex, labelTheme }: LabelSheetProps) {
  const [qrUrls, setQrUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Build expanded list (each label repeated by quantity)
  const expandedLabels: { label: LabelData; uniqueIndex: number }[] = [];
  labels.forEach((label, i) => {
    for (let q = 0; q < label.quantity; q++) {
      expandedLabels.push({ label, uniqueIndex: i });
    }
  });

  useEffect(() => {
    async function generate() {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://wallplace.co.uk";
      // QR URL params (compact keys to keep the encoded string short):
      //   w  = work id (preferred, sets analytics_events.work_id)
      //   t  = work title (compat / display fallback)
      //   vs = venue slug (preferred, used to resolve venue_user_id)
      //   v  = venue name (compat / display fallback)
      //   size = displayed size
      const uniqueUrls = await Promise.all(
        labels.map((l) => {
          const params = new URLSearchParams();
          if (!l.isPortfolioLabel) {
            if (l.workId) params.set("w", l.workId);
            if (l.workTitle) params.set("t", l.workTitle);
          }
          if (l.venueSlug) params.set("vs", l.venueSlug);
          if (l.venueName) params.set("v", l.venueName);
          if (l.workDimensions) params.set("size", l.workDimensions);
          const qs = params.toString();
          const url = `${siteUrl}/api/qr/${l.artistSlug}${qs ? `?${qs}` : ""}`;
          return generateQRDataURL(url);
        })
      );
      setQrUrls(uniqueUrls);
      setLoading(false);
    }
    generate();
  }, [labels]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted text-sm">Generating labels…</p>
      </div>
    );
  }

  // The preview applies one size and one style to every label, so the whole
  // sheet shares one grid, worked out from the real label dimensions so that
  // no combination runs off the page.
  const currentSize = toLabelSize(labels[0]?.labelSize ?? "medium");
  const currentStyle: LabelStyle = labels[0]?.labelStyle || "minimal";
  const layout = sheetLayout(currentSize, currentStyle);

  // Split into pages
  const pages: typeof expandedLabels[] = [];
  for (let i = 0; i < expandedLabels.length; i += layout.perPage) {
    pages.push(expandedLabels.slice(i, i + layout.perPage));
  }

  const pagesToRender = pageIndex !== undefined ? [pages[pageIndex]].filter(Boolean) : pages;

  return (
    <div className="label-sheet">
      {pagesToRender.map((page, idx) => {
        const actualPageIndex = pageIndex !== undefined ? pageIndex : idx;
        return (
          <div
            key={actualPageIndex}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${layout.cols}, ${mm(layout.widthMm)})`,
              gridTemplateRows: `repeat(${layout.rows}, ${mm(layout.heightMm)})`,
              gap: "0mm",
              justifyContent: "center",
            }}
          >
            {page.map((item, i) => {
              const vis = labelVisibility?.[item.uniqueIndex];
              return (
                <QRLabel
                  key={`${actualPageIndex}-${i}`}
                  artistName={item.label.artistName}
                  workTitle={item.label.workTitle}
                  workMedium={item.label.workMedium}
                  workDimensions={item.label.workDimensions}
                  workPrice={item.label.workPrice}
                  qrDataUrl={qrUrls[item.uniqueIndex] || ""}
                  isPortfolioLabel={item.label.isPortfolioLabel}
                  labelSize={currentSize}
                  labelStyle={currentStyle}
                  tagline={item.label.tagline}
                  showMedium={vis ? vis.medium : true}
                  showDimensions={vis ? vis.dimensions : true}
                  showPrice={vis ? vis.price : true}
                  labelTheme={labelTheme}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
