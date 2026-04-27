/**
 * Seed the two demo accounts that power /demo and the homepage demo
 * funnel.
 *
 * Run once after pasting the DEMO_* env vars (or accept the script's
 * default UUIDs / passwords below).
 *
 *   npx tsx scripts/seed-demo-accounts.ts
 *
 * Idempotent — re-runnable. Skips auth-user creation when the user
 * already exists, upserts profile / works / walls / placements rows
 * by id, so you can edit and re-run to refresh content without
 * worrying about duplicates.
 *
 * Defaults:
 *   - Stable UUIDs hard-coded so env var values stay constant across
 *     environments. Override by setting DEMO_ARTIST_USER_ID /
 *     DEMO_VENUE_USER_ID before running.
 *   - Strong default passwords. Override DEMO_*_PASSWORD if you want.
 *
 * After seeding, paste the printed env var block into Vercel project
 * settings (or .env.local for local dev). The /demo cards will then
 * sign visitors straight into the read-only demo accounts.
 */

import { createClient } from "@supabase/supabase-js";

// ──────────────────────────────────────────────────────────────────────────
// Defaults — override via env vars
// ──────────────────────────────────────────────────────────────────────────

const DEFAULTS = {
  ARTIST_USER_ID: "0a4e3b5c-8f7a-4e3d-a5c1-4b3c8e2d6f1a",
  VENUE_USER_ID: "9f2b1a0c-8e7d-4c5f-b3a2-1f5d8e7c4a3b",
  ARTIST_EMAIL: "demo-artist@wallplace.co.uk",
  VENUE_EMAIL: "demo-venue@wallplace.co.uk",
  ARTIST_PASSWORD: "Wp-DemoArtist-Pro-2026!Aa9k",
  VENUE_PASSWORD: "Wp-DemoVenue-Premium-2026!Bb8m",
} as const;

const ARTIST_USER_ID = process.env.DEMO_ARTIST_USER_ID || DEFAULTS.ARTIST_USER_ID;
const VENUE_USER_ID = process.env.DEMO_VENUE_USER_ID || DEFAULTS.VENUE_USER_ID;
const ARTIST_EMAIL = process.env.DEMO_ARTIST_EMAIL || DEFAULTS.ARTIST_EMAIL;
const VENUE_EMAIL = process.env.DEMO_VENUE_EMAIL || DEFAULTS.VENUE_EMAIL;
const ARTIST_PASSWORD = process.env.DEMO_ARTIST_PASSWORD || DEFAULTS.ARTIST_PASSWORD;
const VENUE_PASSWORD = process.env.DEMO_VENUE_PASSWORD || DEFAULTS.VENUE_PASSWORD;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env",
  );
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
});

// ──────────────────────────────────────────────────────────────────────────
// 1. Ensure auth users exist with the specified UUIDs
// ──────────────────────────────────────────────────────────────────────────

async function ensureAuthUser(
  id: string,
  email: string,
  password: string,
  metadata: Record<string, unknown>,
) {
  // Try to find an existing user by id first.
  const { data: existing } = await db.auth.admin.getUserById(id);
  if (existing?.user) {
    // Update password + metadata so re-running keeps things in sync.
    await db.auth.admin.updateUserById(id, {
      email,
      password,
      user_metadata: metadata,
      email_confirm: true,
    });
    console.log(`  ✓ Auth user already existed: ${email} (${id})`);
    return;
  }

  // Create with explicit id so the env var stays stable.
  const { error } = await db.auth.admin.createUser({
    id,
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) {
    // If the email is already taken under a different id, surface it
    // — the user must reconcile manually in Supabase dashboard.
    throw new Error(`createUser failed for ${email}: ${error.message}`);
  }
  console.log(`  ✓ Auth user created: ${email} (${id})`);
}

// ──────────────────────────────────────────────────────────────────────────
// 2. Demo artist — profile + works
// ──────────────────────────────────────────────────────────────────────────

const ARTIST_PROFILE = {
  user_id: ARTIST_USER_ID,
  slug: "maya-chen-demo",
  name: "Maya Chen",
  profile_image:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=600&fit=crop",
  banner_image:
    "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1920&h=600&fit=crop",
  short_bio:
    "Architectural photographer based in East London. Light, line, and the quiet rhythms of urban space.",
  extended_bio:
    "Maya's work captures the stillness embedded in cities — the moments between noise. She works exclusively in medium-format film and prints her own editions in a small studio in Hackney. Her work hangs in cafés, hotels, and offices across London, Bristol, and Manchester.",
  location: "London, UK",
  city: "London",
  postcode: "E8 4AA",
  primary_medium: "Photography",
  style_tags: ["architectural", "minimalist", "black-and-white", "fine-art"],
  themes: ["urban", "architectural", "minimalist"],
  discipline: "photography",
  sub_styles: ["architectural", "black-and-white", "fine-art", "urban"],
  instagram: "@mayachen.demo",
  website: "https://example.com/maya-chen",
  offers_originals: true,
  offers_prints: true,
  offers_framed: true,
  available_sizes: ["A3", "A2", "A1", "60×90cm"],
  open_to_commissions: true,
  open_to_free_loan: true,
  open_to_revenue_share: true,
  revenue_share_percent: 25,
  open_to_outright_purchase: true,
  can_provide_frames: true,
  can_arrange_framing: true,
  delivery_radius: "UK-wide",
  venue_types_suited_for: ["café", "restaurant", "hotel", "office"],
  is_founding_artist: true,
  profile_color: "#2A4759",
  total_views: 4823,
  total_placements: 17,
  total_sales: 42,
  total_enquiries: 91,
  message_notifications_enabled: true,
  subscription_plan: "pro",
  default_shipping_price: 12,
  ships_internationally: false,
  international_shipping_price: null,
  review_status: "approved",
  approved_at: new Date().toISOString(),
};

const ARTIST_WORKS = [
  {
    title: "Last Light on Mare Street",
    medium: "Medium-format silver gelatin print",
    dimensions: "60 × 90 cm",
    image:
      "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=1200&h=900&fit=crop",
    orientation: "landscape" as const,
    color: "#3a4a5c",
    pricing: [
      { size: "A3", price: 180, shippingPrice: 12 },
      { size: "A2", price: 320, shippingPrice: 18 },
      { size: "60×90cm", price: 580, shippingPrice: 25 },
    ],
    in_store_price: 520,
    quantity_available: 8,
  },
  {
    title: "Concrete Calm I",
    medium: "Archival pigment print",
    dimensions: "50 × 70 cm",
    image:
      "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200&h=900&fit=crop",
    orientation: "landscape" as const,
    color: "#4a4538",
    pricing: [
      { size: "A3", price: 160, shippingPrice: 12 },
      { size: "50×70cm", price: 380, shippingPrice: 18 },
    ],
    in_store_price: 350,
    quantity_available: 5,
  },
  {
    title: "Kentish Town Stairwell",
    medium: "Silver gelatin print",
    dimensions: "40 × 60 cm",
    image:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&h=900&fit=crop",
    orientation: "portrait" as const,
    color: "#2c3540",
    pricing: [
      { size: "A4", price: 95, shippingPrice: 8 },
      { size: "40×60cm", price: 280, shippingPrice: 15 },
    ],
    in_store_price: 250,
    quantity_available: 12,
  },
  {
    title: "Threshold Study, Barbican",
    medium: "Archival pigment print",
    dimensions: "70 × 100 cm",
    image:
      "https://images.unsplash.com/photo-1545459720-aac8509eb02c?w=1200&h=900&fit=crop",
    orientation: "landscape" as const,
    color: "#5b6574",
    pricing: [
      { size: "A3", price: 200, shippingPrice: 12 },
      { size: "A2", price: 380, shippingPrice: 18 },
      { size: "70×100cm", price: 720, shippingPrice: 30 },
    ],
    in_store_price: 650,
    quantity_available: 4,
  },
  {
    title: "Window, Whitechapel",
    medium: "Silver gelatin print",
    dimensions: "50 × 50 cm",
    image:
      "https://images.unsplash.com/photo-1551731409-43eb3e517a1a?w=1200&h=1200&fit=crop",
    orientation: "square" as const,
    color: "#3d3a35",
    pricing: [
      { size: "30×30cm", price: 140, shippingPrice: 10 },
      { size: "50×50cm", price: 320, shippingPrice: 18 },
    ],
    in_store_price: 290,
    quantity_available: 7,
  },
  {
    title: "Morning Tide, Margate",
    medium: "Archival pigment print",
    dimensions: "60 × 90 cm",
    image:
      "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=1200&h=900&fit=crop",
    orientation: "landscape" as const,
    color: "#7a8a96",
    pricing: [
      { size: "A3", price: 170, shippingPrice: 12 },
      { size: "A2", price: 340, shippingPrice: 18 },
      { size: "60×90cm", price: 620, shippingPrice: 25 },
    ],
    in_store_price: 560,
    quantity_available: 6,
  },
  {
    title: "Quiet Geometry No. 4",
    medium: "Silver gelatin print",
    dimensions: "40 × 40 cm",
    image:
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&h=1200&fit=crop",
    orientation: "square" as const,
    color: "#5d6770",
    pricing: [
      { size: "30×30cm", price: 130, shippingPrice: 10 },
      { size: "40×40cm", price: 240, shippingPrice: 14 },
    ],
    in_store_price: 220,
    quantity_available: 9,
  },
  {
    title: "Hackney Wick Reflection",
    medium: "Archival pigment print",
    dimensions: "70 × 100 cm",
    image:
      "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=1200&h=900&fit=crop",
    orientation: "landscape" as const,
    color: "#465563",
    pricing: [
      { size: "A3", price: 190, shippingPrice: 12 },
      { size: "70×100cm", price: 680, shippingPrice: 30 },
    ],
    in_store_price: 610,
    quantity_available: 3,
  },
];

async function seedArtist() {
  console.log("\nSeeding demo artist…");

  await ensureAuthUser(ARTIST_USER_ID, ARTIST_EMAIL, ARTIST_PASSWORD, {
    first_name: "Maya",
    user_type: "artist",
    is_demo: true,
  });

  // Upsert profile.
  const { error: profileErr } = await db
    .from("artist_profiles")
    .upsert(ARTIST_PROFILE, { onConflict: "user_id" });
  if (profileErr) throw new Error(`artist_profiles upsert: ${profileErr.message}`);

  // Get the profile id we need for artist_works.artist_id.
  const { data: profileRow } = await db
    .from("artist_profiles")
    .select("id")
    .eq("user_id", ARTIST_USER_ID)
    .single<{ id: string }>();
  if (!profileRow) throw new Error("artist profile not found after upsert");

  // Replace any existing demo works to keep the catalog tidy.
  await db.from("artist_works").delete().eq("artist_id", profileRow.id);

  const works = ARTIST_WORKS.map((w, i) => ({
    artist_id: profileRow.id,
    title: w.title,
    medium: w.medium,
    dimensions: w.dimensions,
    price_band: priceBand(w.pricing[0]?.price || 0),
    pricing: w.pricing,
    available: true,
    color: w.color,
    image: w.image,
    orientation: w.orientation,
    sort_order: i,
    in_store_price: w.in_store_price,
    quantity_available: w.quantity_available,
    description: null,
    images: [w.image],
  }));
  const { error: worksErr } = await db.from("artist_works").insert(works);
  if (worksErr) throw new Error(`artist_works insert: ${worksErr.message}`);
  console.log(`  ✓ Inserted ${works.length} works for ${ARTIST_PROFILE.name}`);
}

function priceBand(price: number): string {
  if (price < 100) return "under-100";
  if (price < 250) return "100-250";
  if (price < 500) return "250-500";
  if (price < 1000) return "500-1000";
  return "1000-plus";
}

// ──────────────────────────────────────────────────────────────────────────
// 3. Demo venue — profile + walls
// ──────────────────────────────────────────────────────────────────────────

const VENUE_PROFILE = {
  user_id: VENUE_USER_ID,
  slug: "the-copper-kettle-demo",
  name: "The Copper Kettle",
  type: "Café",
  location: "Hackney, London",
  contact_name: "Sarah Mitchell",
  email: VENUE_EMAIL,
  phone: "020 7000 0000",
  address_line1: "12 Mare Street",
  address_line2: "",
  city: "London",
  postcode: "E8 3RH",
  wall_space: "Three large feature walls in the main seating area, all artwork-ready",
  description:
    "A Hackney café with eight years of independent character. We rotate artwork every six to eight weeks across our three main walls — the eastern wall gets morning light, the back wall has soft track lighting we'll adjust to suit your work.",
  image:
    "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1920&h=1200&fit=crop",
  images: [
    "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1920&h=1200&fit=crop",
    "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=1920&h=1200&fit=crop",
    "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=1920&h=1200&fit=crop",
    "https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=1920&h=1200&fit=crop",
  ],
  approximate_footfall: "200-400/day",
  audience_type: "Local residents, freelancers, weekend brunch crowd",
  interested_in_free_loan: true,
  interested_in_revenue_share: true,
  interested_in_direct_purchase: true,
  interested_in_collections: true,
  preferred_styles: ["photography", "minimalist", "abstract", "architectural"],
  preferred_themes: ["urban", "architectural", "minimalist", "nature"],
  message_notifications_enabled: true,
  display_wall_space: "3 walls totaling roughly 9 linear metres of hangable space",
  display_lighting: "Track lighting with adjustable warm-white spots on each wall",
  display_install_notes: "We have S-hook + cable system on all three walls; works can be hung without nails",
  display_rotation_frequency: "6-8 weeks",
  subscription_plan: "premium",
};

const VENUE_WALLS = [
  {
    name: "East Wall — Morning Light",
    width_cm: 320,
    height_cm: 200,
    kind: "preset" as const,
    preset_id: "white",
    wall_color_hex: "F5F2EC",
    is_public_on_profile: true,
  },
  {
    name: "Back Wall — Feature",
    width_cm: 400,
    height_cm: 240,
    kind: "preset" as const,
    preset_id: "warm-white",
    wall_color_hex: "EDE6D8",
    is_public_on_profile: true,
  },
  {
    name: "Counter Side — Compact",
    width_cm: 180,
    height_cm: 150,
    kind: "preset" as const,
    preset_id: "off-white",
    wall_color_hex: "E8E2D2",
    is_public_on_profile: true,
  },
];

async function seedVenue() {
  console.log("\nSeeding demo venue…");

  await ensureAuthUser(VENUE_USER_ID, VENUE_EMAIL, VENUE_PASSWORD, {
    first_name: "Sarah",
    user_type: "venue",
    is_demo: true,
  });

  const { error: profileErr } = await db
    .from("venue_profiles")
    .upsert(VENUE_PROFILE, { onConflict: "user_id" });
  if (profileErr) throw new Error(`venue_profiles upsert: ${profileErr.message}`);

  // Walls — wipe and re-seed to keep dims/labels clean across re-runs.
  await db.from("walls").delete().eq("user_id", VENUE_USER_ID);
  const walls = VENUE_WALLS.map((w) => ({
    user_id: VENUE_USER_ID,
    owner_type: "venue",
    name: w.name,
    kind: w.kind,
    preset_id: w.preset_id,
    width_cm: w.width_cm,
    height_cm: w.height_cm,
    wall_color_hex: w.wall_color_hex,
    is_public_on_profile: w.is_public_on_profile,
  }));
  const { error: wallsErr } = await db.from("walls").insert(walls);
  if (wallsErr) throw new Error(`walls insert: ${wallsErr.message}`);
  console.log(`  ✓ Inserted ${walls.length} walls for ${VENUE_PROFILE.name}`);
}

// ──────────────────────────────────────────────────────────────────────────
// 4. Cross-activity — placements + a couple of messages so the accounts
//    feel lived-in, not freshly seeded.
// ──────────────────────────────────────────────────────────────────────────

async function seedActivity() {
  console.log("\nSeeding cross-account activity…");

  // Look up canonical slugs (the upsert may have changed them if rerun
  // pointed at different data).
  const [{ data: ap }, { data: vp }] = await Promise.all([
    db
      .from("artist_profiles")
      .select("slug, name")
      .eq("user_id", ARTIST_USER_ID)
      .single<{ slug: string; name: string }>(),
    db
      .from("venue_profiles")
      .select("slug, name")
      .eq("user_id", VENUE_USER_ID)
      .single<{ slug: string; name: string }>(),
  ]);
  if (!ap || !vp) throw new Error("Profile slugs not resolvable");

  // Wipe prior demo placements to keep the trio realistic.
  await db
    .from("placements")
    .delete()
    .eq("artist_user_id", ARTIST_USER_ID)
    .eq("venue_user_id", VENUE_USER_ID);

  const now = Date.now();
  const days = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000).toISOString();

  const placements = [
    {
      id: crypto.randomUUID(),
      artist_user_id: ARTIST_USER_ID,
      artist_slug: ap.slug,
      venue_user_id: VENUE_USER_ID,
      venue_slug: vp.slug,
      venue: vp.name,
      work_title: ARTIST_WORKS[0].title,
      work_image: ARTIST_WORKS[0].image,
      arrangement_type: "revenue_share",
      revenue_share_percent: 25,
      qr_enabled: true,
      message: "Hi Sarah — I'd love to place this on your back wall. Happy to drop by for the install.",
      status: "active",
      requester_user_id: ARTIST_USER_ID,
      created_at: days(28),
    },
    {
      id: crypto.randomUUID(),
      artist_user_id: ARTIST_USER_ID,
      artist_slug: ap.slug,
      venue_user_id: VENUE_USER_ID,
      venue_slug: vp.slug,
      venue: vp.name,
      work_title: ARTIST_WORKS[3].title,
      work_image: ARTIST_WORKS[3].image,
      arrangement_type: "paid_loan",
      monthly_fee_gbp: 80,
      qr_enabled: false,
      message: "Could we run this for two months on the east wall? Happy with £80/month.",
      status: "pending",
      requester_user_id: ARTIST_USER_ID,
      created_at: days(2),
    },
    {
      id: crypto.randomUUID(),
      artist_user_id: ARTIST_USER_ID,
      artist_slug: ap.slug,
      venue_user_id: VENUE_USER_ID,
      venue_slug: vp.slug,
      venue: vp.name,
      work_title: ARTIST_WORKS[5].title,
      work_image: ARTIST_WORKS[5].image,
      arrangement_type: "purchase",
      qr_enabled: false,
      message: "We'd love to buy this outright for the counter wall — talk to you soon.",
      status: "completed",
      requester_user_id: VENUE_USER_ID,
      created_at: days(120),
    },
  ];
  const { error: placementsErr } = await db.from("placements").insert(placements);
  if (placementsErr) {
    console.warn(
      `  ! placements insert had issues (some columns may be missing in this env): ${placementsErr.message}`,
    );
  } else {
    console.log(`  ✓ Inserted ${placements.length} placements between Maya and Copper Kettle`);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Wallplace demo-account seed");
  console.log("===========================");

  await seedArtist();
  await seedVenue();
  await seedActivity();

  console.log("\nAll done. Paste this into Vercel / .env.local:\n");
  console.log("─────────────────────────────────────────────────────────");
  console.log(`DEMO_ARTIST_USER_ID=${ARTIST_USER_ID}`);
  console.log(`DEMO_VENUE_USER_ID=${VENUE_USER_ID}`);
  console.log(`DEMO_ARTIST_EMAIL=${ARTIST_EMAIL}`);
  console.log(`DEMO_ARTIST_PASSWORD=${ARTIST_PASSWORD}`);
  console.log(`DEMO_VENUE_EMAIL=${VENUE_EMAIL}`);
  console.log(`DEMO_VENUE_PASSWORD=${VENUE_PASSWORD}`);
  console.log(`NEXT_PUBLIC_DEMO_ARTIST_USER_ID=${ARTIST_USER_ID}`);
  console.log(`NEXT_PUBLIC_DEMO_VENUE_USER_ID=${VENUE_USER_ID}`);
  console.log("─────────────────────────────────────────────────────────");
}

main().catch((err) => {
  console.error("\nSeed failed:", err);
  process.exit(1);
});
