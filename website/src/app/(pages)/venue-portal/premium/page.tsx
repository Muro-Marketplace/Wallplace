"use client";

import Image from "next/image";
import Link from "next/link";
import VenuePortalLayout from "@/components/VenuePortalLayout";

const features = [
  {
    title: "AI-Powered Art Search",
    desc: "Describe your space and aesthetic, and our AI surfaces the most relevant artists and works from across the platform.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <path d="M11 8v3l2 2" />
      </svg>
    ),
  },
  {
    title: "AI Visualiser",
    desc: "Upload a photo of your space and see exactly how shortlisted artworks would look on your walls before committing.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  },
  {
    title: "Curated Recommendations",
    desc: "A tailored selection of artworks updated weekly based on your preferences, display needs, and browsing history.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    title: "Optional Installation Packages",
    desc: "Book professional installation and deinstallation services through our trusted network of art handlers.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    title: "Priority Support",
    desc: "Dedicated account support with faster response times and access to our curation team for bespoke sourcing advice.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

export default function PremiumToolsPage() {
  return (
    <VenuePortalLayout>
      <div className="mb-8">
        <h1 className="font-serif text-2xl lg:text-3xl text-foreground mb-1">
          Premium Tools
        </h1>
        <p className="text-sm text-muted">
          Powerful features to help you source, visualise, and manage art for your space.
        </p>
      </div>

      {/* Upgrade card */}
      <div className="bg-white border border-border rounded-sm p-6 lg:p-8 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2.5 py-0.5 text-xs font-medium bg-accent/10 text-accent border border-accent/20 rounded-full">
            Premium Plan
          </span>
          <span className="text-xs text-muted">— currently on Free</span>
        </div>
        <h2 className="font-serif text-xl lg:text-2xl text-foreground mb-2">
          Unlock Premium
        </h2>
        <p className="text-sm text-muted leading-relaxed mb-6 max-w-lg">
          Upgrade to get access to AI-powered search, the visualiser tool, curated weekly recommendations, and more.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {features.map((feature) => (
            <div key={feature.title} className="flex gap-3 p-4 bg-background border border-border rounded-sm">
              <span className="text-accent shrink-0 mt-0.5">{feature.icon}</span>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  {feature.title}
                </p>
                <p className="text-xs text-muted leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            className="px-6 py-3 bg-accent text-white text-sm font-medium rounded-sm hover:bg-accent/90 transition-colors cursor-pointer"
          >
            Upgrade to Premium
          </button>
          <Link
            href="/contact"
            className="px-6 py-3 border border-border text-sm text-muted rounded-sm hover:border-foreground/30 hover:text-foreground transition-colors text-center"
          >
            Contact us for pricing
          </Link>
        </div>
      </div>

      {/* Greyed-out previews */}
      <div className="space-y-5">
        {/* AI Recommendations preview */}
        <div className="relative bg-white border border-border rounded-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-serif text-base text-foreground">
              AI Recommendations
            </h3>
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Premium Only
            </span>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-3 gap-4 blur-sm pointer-events-none select-none">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-border/20 rounded-sm overflow-hidden">
                  <div className="aspect-[3/4] bg-border/30 relative">
                    <Image
                      src={`https://picsum.photos/seed/ai-rec-${i}/300/400`}
                      alt="Recommended artwork"
                      fill
                      className="object-cover"
                      sizes="200px"
                    />
                  </div>
                  <div className="p-3">
                    <div className="h-3 bg-border/60 rounded mb-1.5 w-3/4" />
                    <div className="h-2.5 bg-border/40 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
            {/* Lock overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-white/60">
              <div className="text-center">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-foreground text-white mb-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <p className="text-sm font-medium text-foreground mb-0.5">
                  Premium Feature
                </p>
                <p className="text-xs text-muted">
                  Upgrade to unlock AI recommendations
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Visualiser preview */}
        <div className="relative bg-white border border-border rounded-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-serif text-base text-foreground">
              AI Visualiser
            </h3>
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Premium Only
            </span>
          </div>
          <div className="relative p-5">
            <div className="aspect-video relative overflow-hidden rounded-sm blur-sm pointer-events-none select-none bg-border/20">
              <Image
                src="https://picsum.photos/seed/visualiser/800/450"
                alt="AI Visualiser preview"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 800px"
              />
            </div>
            {/* Lock overlay */}
            <div className="absolute inset-5 flex items-center justify-center bg-white/60 rounded-sm">
              <div className="text-center">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-foreground text-white mb-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <p className="text-sm font-medium text-foreground mb-0.5">
                  Premium Feature
                </p>
                <p className="text-xs text-muted">
                  See artwork on your walls with AI
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </VenuePortalLayout>
  );
}
