"use client";

import { useState } from "react";
import ArtistPortalLayout from "@/components/ArtistPortalLayout";
import Button from "@/components/Button";

const works = [
  { id: 1, title: "Last Light on Mare Street", size: "60×90cm", price: "£280", status: "Placed" },
  { id: 2, title: "Hackney Wick, Dawn", size: "50×75cm", price: "£320", status: "Placed" },
  { id: 3, title: "Canal Series No. 4", size: "40×60cm", price: "£220", status: "Available" },
  { id: 4, title: "Bermondsey Rooftops", size: "60×90cm", price: "£350", status: "Available" },
  { id: 5, title: "Sunday Market, E8", size: "30×45cm", price: "£160", status: "Placed" },
  { id: 6, title: "Golden Hour, Peckham Rye", size: "50×75cm", price: "£280", status: "Sold" },
];

const commercialSettings = [
  { label: "Original prints", enabled: true },
  { label: "Limited edition prints", enabled: true },
  { label: "Framing available", enabled: false },
  { label: "Commissions", enabled: true },
  { label: "Free loan placements", enabled: true },
  { label: "Revenue share placements", enabled: true },
  { label: "Direct purchase", enabled: true },
];

const themes = [
  "Urban", "Architecture", "Street", "East London", "People", "Abstract",
  "Colour", "Night", "Markets", "Transport",
];

const statusColors: Record<string, string> = {
  Placed: "bg-green-100 text-green-700",
  Available: "bg-blue-100 text-blue-700",
  Sold: "bg-gray-100 text-gray-600",
};

export default function PortfolioPage() {
  const [hoveredWork, setHoveredWork] = useState<number | null>(null);

  return (
    <ArtistPortalLayout activePath="/artist-portal/portfolio">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-2xl lg:text-3xl">My Portfolio</h1>
        <Button href="#" variant="secondary" size="sm">
          Edit Profile
        </Button>
      </div>

      {/* Profile summary */}
      <div className="bg-surface border border-border rounded-sm p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xl font-medium flex-shrink-0">
              M
            </div>
            <div>
              <h2 className="text-lg font-medium">Maya Chen</h2>
              <p className="text-sm text-muted">Documentary & Street Photographer</p>
              <p className="text-xs text-muted mt-0.5">East London · Member since Jan 2025</p>
            </div>
          </div>
          <button className="text-xs text-accent hover:underline underline-offset-4">Edit</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-muted font-medium uppercase tracking-wide mb-1">Bio</p>
            <p className="text-sm text-foreground leading-relaxed">
              Documentary photographer based in Hackney. I photograph the texture of everyday urban life – markets, streets, and the people who animate them.
            </p>
          </div>
          <div>
            <p className="text-xs text-muted font-medium uppercase tracking-wide mb-1">Location</p>
            <p className="text-sm text-foreground">Hackney, East London</p>
          </div>
          <div>
            <p className="text-xs text-muted font-medium uppercase tracking-wide mb-1">Delivery Radius</p>
            <p className="text-sm text-foreground">10 miles from E8</p>
          </div>
        </div>
      </div>

      {/* Commercial settings */}
      <div className="bg-surface border border-border rounded-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-medium">Commercial Settings</h2>
          <button className="text-xs text-accent hover:underline underline-offset-4">Edit</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {commercialSettings.map((setting) => (
            <div key={setting.label} className="flex items-center justify-between gap-3 py-2 border-b border-border/60 last:border-0">
              <span className="text-sm text-foreground">{setting.label}</span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  setting.enabled
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {setting.enabled ? "On" : "Off"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Portfolio grid */}
      <div className="bg-surface border border-border rounded-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-medium">Works ({works.length})</h2>
          <Button href="#" variant="primary" size="sm">
            + Add New Work
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {works.map((work) => (
            <div
              key={work.id}
              className="relative group rounded-sm overflow-hidden border border-border cursor-pointer"
              onMouseEnter={() => setHoveredWork(work.id)}
              onMouseLeave={() => setHoveredWork(null)}
            >
              {/* Placeholder image */}
              <div
                className="aspect-[4/3] bg-gradient-to-br from-accent/10 via-accent/5 to-background"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='75' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100' height='75' fill='%23f0ebe5'/%3E%3Crect x='20' y='15' width='60' height='45' fill='%23ddd6ce' rx='2'/%3E%3C/svg%3E")`,
                  backgroundSize: "cover",
                }}
              />

              {/* Hover overlay */}
              {hoveredWork === work.id && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3 transition-opacity">
                  <button className="text-xs font-medium bg-white text-foreground px-3 py-1.5 rounded-sm hover:bg-background transition-colors">
                    Edit
                  </button>
                  <button className="text-xs text-white/80 hover:text-white transition-colors">
                    View public listing
                  </button>
                </div>
              )}

              {/* Info bar */}
              <div className="p-3 border-t border-border">
                <p className="text-xs font-medium text-foreground leading-snug truncate mb-1">
                  {work.title}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">{work.size} · {work.price}</span>
                  <span
                    className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${statusColors[work.status]}`}
                  >
                    {work.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Theme management */}
      <div className="bg-surface border border-border rounded-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-medium">Themes</h2>
          <button className="text-xs text-accent hover:underline underline-offset-4">
            Manage Themes
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {themes.map((theme) => (
            <span
              key={theme}
              className="text-xs border border-border rounded-sm px-3 py-1.5 text-foreground bg-background"
            >
              {theme}
            </span>
          ))}
        </div>
      </div>
    </ArtistPortalLayout>
  );
}
