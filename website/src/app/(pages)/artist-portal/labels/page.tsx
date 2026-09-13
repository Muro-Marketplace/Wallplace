"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { buildVenueOptions, resolveVenueParam, type VenueOption } from "@/lib/labels/venue-options";
import LabelPreview from "@/components/labels/LabelPreview";
import LabelThemePicker from "@/components/labels/LabelThemePicker";
import LabelStylePicker from "@/components/labels/LabelStylePicker";
import LabelSizePicker from "@/components/labels/LabelSizePicker";
import type { LabelData } from "@/components/labels/LabelSheet";
import { LABEL_STYLES, type LabelSize, type LabelStyle } from "@/components/labels/label-layout";
import { displayPhysicalDimensions } from "@/lib/dimensions";
import { hideFeedbackBubble } from "@/lib/ui/feedback-bubble-visibility";
import { useCurrentArtist } from "@/hooks/useCurrentArtist";
import { mutate, apiErrorMessage } from "@/lib/api-client";
import { useToast } from "@/context/ToastContext";
import { DEFAULT_LABEL_THEME, getLabelTheme, type LabelThemeId } from "@/lib/profile-themes";
import { portalGet } from "@/lib/portal-get";

interface LabelOptions {
  showMedium: boolean;
  showDimensions: boolean;
  showPrice: boolean;
}

export default function LabelsPage() {
  const { artist, loading: artistLoading } = useCurrentArtist();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [selectedSizes, setSelectedSizes] = useState<Record<number, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [previewLabels, setPreviewLabels] = useState<LabelData[]>([]);
  const [options, setOptions] = useState<LabelOptions>({
    showMedium: true,
    showDimensions: false,
    showPrice: false,
  });
  // Portfolio label
  const [portfolioQty, setPortfolioQty] = useState(0);
  // Venue context for QR tracking
  const [selectedVenue, setSelectedVenue] = useState<VenueOption | null>(null);
  // Owner decision 2026-09-02: label colour moved off Edit Profile and off
  // the Premium gate, it's now a free, per-print choice made right here and
  // remembered as the artist's default. Seeded once from that saved default
  // below, labelThemeSeeded stops a later background refetch (see
  // useCurrentArtist) from overwriting a colour picked in this session.
  const [labelThemeId, setLabelThemeId] = useState<LabelThemeId>(DEFAULT_LABEL_THEME);
  const [labelThemeSeeded, setLabelThemeSeeded] = useState(false);
  // QA flag D16: the dropdown must carry the venue SLUG, not just the display
  // name. The QR route attributes a scan to a venue (revenue share, redirect,
  // signed venue param) only via `vs=<slug>`; a name-only label loses the
  // attribution silently.
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [venueDropdownOpen, setVenueDropdownOpen] = useState(false);
  const [preselected, setPreselected] = useState(false);
  const [labelSize, setLabelSize] = useState<LabelSize>("medium");
  const [tagline, setTagline] = useState("");
  // High-level style picker — drives size + which fields to show, so
  // the artist doesn't have to think about both. Falling back to
  // "minimal" matches the existing default size of medium.
  const [labelStyle, setLabelStyle] = useState<LabelStyle>("minimal");

  function applyStyle(style: LabelStyle) {
    // Style + size are independent now (per design feedback). Picking
    // a style sets the *default* size for that style on first selection
    // but doesn't override an explicit size the user has already
    // chosen. Field toggles are always live so Editorial actually
    // shows medium/dimensions/price.
    setLabelStyle(style);
    const cfg = LABEL_STYLES.find((s) => s.key === style);
    if (cfg) setLabelSize(cfg.defaultSize);
    if (style === "editorial") {
      setOptions({ showMedium: true, showDimensions: true, showPrice: true });
    } else if (style === "minimal") {
      setOptions({ showMedium: false, showDimensions: false, showPrice: false });
    }
  }

  // Pre-select venue and works from query params (from placement QR
  // button). Two flavours of size param:
  //   - `sizes=` (comma-separated, parallel to works) for multi-work
  //     placements where each work has its own agreed size
  //   - `size=` (single) for legacy single-work links
  useEffect(() => {
    if (!artist || preselected) return;
    const paramVenue = searchParams.get("venue");
    const paramWorks = searchParams.get("works");
    const paramSizes = searchParams.get("sizes");
    const paramSize = searchParams.get("size");
    // Venue resolution happens in its own effect below once the venues list
    // has loaded, so deep links can name the venue by slug (emails) or by
    // display name (portal links) and still preselect correctly.
    void paramVenue;
    if (paramWorks && artist.works) {
      const workTitles = paramWorks.split(",").map((w) => w.trim());
      const sizeList = paramSizes
        ? paramSizes.split(",").map((s) => s.trim())
        : null;
      const indices = new Set<number>();
      const sizeMap: Record<number, string> = {};
      artist.works.forEach((w, i) => {
        const at = workTitles.indexOf(w.title);
        if (at === -1) return;
        indices.add(i);
        // Per-work size from `sizes=` if available; otherwise fall
        // back to the legacy single `size=` param applied to all.
        const perWork = sizeList?.[at];
        const chosen = perWork && perWork.length > 0
          ? perWork
          : (paramSize || "");
        if (chosen) sizeMap[i] = chosen;
      });
      if (indices.size > 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelected(indices);
        if (Object.keys(sizeMap).length > 0) setSelectedSizes(sizeMap);
      }
    }
    setPreselected(true);
  }, [artist, searchParams, preselected]);

  // Seed the label-colour picker from the artist's saved default once
  // `artist` has loaded. labelThemeSeeded guards it to run once, so a
  // later background refetch doesn't clobber a colour picked in this
  // session before it's had a chance to save.
  useEffect(() => {
    if (labelThemeSeeded || !artist) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLabelThemeId(getLabelTheme(artist.labelTheme).id);
    setLabelThemeSeeded(true);
  }, [artist, labelThemeSeeded]);

  // All hooks MUST be before any early return
  const totalLabels = useMemo(() => {
    let count = portfolioQty;
    selected.forEach((i) => { count += quantities[i] ?? 1; });
    return count;
  }, [selected, quantities, portfolioQty]);

  // Owner report 13 September 2026: the Feedback button sat on top of Preview
  // & Print. Hold it hidden while the action bar is on screen.
  const actionBarShowing = selected.size > 0 || portfolioQty > 0;
  useEffect(() => (actionBarShowing ? hideFeedbackBubble() : undefined), [actionBarShowing]);

  // Resolve the venue deep-link param against the loaded venues list. Emails
  // pass the SLUG (?venue=the-curzon), portal pages historically passed the
  // display name; match slug first, then name (QA flag D16).
  useEffect(() => {
    if (venues.length === 0 || selectedVenue) return;
    const match = resolveVenueParam(
      venues,
      searchParams.get("venueSlug") || searchParams.get("venue"),
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (match) setSelectedVenue(match);
  }, [venues, searchParams, selectedVenue]);

  // Fetch unique venue names from placements
  useEffect(() => {
    // portalGet rejects a non-2xx rather than handing the error body to the
    // mapper below; the catch already covers that. Warmed on hover.
    portalGet<{ placements?: Parameters<typeof buildVenueOptions>[0] }>("/api/placements")
      .then((data) => {
        if (data.placements) {
          setVenues(buildVenueOptions(data.placements));
        }
      })
      .catch(() => {});
  }, []);

  if (artistLoading || !artist) {
    return (
      <>
        <p className="text-muted text-sm py-12 text-center">{artistLoading ? "Loading..." : "No artist profile found."}</p>
      </>
    );
  }

  // artist is guaranteed non-null past the guard above
  const currentArtist = artist!;
  const allSelected = selected.size === currentArtist.works.length;

  function getQty(index: number) {
    return quantities[index] ?? 1;
  }

  function setQty(index: number, qty: number) {
    setQuantities((prev) => ({ ...prev, [index]: Math.max(1, Math.min(50, qty)) }));
  }

  async function handleLabelThemeChange(id: LabelThemeId) {
    setLabelThemeId(id);
    try {
      await mutate("/api/artist-profile", {
        method: "PUT",
        body: JSON.stringify({ label_theme: id }),
      });
    } catch (err) {
      showToast(
        apiErrorMessage(err, "Couldn't save this as your default label colour. It's still applied to this print run."),
        { variant: "warn" },
      );
    }
  }

  function toggleWork(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(currentArtist.works.map((_, i) => i)));
  }

  function buildLabels(indices: number[]): LabelData[] {
    const labels: LabelData[] = [];

    // Portfolio labels first
    if (portfolioQty > 0) {
      labels.push({
        artistName: currentArtist.name,
        artistSlug: currentArtist.slug,
        venueName: selectedVenue?.name,
        venueSlug: selectedVenue?.slug ?? undefined,
        quantity: portfolioQty,
        isPortfolioLabel: true,
        labelSize,
        labelStyle,
        tagline: (labelSize === "large" || labelSize === "xlarge") && labelStyle !== "qr_only" ? tagline || undefined : undefined,
      });
    }

    indices.forEach((i) => {
      const work = currentArtist.works[i];
      // Never an image's pixel size (owner report 13 September 2026); the venue
      // labels page filters them the same way.
      const chosenSize =
        displayPhysicalDimensions(selectedSizes[i]) ?? displayPhysicalDimensions(work.dimensions) ?? undefined;
      const sizeOptions = [
        ...new Set(work.pricing.map((p) => displayPhysicalDimensions(p.label)).filter((v): v is string => !!v)),
      ];
      labels.push({
        artistName: currentArtist.name,
        artistSlug: currentArtist.slug,
        workId: work.id,
        venueName: selectedVenue?.name,
        venueSlug: selectedVenue?.slug ?? undefined,
        workTitle: work.title,
        workMedium: work.medium,
        workDimensions: chosenSize,
        sizeOptions,
        workPrice: work.priceBand,
        quantity: getQty(i),
        _sourceMedium: work.medium,
        _sourcePrice: work.priceBand,
        _sourceDimensions: chosenSize,
        labelSize,
        labelStyle,
        tagline: (labelSize === "large" || labelSize === "xlarge") && labelStyle !== "qr_only" ? tagline || undefined : undefined,
      });
    });
    return labels;
  }

  function buildVisibility(labels: LabelData[]): { medium: boolean; dimensions: boolean; price: boolean }[] {
    return labels.map((l) => ({
      medium: l.isPortfolioLabel ? false : options.showMedium,
      dimensions: l.isPortfolioLabel ? false : options.showDimensions,
      price: l.isPortfolioLabel ? false : options.showPrice,
    }));
  }

  function openPreview(indices: number[]) {
    setPreviewLabels(buildLabels(indices));
    setShowPreview(true);
  }

  return (
    <>
      <div className="max-w-5xl pb-24">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-serif text-foreground">QR Labels</h1>
          <p className="text-sm text-muted mt-1">
            Generate printable labels with QR codes. Visitors scan to view your profile and enquire.
          </p>
        </div>

        {/* Label style has the full width so its three options have room; the
            other settings share the row beneath. Owner report 13 September 2026:
            squeezed beside fixed-width panels, the style cards were a few words wide. */}
        <div className="bg-surface border border-border rounded-sm p-4 mb-4">
          <h3 className="text-xs font-medium tracking-wider uppercase text-muted mb-3">Label Style</h3>
          <LabelStylePicker value={labelStyle} onChange={applyStyle} />

          <div className="mt-4">
            <p className="text-xs text-muted mb-1.5">Label size</p>
            <LabelSizePicker value={labelSize} style={labelStyle} onChange={setLabelSize} />
          </div>

          {(labelSize === "large" || labelSize === "xlarge") && labelStyle !== "qr_only" && (
            <div className="mt-4">
              <p className="text-xs text-muted mb-1.5">Tagline (shown on label)</p>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Scan to view & purchase this artwork"
                maxLength={80}
                className="w-full px-3 py-2 bg-background border border-border rounded-sm text-sm text-foreground focus:outline-none focus:border-accent/60"
              />
            </div>
          )}

          {/* Only Editorial prints these rows, so only Editorial offers them. */}
          {labelStyle === "editorial" && (
            <div className="mt-4">
              <p className="text-[11px] text-muted leading-relaxed mb-2">
                Hide a row from the printed label without removing the
                underlying data. Toggles only affect what shows up on
                the printed card. The QR code itself always points to
                the work.
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {([
                  { key: "showMedium" as const, label: "Medium" },
                  { key: "showDimensions" as const, label: "Dimensions" },
                  { key: "showPrice" as const, label: "Price" },
                ]).map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={options[key]}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setOptions((prev) => ({ ...prev, [key]: checked }));
                      }}
                      className="w-4 h-4 accent-accent"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          {/* Venue selector */}
          <div className="bg-surface border border-border rounded-sm p-4">
            <h3 className="text-xs font-medium tracking-wider uppercase text-muted mb-2">Venue</h3>
            <p className="text-xs text-muted mb-3">Tag scans to a specific venue</p>
            <div className="relative">
              <button
                onClick={() => setVenueDropdownOpen(!venueDropdownOpen)}
                className="w-full flex items-center justify-between text-sm border border-border rounded-sm px-3 py-2 bg-background hover:bg-background/80 transition-colors text-left"
              >
                <span className={selectedVenue ? "text-foreground" : "text-muted"}>
                  {selectedVenue?.name || "No venue"}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-muted shrink-0">
                  <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {venueDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-surface border border-border rounded-sm shadow-sm z-20 max-h-48 overflow-y-auto">
                  <button
                    onClick={() => { setSelectedVenue(null); setVenueDropdownOpen(false); }}
                    className={`w-full text-left text-sm px-3 py-2 hover:bg-background transition-colors ${
                      !selectedVenue ? "text-accent font-medium" : "text-foreground"
                    }`}
                  >
                    No venue
                  </button>
                  {venues.map((v) => (
                    <button
                      key={v.slug || v.name}
                      onClick={() => { setSelectedVenue(v); setVenueDropdownOpen(false); }}
                      className={`w-full text-left text-sm px-3 py-2 hover:bg-background transition-colors ${
                        (v.slug || v.name) === (selectedVenue?.slug || selectedVenue?.name) ? "text-accent font-medium" : "text-foreground"
                      }`}
                    >
                      {v.name}
                    </button>
                  ))}
                  {venues.length === 0 && (
                    <p className="text-xs text-muted px-3 py-2">No placements yet</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Label colour (owner decision 2026-09-02): free for every plan,
              chosen per print run and remembered as this artist's default. */}
          <div className="bg-surface border border-border rounded-sm p-4">
            <h3 className="text-xs font-medium tracking-wider uppercase text-muted mb-2">Label colour</h3>
            <p className="text-xs text-muted mb-3">How the printed labels are styled</p>
            <LabelThemePicker value={labelThemeId} onChange={handleLabelThemeChange} label="" />
          </div>

          {/* Portfolio QR */}
          <div className="bg-surface border border-border rounded-sm p-4">
            <h3 className="text-xs font-medium tracking-wider uppercase text-muted mb-2">Portfolio Label</h3>
            <p className="text-xs text-muted mb-3">QR linking to your full portfolio</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPortfolioQty((q) => Math.max(0, q - 1))}
                className="w-7 h-7 rounded-sm border border-border flex items-center justify-center text-muted hover:text-foreground hover:border-foreground/30 transition-colors text-sm"
              >
                −
              </button>
              <span className="w-8 text-center text-sm font-medium tabular-nums">{portfolioQty}</span>
              <button
                onClick={() => setPortfolioQty((q) => Math.min(50, q + 1))}
                className="w-7 h-7 rounded-sm border border-border flex items-center justify-center text-muted hover:text-foreground hover:border-foreground/30 transition-colors text-sm"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Select all bar */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-foreground">Individual Works</h2>
          <button
            onClick={toggleAll}
            className="text-sm text-accent hover:text-accent/80 transition-colors"
          >
            {allSelected ? "Deselect All" : "Select All"}
          </button>
        </div>

        {/* Works grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {currentArtist.works.map((work, index) => {
            const isSelected = selected.has(index);
            const qty = getQty(index);
            return (
              <div
                key={index}
                className={`group relative bg-surface border rounded-sm overflow-hidden transition-all ${
                  isSelected
                    ? "ring-2 ring-accent border-accent/30 shadow-sm"
                    : "border-border hover:border-border/80"
                }`}
              >
                {/* Checkbox */}
                <div
                  className="absolute top-2 right-2 z-10 cursor-pointer"
                  onClick={() => toggleWork(index)}
                >
                  <div
                    className={`w-5 h-5 rounded-sm border flex items-center justify-center transition-colors ${
                      isSelected ? "bg-accent border-accent" : "bg-white/80 border-border backdrop-blur-sm"
                    }`}
                  >
                    {isSelected && (
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 7 5.5 10.5 12 3.5" /></svg>
                    )}
                  </div>
                </div>

                {/* Thumbnail */}
                <div className="aspect-[4/3] relative bg-border/20 cursor-pointer" onClick={() => toggleWork(index)}>
                  <Image
                    src={work.image}
                    alt={work.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                </div>

                {/* Info */}
                <div className="p-3">
                  <h3 className="text-sm font-medium text-foreground leading-snug line-clamp-1">{work.title}</h3>
                  <p className="text-xs text-muted mt-0.5">{work.medium}</p>

                  {/* Quantity + actions row */}
                  <div className="flex items-center justify-between mt-2">
                    {isSelected ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted mr-0.5">Qty</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setQty(index, qty - 1); }}
                          className="w-5 h-5 rounded-sm border border-border flex items-center justify-center text-muted hover:text-foreground transition-colors text-[10px]"
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-xs font-medium tabular-nums">{qty}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setQty(index, qty + 1); }}
                          className="w-5 h-5 rounded-sm border border-border flex items-center justify-center text-muted hover:text-foreground transition-colors text-[10px]"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                          work.available ? "bg-accent/10 text-accent" : "bg-border/50 text-muted"
                        }`}
                      >
                        {work.available ? "Available" : "Sold"}
                      </span>
                    )}
                    {isSelected && work.pricing && work.pricing.length > 0 && (
                      <select
                        value={selectedSizes[index] || ""}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => { e.stopPropagation(); setSelectedSizes((prev) => ({ ...prev, [index]: e.target.value })); }}
                        className="text-[10px] px-1 py-0.5 bg-background border border-border rounded-sm text-foreground focus:outline-none"
                      >
                        <option value="">Size</option>
                        {work.pricing.map((p) => (
                          <option key={p.label} value={p.label}>{p.label}</option>
                        ))}
                      </select>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewLabels(buildLabels([index]));
                        setShowPreview(true);
                      }}
                      className="text-[10px] text-muted hover:text-foreground transition-colors"
                    >
                      Print →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky bottom bar */}
      {(selected.size > 0 || portfolioQty > 0) && (
        <div className="fixed bottom-0 left-0 lg:left-56 right-0 bg-surface border-t border-border px-6 py-3.5 flex items-center justify-between z-40 no-print">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">
              {totalLabels} label{totalLabels !== 1 ? "s" : ""} total
            </span>
            <span className="text-xs text-muted">
              ({selected.size} work{selected.size !== 1 ? "s" : ""}{portfolioQty > 0 ? ` + ${portfolioQty} portfolio` : ""})
            </span>
            <button
              onClick={() => { setSelected(new Set()); setPortfolioQty(0); }}
              className="text-xs text-muted hover:text-foreground transition-colors"
            >
              Clear
            </button>
          </div>
          <button
            onClick={() => openPreview(Array.from(selected).sort((a, b) => a - b))}
            className="px-5 py-2 text-sm font-medium text-white bg-foreground rounded-sm hover:bg-foreground/90 transition-colors"
          >
            Preview & Print
          </button>
        </div>
      )}

      {/* Print preview overlay */}
      {showPreview && (
        <LabelPreview
          labels={previewLabels}
          initialVisibility={buildVisibility(previewLabels)}
          labelTheme={labelThemeId}
          onLabelThemeChange={handleLabelThemeChange}
          onLabelStyleChange={setLabelStyle}
          onLabelSizeChange={setLabelSize}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
}
