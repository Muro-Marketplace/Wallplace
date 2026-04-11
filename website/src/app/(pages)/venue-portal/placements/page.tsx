"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import VenuePortalLayout from "@/components/VenuePortalLayout";
import { authFetch } from "@/lib/api-client";

type FilterTab = "All" | "Pending" | "Active" | "Completed";
type PlacementStatus = "Active" | "Pending" | "Declined" | "Completed";

interface PlacementRequest {
  id: string;
  artistName: string;
  artistSlug: string;
  workTitle: string;
  workImage: string;
  arrangementType: string;
  revenueSharePercent?: number;
  status: PlacementStatus;
  date: string;
  respondedAt?: string;
  message?: string;
  notes?: string;
}

const statusStyles: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  Pending: "bg-amber-100 text-amber-700",
  Declined: "bg-red-100 text-red-600",
  Completed: "bg-gray-100 text-gray-600",
};

const tabs: FilterTab[] = ["All", "Pending", "Active", "Completed"];

function normaliseStatus(raw: string): PlacementStatus {
  const map: Record<string, PlacementStatus> = {
    active: "Active", pending: "Pending", declined: "Declined",
    completed: "Completed", paused: "Completed",
  };
  return map[raw.toLowerCase()] || "Pending";
}

function typeLabel(raw: string, pct?: number): string {
  if (raw === "revenue_share") return `Revenue Share${pct ? ` (${pct}%)` : ""}`;
  if (raw === "free_loan") return "Free Loan";
  if (raw === "purchase") return "Direct Purchase";
  return raw;
}

export default function VenuePlacementsPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [placements, setPlacements] = useState<PlacementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);

  useEffect(() => {
    authFetch("/api/placements")
      .then((res) => res.json())
      .then((data) => {
        if (data.placements) {
          const mapped: PlacementRequest[] = data.placements.map((p: Record<string, unknown>) => ({
            id: p.id,
            artistName: p.artist_slug || "Artist",
            artistSlug: p.artist_slug || "",
            workTitle: p.work_title || "Untitled",
            workImage: (p.work_image as string) || "",
            arrangementType: p.arrangement_type as string || "free_loan",
            revenueSharePercent: p.revenue_share_percent as number | undefined,
            status: normaliseStatus(p.status as string || "pending"),
            date: p.created_at ? new Date(p.created_at as string).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "",
            respondedAt: p.responded_at ? new Date(p.responded_at as string).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : undefined,
            message: p.message as string | undefined,
            notes: p.notes as string | undefined,
          }));
          setPlacements(mapped);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function respond(id: string, accept: boolean) {
    setResponding(id);
    try {
      const res = await authFetch("/api/placements", {
        method: "PATCH",
        body: JSON.stringify({ id, status: accept ? "active" : "declined" }),
      });
      if (res.ok) {
        setPlacements((prev) =>
          prev.map((p) =>
            p.id === id
              ? { ...p, status: accept ? "Active" : "Declined", respondedAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) }
              : p
          )
        );
      }
    } catch (err) {
      console.error("Response error:", err);
    } finally {
      setResponding(null);
    }
  }

  const filtered = placements.filter((p) => {
    if (activeTab === "All") return true;
    if (activeTab === "Completed") return p.status === "Completed" || p.status === "Declined";
    return p.status === activeTab;
  });

  const pendingCount = placements.filter((p) => p.status === "Pending").length;

  return (
    <VenuePortalLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl">Placements</h1>
          <p className="text-sm text-muted mt-1">Manage artwork placement requests from artists</p>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 text-sm font-medium rounded-full">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            {pendingCount} pending request{pendingCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {tabs.map((tab) => {
          const count =
            tab === "All"
              ? placements.length
              : tab === "Completed"
              ? placements.filter((p) => p.status === "Completed" || p.status === "Declined").length
              : placements.filter((p) => p.status === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {tab}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab ? "bg-accent/10 text-accent" : "bg-border text-muted"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-muted text-sm py-12 text-center">Loading placements...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-sm px-6 py-12 text-center">
          <p className="text-muted text-sm">
            {activeTab === "Pending" ? "No pending requests." : "No placements found."}
          </p>
          {placements.length === 0 && (
            <p className="text-muted text-xs mt-2">When artists request to display work at your venue, their requests will appear here.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p.id} className={`bg-surface border rounded-sm overflow-hidden transition-all ${
              p.status === "Pending" ? "border-amber-200 shadow-sm" : "border-border"
            }`}>
              <div className="p-4 sm:p-5">
                <div className="flex items-start gap-4">
                  {/* Work thumbnail */}
                  {p.workImage && (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 relative rounded-sm overflow-hidden bg-border/20 shrink-0">
                      <Image src={p.workImage} alt={p.workTitle} fill className="object-cover" sizes="80px" />
                    </div>
                  )}

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-medium text-foreground">{p.workTitle}</h3>
                        <p className="text-xs text-muted mt-0.5">by {p.artistName}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${statusStyles[p.status] || statusStyles.Pending}`}>
                        {p.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted">
                      <span className="border border-border rounded-sm px-1.5 py-0.5">
                        {typeLabel(p.arrangementType, p.revenueSharePercent)}
                      </span>
                      <span>Requested {p.date}</span>
                      {p.respondedAt && <span>Responded {p.respondedAt}</span>}
                    </div>

                    {p.message && (
                      <div className="mt-3 bg-background border border-border rounded-sm p-3">
                        <p className="text-xs text-muted italic">&ldquo;{p.message}&rdquo;</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action buttons for pending */}
                {p.status === "Pending" && (
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                    <button
                      onClick={() => respond(p.id, true)}
                      disabled={responding === p.id}
                      className="px-5 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-sm transition-colors disabled:opacity-50"
                    >
                      {responding === p.id ? "..." : "Accept"}
                    </button>
                    <button
                      onClick={() => respond(p.id, false)}
                      disabled={responding === p.id}
                      className="px-5 py-2 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-sm transition-colors disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </VenuePortalLayout>
  );
}
