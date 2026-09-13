"use client";

import { useState } from "react";
import LabelSheet, { type LabelData, type LabelVisibility } from "./LabelSheet";
import LabelSizePicker from "./LabelSizePicker";
import LabelStylePicker from "./LabelStylePicker";
import LabelThemePicker from "./LabelThemePicker";
import { LABEL_SIZES, LABEL_STYLES, sheetLayout, toLabelSize, type LabelSize, type LabelStyle } from "./label-layout";
import { getLabelTheme, type LabelThemeId } from "@/lib/profile-themes";

interface LabelPreviewProps {
  labels: LabelData[];
  /** Initial per-label show flags, index-parallel to `labels`. If omitted,
   *  every row a label has data for starts shown. */
  initialVisibility?: LabelVisibility[];
  /** QR label colour theme id (see lib/profile-themes.ts), free for every
   *  plan. Falls back to classic when undefined. */
  labelTheme?: string;
  /** Tell the page about choices made here, so they stick after closing. */
  onLabelThemeChange?: (id: LabelThemeId) => void;
  onLabelStyleChange?: (style: LabelStyle) => void;
  onLabelSizeChange?: (size: LabelSize) => void;
  onClose: () => void;
}

const ROWS = [
  { key: "medium", label: "Medium" },
  { key: "dimensions", label: "Dimensions" },
  { key: "price", label: "Price" },
] as const;

function rowsWithData(label: LabelData): LabelVisibility {
  if (label.isPortfolioLabel) return { medium: false, dimensions: false, price: false };
  return { medium: !!label.workMedium, dimensions: !!label.workDimensions, price: !!label.workPrice };
}

/**
 * Full-screen print preview. Style, size and colour can all be changed here as
 * well as on the labels page (owner report 13 September 2026), and the Medium,
 * Dimensions and Price tick boxes appear only on Editorial, the one style that
 * prints those rows, so a tick box never does nothing.
 */
export default function LabelPreview({
  labels: initialLabels,
  initialVisibility,
  labelTheme,
  onLabelThemeChange,
  onLabelStyleChange,
  onLabelSizeChange,
  onClose,
}: LabelPreviewProps) {
  const [labels, setLabels] = useState<LabelData[]>(initialLabels);
  const [showControls, setShowControls] = useState(true);
  // Per-label visibility flags, decoupled from the data fields. Toggle
  // handlers below flip these flags only, the underlying workMedium /
  // workDimensions / workPrice strings stay populated from the upstream
  // construction so a flag flipped off and on again restores correctly.
  // Without this decoupling, the second-label deselect bug appeared
  // because the toggle was both the data carrier and the visibility
  // carrier, leaving no way to distinguish "off" from "no data".
  const [labelVisibility, setLabelVisibility] = useState<LabelVisibility[]>(
    () => initialVisibility ?? initialLabels.map(rowsWithData),
  );
  const [themeId, setThemeId] = useState<LabelThemeId>(() => getLabelTheme(labelTheme).id);

  // Calculate total including quantities
  const totalCount = labels.reduce((sum, l) => sum + l.quantity, 0);
  const currentSize = toLabelSize(labels[0]?.labelSize ?? "medium");
  const currentStyle: LabelStyle = labels[0]?.labelStyle || "minimal";
  const styleName = LABEL_STYLES.find((s) => s.key === currentStyle)?.name ?? currentStyle;
  const sizeName = LABEL_SIZES.find((s) => s.key === currentSize)?.label ?? currentSize;
  const layout = sheetLayout(currentSize, currentStyle);
  const pageCount = Math.ceil(totalCount / layout.perPage);
  const printsRows = currentStyle === "editorial";
  const takesTagline = currentStyle !== "qr_only" && (currentSize === "large" || currentSize === "xlarge");

  function updateLabel(index: number, updates: Partial<LabelData>) {
    setLabels((prev) => prev.map((l, i) => (i === index ? { ...l, ...updates } : l)));
  }

  function setVisibility(index: number, key: keyof LabelVisibility, next: boolean) {
    setLabelVisibility((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [key]: next } : v)),
    );
  }

  function removeLabel(index: number) {
    setLabels((prev) => prev.filter((_, i) => i !== index));
    setLabelVisibility((prev) => prev.filter((_, i) => i !== index));
  }

  function changeStyle(style: LabelStyle) {
    if (style === currentStyle) return;
    setLabels((prev) => prev.map((l) => ({ ...l, labelStyle: style })));
    // Moving to Editorial shows every row a work has data for; the tick boxes
    // then hide any of them.
    if (style === "editorial") setLabelVisibility(labels.map(rowsWithData));
    onLabelStyleChange?.(style);
  }

  function changeSize(size: LabelSize) {
    setLabels((prev) => prev.map((l) => ({ ...l, labelSize: size })));
    onLabelSizeChange?.(size);
  }

  function changeTheme(id: LabelThemeId) {
    setThemeId(id);
    onLabelThemeChange?.(id);
  }

  function chooseArtworkSize(index: number, size: string) {
    const current = labels[index]?.workDimensions;
    updateLabel(index, { workDimensions: current === size ? undefined : size });
    // Picking a size to print should print it.
    if (current !== size) setVisibility(index, "dimensions", true);
  }

  return (
    <div className="fixed inset-0 z-[110] bg-white flex flex-col">
      {/* Toolbar */}
      <div className="label-preview-toolbar no-print border-b border-border bg-surface px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-sm font-medium text-foreground">
            Print Preview, {totalCount} label{totalCount !== 1 ? "s" : ""}
          </h2>
          {/* Style + size pills so the venue or artist can check what they are
              about to send to the printer at a glance. */}
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm border border-accent/30 bg-accent/5 text-accent">
            {styleName}
          </span>
          <span className="text-[10px] tracking-wider px-2 py-0.5 rounded-sm border border-border text-muted tabular-nums">
            {sizeName} · {layout.widthMm} × {layout.heightMm} mm
          </span>
          <span className="text-xs text-muted">
            {pageCount} page{pageCount !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowControls((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs border rounded-sm transition-colors ${
              showControls ? "text-accent border-accent/30 bg-accent/5" : "text-muted border-border"
            }`}
          >
            {showControls ? "Hide Controls" : "Edit Labels"}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={`transition-transform duration-200 ${showControls ? "rotate-180" : ""}`}>
              <polyline points="2 4 6 8 10 4" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 sm:py-1.5 text-sm text-muted hover:text-foreground border border-border rounded-sm transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => window.print()}
            className="px-5 py-2 sm:py-1.5 text-sm font-medium text-white bg-foreground rounded-sm hover:bg-foreground/90 transition-colors"
          >
            Print Labels
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-[#f0f0f0] no-print-bg">
        <div className="flex gap-0">
          {/* Controls sidebar */}
          {showControls && (
            <aside
              aria-label="Edit labels"
              className="no-print w-80 shrink-0 bg-surface border-r border-border overflow-y-auto p-4 space-y-3"
            >
              <h3 className="text-xs font-medium tracking-wider uppercase text-muted mb-2">Edit Labels</h3>

              {/* Every label on a sheet shares one style, size and colour. */}
              <div className="bg-background border border-border rounded-sm p-3 space-y-4">
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-1.5">Label style</p>
                  <LabelStylePicker value={currentStyle} onChange={changeStyle} variant="compact" />
                </div>
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-1.5">Label size</p>
                  <LabelSizePicker value={currentSize} style={currentStyle} onChange={changeSize} compact />
                </div>
                <LabelThemePicker value={themeId} onChange={changeTheme} label="Label colour" />
              </div>

              {labels.map((label, index) => {
                const title = label.isPortfolioLabel ? "Portfolio Label" : label.workTitle || "Untitled";
                const sizeOptions = label.sizeOptions ?? [];
                return (
                  <div
                    key={index}
                    role="group"
                    aria-label={title}
                    className="bg-background border border-border rounded-sm p-3 space-y-2"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{title}</p>
                        {!label.isPortfolioLabel && (
                          <p className="text-[10px] text-muted">{label.artistName}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeLabel(index)}
                        className="text-muted hover:text-red-500 transition-colors ml-2 shrink-0"
                        title="Remove"
                        aria-label={`Remove ${title}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 3l8 8M11 3L3 11" /></svg>
                      </button>
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted uppercase tracking-wider">Copies</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateLabel(index, { quantity: Math.max(1, label.quantity - 1) })}
                          className="w-6 h-6 rounded-sm border border-border flex items-center justify-center text-muted hover:text-foreground text-xs"
                        >−</button>
                        <span className="w-6 text-center text-xs font-medium tabular-nums">{label.quantity}</span>
                        <button
                          onClick={() => updateLabel(index, { quantity: Math.min(50, label.quantity + 1) })}
                          className="w-6 h-6 rounded-sm border border-border flex items-center justify-center text-muted hover:text-foreground text-xs"
                        >+</button>
                      </div>
                    </div>

                    {/* The work's own sizes. The chosen one goes into the QR link
                        for every style, and Editorial also prints it. */}
                    {!label.isPortfolioLabel && (sizeOptions.length > 0 || label.workDimensions) && (
                      <div>
                        <span className="text-[10px] text-muted uppercase tracking-wider block mb-1">Artwork size</span>
                        <div className="flex flex-wrap gap-1">
                          {sizeOptions.map((size) => (
                            <button
                              key={size}
                              type="button"
                              aria-pressed={label.workDimensions === size}
                              onClick={() => chooseArtworkSize(index, size)}
                              className={`px-2 py-0.5 text-[10px] rounded-sm border transition-colors ${
                                label.workDimensions === size
                                  ? "bg-accent text-white border-accent"
                                  : "text-muted border-border hover:border-foreground/30"
                              }`}
                            >
                              {size}
                            </button>
                          ))}
                          {label.workDimensions && !sizeOptions.includes(label.workDimensions) && (
                            <span className="px-2 py-0.5 text-[10px] rounded-sm bg-accent/10 text-accent border border-accent/20">
                              {label.workDimensions}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Only Editorial prints these rows, so only Editorial offers
                        them. They flip visibility only, leaving the data intact so
                        ticking again restores it. */}
                    {!label.isPortfolioLabel && printsRows && (
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {ROWS.map(({ key, label: rowLabel }) => (
                          <label key={key} className="flex items-center gap-1.5 cursor-pointer text-[11px] text-muted">
                            <input
                              type="checkbox"
                              checked={labelVisibility[index]?.[key] ?? false}
                              onChange={(e) => setVisibility(index, key, e.target.checked)}
                              className="w-3.5 h-3.5 accent-accent"
                            />
                            {rowLabel}
                          </label>
                        ))}
                      </div>
                    )}

                    {/* Tagline, only where it prints: Large and Extra Large, not QR Only */}
                    {takesTagline && (
                      <div>
                        <span className="text-[10px] text-muted uppercase tracking-wider block mb-1">Tagline</span>
                        <input
                          type="text"
                          value={label.tagline || ""}
                          onChange={(e) => updateLabel(index, { tagline: e.target.value })}
                          placeholder="e.g. Scan to view & buy"
                          className="w-full px-2 py-1 bg-surface border border-border rounded-sm text-[10px] text-foreground focus:outline-none focus:border-accent/50"
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {labels.length === 0 && (
                <p className="text-sm text-muted text-center py-8">No labels. Close and select some works.</p>
              )}
            </aside>
          )}

          {/* A4 paper preview, scales to fit on mobile */}
          <div className="flex-1 overflow-auto">
            <div className="py-4 sm:py-8 flex flex-col items-center gap-4 sm:gap-8">
              {Array.from({ length: pageCount }, (_, pageIdx) => (
                <div
                  key={pageIdx}
                  className="origin-top scale-[0.45] sm:scale-[0.6] lg:scale-100 -mb-[160mm] sm:-mb-[120mm] lg:mb-0"
                >
                <div
                  className="bg-white shadow-lg label-page"
                  style={{
                    width: "210mm",
                    height: "297mm",
                    padding: "10mm",
                    boxSizing: "border-box",
                    position: "relative",
                  }}
                >
                  {/* Page number badge */}
                  <div className="no-print absolute top-2 right-3 text-[10px] text-muted/50">
                    Page {pageIdx + 1} of {pageCount}
                  </div>
                  <LabelSheet labels={labels} labelVisibility={labelVisibility} pageIndex={pageIdx} labelTheme={themeId} />
                </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
