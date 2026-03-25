"use client";

import { useState } from "react";
import Image from "next/image";
import type { ArtistWork } from "@/data/artists";

interface ArtistProfileClientProps {
  extendedBio: string;
  themes: string[];
  works: ArtistWork[];
}

export default function ArtistProfileClient({
  extendedBio,
  themes,
  works,
}: ArtistProfileClientProps) {
  const [activeTheme, setActiveTheme] = useState("All");
  const [bioExpanded, setBioExpanded] = useState(false);

  const allThemes = ["All", ...themes];

  const filteredWorks =
    activeTheme === "All"
      ? works
      : works.filter((w) => {
          // Match work against artist themes loosely by medium/title keyword
          // Since works don't have per-work themes, show all for selected theme tab
          return true;
        });

  return (
    <>
      {/* Portfolio section */}
      <section className="py-14 lg:py-18">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl">Portfolio</h2>
            {/* Theme tabs */}
            {themes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {allThemes.slice(0, 6).map((theme) => (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => setActiveTheme(theme)}
                    className={`px-3 py-1.5 text-xs rounded-sm border transition-all duration-150 cursor-pointer ${
                      activeTheme === theme
                        ? "bg-foreground text-background border-foreground"
                        : "border-border text-muted hover:border-foreground/30"
                    }`}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Masonry grid */}
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
            {filteredWorks.map((work, index) => (
              <div
                key={index}
                className="break-inside-avoid group relative overflow-hidden rounded-sm bg-border/20"
              >
                <div className="relative">
                  <Image
                    src={work.image}
                    alt={work.title}
                    width={work.orientation === "landscape" ? 750 : 600}
                    height={work.orientation === "landscape" ? 500 : work.orientation === "square" ? 600 : 750}
                    className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/55 transition-colors duration-300 flex items-end">
                    <div className="p-5 w-full opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                      <h3 className="text-white font-sans font-medium text-sm leading-snug mb-1">
                        {work.title}
                      </h3>
                      <p className="text-white/70 text-xs mb-1.5">
                        {work.medium} &middot; {work.dimensions}
                      </p>
                      <p className="text-white text-sm font-medium">
                        {work.priceBand}
                      </p>
                    </div>
                  </div>
                  {/* Availability */}
                  <div className="absolute top-3 right-3">
                    {work.available ? (
                      <span className="inline-block px-2 py-0.5 bg-accent/90 text-white text-[10px] rounded-sm backdrop-blur-sm">
                        Available
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 bg-black/60 text-white text-[10px] rounded-sm backdrop-blur-sm">
                        Sold
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Extended bio */}
      <section className="py-10 lg:py-14 border-t border-border">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl mb-6">About the Artist</h2>
            <div
              className={`overflow-hidden transition-all duration-500 ${
                bioExpanded ? "max-h-[600px]" : "max-h-[4.5rem]"
              }`}
            >
              <p className="text-foreground/75 leading-relaxed">{extendedBio}</p>
            </div>
            <button
              type="button"
              onClick={() => setBioExpanded(!bioExpanded)}
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover transition-colors duration-200 cursor-pointer"
            >
              {bioExpanded ? "Read less" : "Read more"}
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                className={`transition-transform duration-300 ${bioExpanded ? "rotate-180" : ""}`}
              >
                <polyline points="3 5 7 9 11 5" />
              </svg>
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
