"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { authFetch } from "@/lib/api-client";
import type { ArtistWork } from "@/data/artists";
import {
  normaliseStatus,
  statusBadgeClass,
  nextAction,
  viewerRole,
  type DisplayStatus,
  type PlacementLifecycle,
} from "@/lib/placements/status";
import { canRespond } from "@/lib/placement-permissions";

interface PanelProps {
  otherPartySlug: string | null;
  otherPartyName: string;
  otherPartyType: "artist" | "venue" | "admin";
  otherPartyImage: string | null;
  portalType: "artist" | "venue";
  userId: string | null | undefined;
  /** Works owned by the current user (only for the artist side) or loaded portfolio of the other artist (venue side). */
  otherPartyWorks: ArtistWork[];
  otherPartyWorksLoading: boolean;
  onRequestSent?: () => void;
  /** Optional close callback. When provided the panel renders a dismiss
      chevron in its top-right corner (used by the mobile drawer and as
      an optional collapse affordance on desktop). */
  onClose?: () => void;
}

interface RemotePlacement extends PlacementLifecycle {
  id: string;
  work_title: string;
  work_image: string | null;
  arrangement_type: string;
  revenue_share_percent: number | null;
  monthly_fee_gbp: number | null;
  qr_enabled: boolean | null;
  artist_slug: string | null;
  venue_slug: string | null;
  venue: string | null;
  artist_user_id: string | null;
  venue_user_id: string | null;
  requester_user_id: string | null;
  accepted_at: string | null;
  scheduled_for: string | null;
  installed_at: string | null;
  live_from: string | null;
  collected_at: string | null;
  revenue_earned_gbp: number | null;
  created_at: string;
}

function formatDate(ts: string | null | undefined) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function TermsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-xs">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">{title}</p>
      {subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
    </div>
  );
}

export default function PlacementContextPanel({
  otherPartySlug,
  otherPartyName,
  otherPartyType,
  portalType,
  userId,
  otherPartyWorks,
  otherPartyWorksLoading,
  onRequestSent,
  onClose,
}: PanelProps) {
  const [placements, setPlacements] = useState<RemotePlacement[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Counter form state
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterRevShare, setCounterRevShare] = useState<number>(0);
  const [counterQr, setCounterQr] = useState<boolean>(true);
  const [counterFee, setCounterFee] = useState<number | "">("");
  const [counterNote, setCounterNote] = useState("");

  // Request-a-placement form state
  const [reqSelected, setReqSelected] = useState<Set<string>>(new Set());
  // reqQr: true \u2192 Revenue share arrangement (QR always on).
  //        false \u2192 Paid loan arrangement (QR optional via reqPaidLoanQr).
  const [reqQr, setReqQr] = useState(true);
  // Paid-loan sub-toggle: does the venue also want a QR card so the artist
  // earns a share on QR sales? Independent of the monthly fee.
  const [reqPaidLoanQr, setReqPaidLoanQr] = useState(true);
  const [reqRevShare, setReqRevShare] = useState<number>(0);
  const [reqFee, setReqFee] = useState<number | "">("");
  const [reqNote, setReqNote] = useState("");

  const isSupported = !!otherPartySlug && otherPartyType !== "admin";

  const loadPlacements = useCallback(async () => {
    if (!isSupported) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/placements");
      const data = await res.json();
      const rows: RemotePlacement[] = (data.placements || []).filter((p: RemotePlacement) => {
        return p.artist_slug === otherPartySlug || p.venue_slug === otherPartySlug;
      });
      // Sort most recent first \u2014 API already orders, but be defensive.
      rows.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
      setPlacements(rows);
    } catch (err) {
      console.error("Failed to load placements for panel:", err);
    } finally {
      setLoading(false);
    }
  }, [otherPartySlug, isSupported]);

  useEffect(() => {
    loadPlacements();
  }, [loadPlacements]);

  // The "current" placement for this conversation = the most recent one that is
  // still active/pending. If none, fall back to the most recent (so a completed
  // placement is still visible in the summary).
  const current: PlacementLifecycle & Partial<RemotePlacement> | null = (() => {
    if (placements.length === 0) return null;
    const live = placements.find((p) => {
      const s = normaliseStatus(p.status);
      return s === "Pending" || s === "Active";
    });
    return live || placements[0];
  })();

  const displayStatus: DisplayStatus | null = current ? normaliseStatus(current.status as string) : null;
  // Map snake_case DB columns onto the camelCase PlacementLifecycle shape
  // that status helpers expect. Without this, currentStage / nextStage
  // can't read the timestamps and every active placement looks like it
  // has no next step.
  const lifecycleCurrent = current ? {
    status: current.status,
    acceptedAt: (current as RemotePlacement).accepted_at,
    scheduledFor: (current as RemotePlacement).scheduled_for,
    installedAt: (current as RemotePlacement).installed_at,
    liveFrom: (current as RemotePlacement).live_from,
    collectedAt: (current as RemotePlacement).collected_at,
    requesterUserId: (current as RemotePlacement).requester_user_id,
  } : null;
  const role = lifecycleCurrent ? viewerRole(lifecycleCurrent, userId || null) : "observer";
  const nextAct = lifecycleCurrent ? nextAction(lifecycleCurrent, role) : null;

  // Authoritative "can I respond?" check that matches the logic used on
  // /venue-portal/placements and /artist-portal/placements. Handles both
  // modern rows (with requester_user_id) and legacy rows (with the
  // historical venue-requested-artist-accepts assumption), so the
  // Messages panel never shows Accept / Decline for a placement the
  // current user sent themselves.
  const canViewerRespond = current
    ? canRespond(
        {
          status: current.status,
          requester_user_id: (current as RemotePlacement).requester_user_id,
          artist_user_id: (current as RemotePlacement).artist_user_id,
          venue_user_id: (current as RemotePlacement).venue_user_id,
        },
        userId || null,
        portalType,
      )
    : false;

  async function handleAccept() {
    if (!current) return;
    setBusyAction("accept");
    setError(null);
    try {
      const res = await authFetch("/api/placements", {
        method: "PATCH",
        body: JSON.stringify({ id: (current as RemotePlacement).id, status: "active" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "Could not accept");
      else await loadPlacements();
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDecline() {
    if (!current) return;
    if (!confirm("Decline this placement request?")) return;
    setBusyAction("decline");
    setError(null);
    try {
      const res = await authFetch("/api/placements", {
        method: "PATCH",
        body: JSON.stringify({ id: (current as RemotePlacement).id, status: "declined" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "Could not decline");
      else await loadPlacements();
    } finally {
      setBusyAction(null);
    }
  }

  async function handleAdvance(stage: string) {
    if (!current || stage === "accepted") return;
    setBusyAction(`advance-${stage}`);
    setError(null);
    try {
      const res = await authFetch("/api/placements", {
        method: "PATCH",
        body: JSON.stringify({ id: (current as RemotePlacement).id, stage }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "Could not update stage");
      else await loadPlacements();
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCounterSubmit() {
    if (!current) return;
    setBusyAction("counter");
    setError(null);
    try {
      const arrangementType = counterQr ? (counterRevShare > 0 ? "revenue_share" : "free_loan") : "free_loan";
      const body = {
        id: (current as RemotePlacement).id,
        counter: {
          arrangementType,
          revenueSharePercent: counterQr && counterRevShare > 0 ? counterRevShare : undefined,
          qrEnabled: counterQr,
          monthlyFeeGbp: !counterQr && typeof counterFee === "number" ? counterFee : undefined,
          message: counterNote.trim() || undefined,
        },
      };
      const res = await authFetch("/api/placements", { method: "PATCH", body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "Could not send counter");
      else {
        setCounterOpen(false);
        setCounterNote("");
        await loadPlacements();
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRequest() {
    if (reqSelected.size === 0 || !otherPartySlug) return;
    setBusyAction("request");
    setError(null);
    try {
      const selectedWorks = otherPartyWorks.filter((w) => reqSelected.has(w.title));
      const arrangementType = reqQr ? "revenue_share" : "free_loan";
      // QR is always enabled on revenue share (that's the whole point);
      // on paid loan it follows the venue's choice via reqPaidLoanQr.
      const qrEnabled = reqQr ? true : reqPaidLoanQr;
      const fromVenue = portalType === "venue";
      const body = {
        fromVenue,
        artistSlug: fromVenue ? otherPartySlug : undefined,
        placements: selectedWorks.map((w) => ({
          id: `pl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          workTitle: w.title,
          workImage: w.image,
          venueSlug: fromVenue ? "" : otherPartySlug,
          venue: fromVenue ? "" : otherPartyName,
          type: arrangementType,
          revenueSharePercent: (reqQr || (qrEnabled && reqRevShare > 0)) && reqRevShare > 0 ? reqRevShare : undefined,
          qrEnabled,
          monthlyFeeGbp: !reqQr && typeof reqFee === "number" ? reqFee : undefined,
          message: reqNote.trim() || undefined,
        })),
      };
      const res = await authFetch("/api/placements", { method: "POST", body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "Could not send request");
      else {
        setReqSelected(new Set());
        setReqNote("");
        await loadPlacements();
        onRequestSent?.();
      }
    } finally {
      setBusyAction(null);
    }
  }

  // Unsupported conversation (e.g. Wallplace Support) \u2014 keep it quiet.
  if (!isSupported) {
    return (
      <aside className="w-full h-full bg-[#FAF8F5] border-l border-border flex flex-col">
        <div className="px-5 py-6">
          <Header title="Placement" />
          <p className="text-xs text-muted mt-3">
            Placements don't apply to this conversation.
          </p>
        </div>
      </aside>
    );
  }

  // Loading placeholder
  if (loading && placements.length === 0) {
    return (
      <aside className="w-full h-full bg-[#FAF8F5] border-l border-border flex flex-col">
        <div className="px-5 py-6">
          <Header title="Placement" />
          <p className="text-xs text-muted mt-3">Loading…</p>
        </div>
      </aside>
    );
  }

  // No placement \u2014 show the Request a Placement form.
  if (!current) {
    return (
      <aside className="w-full h-full bg-[#FAF8F5] border-l border-border flex flex-col overflow-y-auto">
        <div className="px-5 py-6 border-b border-border">
          <Header title="Request a Placement" subtitle={`Start a placement with ${otherPartyName}.`} />
        </div>

        <div className="px-5 py-5 space-y-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted mb-2">
              Select works {reqSelected.size > 0 && <span className="text-accent normal-case">({reqSelected.size})</span>}
            </p>
            {otherPartyWorksLoading ? (
              <p className="text-xs text-muted">Loading portfolio…</p>
            ) : otherPartyWorks.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {otherPartyWorks.slice(0, 12).map((w) => {
                  const selected = reqSelected.has(w.title);
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => {
                        setReqSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(w.title)) next.delete(w.title); else next.add(w.title);
                          return next;
                        });
                      }}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${selected ? "border-accent shadow-sm" : "border-transparent hover:border-border"}`}
                      title={w.title}
                    >
                      <Image src={w.image} alt={w.title} fill className="object-cover" sizes="100px" />
                      {selected && (
                        <div className="absolute inset-0 bg-accent/25 flex items-center justify-center">
                          <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="2 7 5.5 10.5 12 3.5" /></svg>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted">No works available yet.</p>
            )}
          </div>

          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted mb-2">Type</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setReqQr(true)} className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${reqQr ? "bg-accent/10 border-accent text-accent" : "border-border text-muted hover:text-foreground"}`}>Revenue share</button>
              <button type="button" onClick={() => setReqQr(false)} className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${!reqQr ? "bg-accent/10 border-accent text-accent" : "border-border text-muted hover:text-foreground"}`}>Paid loan</button>
            </div>
          </div>

          {reqQr ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted flex-1">Revenue share</span>
              <input type="number" min={0} max={50} value={reqRevShare} onChange={(e) => setReqRevShare(Number(e.target.value) || 0)} className="w-16 px-2 py-1.5 bg-surface border border-border rounded-lg text-xs text-center focus:outline-none focus:border-accent/50" />
              <span className="text-xs text-muted">%</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted flex-1">Monthly fee</span>
                <span className="text-xs text-muted">£</span>
                <input type="number" min={0} value={reqFee} onChange={(e) => { const v = e.target.value; if (v === "") { setReqFee(""); return; } const n = Number(v); if (!Number.isNaN(n)) setReqFee(n); }} placeholder="e.g. 50" className="w-20 px-2 py-1.5 bg-surface border border-border rounded-lg text-xs focus:outline-none focus:border-accent/50" />
              </div>
              {/* Optional QR for paid loans \u2014 venue still earns a share
                  on any QR sales even while paying the artist a monthly fee. */}
              <label className="flex items-center justify-between gap-2 cursor-pointer">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground">Add a QR code</p>
                  <p className="text-[10px] text-muted leading-snug">Let visitors buy the piece. You&rsquo;ll split QR sales.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setReqPaidLoanQr(!reqPaidLoanQr)}
                  className={`relative shrink-0 w-9 h-5 rounded-full transition-colors ${reqPaidLoanQr ? "bg-accent" : "bg-border"}`}
                  aria-pressed={reqPaidLoanQr}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${reqPaidLoanQr ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                </button>
              </label>
              {reqPaidLoanQr && (
                <div className="flex items-center gap-2 pl-0">
                  <span className="text-xs text-muted flex-1">Share on QR sales</span>
                  <input type="number" min={0} max={50} value={reqRevShare} onChange={(e) => setReqRevShare(Number(e.target.value) || 0)} className="w-16 px-2 py-1.5 bg-surface border border-border rounded-lg text-xs text-center focus:outline-none focus:border-accent/50" />
                  <span className="text-xs text-muted">%</span>
                </div>
              )}
            </div>
          )}

          <textarea value={reqNote} onChange={(e) => setReqNote(e.target.value)} placeholder="Add a note (optional)" rows={3} className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent/50 resize-none" />

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button onClick={handleRequest} disabled={busyAction === "request" || reqSelected.size === 0} className="w-full px-4 py-2.5 bg-accent text-white text-sm font-medium rounded-full hover:bg-accent-hover transition-colors disabled:opacity-40">
            {busyAction === "request" ? "Sending…" : `Send placement request${reqSelected.size > 1 ? ` (${reqSelected.size})` : ""}`}
          </button>
        </div>
      </aside>
    );
  }

  // Has placement \u2014 show progress panel.
  const p = current as RemotePlacement;
  // "Type" label: just the arrangement name. The numeric value lives on its
  // own Terms row ("Revenue share: 1%" / "Monthly fee: £X") so we don't
  // repeat it here.
  const arrangementLabel = p.arrangement_type === "revenue_share"
    ? "Revenue share"
    : p.arrangement_type === "free_loan"
      ? (p.monthly_fee_gbp && p.monthly_fee_gbp > 0 ? "Paid loan" : "Free loan")
      : "Purchase";

  return (
    <aside className="w-full h-full bg-[#FAF8F5] border-l border-border flex flex-col overflow-y-auto">
      {/* Compact placement header — work title + status chip on one row,
          arrangement as a small subtitle. Dropped the "PLACEMENT" kicker
          and the extra mt-3 gap that used to push the title down. */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">Placement</p>
          <div className="flex items-center gap-2">
            {displayStatus && (
              <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${statusBadgeClass(displayStatus)}`}>
                {displayStatus}
              </span>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 -mr-1 text-muted hover:text-foreground transition-colors"
                aria-label="Close placement panel"
                title="Collapse panel"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
              </button>
            )}
          </div>
        </div>
        <p className="text-sm font-medium text-foreground mt-1.5 truncate">{p.work_title}</p>
        <p className="text-[11px] text-muted">{arrangementLabel}</p>
      </div>

      {/* Progress — tighter vertical rhythm (pb-2 instead of pb-4, smaller
          dots) so the whole lifecycle fits in one glance. */}
      <div className="px-4 py-3 border-b border-border bg-surface">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">Progress</p>
        <ol className="mt-2 space-y-0">
          {(() => {
            const lifecycle = [
              { key: "requested", label: "Requested", ts: p.created_at, reached: !!p.created_at },
              { key: "accepted",  label: "Accepted",  ts: p.accepted_at, reached: !!p.accepted_at },
              { key: "scheduled", label: "Scheduled", ts: p.scheduled_for, reached: !!p.scheduled_for },
              { key: "installed", label: "Installed", ts: p.installed_at, reached: !!p.installed_at },
              { key: "live",      label: "Live on wall", ts: p.live_from, reached: !!p.live_from },
              { key: "collected", label: "Collected", ts: p.collected_at, reached: !!p.collected_at },
            ];
            const isDeclined = displayStatus === "Declined";
            const currentIdx = lifecycle.reduce((acc, s, i) => (s.reached ? i : acc), -1);
            if (isDeclined) {
              return (
                <>
                  <li className="relative pl-5 pb-2">
                    <span className="absolute left-0 top-0.5 w-3.5 h-3.5 rounded-full bg-green-500 flex items-center justify-center">
                      <svg width="8" height="8" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="2 7 5.5 10.5 12 3.5" /></svg>
                    </span>
                    <span className="absolute left-[6px] top-3.5 bottom-0 w-px bg-red-200" />
                    <p className="text-xs font-medium text-foreground leading-tight">Requested</p>
                    <p className="text-[10px] text-muted leading-tight">{formatDate(p.created_at)}</p>
                  </li>
                  <li className="relative pl-5">
                    <span className="absolute left-0 top-0.5 w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center">
                      <svg width="7" height="7" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M3 3l8 8M11 3L3 11" /></svg>
                    </span>
                    <p className="text-xs font-medium text-red-700 leading-tight">Declined</p>
                  </li>
                </>
              );
            }
            return lifecycle.map((s, i) => {
              const isCurrent = i === currentIdx;
              const isNext = !s.reached && i === currentIdx + 1;
              const isLast = i === lifecycle.length - 1;
              const dotCls = s.reached
                ? (isCurrent ? "bg-accent" : "bg-green-500")
                : isNext ? "bg-accent/20 border border-accent" : "bg-border/60";
              const connectorCls = s.reached && i < currentIdx ? "bg-green-500" : "bg-border/60";
              return (
                <li key={s.key} className={`relative pl-5 ${isLast ? "" : "pb-2"}`}>
                  <span className={`absolute left-0 top-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center ${dotCls}`}>
                    {s.reached ? (
                      <svg width="8" height="8" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="2 7 5.5 10.5 12 3.5" /></svg>
                    ) : (
                      <span className={`text-[8px] font-medium ${isNext ? "text-accent" : "text-muted"}`}>{i + 1}</span>
                    )}
                  </span>
                  {!isLast && <span className={`absolute left-[6px] top-3.5 bottom-0 w-px ${connectorCls}`} />}
                  <p className={`text-xs font-medium leading-tight ${s.reached ? "text-foreground" : isNext ? "text-accent" : "text-muted"}`}>
                    {s.label}
                    {isCurrent && <span className="ml-1.5 text-[9px] font-normal uppercase tracking-wider text-accent">Current</span>}
                    {isNext && <span className="ml-1.5 text-[9px] font-normal uppercase tracking-wider text-accent">Next</span>}
                  </p>
                  {s.ts && s.reached && <p className="text-[10px] text-muted leading-tight">{formatDate(s.ts)}</p>}
                </li>
              );
            });
          })()}
        </ol>

        {/* Inline action row — Accept / Counter / Decline when Pending,
            Mark next stage when Active. */}
        {displayStatus === "Pending" && canViewerRespond && !counterOpen && (
          <div className="mt-3 flex gap-2">
            <button onClick={handleAccept} disabled={busyAction === "accept"} className="px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-hover rounded-full transition-colors disabled:opacity-60">
              {busyAction === "accept" ? "Accepting…" : "Accept"}
            </button>
            <button onClick={() => {
              setCounterOpen(true);
              setCounterRevShare(p.revenue_share_percent || 0);
              setCounterQr(p.qr_enabled ?? true);
              setCounterFee(p.monthly_fee_gbp ?? "");
            }} className="px-3 py-1.5 text-xs font-medium text-accent border border-accent/30 hover:bg-accent/5 rounded-full transition-colors">
              Counter
            </button>
            <button onClick={handleDecline} disabled={busyAction === "decline"} className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-full transition-colors disabled:opacity-60">
              {busyAction === "decline" ? "Declining…" : "Decline"}
            </button>
          </div>
        )}

        {displayStatus === "Pending" && !canViewerRespond && (
          <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            Awaiting the other side&rsquo;s response
          </div>
        )}

        {error && <p className="text-[11px] text-red-600 mt-2">{error}</p>}
      </div>

      {/* Counter form */}
      {counterOpen && (
        <div className="px-5 py-4 border-b border-border bg-surface">
          <Header title="Counter offer" subtitle="Adjust the terms before sending back." />
          <div className="mt-3 space-y-3">
            <div className="flex gap-2">
              <button type="button" onClick={() => setCounterQr(true)} className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${counterQr ? "bg-accent/10 border-accent text-accent" : "border-border text-muted hover:text-foreground"}`}>QR Display</button>
              <button type="button" onClick={() => setCounterQr(false)} className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${!counterQr ? "bg-accent/10 border-accent text-accent" : "border-border text-muted hover:text-foreground"}`}>Paid Loan</button>
            </div>
            {counterQr ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted flex-1">Revenue share</span>
                <input type="number" min={0} max={50} value={counterRevShare} onChange={(e) => setCounterRevShare(Number(e.target.value) || 0)} className="w-16 px-2 py-1.5 bg-surface border border-border rounded-lg text-xs text-center focus:outline-none focus:border-accent/50" />
                <span className="text-xs text-muted">%</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted flex-1">Monthly fee</span>
                <span className="text-xs text-muted">£</span>
                <input type="number" min={0} value={counterFee} onChange={(e) => { const v = e.target.value; if (v === "") { setCounterFee(""); return; } const n = Number(v); if (!Number.isNaN(n)) setCounterFee(n); }} className="w-20 px-2 py-1.5 bg-surface border border-border rounded-lg text-xs focus:outline-none focus:border-accent/50" />
              </div>
            )}
            <textarea value={counterNote} onChange={(e) => setCounterNote(e.target.value)} placeholder="Add a note (optional)" rows={2} className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent/50 resize-none" />
            <div className="flex gap-2">
              <button onClick={handleCounterSubmit} disabled={busyAction === "counter"} className="flex-1 px-3 py-2 text-xs font-medium text-white bg-accent hover:bg-accent-hover rounded-full transition-colors disabled:opacity-60">
                {busyAction === "counter" ? "Sending…" : "Send counter"}
              </button>
              <button onClick={() => setCounterOpen(false)} className="px-3 py-2 text-xs text-muted hover:text-foreground">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Terms — two-column key/value rows, denser than the previous
          stack-of-full-width rows. QR-code row dropped for revenue share
          arrangements because rev share is always QR-enabled by design,
          so the row was redundant. */}
      <div className="px-4 py-3 border-b border-border">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted mb-2">Terms</p>
        <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-xs">
          <dt className="text-muted">Type</dt>
          <dd className="text-foreground font-medium text-right">{arrangementLabel}</dd>

          {p.arrangement_type === "revenue_share" && (
            <>
              <dt className="text-muted">Revenue share</dt>
              <dd className="text-foreground font-medium text-right">
                {p.revenue_share_percent != null ? `${p.revenue_share_percent}%` : "Not set"}
              </dd>
            </>
          )}

          {p.arrangement_type === "free_loan" && (
            <>
              <dt className="text-muted">Monthly fee</dt>
              <dd className="text-foreground font-medium text-right">
                {p.monthly_fee_gbp != null && p.monthly_fee_gbp > 0 ? `£${p.monthly_fee_gbp}` : "Free"}
              </dd>
              {p.qr_enabled != null && (
                <>
                  <dt className="text-muted">QR code</dt>
                  <dd className="text-foreground font-medium text-right">{p.qr_enabled ? "Enabled" : "Disabled"}</dd>
                </>
              )}
            </>
          )}

          <dt className="text-muted">Requested</dt>
          <dd className="text-foreground font-medium text-right">{formatDate(p.created_at)}</dd>
          {p.accepted_at && (
            <>
              <dt className="text-muted">Accepted</dt>
              <dd className="text-foreground font-medium text-right">{formatDate(p.accepted_at)}</dd>
            </>
          )}
        </dl>
      </div>

      {/* Revenue — inline single row. Only shown post-acceptance. */}
      {(displayStatus === "Active" || displayStatus === "Completed" || displayStatus === "Sold") ? (
        <div className="px-4 py-2.5 border-b border-border flex items-baseline justify-between gap-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">Earned to date</p>
          <p className="text-sm font-medium text-foreground">&pound;{(p.revenue_earned_gbp ?? 0).toLocaleString()}</p>
        </div>
      ) : null}

      {/* Bottom CTAs — primary action mirrors the "Next" step on the
          progress bar. Tightened to py-2 and space-y-1.5 so the buttons
          don't eat half the mobile drawer. */}
      <div className="px-4 py-3 mt-auto space-y-1.5">
        {(() => {
          const nextStageKey = nextAct?.cta?.kind === "advance" ? nextAct.cta.stage : null;
          const nextLabel = nextStageKey ? `Mark ${nextStageKey === "live" ? "live on wall" : nextStageKey}` : null;
          if (displayStatus === "Active" && nextStageKey && nextLabel) {
            return (
              <button
                onClick={() => handleAdvance(nextStageKey)}
                disabled={busyAction === `advance-${nextStageKey}`}
                className="inline-flex w-full items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-white bg-accent hover:bg-accent-hover rounded-full transition-colors disabled:opacity-60"
              >
                {busyAction === `advance-${nextStageKey}` ? "Updating…" : nextLabel}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </button>
            );
          }
          return null;
        })()}
        <Link
          href={`/placements/${encodeURIComponent(p.id)}`}
          className="inline-flex w-full items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-accent bg-surface border border-accent/40 hover:bg-accent hover:text-white hover:border-accent rounded-full transition-colors"
        >
          Open full placement
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
        </Link>
      </div>
    </aside>
  );
}
