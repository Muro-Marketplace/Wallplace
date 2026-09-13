// Printable QR label.
//
// Three independent choices:
//   1. **size** (LabelSize): Small to Extra Large. Drives sheet density.
//   2. **style** (LabelStyle): what the label says. Minimal (artist + title +
//      QR, plus any rows ticked), Editorial (gallery-style framing with medium,
//      size and price), or QR Only (the code and the web address, on a square
//      label).
//   3. **theme** (LabelTheme): colour scheme. Default is the classic
//      white-on-paper look.
//
// Geometry lives in label-layout.ts so the label, the sheet grid and the
// preview's page count all read the same numbers. Owner report 13 September
// 2026: "QR Only" was a size, so it squeezed a full label into 25mm.

import { getLabelTheme, type LabelTheme } from "@/lib/profile-themes";
import { labelDims, mm, type LabelSize, type LabelStyle } from "./label-layout";

interface QRLabelProps {
  artistName: string;
  workTitle?: string;
  workMedium?: string;
  workDimensions?: string;
  workPrice?: string;
  qrDataUrl: string;
  isPortfolioLabel?: boolean;
  labelSize?: LabelSize;
  /** Visual treatment. Defaults to "minimal". */
  labelStyle?: LabelStyle;
  tagline?: string;
  /** Per-label row toggles. Minimal and Editorial print these rows; QR Only never does. */
  showMedium?: boolean;
  showDimensions?: boolean;
  showPrice?: boolean;
  /** Colour theme id, free for every plan. */
  labelTheme?: string;
}

export default function QRLabel({
  artistName,
  workTitle,
  workMedium,
  workDimensions,
  workPrice,
  qrDataUrl,
  isPortfolioLabel,
  labelSize = "medium",
  labelStyle = "minimal",
  tagline,
  showMedium = true,
  showDimensions = true,
  showPrice = true,
  labelTheme,
}: QRLabelProps) {
  // Editorial dims come back portrait. Font sizing keys off the size name, not
  // the swapped numbers, so a portrait card keeps its size's type scale.
  const dims = labelDims(labelSize, labelStyle);
  const isLargeSize = labelSize === "large" || labelSize === "xlarge";
  const isSmallSize = labelSize === "small";
  const theme: LabelTheme = getLabelTheme(labelTheme);

  // ── Style: QR Only ───────────────────────────────────────────────
  if (labelStyle === "qr_only") {
    const qrBox = mm(dims.qrMm);
    return (
      <div
        className="qr-label"
        style={{
          width: mm(dims.widthMm),
          height: mm(dims.heightMm),
          boxSizing: "border-box",
          pageBreakInside: "avoid",
          backgroundColor: theme.bg,
          border: `0.5pt solid ${theme.border}`,
          padding: "2mm",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1mm",
          overflow: "hidden",
        }}
      >
        {/* QR codes need a high-contrast quiet zone: on dark themes the dots
            stay dark on a white square. */}
        <div
          style={{
            width: qrBox,
            height: qrBox,
            flexShrink: 0,
            boxSizing: "border-box",
            backgroundColor: "#fff",
            padding: theme.qrDark ? "0.8mm" : 0,
            borderRadius: 1,
            lineHeight: 0,
          }}
        >
          {qrDataUrl && (
            <img src={qrDataUrl} alt="QR code" style={{ width: "100%", height: "100%", display: "block" }} />
          )}
        </div>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: isSmallSize ? "5pt" : "6.5pt",
            color: theme.subtle,
            margin: 0,
            letterSpacing: "0.05em",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          wallplace.co.uk
        </p>
      </div>
    );
  }

  const containerStyle: React.CSSProperties = {
    width: mm(dims.widthMm),
    height: mm(dims.heightMm),
    border: `0.5pt solid ${theme.border}`,
    boxSizing: "border-box",
    pageBreakInside: "avoid",
    backgroundColor: theme.bg,
    fontFamily: "var(--font-sans)",
    // A long title clips inside its own card rather than spilling onto the next.
    overflow: "hidden",
  };

  // ── Style: Editorial ─────────────────────────────────────────────
  if (labelStyle === "editorial") {
    return (
      <div
        className="qr-label"
        style={{
          ...containerStyle,
          padding: isLargeSize ? "6mm 5mm" : isSmallSize ? "3mm" : "4.5mm",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ width: "100%", textAlign: "center" }}>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: isLargeSize ? "7pt" : "6pt",
              color: theme.subtle,
              margin: 0,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            {artistName}
          </p>
          {!isPortfolioLabel && workTitle && (
            <p
              style={{
                fontFamily: "var(--font-serif)",
                // Editorial portrait at medium gets a narrower card, so the
                // title drops to 11pt to keep longer titles like "Vietnamese
                // Village" inside the border. Large and Extra Large stay at 16pt.
                fontSize: isLargeSize ? "16pt" : isSmallSize ? "10pt" : "11pt",
                fontWeight: 400,
                color: theme.fg,
                margin: "1.5mm 0 0 0",
                lineHeight: 1.15,
                // Wrap between words, never inside one: automatic hyphenation
                // split "Vil-lage" across two lines (owner follow-up, 13
                // September 2026). Only a single word wider than the card
                // breaks, and without a hyphen.
                overflowWrap: "break-word",
                hyphens: "manual",
              }}
            >
              {workTitle}
            </p>
          )}
          {isPortfolioLabel && (
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: isLargeSize ? "12pt" : "10pt",
                fontStyle: "italic",
                color: theme.subtle,
                margin: "1.5mm 0 0 0",
              }}
            >
              Scan to view full portfolio
            </p>
          )}
          <div
            style={{
              width: isLargeSize ? "10mm" : "6mm",
              height: "0.4pt",
              backgroundColor: "#C17C5A",
              margin: "2mm auto 0",
            }}
          />
        </div>

        <div
          style={{
            width: mm(dims.qrMm),
            height: mm(dims.qrMm),
            flexShrink: 0,
            backgroundColor: theme.qrDark ? "#fff" : "transparent",
            padding: theme.qrDark ? "0.8mm" : 0,
            borderRadius: 1,
            lineHeight: 0,
          }}
        >
          {qrDataUrl && (
            <img src={qrDataUrl} alt="QR code" style={{ width: "100%", height: "100%", display: "block" }} />
          )}
        </div>

        <div style={{ width: "100%", textAlign: "center" }}>
          {!isPortfolioLabel && (
            <div
              style={{
                fontSize: isLargeSize ? "7pt" : "6pt",
                color: theme.subtle,
                lineHeight: 1.4,
              }}
            >
              {showMedium && workMedium && <div>{workMedium}</div>}
              {showDimensions && workDimensions && <div>{workDimensions}</div>}
              {showPrice && workPrice && (
                <div style={{ color: "#C17C5A", fontWeight: 500, marginTop: "1mm" }}>{workPrice}</div>
              )}
            </div>
          )}
          {isLargeSize && tagline && (
            <p
              style={{
                fontSize: "7pt",
                color: theme.subtle,
                fontStyle: "italic",
                margin: "2mm 0 0 0",
              }}
            >
              {tagline}
            </p>
          )}
          <p
            style={{
              fontSize: isSmallSize ? "5pt" : "6pt",
              color: theme.subtle,
              margin: "1.5mm 0 0 0",
              letterSpacing: "0.05em",
            }}
          >
            wallplace.co.uk
          </p>
        </div>
      </div>
    );
  }

  // ── Style: Minimal (default) ─────────────────────────────────────
  return (
    <div
      className="qr-label"
      style={{
        ...containerStyle,
        padding: isSmallSize ? "3mm" : isLargeSize ? "5mm" : "4mm",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "stretch",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flex: 1,
          minWidth: 0,
          paddingRight: "3mm",
        }}
      >
        <div>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: isLargeSize ? "14pt" : isSmallSize ? "9pt" : "11pt",
              fontWeight: 600,
              color: theme.fg,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {artistName}
          </p>
          {isPortfolioLabel ? (
            <p
              style={{
                fontSize: "8pt",
                color: theme.subtle,
                margin: "2mm 0 0 0",
                lineHeight: 1.3,
                fontStyle: "italic",
              }}
            >
              Scan to view full portfolio
            </p>
          ) : (
            workTitle && (
              <p
                style={{
                  fontSize: isLargeSize ? "10pt" : "9pt",
                  fontWeight: 500,
                  color: theme.fg,
                  margin: "2mm 0 0 0",
                  lineHeight: 1.3,
                  // As on Editorial: wrap between words, and break only a word
                  // too wide for the column, so it never runs under the QR code.
                  overflowWrap: "break-word",
                  hyphens: "manual",
                }}
              >
                {workTitle}
              </p>
            )
          )}
          {/* The rows this label has ticked. Owner follow-up, 13 September
              2026: Minimal used to ignore them, so its tick boxes did nothing. */}
          {!isPortfolioLabel &&
            ((showMedium && workMedium) || (showDimensions && workDimensions) || (showPrice && workPrice)) && (
              <div
                style={{
                  margin: "1.5mm 0 0 0",
                  fontSize: isLargeSize ? "7.5pt" : isSmallSize ? "5.5pt" : "6.5pt",
                  color: theme.subtle,
                  lineHeight: 1.35,
                }}
              >
                {showMedium && workMedium && <div>{workMedium}</div>}
                {showDimensions && workDimensions && <div>{workDimensions}</div>}
                {showPrice && workPrice && <div style={{ color: "#C17C5A", fontWeight: 500 }}>{workPrice}</div>}
              </div>
            )}
        </div>
        {isLargeSize && tagline && (
          <p
            style={{
              fontSize: "7.5pt",
              color: theme.subtle,
              margin: "2mm 0 0 0",
              lineHeight: 1.3,
              fontStyle: "italic",
            }}
          >
            {tagline}
          </p>
        )}
        <p
          style={{
            fontSize: isSmallSize ? "5.5pt" : "6.5pt",
            color: theme.subtle,
            margin: 0,
            letterSpacing: "0.03em",
          }}
        >
          wallplace.co.uk
        </p>
      </div>
      <div
        style={{
          width: mm(dims.qrMm),
          height: mm(dims.qrMm),
          flexShrink: 0,
          alignSelf: "center",
          backgroundColor: theme.qrDark ? "#fff" : "transparent",
          padding: theme.qrDark ? "0.8mm" : 0,
          borderRadius: 1,
          lineHeight: 0,
        }}
      >
        {qrDataUrl && (
          <img src={qrDataUrl} alt="QR code" style={{ width: "100%", height: "100%", display: "block" }} />
        )}
      </div>
    </div>
  );
}
