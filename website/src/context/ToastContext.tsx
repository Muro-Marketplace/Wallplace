"use client";

import { createContext, useContext, useState, useCallback } from "react";

export type ToastVariant = "info" | "warn" | "error";

export interface ToastOptions {
  variant?: ToastVariant;
  durationMs?: number;
}

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, opts?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  info: "bg-foreground text-white",
  warn: "bg-amber-50 text-amber-900 border border-amber-200",
  error: "bg-red-50 text-red-900 border border-red-200",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, opts?: ToastOptions) => {
    const id = nextId++;
    const variant = opts?.variant ?? "info";
    const durationMs = opts?.durationMs ?? 3000;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, durationMs);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto text-sm px-4 py-3 rounded-sm shadow-lg toast-enter ${VARIANT_CLASSES[toast.variant]}`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const noop: ToastContextValue = { showToast: () => {} };

export function useToast() {
  const ctx = useContext(ToastContext);
  return ctx ?? noop;
}
