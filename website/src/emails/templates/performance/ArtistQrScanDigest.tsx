// Stream: notify. Daily QR scan digest — sent the morning after a day
// the artist had at least one scan on any of their works. Skipped on
// quiet days (no false-positive "0 scans yesterday" emails).

import { EmailShell, H1, P, Button, Small, Divider } from "@/emails/_components";
import type { TemplateEntry } from "@/emails/registry-types";

export interface ArtistQrScanDigestProps {
  firstName: string;
  /** Human-readable label for the day being digested (e.g. "Tuesday 28 April"). */
  dayLabel: string;
  /** Total scans across all works on this day. */
  totalScans: number;
  /** Per-work breakdown, ordered by scan count descending. */
  works: Array<{
    workTitle: string;
    venueName: string | null;
    scans: number;
    /** Optional thumbnail URL for the email card. */
    image?: string | null;
  }>;
  /** Deep link to the artist's analytics view. */
  analyticsUrl: string;
}

export function ArtistQrScanDigest({
  firstName,
  dayLabel,
  totalScans,
  works,
  analyticsUrl,
}: ArtistQrScanDigestProps) {
  const headline =
    totalScans === 1
      ? `1 scan yesterday`
      : `${totalScans} scans yesterday`;
  const topWork = works[0];
  return (
    <EmailShell
      stream="notify"
      persona="artist"
      category="digests"
      preview={`${headline} — ${dayLabel}`}
    >
      <H1>{headline}</H1>
      <P>
        Hi {firstName} — your QR codes pulled {totalScans === 1 ? "a scan" : "scans"} on{" "}
        {dayLabel}. Each one is a person who saw your work in a venue and
        cared enough to look you up.
      </P>
      {topWork && (
        <P>
          <strong>Top performer:</strong> {topWork.workTitle}
          {topWork.venueName ? ` at ${topWork.venueName}` : ""} (
          {topWork.scans} scan{topWork.scans === 1 ? "" : "s"}).
        </P>
      )}
      {works.length > 1 && (
        <>
          <Divider />
          <P>Across all your placements:</P>
          <ul style={{ fontSize: 14, color: "#4A4740", lineHeight: 1.7, paddingLeft: 18, margin: "8px 0 16px" }}>
            {works.slice(0, 8).map((w) => (
              <li key={`${w.workTitle}-${w.venueName ?? ""}`}>
                <strong>{w.workTitle}</strong>
                {w.venueName ? ` — ${w.venueName}` : ""} · {w.scans} scan
                {w.scans === 1 ? "" : "s"}
              </li>
            ))}
          </ul>
          {works.length > 8 && (
            <Small>+ {works.length - 8} more — see the full list in your analytics.</Small>
          )}
        </>
      )}
      <Button href={analyticsUrl} persona="artist">Open analytics</Button>
      <Small>
        We only email you on days you actually got scans — no quiet-day digests.
      </Small>
    </EmailShell>
  );
}

export const mock: ArtistQrScanDigestProps = {
  firstName: "Maya",
  dayLabel: "Tuesday 28 April",
  totalScans: 9,
  works: [
    { workTitle: "Last Light on Mare Street", venueName: "The Copper Kettle", scans: 5 },
    { workTitle: "Concrete Calm I", venueName: "Roots & Vine", scans: 3 },
    { workTitle: "Threshold Study, Barbican", venueName: null, scans: 1 },
  ],
  analyticsUrl: "https://wallplace.co.uk/artist-portal/analytics",
};

const entry: TemplateEntry<ArtistQrScanDigestProps> = {
  id: "artist_qr_scan_digest",
  name: "QR scan digest (artist)",
  description: "Daily morning summary of yesterday's QR scans, skipped on quiet days.",
  stream: "notify",
  persona: "artist",
  category: "digests",
  subject: "{{totalScans}} QR scan{{plural}} yesterday",
  previewText: "Each scan is a person who saw your work in a venue.",
  component: ArtistQrScanDigest,
  mock,
  canUnsubscribe: true,
  hasInAppEquivalent: false,
  priority: 3,
};
export default entry;
