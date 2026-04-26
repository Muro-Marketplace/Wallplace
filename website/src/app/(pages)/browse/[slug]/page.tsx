import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { artists } from "@/data/artists";
import { getDisciplineById, resolveDiscipline, formatSubStyleLabel, disciplineLabel } from "@/data/categories";
import { getCollectionsByArtist } from "@/data/collections";
import Button from "@/components/Button";
import CollectionCard from "@/components/CollectionCard";
import MessageArtistButton from "@/components/MessageArtistButton";
import { PlacementButton, PlacementCTASection } from "@/components/PlacementCTA";
import ArtistProfileClient from "./ArtistProfileClient";
import { getArtistBySlug } from "@/lib/db/merged-data";
import { trackEvent, extractTrackingContext, generateVisitorId } from "@/lib/analytics";
import type { Metadata } from "next";

// Static params for seed artists — database artists use dynamic fallback
export async function generateStaticParams() {
  return artists.map((artist) => ({
    slug: artist.slug,
  }));
}

// Allow dynamic params for database artists not in static list
export const dynamicParams = true;
// Always read fresh from DB so new works/descriptions appear immediately
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);

  if (!artist) {
    return { title: "Artist Not Found – Wallplace" };
  }

  return {
    title: `${artist.name} – Wallplace`,
    description: artist.shortBio,
    openGraph: {
      title: `${artist.name} – Wallplace`,
      description: artist.shortBio,
      images: artist.image ? [{ url: artist.image, width: 400, height: 400 }] : [],
      type: "profile",
    },
    twitter: {
      card: "summary",
      title: `${artist.name} – Wallplace`,
      description: artist.shortBio,
    },
  };
}

/**
 * Pill used for the "Terms" group — accent-tinted with a tick.
 * Communicates "this is a commitment / an opt-in" in green-light style.
 */
function TermPill({ label, yes }: { label: string; yes: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-full ${
      yes ? "bg-accent/10 text-accent border border-accent/20" : "bg-surface text-muted border border-border"
    }`}>
      {yes && <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 7 5.5 10.5 12 3.5" /></svg>}
      {label}
    </span>
  );
}

/**
 * Pill used for the "Sells" group — quieter neutral chip, no tick.
 * Matches the format chips on the marketplace BrowseArtistCard so the
 * card → profile transition feels consistent. Reads as a tag, not a
 * checked-off commitment.
 */
function SellsPill({ label }: { label: string }) {
  return (
    <span className="inline-block text-[11px] text-muted/90 px-2 py-0.5 border border-border/70 rounded-sm bg-surface">
      {label}
    </span>
  );
}

export default async function ArtistProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);

  if (!artist) {
    notFound();
  }

  // Track profile view (fire-and-forget, non-blocking)
  const headersList = await headers();
  const ctx = extractTrackingContext(headersList);
  trackEvent({
    event_type: "profile_view",
    artist_slug: slug,
    visitor_id: generateVisitorId(ctx.ip, ctx.userAgent),
    referrer: ctx.referrer || undefined,
    source: ctx.referrer?.includes("qr") ? "qr" : "browse",
  }).catch(() => {});

  // Variant A — no banner, so we don't need a bannerSrc fallback. The
  // saved banner_image stays in the DB for future variants and for
  // social-card fallback in generateMetadata.
  //
  // Split offerings (what they sell) from terms (how they let venues
  // host) — the marketplace cards already do this, and merging them
  // into one row makes both feel like an undifferentiated bag of pills.
  const offerings = [
    { label: "Originals", yes: artist.offersOriginals },
    { label: "Prints", yes: artist.offersPrints },
    { label: "Framed", yes: artist.offersFramed },
  ].filter((o) => o.yes);
  const terms = [
    {
      label: artist.revenueSharePercent
        ? `Revenue share · ${artist.revenueSharePercent}%`
        : "Revenue share",
      yes: artist.openToRevenueShare,
    },
    { label: "Paid loan", yes: artist.openToFreeLoan },
    { label: "Direct purchase", yes: artist.openToOutrightPurchase },
  ].filter((t) => t.yes);

  const hasStats =
    (artist.totalPlacements ?? 0) > 0 ||
    (artist.totalSales ?? 0) > 0 ||
    (artist.totalViews ?? 0) > 0;

  return (
    <div className="bg-background">
      {/* Variant A — no banner. Square profile photo on the left,
          identity + bio + facts in a generous right column. The
          gallery-website feel: the artist's first work shows up on
          scroll instead of fighting a hero image. */}
      <section className="pt-8 lg:pt-12 pb-2">
        <div className="max-w-[1200px] mx-auto px-6">
          <Link
            href="/browse"
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground mb-8"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11L5 7l4-4" />
            </svg>
            Back to Marketplace
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-10 lg:gap-14 items-start">
            {/* LEFT — square photo + Instagram + facts + Sells/Terms.
                All the meta-data lives here so the right column stays
                short and the Portfolio header pushes up. */}
            <div className="space-y-5">
              <div className="relative aspect-square w-full max-w-[280px] rounded-sm overflow-hidden bg-stone-100 border border-border">
                <Image
                  src={artist.image || `https://picsum.photos/seed/${artist.slug}/600/600`}
                  alt={artist.name}
                  fill
                  className="object-cover"
                  sizes="280px"
                  priority
                />
                {artist.isFoundingArtist && (
                  <span
                    className="absolute top-3 left-3 px-2 py-0.5 bg-white/90 backdrop-blur-sm text-[10px] font-medium text-foreground rounded-sm cursor-help"
                    title="One of the founding artists on Wallplace"
                  >
                    Founding Artist
                  </span>
                )}
              </div>
              {artist.instagram && (
                <a
                  href={`https://instagram.com/${artist.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="5" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
                  {artist.instagram}
                </a>
              )}

              {/* Facts — Location / Delivery / Suited for. Stacked
                  vertically because the column is narrow (280px). */}
              <div className="grid grid-cols-1 gap-y-3 pt-5 border-t border-border max-w-[280px]">
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">Location</p>
                  <p className="text-sm font-medium text-foreground">{artist.location || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">Delivery</p>
                  <p className="text-sm font-medium text-foreground">{artist.deliveryRadius || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">Suited for</p>
                  <p className="text-sm font-medium text-foreground">
                    {artist.venueTypesSuitedFor.length > 0
                      ? artist.venueTypesSuitedFor.slice(0, 3).join(", ")
                      : "Any venue"}
                  </p>
                </div>
              </div>

              {hasStats && (
                <div className="flex items-center gap-5 pt-4 border-t border-border max-w-[280px]">
                  {(artist.totalPlacements ?? 0) > 0 && (
                    <div>
                      <p className="text-lg font-serif font-semibold text-foreground leading-none">{artist.totalPlacements}</p>
                      <p className="text-[10px] text-muted uppercase tracking-wider mt-1">Venue{artist.totalPlacements !== 1 ? "s" : ""}</p>
                    </div>
                  )}
                  {(artist.totalSales ?? 0) > 0 && (
                    <div>
                      <p className="text-lg font-serif font-semibold text-foreground leading-none">{artist.totalSales}</p>
                      <p className="text-[10px] text-muted uppercase tracking-wider mt-1">Sold</p>
                    </div>
                  )}
                  {(artist.totalViews ?? 0) > 0 && (
                    <div>
                      <p className="text-lg font-serif font-semibold text-foreground leading-none">{artist.totalViews}</p>
                      <p className="text-[10px] text-muted uppercase tracking-wider mt-1">Views</p>
                    </div>
                  )}
                </div>
              )}

              {/* Sells + Terms — pushed into the side column so the
                  right side stays focused on the artist's voice. Sells
                  uses the marketplace card's neutral chip (no tick);
                  Terms keeps the accent-tinted tick pill — Terms are
                  commitments, Sells are inventory categories. */}
              {offerings.length > 0 && (
                <div className="pt-4 border-t border-border max-w-[280px]">
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-2">Sells</p>
                  <div className="flex flex-wrap gap-1.5">
                    {offerings.map((o) => (
                      <SellsPill key={o.label} label={o.label} />
                    ))}
                  </div>
                </div>
              )}
              {terms.length > 0 && (
                <div className="pt-4 border-t border-border max-w-[280px]">
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-2">Terms</p>
                  <div className="flex flex-wrap gap-1.5">
                    {terms.map((t) => (
                      <TermPill key={t.label} label={t.label} yes={t.yes} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT — identity + bio + tags + CTAs. Nothing else. The
                shorter the right column gets, the higher the Portfolio
                header sits below the hero. */}
            <div className="min-w-0">
              <p className="text-[11px] text-muted uppercase tracking-[0.18em] mb-3">
                {disciplineLabel(artist.primaryMedium, artist.discipline)}
              </p>
              <h1 className="font-serif text-4xl lg:text-5xl text-foreground leading-tight tracking-tight mb-2">
                {artist.name}
              </h1>
              <p className="text-muted text-sm mb-6">{artist.location}</p>

              {(artist.subStyles && artist.subStyles.length > 0) && (
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {artist.subStyles.slice(0, 6).map((s) => (
                    <span
                      key={s}
                      className="inline-block px-2.5 py-1 text-[11px] font-medium text-foreground/70 bg-surface border border-border rounded-full"
                    >
                      {formatSubStyleLabel(s)}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-foreground/85 leading-relaxed text-[15px] max-w-2xl mb-6">
                {artist.shortBio}
              </p>

              {artist.styleTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {artist.styleTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block px-2.5 py-1 text-[11px] font-medium text-foreground/65 bg-surface border border-border rounded-sm"
                    >
                      {formatSubStyleLabel(tag)}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <MessageArtistButton artistSlug={artist.slug} artistName={artist.name} variant="accent" size="md" />
                <PlacementButton artistSlug={artist.slug} artistName={artist.name} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio + Extended Bio (client) */}
      <ArtistProfileClient
        artistName={artist.name}
        artistSlug={artist.slug}
        extendedBio={artist.extendedBio}
        themes={artist.themes}
        works={artist.works}
      />

      {/* Collections */}
      {(() => {
        const artistCollections = getCollectionsByArtist(artist.slug);
        if (artistCollections.length === 0) return null;
        return (
          <section className="py-10 lg:py-14 border-t border-border">
            <div className="max-w-[1200px] mx-auto px-6">
              <h2 className="text-2xl mb-6">Collections</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {artistCollections.map((col) => (
                  <CollectionCard key={col.id} collection={col} />
                ))}
              </div>
            </div>
          </section>
        );
      })()}

      {/* CTA Block — hidden for artists viewing other artists */}
      <PlacementCTASection>
        <section className="py-20 lg:py-24 border-t border-border">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl lg:text-4xl mb-4">
                Interested in {artist.name}&rsquo;s work?
              </h2>
              <p className="text-muted leading-relaxed mb-8 text-lg">
                Get in touch to discuss pricing, availability, and how this artist&rsquo;s work could transform your venue.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <PlacementButton artistSlug={artist.slug} artistName={artist.name} variant="primary" size="lg" />
                <MessageArtistButton artistSlug={artist.slug} artistName={artist.name} variant="accent" size="lg" />
                <Button href="/browse" variant="secondary" size="lg">Browse More Artists</Button>
              </div>
            </div>
          </div>
        </section>
      </PlacementCTASection>
    </div>
  );
}
