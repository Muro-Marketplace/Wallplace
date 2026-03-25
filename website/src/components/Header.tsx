"use client";

import { useState } from "react";
import Link from "next/link";

const navLinks = [
  { label: "Browse Art", href: "/browse" },
  { label: "For Venues", href: "/venues" },
  { label: "For Artists", href: "/artists" },
  { label: "Spaces", href: "/spaces" },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-border">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="flex items-center justify-between h-14 lg:h-16">
          {/* Logo */}
          <Link
            href="/"
            className="font-serif text-xl lg:text-2xl tracking-tight text-foreground"
          >
            Muro
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted hover:text-foreground transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center gap-2.5">
            <Link
              href="/login"
              className="text-sm px-4 py-2 text-muted hover:text-foreground transition-colors duration-200"
            >
              Login
            </Link>
            <Link
              href="/apply"
              className="text-sm text-muted hover:text-foreground transition-colors duration-200"
            >
              Apply as Artist
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            className="lg:hidden p-2 -mr-2 text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              {mobileMenuOpen ? (
                <>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="6" y1="18" x2="18" y2="6" />
                </>
              ) : (
                <>
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-white">
          <div className="mx-auto max-w-[1400px] px-6 py-6 space-y-6">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-base text-muted hover:text-foreground transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="flex flex-col gap-3 pt-4 border-t border-border">
              <Link
                href="/login"
                className="text-center text-sm px-5 py-3 rounded-sm border border-border text-foreground hover:bg-foreground/5"
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                href="/apply"
                className="text-base text-muted hover:text-foreground transition-colors duration-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                Apply as Artist
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
