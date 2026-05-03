import { useEffect, useRef, type RefObject } from "react";

interface ModalKeyOptions {
  onClose?: () => void;
  onSubmit?: () => void;
  enabled?: boolean;
}

// Standard modal keyboard handling: Escape closes, Enter submits.
// Also focuses the first focusable element inside the ref on mount,
// which gives keyboard users a sensible starting point.
export function useModalKeys<T extends HTMLElement>(
  opts: ModalKeyOptions,
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const { onClose, onSubmit, enabled = true } = opts;

  useEffect(() => {
    if (!enabled) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      } else if (
        e.key === "Enter" &&
        (e.target as HTMLElement | null)?.tagName !== "TEXTAREA"
      ) {
        // Don't fire on Enter inside a textarea (user wants a newline).
        e.preventDefault();
        onSubmit?.();
      }
    }
    window.addEventListener("keydown", onKey);
    const firstFocusable = ref.current?.querySelector<HTMLElement>(
      'input, button, textarea, [tabindex]:not([tabindex="-1"])',
    );
    firstFocusable?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, onClose, onSubmit]);

  return ref;
}
