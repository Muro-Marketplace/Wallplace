"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DemoBanner from "@/components/DemoBanner";

export default function PagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPortal = pathname?.startsWith("/artist-portal") || pathname?.startsWith("/venue-portal") || pathname?.startsWith("/customer-portal") || pathname?.startsWith("/admin");

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {/* Demo-account banner, only renders when the signed-in user
          matches NEXT_PUBLIC_DEMO_ARTIST_USER_ID / _VENUE_USER_ID.
          Self-hides when those env vars aren't set, so this is safe
          to leave mounted before Phase 2 demo accounts are wired. */}
      <DemoBanner />
      {/* The outer <main id="main-content"> lives in src/app/layout.tsx
          so the skip link works on every route. This wrapper just owns
          the layout-level offset for the fixed header. */}
      <div className="flex-1 pt-14 lg:pt-16">{children}</div>
      {!isPortal && <Footer />}
    </div>
  );
}
