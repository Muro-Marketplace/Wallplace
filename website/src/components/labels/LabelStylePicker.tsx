"use client";

import { LABEL_STYLES, type LabelStyle } from "./label-layout";

interface LabelStylePickerProps {
  value: LabelStyle;
  onChange: (style: LabelStyle) => void;
  /** "cards" shows each style's description; "compact" fits the preview sidebar. */
  variant?: "cards" | "compact";
}

/**
 * Minimal, Editorial or QR Only, shared by both label pages and the print
 * preview so the choice reads the same everywhere. The cards reflow on their own
 * width rather than the window's, so a narrow panel stacks them instead of
 * crushing three columns a few words wide (owner report 13 September 2026).
 */
export default function LabelStylePicker({ value, onChange, variant = "cards" }: LabelStylePickerProps) {
  if (variant === "compact") {
    const selected = LABEL_STYLES.find((s) => s.key === value);
    return (
      <div>
        <div role="group" aria-label="Label style" className="grid grid-cols-3 gap-1">
          {LABEL_STYLES.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-pressed={value === s.key}
              onClick={() => onChange(s.key)}
              className={`px-2 py-1.5 text-xs rounded-sm border transition-colors ${
                value === s.key
                  ? "bg-accent text-white border-accent"
                  : "text-foreground border-border hover:border-foreground/30"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
        {selected && <p className="text-[11px] text-muted leading-snug mt-1.5">{selected.description}</p>}
      </div>
    );
  }

  return (
    <div role="group" aria-label="Label style" className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
      {LABEL_STYLES.map((s) => (
        <button
          key={s.key}
          type="button"
          aria-pressed={value === s.key}
          onClick={() => onChange(s.key)}
          className={`text-left p-3 rounded-sm border transition-colors ${
            value === s.key ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"
          }`}
        >
          <span className="block text-sm font-medium text-foreground">{s.name}</span>
          <span className="block text-[11px] text-muted leading-snug mt-0.5">{s.description}</span>
        </button>
      ))}
    </div>
  );
}
