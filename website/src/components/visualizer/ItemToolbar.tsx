"use client";

/**
 * ItemToolbar — floating toolbar for the currently selected item.
 *
 * Rendered as an HTML overlay (not Konva) so we get crisp text + native
 * focus management. Anchored to the top-centre of the canvas region to
 * keep simple positioning logic; later we can pin it next to the item
 * itself once the editor has multi-row layouts.
 *
 * Capabilities:
 *   - Cycle through listed sizes (when the work has size variants)
 *   - Pick frame style (5 options)
 *   - Pick frame finish (filtered to current style's finishes)
 *   - Bring forward / send back
 *   - Duplicate / delete
 */

import { useMemo } from "react";
import { cycleSize, type SizeVariant } from "@/lib/visualizer/dimensions";
import {
  FRAME_STYLES,
  defaultFrameConfig,
  getFrameStyle,
} from "@/lib/visualizer/frames";
import type { FrameStyle, WallItem } from "@/lib/visualizer/types";

interface Props {
  item: WallItem;
  onChange: (partial: Partial<WallItem>) => void;
  onBringForward: () => void;
  onSendBack: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  /** Available size variants for the work this item references. */
  sizes?: SizeVariant[];
}

export default function ItemToolbar({
  item,
  onChange,
  onBringForward,
  onSendBack,
  onDuplicate,
  onDelete,
  sizes,
}: Props) {
  const styleDef = useMemo(() => getFrameStyle(item.frame.style), [item.frame.style]);

  const handleStyleChange = (newStyle: FrameStyle) => {
    onChange({ frame: defaultFrameConfig(newStyle) });
  };

  const handleFinishChange = (finishId: string) => {
    onChange({ frame: { ...item.frame, finish: finishId } });
  };

  const handleSizeCycle = (direction: 1 | -1) => {
    if (!sizes || sizes.length === 0) return;
    const next = cycleSize(sizes, item.size_label ?? null, direction);
    if (!next) return;
    onChange({
      width_cm: next.widthCm,
      height_cm: next.heightCm,
      size_label: next.label,
    });
  };

  // Compact label: "12×16\" (A3)" → "A3" if parens present, else first 12 chars.
  const sizeLabelShort = useMemo(() => {
    if (item.size_label) {
      const parens = /\(([^)]+)\)/.exec(item.size_label);
      if (parens) return parens[1];
      return item.size_label.length > 14
        ? item.size_label.slice(0, 12) + "…"
        : item.size_label;
    }
    return `${Math.round(item.width_cm)}×${Math.round(item.height_cm)} cm`;
  }, [item.size_label, item.width_cm, item.height_cm]);

  const hasMultipleSizes = (sizes?.length ?? 0) > 1;

  return (
    <div
      role="toolbar"
      aria-label="Selected artwork"
      className="flex items-center gap-2 px-2 py-1.5 rounded-full bg-white/95 backdrop-blur border border-black/10 shadow-md text-stone-700"
    >
      {/* Size cycle — only when the work has multiple listed sizes */}
      {hasMultipleSizes && (
        <>
          <div className="flex items-center gap-0.5 px-1">
            <button
              type="button"
              title="Smaller size"
              onClick={() => handleSizeCycle(-1)}
              className="px-1.5 py-0.5 text-[11px] rounded hover:bg-stone-100"
            >
              −
            </button>
            <span
              className="text-[11px] tabular-nums px-1.5 text-stone-700 min-w-[3.5rem] text-center"
              title={
                item.size_label ??
                `${Math.round(item.width_cm)}×${Math.round(item.height_cm)} cm`
              }
            >
              {sizeLabelShort}
            </span>
            <button
              type="button"
              title="Larger size"
              onClick={() => handleSizeCycle(1)}
              className="px-1.5 py-0.5 text-[11px] rounded hover:bg-stone-100"
            >
              +
            </button>
          </div>
          <span className="h-4 w-px bg-black/10" />
        </>
      )}

      {/* Frame style — segmented buttons */}
      <div className="flex items-center gap-0.5">
        {FRAME_STYLES.map((s) => {
          const active = s.id === item.frame.style;
          return (
            <button
              key={s.id}
              type="button"
              title={s.label}
              onClick={() => handleStyleChange(s.id)}
              className={`px-2 py-1 text-[11px] rounded-full transition ${
                active
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Finish — only when style has finishes */}
      {styleDef.finishes.length > 0 && (
        <>
          <span className="h-4 w-px bg-black/10" />
          <select
            aria-label="Frame finish"
            value={item.frame.finish}
            onChange={(e) => handleFinishChange(e.target.value)}
            className="text-[11px] px-1.5 py-0.5 rounded border border-black/10 bg-white"
          >
            {styleDef.finishes.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </>
      )}

      <span className="h-4 w-px bg-black/10" />

      {/* Z-order */}
      <button
        type="button"
        title="Bring forward"
        onClick={onBringForward}
        className="px-2 py-1 text-[11px] rounded hover:bg-stone-100"
      >
        ↑
      </button>
      <button
        type="button"
        title="Send back"
        onClick={onSendBack}
        className="px-2 py-1 text-[11px] rounded hover:bg-stone-100"
      >
        ↓
      </button>

      <span className="h-4 w-px bg-black/10" />

      {/* Duplicate / delete */}
      <button
        type="button"
        title="Duplicate"
        onClick={onDuplicate}
        className="px-2 py-1 text-[11px] rounded hover:bg-stone-100"
      >
        Duplicate
      </button>
      <button
        type="button"
        title="Delete"
        onClick={onDelete}
        className="px-2 py-1 text-[11px] rounded text-red-600 hover:bg-red-50"
      >
        Delete
      </button>
    </div>
  );
}
