import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { artists } from "@/data/artists";
import Button from "@/components/Button";
import ArtistProfileClient from "./ArtistProfileClient";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return artists.map((artist) => ({
    slug: artist.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const artist = artists.find((a) => a.slug === slug);

  if (!artist) {
    return { title: "Artist Not Found — Wallspace" };
  }

  return {
    title: `${artist.name} — Wallspace`,
    description: artist.shortBio,
  };
}

function CheckIcon({ yes }: { yes: boolean }) {
  if (yes) {
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-accent shrink-0"
      >
        <polyline points="2 7 5.5 10.5 12 3.5" />
      </svg>
    );
  }
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-muted/40 shrink-0"
    >
      <path d="M3 3l8 8M11 3L3 11" />
    </svg>
  );
}

function InfoCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-sm border ${
        highlight
          ? "border-accent/20 bg-accent/5"
          : "border-border bg-surface"
      }`}
    >
      <span className="mt-0.5 text-muted">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted uppercase tracking-wide leading-none mb-1">
          {label}
        </p>
        <p className="text-sm text-foreground font-medium leading-snug">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

function BoolCard({ label, yes }: { label: string; yes: boolean }) {
  return (
    <div
      className={`flex items-center gap-2.5 p-3.5 rounded-sm border ${
        yes ? "border-accent/20 bg-accent/5" : "border-border bg-surface"
      }`}
    >
      <CheckIcon yes={yes} />
      <span
        className={`text-sm leading-none ${yes ? "text-foreground" : "text-muted"}`}
      >
        {label}
      </span>
    </div>
  );
}

export default async function ArtistProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artist = artists.find((a) => a.slug === slug);

  if (!artist) {
    notFound();
  }

  return (
    <div className="bg-background">
      {/* Back link */}
      <div className="border-b border-border">
        <div className="max-w-[1200px] mx-auto px-6 py-3">
          <Link
            href="/browse"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors duration-200"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 11L5 7l4-4" />
            </svg>
            Browse Portfolios
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section className="py-14 lg:py-20">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex flex-col md:flex-row gap-8 lg:gap-14 items-start">
            {/* Profile image */}
            <div className="relative w-36 h-36 lg:w-48 lg:h-48 rounded-full overflow-hidden shrink-0 bg-border/30">
              <Image
                src={
                  artist.image ||
                  `https://picsum.photos/seed/${artist.slug}/400/400`
                }
                alt={artist.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 144px, 192px"
                priority
              />
            </div>

            {/* Identity */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-4xl lg:text-5xl leading-none">
                  {artist.name}
                </h1>
                {artist.isFoundingArtist && (
                  <span className="inline-block px-3 py-1 bg-accent/10 text-accent text-xs font-medium rounded-sm border border-accent/20">
                    Founding Artist
                  </span>
                )}
              </div>

              <p className="text-muted text-lg mb-5">
                {artist.primaryMedium} &middot; {artist.location}
              </p>

              <p className="text-foreground/80 leading-relaxed max-w-xl mb-6">
                {artist.shortBio}
              </p>

              {/* Style tags */}
              <div className="flex flex-wrap gap-2 mb-7">
                {artist.styleTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-block px-3 py-1 text-xs text-muted bg-surface border border-border rounded-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Social links */}
              <div className="flex items-center gap-5">
                <a
                  href={`https://instagram.com/${artist.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors duration-200"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <circle cx="12" cy="12" r="5" />
                    <circle
                      cx="17.5"
                      cy="6.5"
                      r="1"
                      fill="currentColor"
                      stroke="none"
                    />
                  </svg>
                  {artist.instagram}
                </a>
                {artist.website && (
                  <a
                    href={artist.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors duration-200"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M2 12h20" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Commercial Summary Strip */}
      <section className="py-10 lg:py-14 border-t border-border bg-surface/50">
        <div className="max-w-[1200px] mx-auto px-6">
          <h2 className="text-xl mb-8 text-foreground/80">
            Commercial Overview
          </h2>

          {/* Row 1: Key info cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
            <InfoCard
              icon={
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
              }
              label="Location"
              value={`${artist.location} · ${artist.deliveryRadius}`}
            />
            <InfoCard
              icon={
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18" />
                  <path d="M9 21V9" />
                </svg>
              }
              label="Available Sizes"
              value={artist.availableSizes.join(", ")}
            />
            <InfoCard
              icon={
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
              }
              label="Themes"
              value={artist.themes.slice(0, 3).join(", ")}
            />
            <InfoCard
              icon={
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              }
              label="Suited For"
              value={artist.venueTypesSuitedFor.join(", ")}
            />
          </div>

          {/* Row 2: Bool cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            <BoolCard label="Originals" yes={artist.offersOriginals} />
            <BoolCard label="Prints" yes={artist.offersPrints} />
            <BoolCard label="Framed works" yes={artist.offersFramed} />
            <BoolCard label="Free loan" yes={artist.openToFreeLoan} />
            <BoolCard label="Revenue share" yes={artist.openToRevenueShare} />
            <BoolCard
              label="Outright purchase"
              yes={artist.openToOutrightPurchase}
            />
            <BoolCard label="Provides frames" yes={artist.canProvideFrames} />
            <BoolCard
              label="Arranges framing"
              yes={artist.canArrangeFraming}
            />
          </div>
        </div>
      </section>

      {/* Portfolio + Extended Bio (client) */}
      <ArtistProfileClient
        extendedBio={artist.extendedBio}
        themes={artist.themes}
        works={artist.works}
      />

      {/* CTA Block */}
      <section className="py-20 lg:py-24 border-t border-border">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl lg:text-4xl mb-4">
              Interested in {artist.name}&rsquo;s work?
            </h2>
            <p className="text-muted leading-relaxed mb-8 text-lg">
              Get in touch to discuss pricing, availability, and how this
              artist&rsquo;s work could transform your venue.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button href="/contact" variant="primary" size="lg">
                Enquire About This Artist
              </Button>
              <Button href="/apply" variant="ghost" size="lg">
                Are you an artist? Apply to join
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
