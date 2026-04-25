"use client";

/**
 * WorksPanel — left-side rail in the editor showing placeable works.
 *
 * Presentational only — the parent owns the data lifecycle. This makes
 * it easy for the parent to keep its own `workById` map for image
 * lookups inside the canvas.
 *
 * The panel emits two interactions:
 *   - onSelect(work)            user clicked a thumbnail (parent decides
 *                               whether to add to the wall)
 *   - drag with type
 *     "application/x-wallplace-work" carrying the work id, so the canvas
 *     can place at drop coordinates.
 */

import { useState } from "react";
import type { VisualizerMode } from "@/lib/visualizer/types";

export interface PanelWork {
  id: string;
  title: string;
  imageUrl: string;
  artistName?: string;
  /** "60 x 80 cm" if known. Helps users place at realistic scale. */
  dimensions?: string;
}

interface Props {
  mode: VisualizerMode;
  works: PanelWork[];
  loading?: boolean;
  error?: string | null;
  onSelect?: (work: PanelWork) => void;
}

export default function WorksPanel({
  mode,
  works,
  loading,
  error,
  onSelect,
}: Props) {
  const [filter, setFilter] = useState("");

  const filtered = filter.trim()
    ? works.filter((w) =>
        (w.title + " " + (w.artistName ?? ""))
          .toLowerCase()
          .includes(filter.toLowerCase()),
      )
    : works;

  return (
    <aside className="h-full w-60 shrink-0 border-r border-black/5 bg-white/60 backdrop-blur flex flex-col">
      <div className="px-3 py-3 border-b border-black/5">
        <p className="text-[10px] uppercase tracking-[0.18em] text-stone-500 mb-1">
          {mode === "venue_my_walls"
            ? "Hosted works"
            : mode === "customer_artwork_page"
              ? "This artwork"
              : "Your works"}
        </p>
        <input
          type="search"
          placeholder="Search…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          disabled={works.length <= 1}
          className="w-full text-xs px-2 py-1.5 rounded border border-black/10 focus:border-black/30 focus:outline-none bg-white disabled:bg-stone-50 disabled:text-stone-400"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading && <p className="text-xs text-stone-400 px-2 py-3">Loading…</p>}
        {error && (
          <p className="text-xs text-red-600 px-2 py-3">
            Couldn&apos;t load works.
          </p>
        )}
        {!loading && !error && filtered.length === 0 && (
          <p className="text-xs text-stone-500 px-2 py-3">
            {mode === "venue_my_walls"
              ? "No hosted works yet."
              : "No works match."}
          </p>
        )}

        <ul className="grid grid-cols-2 gap-2">
          {filtered.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                draggable
                onClick={() => onSelect?.(w)}
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/x-wallplace-work", w.id);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                className="group block w-full text-left rounded overflow-hidden border border-black/5 bg-white hover:border-black/20 transition cursor-grab active:cursor-grabbing"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={w.imageUrl}
                  alt={w.title}
                  className="block w-full aspect-square object-cover"
                  loading="lazy"
                />
                <div className="px-2 py-1.5">
                  <p className="text-[11px] font-medium text-stone-800 truncate">
                    {w.title}
                  </p>
                  {w.dimensions && (
                    <p className="text-[10px] text-stone-500 truncate">
                      {w.dimensions}
                    </p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
