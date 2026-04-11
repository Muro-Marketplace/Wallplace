interface QRLabelProps {
  artistName: string;
  workTitle?: string;
  workMedium?: string;
  workDimensions?: string;
  workPrice?: string;
  qrDataUrl: string;
  isPortfolioLabel?: boolean;
}

export default function QRLabel({
  artistName,
  workTitle,
  workMedium,
  workDimensions,
  workPrice,
  qrDataUrl,
  isPortfolioLabel,
}: QRLabelProps) {
  return (
    <div
      className="qr-label"
      style={{
        width: "70mm",
        height: "50mm",
        border: "0.5pt solid #ddd",
        padding: "4mm",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "stretch",
        fontFamily: "var(--font-sans)",
        boxSizing: "border-box",
        pageBreakInside: "avoid",
        backgroundColor: "#fff",
      }}
    >
      {/* Left: text content */}
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
              fontSize: "11pt",
              fontWeight: 600,
              color: "#1A1A1A",
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
                color: "#6B6B6B",
                margin: "2mm 0 0 0",
                lineHeight: 1.3,
                fontStyle: "italic",
              }}
            >
              Scan to view full portfolio
            </p>
          ) : (
            <>
              {workTitle && (
                <p
                  style={{
                    fontSize: "9pt",
                    fontWeight: 500,
                    color: "#1A1A1A",
                    margin: "2mm 0 0 0",
                    lineHeight: 1.3,
                  }}
                >
                  {workTitle}
                </p>
              )}
              {workMedium && (
                <p
                  style={{
                    fontSize: "7.5pt",
                    color: "#6B6B6B",
                    margin: "1mm 0 0 0",
                    lineHeight: 1.3,
                  }}
                >
                  {workMedium}
                </p>
              )}
              {workDimensions && (
                <p
                  style={{
                    fontSize: "7pt",
                    color: "#999",
                    margin: "0.5mm 0 0 0",
                    lineHeight: 1.3,
                  }}
                >
                  {workDimensions}
                </p>
              )}
              {workPrice && (
                <p
                  style={{
                    fontSize: "8pt",
                    fontWeight: 500,
                    color: "#C17C5A",
                    margin: "1.5mm 0 0 0",
                    lineHeight: 1.3,
                  }}
                >
                  {workPrice}
                </p>
              )}
            </>
          )}
        </div>
        <p
          style={{
            fontSize: "6.5pt",
            color: "#999",
            margin: 0,
            letterSpacing: "0.03em",
          }}
        >
          wallplace.art
        </p>
      </div>

      {/* Right: QR code */}
      <div
        style={{
          width: "28mm",
          height: "28mm",
          flexShrink: 0,
          alignSelf: "center",
        }}
      >
        {qrDataUrl && (
          <img
            src={qrDataUrl}
            alt="QR code"
            style={{ width: "100%", height: "100%", display: "block" }}
          />
        )}
      </div>
    </div>
  );
}
