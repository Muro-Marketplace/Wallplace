/**
 * Wallplace taxonomy (Phase 3 rewrite).
 *
 * A single clean model: 6 top-level disciplines + flat sub-styles per
 * discipline. (Seven entries if you count the "mixed" fallback bucket.)
 *
 * Digital Art replaces Printmaking as a top-level. Printmaking is now a
 * sub-style under Painting + Drawing.
 */
export const DISCIPLINES = [
  {
    id: "photography",
    label: "Photography",
    subStyles: [
      "landscape",
      "portrait",
      "urban",
      "documentary",
      "black-and-white",
      "fine-art",
      "abstract",
      "architectural",
      "still-life",
    ],
  },
  {
    id: "painting",
    label: "Painting",
    subStyles: [
      "abstract",
      "figurative",
      "landscape",
      "portrait",
      "still-life",
      "expressionist",
      "minimalist",
      "pop-art",
      "printmaking",
      "linocut",
      "screen-print",
    ],
  },
  {
    id: "digital",
    label: "Digital Art",
    subStyles: [
      "illustration",
      "3d-render",
      "generative",
      "pixel-art",
      "collage",
      "graphic",
      "typography",
    ],
  },
  {
    id: "drawing",
    label: "Drawing & Illustration",
    subStyles: [
      "botanical",
      "architectural",
      "portrait",
      "fashion",
      "editorial",
      "children",
      "line-art",
      "printmaking",
    ],
  },
  {
    id: "sketching",
    label: "Sketching",
    subStyles: ["urban", "figurative", "travel", "still-life", "architectural"],
  },
  {
    id: "sculpture",
    label: "Sculpture",
    subStyles: ["figurative", "abstract", "ceramic", "metal", "wood", "mixed-media"],
  },
  {
    id: "mixed",
    label: "Mixed / Other",
    subStyles: ["collage", "textile", "installation", "found-object", "multimedia"],
  },
] as const;

export type DisciplineId = (typeof DISCIPLINES)[number]["id"];
export type Discipline = (typeof DISCIPLINES)[number];

/** Find a discipline by its id. */
export function getDisciplineById(id: string): Discipline | null {
  return DISCIPLINES.find((d) => d.id === id) ?? null;
}

/** Get the sub-style list for a given discipline id (empty array if unknown). */
export function getSubStylesForDiscipline(id: string): readonly string[] {
  return getDisciplineById(id)?.subStyles ?? [];
}

/** Human-readable label for a sub-style slug ("black-and-white" -> "Black and white"). */
export function formatSubStyleLabel(slug: string): string {
  if (!slug) return "";
  const spaced = slug.replace(/-/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
