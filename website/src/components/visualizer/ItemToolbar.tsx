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
 *   - Pick frame style (5 options)
 *   - Pick frame finish (filtered to current style's finishes)
 *   - Bring forward / send back
 *   - Duplicate / delete
 */

import { useMemo } from "react";
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
}

export default function ItemToolbar({
  item,
  onChange,
  onBringForward,
  onSendBack,
  onDuplicate,
  onDelete,
}: Props) {
  const styleDef = useMemo(() => getFrameStyle(item.frame.style), [item.frame.style]);

  const handleStyleChange = (newStyle: FrameStyle) => {
    onChange({ frame: defaultFrameConfig(newStyle) });
  };

  const handleFinishChange = (finishId: string) => {
    onChange({ frame: { ...item.frame, finish: finishId } });
  };

  return (
    <div
      role="toolbar"
      aria-label="Selected artwork"
      className="flex items-center gap-2 px-2 py-1.5 rounded-full bg-white/95 backdrop-blur border border-black/10 shadow-md text-stone-700"
    >
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
