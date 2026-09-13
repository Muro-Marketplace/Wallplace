"use client";

import { LABEL_SIZES, sheetLayout, type LabelSize, type LabelStyle } from "./label-layout";

interface LabelSizePickerProps {
  value: LabelSize;
  /** The chosen style, which decides the label's shape. */
  style: LabelStyle;
  onChange: (size: LabelSize) => void;
  /** Four equal buttons, for the preview sidebar. */
  compact?: boolean;
}

/**
 * Small to Extra Large, with the printed size and how many fit on a sheet in
 * the chosen style. QR Only is a style, never a size (owner report 13 September
 * 2026).
 */
export default function LabelSizePicker({ value, style, onChange, compact = false }: LabelSizePickerProps) {
  const layout = sheetLayout(value, style);
  return (
    <div>
      <div role="group" aria-label="Label size" className={compact ? "grid grid-cols-4 gap-1" : "flex flex-wrap gap-1.5"}>
        {LABEL_SIZES.map((s) => (
          <button
            key={s.key}
            type="button"
            aria-pressed={value === s.key}
            onClick={() => onChange(s.key)}
            className={`${compact ? "px-1 py-1.5 text-[11px]" : "px-3 py-1.5 text-xs"} rounded-sm border transition-colors ${
              value === s.key
                ? "bg-foreground text-white border-foreground"
                : "border-border text-muted hover:border-foreground/30"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted mt-1.5 tabular-nums">
        {layout.widthMm} × {layout.heightMm} mm, {layout.perPage} to an A4 sheet
      </p>
    </div>
  );
}
