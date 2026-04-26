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

function BoolCard({ label, yes }: { label: string; yes: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-full ${
      yes ? "bg-accent/10 text-accent border border-accent/20" : "bg-surface text-muted border border-border"
    }`}>
      {yes && <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 7 5.5 10.5 12 3.5" /></svg>}
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

  // Banner falls back through saved → first work → profile pic so a
  // legacy account without a banner still gets something landscape-y at
  // the top, but a banner the artist sets in /artist-portal/profile
  // always wins.
  const bannerSrc =
    artist.bannerImage || artist.works[0]?.image || artist.image;

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
      {/* Banner — true 3:1 aspect ratio so the hero feels editorial
          rather than the squashed 16:5 strip we had before. Slight
          gradient at the bottom keeps the back-link readable on light
          banners but doesn't muddy the image. */}
      <section className="relative -mt-14 lg:-mt-16 overflow-hidden">
        <div className="relative w-full" style={{ aspectRatio: "3 / 1" }}>
          <Image
            src={bannerSrc}
            alt={`${artist.name} banner`}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/30" />
        </div>
        <div className="absolute top-20 lg:top-24 left-0 right-0 z-10">
          <div className="max-w-[1200px] mx-auto px-6">
            <Link
              href="/browse"
              className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors duration-200 drop-shadow"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11L5 7l4-4" />
              </svg>
              Back to Marketplace
            </Link>
          </div>
        </div>
      </section>

      {/* Profile header */}
      <section className="relative -mt-20 lg:-mt-24 pb-2">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 lg:gap-12 items-start">
            {/* LEFT — identity + bio + tags + CTAs */}
            <div className="min-w-0">
              <div className="relative w-28 h-28 lg:w-36 lg:h-36 rounded-full overflow-hidden shrink-0 bg-border/30 border-4 border-background shadow-xl mb-5">
                <Image
                  src={artist.image || `https://picsum.photos/seed/${artist.slug}/400/400`}
                  alt={artist.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 112px, 144px"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h1 className="font-serif text-3xl lg:text-4xl leading-none tracking-tight">
                  {artist.name}
                </h1>
                {artist.isFoundingArtist && (
                  <span
                    className="inline-block px-2 py-0.5 bg-accent/10 text-accent text-[10px] font-medium rounded-full border border-accent/20 cursor-help"
                    title="One of the founding artists on Wallplace"
                  >
                    Founding Artist
                  </span>
                )}
              </div>

              {/* Discipline + location reads as the editorial subtitle.
                  Sub-styles + Instagram move into a single inline meta
                  row below — no more loose pills floating around. */}
              <p className="text-muted text-sm font-medium tracking-wide uppercase">
                {disciplineLabel(artist.primaryMedium, artist.discipline)}
                <span className="mx-1.5 text-border">·</span>
                {artist.location}
              </p>

              {(artist.subStyles && artist.subStyles.length > 0) && (
                <div className="flex flex-wrap gap-1.5 mt-3">
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

              <p className="text-foreground/85 leading-relaxed max-w-2xl text-[15px] mt-5 mb-5">
                {artist.shortBio}
              </p>

              {/* Tags + Instagram on one tidy row. Tags formatted into
                  Title Case so "colour-&-atmosphere" reads as
                  "Colour & Atmosphere" rather than a raw slug. */}
              {(artist.styleTags.length > 0 || artist.instagram) && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 mb-5">
                  {artist.styleTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block px-2.5 py-1 text-[11px] font-medium text-foreground/65 bg-surface border border-border rounded-sm"
                    >
                      {formatSubStyleLabel(tag)}
                    </span>
                  ))}
                  {artist.instagram && (
                    <a
                      href={`https://instagram.com/${artist.instagram.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors ml-1"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="5" />
                        <circle cx="12" cy="12" r="5" />
                        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                      </svg>
                      {artist.instagram}
                    </a>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <MessageArtistButton artistSlug={artist.slug} artistName={artist.name} variant="accent" size="md" />
                <PlacementButton artistSlug={artist.slug} artistName={artist.name} />
              </div>
            </div>

            {/* RIGHT — facts + offerings + terms card. Sized to fit
                neatly under the banner and align with the bottom of
                the bio on desktop. */}
            <aside className="lg:mt-32 w-full lg:w-[360px] bg-white border border-border rounded-lg p-5 shadow-sm">
              <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">Location</p>
                  <p className="text-sm font-medium text-foreground">{artist.location || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">Delivery</p>
                  <p className="text-sm font-medium text-foreground">{artist.deliveryRadius || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-0.5">Suited for</p>
                  <p className="text-sm font-medium text-foreground">
                    {artist.venueTypesSuitedFor.length > 0
                      ? artist.venueTypesSuitedFor.slice(0, 4).join(", ")
                      : "Any venue type"}
                  </p>
                </div>
              </div>

              {hasStats && (
                <div className="flex items-center gap-5 mt-4 pt-4 border-t border-border">
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

              {offerings.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-2">Sells</p>
                  <div className="flex flex-wrap gap-1.5">
                    {offerings.map((o) => (
                      <BoolCard key={o.label} label={o.label} yes={o.yes} />
                    ))}
                  </div>
                </div>
              )}

              {terms.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-[10px] text-muted uppercase tracking-wider mb-2">Terms</p>
                  <div className="flex flex-wrap gap-1.5">
                    {terms.map((t) => (
                      <BoolCard key={t.label} label={t.label} yes={t.yes} />
                    ))}
                  </div>
                </div>
              )}
            </aside>
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
