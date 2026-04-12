"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function VenueArtistToggle() {
  const pathname = usePathname();
  const isVenues = pathname === "/venues" || pathname === "/how-it-works";
  const isArtists = pathname === "/artists";

  return (
    <div className="sticky top-14 lg:top-16 z-30 border-b border-border bg-white">
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="flex items-center justify-center gap-0">
          <Link
            href="/venues"
            className={`px-6 sm:px-8 py-4 text-sm font-medium border-b-2 transition-colors ${
              isVenues ? "border-foreground text-foreground" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            For Venues
          </Link>
          <Link
            href="/artists"
            className={`px-6 sm:px-8 py-4 text-sm font-medium border-b-2 transition-colors ${
              isArtists ? "border-foreground text-foreground" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            For Artists
          </Link>
        </div>
      </div>
    </div>
  );
}
