"use client";

interface StatusStep {
  key: string;
  label: string;
}

const STEPS: StatusStep[] = [
  { key: "confirmed", label: "Confirmed" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

interface StatusHistoryEntry {
  status: string;
  timestamp: string;
}

interface OrderStatusTrackerProps {
  currentStatus: string;
  statusHistory?: StatusHistoryEntry[];
  compact?: boolean;
}

export default function OrderStatusTracker({ currentStatus, statusHistory = [], compact = false }: OrderStatusTrackerProps) {
  const currentIdx = STEPS.findIndex((s) => s.key === currentStatus);
  const isCancelled = currentStatus === "cancelled" || currentStatus === "refunded";

  if (isCancelled) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${currentStatus === "cancelled" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l8 8M11 3L3 11" /></svg>
        {currentStatus === "cancelled" ? "Cancelled" : "Refunded"}
      </div>
    );
  }

  function getTimestamp(stepKey: string): string | null {
    const entry = statusHistory.find((h) => h.status === stepKey);
    return entry ? new Date(entry.timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        {STEPS.map((step, i) => {
          const isComplete = i <= currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div key={step.key} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${isComplete ? "bg-accent" : "bg-border"} ${isCurrent ? "ring-2 ring-accent/30" : ""}`} />
              {i < STEPS.length - 1 && <div className={`w-4 h-0.5 ${i < currentIdx ? "bg-accent" : "bg-border"}`} />}
            </div>
          );
        })}
        <span className="text-xs font-medium text-foreground ml-2">{STEPS[currentIdx]?.label || currentStatus}</span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-0">
      {STEPS.map((step, i) => {
        const isComplete = i < currentIdx;
        const isCurrent = i === currentIdx;
        const isPending = i > currentIdx;
        const ts = getTimestamp(step.key);

        return (
          <div key={step.key} className="flex-1 flex flex-col items-center relative">
            {/* Connector line */}
            {i > 0 && (
              <div className={`absolute top-3 right-1/2 w-full h-0.5 -z-10 ${isComplete || isCurrent ? "bg-accent" : "bg-border"}`} />
            )}
            {/* Circle */}
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
              isComplete ? "bg-accent text-white" : isCurrent ? "bg-accent text-white ring-4 ring-accent/20" : "bg-border text-muted"
            }`}>
              {isComplete ? (
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="2 7 5.5 10.5 12 3.5" /></svg>
              ) : (
                <span className="text-[9px] font-bold">{i + 1}</span>
              )}
            </div>
            {/* Label */}
            <p className={`text-[10px] mt-1.5 text-center font-medium ${isPending ? "text-muted" : "text-foreground"}`}>
              {step.label}
            </p>
            {ts && <p className="text-[9px] text-muted mt-0.5">{ts}</p>}
          </div>
        );
      })}
    </div>
  );
}
