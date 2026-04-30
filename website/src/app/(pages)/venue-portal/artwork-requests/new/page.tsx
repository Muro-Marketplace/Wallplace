"use client";

// Venue creates a new artwork request.

import { useState } from "react";
import { useRouter } from "next/navigation";
import VenuePortalLayout from "@/components/VenuePortalLayout";
import { authFetch } from "@/lib/api-client";

const INTENT_OPTIONS = ["purchase", "commission", "display", "loan"] as const;
const TIMESCALE_OPTIONS: { key: "asap" | "weeks" | "months" | "flexible"; label: string }[] = [
  { key: "asap", label: "ASAP" },
  { key: "weeks", label: "Within weeks" },
  { key: "months", label: "Within months" },
  { key: "flexible", label: "Flexible" },
];

export default function NewArtworkRequestPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [intent, setIntent] = useState<Set<typeof INTENT_OPTIONS[number]>>(new Set(["display"]));
  const [styles, setStyles] = useState("");
  const [mediums, setMediums] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [location, setLocation] = useState("");
  const [timescale, setTimescale] = useState<"asap" | "weeks" | "months" | "flexible" | "">("");
  const [visibility, setVisibility] = useState<"public" | "semi_public" | "private">("public");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleIntent(i: typeof INTENT_OPTIONS[number]) {
    setIntent((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !description.trim() || intent.size === 0) {
      setError("Title, description and at least one intent are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await authFetch("/api/artwork-requests", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          intent: Array.from(intent),
          styles: styles.split(",").map((s) => s.trim()).filter(Boolean),
          mediums: mediums.split(",").map((s) => s.trim()).filter(Boolean),
          budgetMinPence: budgetMin ? Math.round(parseFloat(budgetMin) * 100) : undefined,
          budgetMaxPence: budgetMax ? Math.round(parseFloat(budgetMax) * 100) : undefined,
          location: location.trim() || undefined,
          timescale: timescale || undefined,
          visibility,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "Could not create request.");
        setSubmitting(false);
        return;
      }
      router.push(`/venue-portal/artwork-requests/${data.id}`);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <VenuePortalLayout activePath="/venue-portal/artwork-requests">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-serif mb-2">New artwork request</h1>
        <p className="text-sm text-muted mb-8">Describe what you&rsquo;re looking for. Artists who think they&rsquo;re a fit will reach out.</p>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted mb-1.5" htmlFor="title">Title</label>
            <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder="e.g. Statement piece for our reception wall" className="w-full px-3 py-2.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:border-accent/60" />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-muted mb-1.5" htmlFor="desc">What you&rsquo;re looking for</label>
            <textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} maxLength={4000} placeholder="The space, the vibe, what you've tried, what you'd like." className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:border-accent/60 resize-y" />
          </div>

          <div>
            <p className="block text-xs uppercase tracking-wider text-muted mb-2">I&rsquo;m open to</p>
            <div className="flex flex-wrap gap-2">
              {INTENT_OPTIONS.map((i) => (
                <button key={i} type="button" onClick={() => toggleIntent(i)} className={`px-3 py-1.5 text-xs rounded-sm border transition-colors capitalize ${
                  intent.has(i) ? "bg-accent text-white border-accent" : "bg-background text-muted border-border hover:border-accent/40"
                }`}>{i}</button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted mb-1.5" htmlFor="styles">Styles (comma separated)</label>
              <input id="styles" type="text" value={styles} onChange={(e) => setStyles(e.target.value)} placeholder="abstract, minimalist" className="w-full px-3 py-2.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:border-accent/60" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted mb-1.5" htmlFor="mediums">Mediums</label>
              <input id="mediums" type="text" value={mediums} onChange={(e) => setMediums(e.target.value)} placeholder="oil, photography" className="w-full px-3 py-2.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:border-accent/60" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted mb-1.5" htmlFor="bmin">Budget min (£)</label>
              <input id="bmin" type="number" min="0" step="1" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:border-accent/60" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted mb-1.5" htmlFor="bmax">Budget max (£)</label>
              <input id="bmax" type="number" min="0" step="1" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} className="w-full px-3 py-2.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:border-accent/60" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted mb-1.5" htmlFor="loc">Location</label>
              <input id="loc" type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="London, EC1" className="w-full px-3 py-2.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:border-accent/60" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted mb-1.5" htmlFor="ts">Timeline</label>
              <select id="ts" value={timescale} onChange={(e) => setTimescale(e.target.value as typeof timescale)} className="w-full px-3 py-2.5 bg-background border border-border rounded-sm text-sm focus:outline-none focus:border-accent/60">
                <option value="">No preference</option>
                {TIMESCALE_OPTIONS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <p className="block text-xs uppercase tracking-wider text-muted mb-2">Visibility</p>
            <div className="grid sm:grid-cols-3 gap-2">
              {([
                { key: "public", label: "Public", desc: "Any artist can see this" },
                { key: "semi_public", label: "Verified artists", desc: "Approved artists only" },
                { key: "private", label: "Private", desc: "Only artists you invite" },
              ] as const).map((v) => (
                <button key={v.key} type="button" onClick={() => setVisibility(v.key)} className={`text-left p-3 rounded-sm border transition-colors ${
                  visibility === v.key ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"
                }`}>
                  <p className="text-sm font-medium">{v.label}</p>
                  <p className="text-[11px] text-muted">{v.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="flex-1 px-5 py-3 text-sm font-medium text-white bg-accent hover:bg-accent/90 rounded-sm transition-colors disabled:opacity-60">
              {submitting ? "Posting…" : "Post request"}
            </button>
            <button type="button" onClick={() => router.back()} className="px-4 py-3 text-sm text-muted hover:text-foreground transition-colors">Cancel</button>
          </div>
        </form>
      </div>
    </VenuePortalLayout>
  );
}
