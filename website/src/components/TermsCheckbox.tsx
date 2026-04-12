"use client";

import Link from "next/link";

interface TermsCheckboxProps {
  termsType: "platform_tos" | "artist_agreement" | "venue_agreement";
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const labelContent: Record<TermsCheckboxProps["termsType"], React.ReactNode> = {
  platform_tos: (
    <>
      I agree to the{" "}
      <Link href="/terms" className="text-accent hover:underline">
        Terms of Service
      </Link>{" "}
      and{" "}
      <Link href="/privacy" className="text-accent hover:underline">
        Privacy Policy
      </Link>
    </>
  ),
  artist_agreement: (
    <>
      I agree to the{" "}
      <Link href="/artist-agreement" className="text-accent hover:underline">
        Artist Agreement
      </Link>
    </>
  ),
  venue_agreement: (
    <>
      I agree to the{" "}
      <Link href="/venue-agreement" className="text-accent hover:underline">
        Venue Partnership Agreement
      </Link>
    </>
  ),
};

export default function TermsCheckbox({
  termsType,
  checked,
  onChange,
}: TermsCheckboxProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded-sm border border-border bg-background checked:bg-accent checked:border-accent focus:outline-none cursor-pointer shrink-0"
      />
      <span className="text-sm text-foreground">{labelContent[termsType]}</span>
    </label>
  );
}
