import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { venues as staticVenues } from "@/data/venues";

interface VenueShape {
  slug: string;
  name: string;
  type: string | null;
  location?: string | null;
  city?: string | null;
  postcode?: string | null;
  wall_space?: string | null;
  description?: string | null;
  image?: string | null;
  images?: string[] | null;
  approximate_footfall?: string | null;
  audience_type?: string | null;
  interested_in_free_loan?: boolean | null;
  interested_in_revenue_share?: boolean | null;
  interested_in_direct_purchase?: boolean | null;
  preferred_styles?: string[] | null;
  preferred_themes?: string[] | null;
  display_wall_space?: string | null;
  display_lighting?: string | null;
  display_install_notes?: string | null;
  display_rotation_frequency?: string | null;
}

async function loadVenue(slug: string): Promise<VenueShape | null> {
  try {
    const db = getSupabaseAdmin();
    let { data } = await db
      .from("venue_profiles")
      .select(
        "slug, name, type, location, city, postcode, wall_space, description, image, images, approximate_footfall, audience_type, interested_in_free_loan, interested_in_revenue_share, interested_in_direct_purchase, preferred_styles, preferred_themes, display_wall_space, display_lighting, display_install_notes, display_rotation_frequency",
      )
      .eq("slug", slug)
      .maybeSingle();
    if (!data) {
      const fallback = await db
        .from("venue_profiles")
        .select(
          "slug, name, type, location, city, postcode, wall_space, description, image, approximate_footfall, audience_type, interested_in_free_loan, interested_in_revenue_share, interested_in_direct_purchase, preferred_styles, preferred_themes",
        )
        .eq("slug", slug)
        .maybeSingle();
      data = (fallback.data as typeof data) || null;
    }
    if (data) return data as unknown as VenueShape;
  } catch {
    // Fall through to seed data
  }
  const seed = staticVenues.find((v) => v.slug === slug);
  if (!seed) return null;
  return {
    slug: seed.slug,
    name: seed.name,
    type: seed.type,
    location: seed.location,
    city: seed.location,
    postcode: null,
    wall_space: seed.wallSpace,
    description: seed.description,
    image: seed.image,
    images: Array.isArray(seed.images) ? seed.images : [],
    approximate_footfall: seed.approximateFootfall,
    audience_type: seed.audienceType,
    interested_in_free_loan: seed.interestedInFreeLoan,
    interested_in_revenue_share: seed.interestedInRevenueShare,
    interested_in_direct_purchase: seed.interestedInDirectPurchase,
    preferred_styles: seed.preferredStyles,
    preferred_themes: seed.preferredThemes,
    display_wall_space: seed.displayWallSpace || null,
    display_lighting: seed.displayLighting || null,
    display_install_notes: seed.displayInstallNotes || null,
    display_rotation_frequency: seed.displayRotationFrequency || null,
  };
}

export default async function VenueDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const venue = await loadVenue(slug);
  if (!venue) notFound();

  const gallery = (venue.images || []).filter(Boolean);
  const hero = gallery[0] || venue.image || null;
  const arrangements = [
    venue.interested_in_free_loan && "Paid loan",
    venue.interested_in_revenue_share && "Revenue share",
    venue.interested_in_direct_purchase && "Direct purchase",
  ].filter(Boolean) as string[];

  return (
    <div className="bg-background min-h-screen">
      {/* Hero */}
      <div className="relative h-[280px] sm:h-[360px] bg-border/20">
        {hero && (
          // quality=92: hero is the first thing visitors judge a venue
          // on. Default Next.js quality (75) shows visible JPEG
          // artefacting on detail-heavy interior shots.
          <Image
            src={hero}
            alt={venue.name}
            fill
            className="object-cover"
            sizes="100vw"
            quality={92}
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/70" />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10 text-white">
          <div className="max-w-[1100px] mx-auto">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] opacity-80">
              {[venue.type, venue.city || venue.location].filter(Boolean).join(" · ")}
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl mt-1">{venue.name}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-10">
        {/* Main */}
        <div className="space-y-10">
          {venue.description && (
            <section>
              <h2 className="font-serif text-lg text-foreground mb-3">About the space</h2>
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{venue.description}</p>
            </section>
          )}

          {gallery.length > 1 && (
            <section>
              <h2 className="font-serif text-lg text-foreground mb-3">Gallery</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {gallery.slice(1).map((url, i) => (
                  <div key={i} className="relative aspect-[4/3] rounded-sm overflow-hidden border border-border bg-background">
                    <Image
                      src={url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 33vw"
                      quality={88}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {(venue.display_wall_space || venue.display_lighting || venue.display_install_notes || venue.display_rotation_frequency) && (
            <section>
              <h2 className="font-serif text-lg text-foreground mb-3">Display needs</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {venue.display_wall_space && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-muted">Wall space</dt>
                    <dd className="text-foreground">{venue.display_wall_space}</dd>
                  </div>
                )}
                {venue.display_lighting && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-muted">Lighting</dt>
                    <dd className="text-foreground">{venue.display_lighting}</dd>
                  </div>
                )}
                {venue.display_install_notes && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-muted">Installation notes</dt>
                    <dd className="text-foreground">{venue.display_install_notes}</dd>
                  </div>
                )}
                {venue.display_rotation_frequency && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-muted">Rotation</dt>
                    <dd className="text-foreground">{venue.display_rotation_frequency}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {((venue.preferred_styles || []).length > 0 || (venue.preferred_themes || []).length > 0) && (
            <section>
              <h2 className="font-serif text-lg text-foreground mb-3">What the venue looks for</h2>
              {(venue.preferred_styles || []).length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted mb-1.5">Styles</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(venue.preferred_styles || []).map((s) => (
                      <span key={s} className="text-xs px-2 py-1 bg-accent/5 text-accent border border-accent/20 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {(venue.preferred_themes || []).length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted mb-1.5">Themes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(venue.preferred_themes || []).map((t) => (
                      <span key={t} className="text-xs px-2 py-1 bg-surface text-foreground border border-border rounded-full">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Sidebar facts */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="bg-surface border border-border rounded-sm p-5 space-y-4">
            {arrangements.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted mb-1.5">Arrangements</p>
                <div className="flex flex-wrap gap-1.5">
                  {arrangements.map((a) => (
                    <span key={a} className="text-xs px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-sm">{a}</span>
                  ))}
                </div>
              </div>
            )}
            {venue.wall_space && (
              <Fact label="Wall space" value={venue.wall_space} />
            )}
            {venue.approximate_footfall && (
              <Fact label="Footfall" value={venue.approximate_footfall} />
            )}
            {venue.audience_type && (
              <Fact label="Audience" value={venue.audience_type} />
            )}
            {(venue.city || venue.location) && (
              <Fact label="Location" value={(venue.city || venue.location) as string} />
            )}
          </div>
          <Link
            href="/spaces-looking-for-art"
            className="inline-flex items-center gap-1 mt-4 text-xs text-accent hover:underline"
          >
            &larr; All spaces
          </Link>
        </aside>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}
