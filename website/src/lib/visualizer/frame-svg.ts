/**
 * Frame SVG generator.
 *
 * Each frame style returns a self-contained SVG string sized to the
 * outer item bounds. The render service rasterises it via `sharp` and
 * composites the artwork on top inside the inner cutout area.
 *
 * Why SVG (not PNG textures)?
 *   - Resolution-independent — same source scales from a 200px chip in
 *     the editor to a 4K render with no asset duplication.
 *   - librsvg (sharp's renderer) supports gradients + feTurbulence +
 *     pattern fills, which is enough for "looks like wood / gold /
 *     painted metal" without an art pipeline.
 *   - Zero additional network/disk overhead — the SVG is generated on
 *     demand alongside the render.
 *
 * Style coverage:
 *   - classic_wood: linear gradient base + turbulence-driven grain overlay
 *     with darkening composite. Bevel highlight on top edge for depth.
 *   - ornate_gold: 5-stop metallic gradient + inner bright band + soft
 *     edge highlight. Reads "polished gold" vs "antique gold" via
 *     finish-tuned stops.
 *   - thin_black: 3-stop gradient with subtle top-edge highlight,
 *     matching the "matte / gloss / white" finishes.
 *   - floater: solid finish colour with a thin black gap inset on the
 *     inner edge — the gap is what gives floater frames their distinctive
 *     look.
 *
 * Inner cut-out:
 *   The artwork sits inside the frame at (borderPx, borderPx) up to
 *   (outerW - borderPx, outerH - borderPx). The SVG renders an opaque
 *   frame all the way through, then a transparent inner rect punches
 *   the artwork window. The render-service composites the artwork
 *   underneath (so transparent frame pixels show the artwork).
 */

import type { FrameConfig } from "./types";

interface FrameSvgInput {
  outerWidthPx: number;
  outerHeightPx: number;
  borderPx: number;
  frame: FrameConfig;
}

/**
 * Generate the SVG string for a frame. Returns null when the style is
 * "none" (no frame to draw) or when the border has no thickness.
 */
export function generateFrameSvg(input: FrameSvgInput): string | null {
  const { outerWidthPx, outerHeightPx, borderPx, frame } = input;
  if (frame.style === "none" || borderPx <= 0) return null;

  const w = Math.max(1, Math.round(outerWidthPx));
  const h = Math.max(1, Math.round(outerHeightPx));
  const b = Math.max(1, Math.round(borderPx));

  switch (frame.style) {
    case "classic_wood":
      return classicWoodSvg(w, h, b, frame.finish);
    case "ornate_gold":
      return ornateGoldSvg(w, h, b, frame.finish);
    case "thin_black":
      return thinBlackSvg(w, h, b, frame.finish);
    case "floater":
      return floaterSvg(w, h, b, frame.finish);
    default:
      return null;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Build the "frame ring" that wraps the SVG body. We use a single
 * shape with the even-odd fill-rule trick: outer rect + inner rect cut
 * out of it. That gives us a single fillable region (the frame
 * material) and leaves the inner area transparent for the artwork to
 * show through.
 */
function frameRingPath(w: number, h: number, b: number): string {
  // Outer rectangle (clockwise) + inner rectangle (counter-clockwise)
  // → with fill-rule="evenodd" the inner punches a hole.
  const inner = {
    x: b,
    y: b,
    w: w - b * 2,
    h: h - b * 2,
  };
  return [
    `M 0 0 H ${w} V ${h} H 0 Z`,
    `M ${inner.x} ${inner.y} V ${inner.y + inner.h} H ${inner.x + inner.w} V ${inner.y} Z`,
  ].join(" ");
}

// ── Classic wood ────────────────────────────────────────────────────────

function classicWoodSvg(
  w: number,
  h: number,
  b: number,
  finish: string,
): string {
  // Per-finish colour palette.
  const finishMap: Record<string, { c1: string; c2: string; c3: string; grain: string }> = {
    natural: { c1: "#D9B989", c2: "#9C7A4F", c3: "#7C5E3A", grain: "#5A3F22" },
    walnut: { c1: "#8C5A35", c2: "#5C3A24", c3: "#3D2818", grain: "#1F1208" },
    ebony: { c1: "#3A2C24", c2: "#1F1714", c3: "#0F0A08", grain: "#000000" },
  };
  const c = finishMap[finish] ?? finishMap.natural;

  // Choose a grain frequency that scales with the smaller dimension —
  // bigger frame, finer grain (looks consistent across sizes).
  const grainScale = Math.max(0.005, 0.012 - Math.min(w, h) / 80000);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    <defs>
      <linearGradient id="woodBase" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"   stop-color="${c.c1}" />
        <stop offset="48%"  stop-color="${c.c2}" />
        <stop offset="100%" stop-color="${c.c3}" />
      </linearGradient>
      <filter id="grainFilter" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="${grainScale} ${grainScale * 14}"
                      numOctaves="2" seed="3" result="noise" />
        <feColorMatrix in="noise" type="matrix"
          values="0 0 0 0 0
                  0 0 0 0 0
                  0 0 0 0 0
                  0 0 0 0.5 0" result="grain" />
        <feComposite in="grain" in2="SourceGraphic" operator="in" result="grainMasked" />
        <feBlend in="SourceGraphic" in2="grainMasked" mode="multiply" />
      </filter>
      <linearGradient id="woodHighlight" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"  stop-color="white" stop-opacity="0.18" />
        <stop offset="40%" stop-color="white" stop-opacity="0" />
        <stop offset="60%" stop-color="black" stop-opacity="0" />
        <stop offset="100%" stop-color="black" stop-opacity="0.15" />
      </linearGradient>
    </defs>
    <!-- Frame ring with wood gradient + grain filter -->
    <path d="${frameRingPath(w, h, b)}" fill="url(#woodBase)" fill-rule="evenodd"
          filter="url(#grainFilter)" />
    <!-- Bevel highlight on top + shadow on bottom (frame-shaped) -->
    <path d="${frameRingPath(w, h, b)}" fill="url(#woodHighlight)" fill-rule="evenodd" />
    <!-- Inner edge dark line (rabbet) -->
    <rect x="${b - 1}" y="${b - 1}" width="${w - 2 * (b - 1)}" height="${h - 2 * (b - 1)}"
          fill="none" stroke="${c.grain}" stroke-width="1.5" stroke-opacity="0.8" />
  </svg>`;
}

// ── Ornate gold ─────────────────────────────────────────────────────────

function ornateGoldSvg(
  w: number,
  h: number,
  b: number,
  finish: string,
): string {
  // Metallic gradient stops per finish.
  const finishMap: Record<
    string,
    { dark: string; mid: string; bright: string; warm: string }
  > = {
    antique: { dark: "#7A5510", mid: "#A07726", bright: "#D9B043", warm: "#5A3D08" },
    polished: { dark: "#9C6F0E", mid: "#D4AF37", bright: "#FFEB91", warm: "#7A5505" },
    champagne: { dark: "#9A8855", mid: "#C9B481", bright: "#EFE2B5", warm: "#7A6A40" },
  };
  const c = finishMap[finish] ?? finishMap.antique;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    <defs>
      <linearGradient id="goldBase" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"   stop-color="${c.warm}" />
        <stop offset="20%"  stop-color="${c.mid}"  />
        <stop offset="50%"  stop-color="${c.bright}" />
        <stop offset="78%"  stop-color="${c.mid}"  />
        <stop offset="100%" stop-color="${c.dark}" />
      </linearGradient>
      <linearGradient id="goldShine" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="white" stop-opacity="0.35" />
        <stop offset="15%"  stop-color="white" stop-opacity="0.05" />
        <stop offset="50%"  stop-color="white" stop-opacity="0" />
        <stop offset="85%"  stop-color="black" stop-opacity="0.05" />
        <stop offset="100%" stop-color="black" stop-opacity="0.25" />
      </linearGradient>
      <!-- Inner bright band: a thin glow just inside the rabbet for the
           "polished" feel. -->
      <linearGradient id="goldInner" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"   stop-color="${c.bright}" />
        <stop offset="50%"  stop-color="${c.bright}" stop-opacity="0.7" />
        <stop offset="100%" stop-color="${c.warm}" />
      </linearGradient>
    </defs>
    <!-- Main metallic ring -->
    <path d="${frameRingPath(w, h, b)}" fill="url(#goldBase)" fill-rule="evenodd" />
    <!-- Highlight gradient overlay (top brighter than bottom) -->
    <path d="${frameRingPath(w, h, b)}" fill="url(#goldShine)" fill-rule="evenodd" />
    <!-- Inner bright band (1/4 of the border, hugging the artwork) -->
    ${innerBandPath(w, h, b, Math.max(1, Math.round(b * 0.18)), "url(#goldInner)")}
    <!-- Outer thin dark edge so the gold reads against the wall -->
    <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}"
          fill="none" stroke="${c.warm}" stroke-width="1" stroke-opacity="0.7" />
    <!-- Inner thin dark line (rabbet shadow) -->
    <rect x="${b - 0.5}" y="${b - 0.5}" width="${w - 2 * (b - 0.5)}" height="${h - 2 * (b - 0.5)}"
          fill="none" stroke="${c.dark}" stroke-width="1" stroke-opacity="0.9" />
  </svg>`;
}

// ── Thin black ──────────────────────────────────────────────────────────

function thinBlackSvg(
  w: number,
  h: number,
  b: number,
  finish: string,
): string {
  const finishMap: Record<
    string,
    { c1: string; c2: string; highlight: number }
  > = {
    matte: { c1: "#1A1A1A", c2: "#2A2A2A", highlight: 0.06 },
    gloss: { c1: "#000000", c2: "#1A1A1A", highlight: 0.22 },
    white: { c1: "#F5F1EB", c2: "#E8E2D6", highlight: 0.04 },
  };
  const c = finishMap[finish] ?? finishMap.matte;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    <defs>
      <linearGradient id="blackBase" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="${c.c2}" />
        <stop offset="50%"  stop-color="${c.c1}" />
        <stop offset="100%" stop-color="${c.c2}" />
      </linearGradient>
      <linearGradient id="blackShine" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="white" stop-opacity="${c.highlight}" />
        <stop offset="30%"  stop-color="white" stop-opacity="0" />
      </linearGradient>
    </defs>
    <path d="${frameRingPath(w, h, b)}" fill="url(#blackBase)" fill-rule="evenodd" />
    <path d="${frameRingPath(w, h, b)}" fill="url(#blackShine)" fill-rule="evenodd" />
  </svg>`;
}

// ── Floater ─────────────────────────────────────────────────────────────

function floaterSvg(
  w: number,
  h: number,
  b: number,
  finish: string,
): string {
  // Floater frames are clean, one-tone wood/painted profiles. The
  // signature is the *gap* — a thin shadow visible between the artwork
  // edge and the inner frame face.
  const finishMap: Record<string, { c1: string; c2: string }> = {
    natural: { c1: "#A1856A", c2: "#7C6347" },
    white: { c1: "#F5F1EB", c2: "#E8E2D6" },
    black: { c1: "#1A1A1A", c2: "#0E0E0E" },
  };
  const c = finishMap[finish] ?? finishMap.natural;

  // Floater-gap thickness: ~30% of the border or 4px, whichever larger.
  // The gap sits *inside* the frame thickness — the artwork window stays
  // at (b, b, w-2b, h-2b), and the gap is a ring of `gap` pixels just
  // outside that window (i.e. the inner b pixels of the frame change
  // from frame-colour to black).
  const gap = Math.max(2, Math.min(Math.round(b * 0.3), 8));

  // Outer rect for the gap ring (a square `gap` pixels outside the artwork).
  const outerGapX = b - gap;
  const outerGapY = b - gap;
  const outerGapW = w - 2 * outerGapX;
  const outerGapH = h - 2 * outerGapY;
  // Inner rect = the artwork window itself, punched out so it stays transparent.
  const innerX = b;
  const innerY = b;
  const innerW = w - 2 * b;
  const innerH = h - 2 * b;

  // Two even-odd ring paths.
  const framePath = frameRingPath(w, h, b);
  const gapPath = [
    `M ${outerGapX} ${outerGapY} H ${outerGapX + outerGapW} V ${outerGapY + outerGapH} H ${outerGapX} Z`,
    `M ${innerX} ${innerY} V ${innerY + innerH} H ${innerX + innerW} V ${innerY} Z`,
  ].join(" ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    <defs>
      <linearGradient id="floatBase" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"   stop-color="${c.c1}" />
        <stop offset="100%" stop-color="${c.c2}" />
      </linearGradient>
    </defs>
    <!-- Outer frame ring (frame material, with the artwork+gap punched out) -->
    <path d="${framePath}" fill="url(#floatBase)" fill-rule="evenodd" />
    <!-- Gap ring: black band hugging the artwork -->
    <path d="${gapPath}" fill="#0A0A0A" fill-rule="evenodd" />
  </svg>`;
}

// ── Inner band utility ──────────────────────────────────────────────────

/**
 * Render a thin band sitting just inside the inner edge of the frame,
 * `bandPx` thick, filled with the given paint string. Used by ornate
 * gold to add a polished "lip" detail.
 */
function innerBandPath(
  w: number,
  h: number,
  b: number,
  bandPx: number,
  fillRef: string,
): string {
  const x = b;
  const y = b;
  const innerW = w - 2 * b;
  const innerH = h - 2 * b;

  // Outer-of-band rect (= frame inner edge) + inner-of-band rect (a hole).
  const outerPath = `M ${x} ${y} H ${x + innerW} V ${y + innerH} H ${x} Z`;
  const innerPath = `M ${x + bandPx} ${y + bandPx} V ${y + innerH - bandPx} H ${x + innerW - bandPx} V ${y + bandPx} Z`;

  return `<path d="${outerPath} ${innerPath}" fill="${fillRef}" fill-rule="evenodd" />`;
}
