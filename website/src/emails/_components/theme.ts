// Centralised colour + type tokens so every email matches the site.
// Keep hex literals — email clients (esp. Outlook) don't resolve CSS vars.

export const theme = {
  // Brand
  accent:        "#C17C5A",
  accentHover:   "#A9683E",
  // Neutrals
  background:    "#FAF7F2",
  surface:       "#FFFFFF",
  border:        "#E8E3DB",
  foreground:    "#1A1814",
  muted:         "#6B6760",
  mutedStrong:   "#4A4740",
  // Type
  serifStack:    "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
  sansStack:     "-apple-system, BlinkMacSystemFont, 'Inter', 'Helvetica Neue', Arial, sans-serif",
} as const;

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://wallplace.co.uk";
