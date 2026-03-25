"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import VenuePortalLayout from "@/components/VenuePortalLayout";

const savedArtists = [
  {
    id: 1,
    name: "Maya Chen",
    medium: "Oil Painting",
    location: "East London",
    slug: "maya-chen",
  },
  {
    id: 2,
    name: "James Okafor",
    medium: "Photography",
    location: "Brixton, London",
    slug: "james-okafor",
  },
  {
    id: 3,
    name: "Sofia Andersen",
    medium: "Watercolour",
    location: "Hackney, London",
    slug: "sofia-andersen",
  },
  {
    id: 4,
    name: "Ravi Patel",
    medium: "Mixed Media",
    location: "Shoreditch, London",
    slug: "ravi-patel",
  },
];

const savedWorks = [
  {
    id: 1,
    title: "Golden Hour, Borough Market",
    artist: "Maya Chen",
    priceBand: "£400–£600",
    slug: "maya-chen",
  },
  {
    id: 2,
    title: "Southbank Reflections",
    artist: "James Okafor",
    priceBand: "£150–£300",
    slug: "james-okafor",
  },
  {
    id: 3,
    title: "Tidal Study No. 4",
    artist: "Sofia Andersen",
    priceBand: "£250–£400",
    slug: "sofia-andersen",
  },
  {
    id: 4,
    title: "Urban Fragments III",
    artist: "Ravi Patel",
    priceBand: "£600–£900",
    slug: "ravi-patel",
  },
  {
    id: 5,
    title: "Morning Light, Bermondsey",
    artist: "Maya Chen",
    priceBand: "£350–£500",
    slug: "maya-chen",
  },
  {
    id: 6,
    title: "The Wren at Dusk",
    artist: "Sofia Andersen",
    priceBand: "£200–£350",
    slug: "sofia-andersen",
  },
];

type Tab = "artists" | "works";

export default function SavedPage() {
  const [activeTab, setActiveTab] = useState<Tab>("artists");
  const [removedArtists, setRemovedArtists] = useState<number[]>([]);
  const [removedWorks, setRemovedWorks] = useState<number[]>([]);

  const visibleArtists = savedArtists.filter((a) => !removedArtists.includes(a.id));
  const visibleWorks = savedWorks.filter((w) => !removedWorks.includes(w.id));

  return (
    <VenuePortalLayout>
      <div className="mb-6">
        <h1 className="font-serif text-2xl lg:text-3xl text-foreground mb-1">
          Saved
        </h1>
        <p className="text-sm text-muted">
          Artists and artworks you&apos;ve bookmarked.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-border">
        {(["artists", "works"] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors duration-150 border-b-2 -mb-px cursor-pointer ${
              activeTab === tab
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {tab === "artists" ? "Saved Artists" : "Saved Works"}
            <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-background border border-border rounded-full text-muted">
              {tab === "artists" ? visibleArtists.length : visibleWorks.length}
            </span>
          </button>
        ))}
      </div>

      {/* Artists tab */}
      {activeTab === "artists" && (
        <>
          {visibleArtists.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-muted mb-4">No saved artists yet.</p>
              <Link href="/browse" className="text-sm text-accent hover:underline">
                Browse Portfolios
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              {visibleArtists.map((artist) => (
                <div
                  key={artist.id}
                  className="bg-white border border-border rounded-sm overflow-hidden"
                >
                  <div className="relative aspect-[3/4] bg-border/20">
                    <Image
                      src={`https://picsum.photos/seed/${artist.slug}/300/400`}
                      alt={artist.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-sm text-foreground mb-0.5">
                      {artist.name}
                    </h3>
                    <p className="text-xs text-muted mb-4">
                      {artist.medium} &middot; {artist.location}
                    </p>
                    <div className="flex gap-2">
                      <Link
                        href={`/browse/${artist.slug}`}
                        className="flex-1 text-center px-3 py-1.5 text-xs font-medium bg-foreground text-white rounded-sm hover:bg-foreground/90 transition-colors"
                      >
                        View Profile
                      </Link>
                      <button
                        type="button"
                        onClick={() =>
                          setRemovedArtists((prev) => [...prev, artist.id])
                        }
                        className="px-3 py-1.5 text-xs border border-border text-muted rounded-sm hover:border-red-300 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Works tab */}
      {activeTab === "works" && (
        <>
          {visibleWorks.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-muted mb-4">No saved works yet.</p>
              <Link href="/browse" className="text-sm text-accent hover:underline">
                Browse Portfolios
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibleWorks.map((work) => (
                <div
                  key={work.id}
                  className="bg-white border border-border rounded-sm overflow-hidden"
                >
                  <div className="relative aspect-[4/3] bg-border/20">
                    <Image
                      src={`https://picsum.photos/seed/${work.slug}-${work.id}/400/300`}
                      alt={work.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-sm text-foreground mb-0.5 leading-snug">
                      {work.title}
                    </h3>
                    <p className="text-xs text-muted mb-1">{work.artist}</p>
                    <p className="text-xs text-accent font-medium mb-4">
                      {work.priceBand}
                    </p>
                    <div className="flex gap-2">
                      <Link
                        href={`/browse/${work.slug}`}
                        className="flex-1 text-center px-3 py-1.5 text-xs font-medium bg-foreground text-white rounded-sm hover:bg-foreground/90 transition-colors"
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() =>
                          setRemovedWorks((prev) => [...prev, work.id])
                        }
                        className="px-3 py-1.5 text-xs border border-border text-muted rounded-sm hover:border-red-300 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </VenuePortalLayout>
  );
}
