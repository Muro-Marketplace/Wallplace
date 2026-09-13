/**
 * Printable label geometry: the sizes and styles on offer, each label's
 * dimensions, and how many fit on an A4 sheet.
 *
 * Owner report 13 September 2026: "QR Only" used to sit among the sizes, so
 * choosing it shrank the chosen style to 25mm instead of printing just the code.
 * Style and size are separate choices now, and the sheet grid is worked out from
 * each label's real dimensions, so no combination runs off the page.
 */

export type LabelSize = "small" | "medium" | "large" | "xlarge";
export type LabelStyle = "minimal" | "editorial" | "qr_only";

/** The printable area of an A4 page inside its 10mm margins. */
export const SHEET_WIDTH_MM = 190;
export const SHEET_HEIGHT_MM = 277;

export const LABEL_SIZES: { key: LabelSize; label: string }[] = [
  { key: "small", label: "Small" },
  { key: "medium", label: "Medium" },
  { key: "large", label: "Large" },
  { key: "xlarge", label: "Extra Large" },
];

export const LABEL_STYLES: {
  key: LabelStyle;
  name: string;
  description: string;
  /** The size a style starts at when it is picked on a labels page. */
  defaultSize: LabelSize;
}[] = [
  { key: "minimal", name: "Minimal", description: "Artist, title and QR code, plus any rows you tick.", defaultSize: "medium" },
  {
    key: "editorial",
    name: "Editorial",
    description: "Adds medium, size and price, like a gallery label.",
    defaultSize: "large",
  },
  { key: "qr_only", name: "QR Only", description: "Just the QR code and the web address.", defaultSize: "small" },
];

/** Minimal's landscape card at each size. Editorial turns the same card portrait. */
const CARD_MM: Record<LabelSize, { width: number; height: number; qr: number }> = {
  small: { width: 55, height: 35, qr: 20 },
  medium: { width: 70, height: 50, qr: 28 },
  large: { width: 90, height: 60, qr: 34 },
  xlarge: { width: 130, height: 80, qr: 44 },
};

/** A QR Only label is a square: the code, with the web address beneath it. */
const QR_ONLY_SIDE_MM: Record<LabelSize, number> = { small: 25, medium: 35, large: 45, xlarge: 60 };

export interface LabelDims {
  widthMm: number;
  heightMm: number;
  qrMm: number;
}

export function labelDims(size: LabelSize, style: LabelStyle): LabelDims {
  if (style === "qr_only") {
    const side = QR_ONLY_SIDE_MM[size];
    // 2mm padding on each side, and about 4mm for the address line.
    return { widthMm: side, heightMm: side, qrMm: side - 8 };
  }
  const card = CARD_MM[size];
  return style === "editorial"
    ? { widthMm: card.height, heightMm: card.width, qrMm: card.qr }
    : { widthMm: card.width, heightMm: card.height, qrMm: card.qr };
}

/**
 * How much bigger an Extra Large label sets Large's type and spacing: the ratio
 * of the two cards' short sides, a third in every style. Small, Medium and Large
 * each have type of their own, so they stay at 1. Owner follow-up, 13 September
 * 2026: Extra Large used Large's sizes as they were, so its writing looked lost.
 */
export function typeScale(size: LabelSize, style: LabelStyle): number {
  if (size !== "xlarge") return 1;
  const shortSide = (dims: LabelDims) => Math.min(dims.widthMm, dims.heightMm);
  return shortSide(labelDims("xlarge", style)) / shortSide(labelDims("large", style));
}

export interface SheetLayout extends LabelDims {
  cols: number;
  rows: number;
  perPage: number;
}

/** As many whole labels as fit across and down the printable area. */
export function sheetLayout(size: LabelSize, style: LabelStyle): SheetLayout {
  const dims = labelDims(size, style);
  const cols = Math.max(1, Math.floor(SHEET_WIDTH_MM / dims.widthMm));
  const rows = Math.max(1, Math.floor(SHEET_HEIGHT_MM / dims.heightMm));
  return { ...dims, cols, rows, perPage: cols * rows };
}

/** A size key, or Small for anything else, such as the retired "micro". */
export function toLabelSize(value: unknown): LabelSize {
  return LABEL_SIZES.some((s) => s.key === value) ? (value as LabelSize) : "small";
}

export const mm = (value: number) => `${value}mm`;
