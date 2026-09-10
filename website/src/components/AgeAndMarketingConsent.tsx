"use client";

/**
 * The two consent controls every signup form needs, in one place so the three
 * forms cannot drift apart on either of them.
 *
 * Age (UK compliance audit, finding CHI-1)
 *   The Terms and the Artist Agreement both say "you must be at least 18", and
 *   nothing anywhere asked. A self-declaration is the proportionate control
 *   here: Wallplace has no pornography, no children's product and no feature a
 *   child would seek out, so the Online Safety Act children's access assessment
 *   is the thing that has to exist, not an ID check. Anything stronger, ID
 *   documents or facial age estimation, would be disproportionate and would
 *   create a biometric processing problem the platform currently does not have.
 *
 *   Required, and unticked. A pre-ticked box is not a declaration.
 *
 * Marketing (finding MKT-1)
 *   PECR reg 22(3)'s soft opt-in has two limbs and Wallplace met neither: a
 *   venue on a free account has no sale or negotiations for a sale, and no
 *   form ever offered "a simple means of refusing" at the point of collection.
 *   So consent is required, and consent means unticked, specific and
 *   affirmative. Optional: the form submits perfectly well with it left alone,
 *   which is what makes it a genuine choice rather than a toll.
 */

import Link from "next/link";

interface AgeAndMarketingConsentProps {
  ageConfirmed: boolean;
  onAgeChange: (value: boolean) => void;
  marketingOptIn: boolean;
  onMarketingChange: (value: boolean) => void;
  /** Light copy sits on the photographic signup backdrops; dark on white cards. */
  tone?: "light" | "dark";
}

export default function AgeAndMarketingConsent({
  ageConfirmed,
  onAgeChange,
  marketingOptIn,
  onMarketingChange,
  tone = "dark",
}: AgeAndMarketingConsentProps) {
  const textClass = tone === "light" ? "text-white/90" : "text-foreground";
  const mutedClass = tone === "light" ? "text-white/60" : "text-muted";
  const linkClass = tone === "light" ? "underline text-white" : "text-accent hover:underline";

  return (
    <div className="space-y-3">
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={ageConfirmed}
          onChange={(e) => onAgeChange(e.target.checked)}
          required
          aria-required="true"
          data-testid="age-confirm"
          className="mt-0.5 w-4 h-4 rounded-sm border border-border bg-background checked:bg-accent checked:border-accent focus:outline-none cursor-pointer shrink-0"
        />
        <span className={`text-sm ${textClass}`}>
          I am 18 or over.{" "}
          <span className={`text-xs ${mutedClass}`}>
            Wallplace is for adults. See our{" "}
            <Link href="/terms" className={linkClass}>
              Terms
            </Link>
            .
          </span>
        </span>
      </label>

      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={marketingOptIn}
          onChange={(e) => onMarketingChange(e.target.checked)}
          data-testid="marketing-opt-in"
          className="mt-0.5 w-4 h-4 rounded-sm border border-border bg-background checked:bg-accent checked:border-accent focus:outline-none cursor-pointer shrink-0"
        />
        <span className={`text-sm ${textClass}`}>
          Email me tips and recommendations.{" "}
          <span className={`text-xs ${mutedClass}`}>
            Optional. You will still get everything about your account, your
            orders and your placements. Change this any time in your account
            settings.
          </span>
        </span>
      </label>
    </div>
  );
}
