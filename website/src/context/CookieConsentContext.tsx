"use client";

/**
 * Whether the storage notice has been dismissed.
 *
 * This used to be a consent context, and it was a fiction. The banner offered
 * Accept and Decline; `setConsent(false)` wrote "false" to localStorage and no
 * other line of code in the repository ever read the value. Nothing was gated
 * on it, because there is nothing to gate: Wallplace sets no cookies, loads no
 * third-party script, and runs no analytics in the browser. The 10 September
 * 2026 compliance audit checked for Meta Pixel, Google Analytics and Ads,
 * TikTok, Hotjar, Clarity, PostHog, Sentry, Mixpanel, Segment, Plausible,
 * Fathom, Matomo and Vercel Analytics, and fetched the live homepage. There is
 * no third-party script of any kind.
 *
 * So there was no PECR breach, and there was a button that did nothing. A
 * control that pretends to do something is its own problem: it teaches people
 * their choice does not matter, and it is exactly what a regulator reads as
 * carelessness about everything around it.
 *
 * What is stored is now a dismissal, and the name says so. If Wallplace ever
 * adds a non-essential storage technology, this is the wrong shape and should
 * be replaced by a real consent record, not quietly reused.
 */

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "wallplace-storage-notice-dismissed";
/** What the old consent key was called, so an existing visitor is not asked twice. */
const LEGACY_KEY = "wallplace-cookie-consent";

interface StorageNoticeContextValue {
  dismissed: boolean | null;
  dismiss: () => void;
}

const StorageNoticeContext = createContext<StorageNoticeContextValue | null>(null);

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  // null while unread: the banner must not flash in before we know.
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    let seen = false;
    try {
      seen =
        localStorage.getItem(STORAGE_KEY) === "true" ||
        localStorage.getItem(LEGACY_KEY) !== null;
    } catch {
      // Private browsing, or storage blocked entirely. Treat as not dismissed:
      // showing the notice once more is the harmless direction to fail in.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(seen);
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      /* the notice still closes for this session */
    }
    setDismissed(true);
  }, []);

  return (
    <StorageNoticeContext.Provider value={{ dismissed, dismiss }}>
      {children}
    </StorageNoticeContext.Provider>
  );
}

export function useCookieConsent() {
  const ctx = useContext(StorageNoticeContext);
  if (!ctx) throw new Error("useCookieConsent must be used within CookieConsentProvider");
  return ctx;
}
