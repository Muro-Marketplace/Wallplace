"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { label: "Dashboard", href: "/artist-portal" },
  { label: "Messages", href: "/artist-portal/messages" },
  { label: "Edit Profile", href: "/artist-portal/profile" },
  { label: "My Portfolio", href: "/artist-portal/portfolio" },
  { label: "Collections", href: "/artist-portal/collections" },
  { label: "QR Labels", href: "/artist-portal/labels" },
  { label: "Placements", href: "/artist-portal/placements" },
  { label: "Analytics", href: "/artist-portal/analytics" },
  { label: "Billing", href: "/artist-portal/billing" },
  { label: "Settings", href: "/artist-portal/settings" },
];

const secondaryItems = [
  { label: "Browse Site", href: "/" },
];

interface ArtistPortalLayoutProps {
  children: React.ReactNode;
  activePath: string;
}

export default function ArtistPortalLayout({
  children,
  activePath,
}: ArtistPortalLayoutProps) {
  const router = useRouter();
  const { user, loading, userType, displayName, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || userType !== "artist")) {
      router.replace("/login");
    }
  }, [loading, user, userType, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted text-sm">Loading...</p>
      </div>
    );
  }

  if (!user || userType !== "artist") return null;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-14 lg:top-16 left-0 h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-4rem)]
          w-56 border-r border-white/10 z-30
          flex flex-col overflow-hidden relative
          transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Background image + overlay matching waitlist */}
        <div className="absolute inset-0 -z-10">
          <img src="https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=1200&fit=crop&crop=center" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/70" />
        </div>
        <nav className="flex-1 py-4 overflow-y-auto relative z-10">
          <ul className="space-y-0.5 px-2">
            {navItems.map((item) => {
              const isActive = activePath === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      block text-sm py-2 px-3 rounded-sm transition-colors duration-150
                      ${
                        isActive
                          ? "text-accent font-medium bg-white/10"
                          : "text-white/70 hover:text-white hover:bg-white/5"
                      }
                    `}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="my-4 mx-4 border-t border-white/10" />

          <ul className="space-y-0.5 px-2">
            {secondaryItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className="block text-sm py-2 px-3 rounded-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors duration-150"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <button
                onClick={() => signOut()}
                className="w-full text-left text-sm py-2 px-3 rounded-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors duration-150"
              >
                Logout
              </button>
            </li>
          </ul>
        </nav>

        <div className="px-4 py-4 border-t border-white/10 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-sm font-medium">
              {displayName?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div>
              <p className="text-sm font-medium text-white leading-tight">{displayName || "Artist"}</p>
              <p className="text-xs text-white/50">Artist</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-56 min-w-0">
        {/* Mobile header bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-border sticky top-14 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-sm hover:bg-background transition-colors"
            aria-label="Open navigation"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <span className="text-sm font-medium text-foreground">Artist Portal</span>
        </div>

        <main className="p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
