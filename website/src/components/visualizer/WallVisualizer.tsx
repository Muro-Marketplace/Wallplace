"use client";

/**
 * WallVisualizer — top-level editor.
 *
 * Owns:
 *   - layout state (background, dimensions, items, selection)
 *   - works data (fetched once, kept as both list + lookup map)
 *   - high-level interactions: add/move/resize/delete/duplicate/z-order
 *
 * Composes:
 *   - WorksPanel       (presentational)
 *   - WallCanvas       (Konva, dynamic-imported with ssr:false)
 *   - QuotaChip        (self-fetching)
 *   - ItemToolbar      (visible when an item is selected)
 *   - WallConfigBar    (preset/colour/dimensions)
 *
 * Feature flag:
 *   Returns null when WALL_VISUALIZER_V1 is off, so embedding routes
 *   compile + render fine.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { isFlagOn } from "@/lib/feature-flags";
import { defaultFrameConfig } from "@/lib/visualizer/frames";
import { PRESET_WALLS, getPresetWall } from "@/lib/visualizer/preset-walls";
import type {
  LayoutBackground,
  VisualizerEditorProps,
  WallItem,
} from "@/lib/visualizer/types";
import ItemToolbar from "./ItemToolbar";
import QuotaChip from "./QuotaChip";
import WorksPanel, { type PanelWork } from "./WorksPanel";

const WallCanvas = dynamic(() => import("./WallCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-stone-100 grid place-items-center text-xs text-stone-400">
      Loading canvas…
    </div>
  ),
});

// ── Constants ───────────────────────────────────────────────────────────

const DEFAULT_PRESET_ID = "minimal_white";
const DEFAULT_ITEM_WIDTH_CM = 60;
const DEFAULT_ITEM_HEIGHT_CM = 80;

// ── Public props ────────────────────────────────────────────────────────

interface ExtendedProps extends VisualizerEditorProps {
  /** Bearer token for authenticated API calls (quota, works fetch). */
  authToken?: string | null;
  /** Pre-supplied work to lock onto (artwork-page entry). */
  lockedWork?: PanelWork | null;
}

export default function WallVisualizer(props: ExtendedProps) {
  if (!isFlagOn("WALL_VISUALIZER_V1")) return null;
  return <WallVisualizerInner {...props} />;
}

// ── Inner ───────────────────────────────────────────────────────────────

function WallVisualizerInner(props: ExtendedProps) {
  const initialPreset = getPresetWall(DEFAULT_PRESET_ID) ?? PRESET_WALLS[0];

  // ── Layout state ──────────────────────────────────────────────────
  const [background, setBackground] = useState<LayoutBackground>({
    kind: "preset",
    preset_id: initialPreset.id,
    color_hex: initialPreset.defaultColorHex,
  });
  const [widthCm, setWidthCm] = useState(initialPreset.defaultWidthCm);
  const [heightCm, setHeightCm] = useState(initialPreset.defaultHeightCm);
  const [items, setItems] = useState<WallItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [refreshNonce] = useState(0);

  // ── Works data (lifted from WorksPanel) ───────────────────────────
  const [works, setWorks] = useState<PanelWork[]>([]);
  const [worksLoading, setWorksLoading] = useState(false);
  const [worksError, setWorksError] = useState<string | null>(null);

  useEffect(() => {
    if (props.lockedWork) {
      setWorks([props.lockedWork]);
      return;
    }
    if (props.mode === "venue_my_walls") {
      setWorks([]);
      return;
    }
    if (props.mode === "artist_mockup" || props.mode === "artist_showroom") {
      let cancelled = false;
      setWorksLoading(true);
      setWorksError(null);
      fetch("/api/artist-works", {
        headers: props.authToken
          ? { Authorization: `Bearer ${props.authToken}` }
          : {},
        cache: "no-store",
      })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((data: { works?: Array<Record<string, unknown>> }) => {
          if (cancelled) return;
          const mapped = (data.works ?? [])
            .map(normaliseWork)
            .filter((w): w is PanelWork => w !== null);
          setWorks(mapped);
        })
        .catch((e) => !cancelled && setWorksError(String(e)))
        .finally(() => !cancelled && setWorksLoading(false));
      return () => {
        cancelled = true;
      };
    }
  }, [props.mode, props.authToken, props.lockedWork]);

  /** id → work lookup; canvas uses this to load images per item. */
  const workById = useMemo<Record<string, PanelWork>>(
    () => Object.fromEntries(works.map((w) => [w.id, w])),
    [works],
  );

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedItemId) ?? null,
    [items, selectedItemId],
  );

  // ── Wall config handlers ──────────────────────────────────────────
  const handlePickPreset = useCallback((presetId: string) => {
    const preset = getPresetWall(presetId);
    if (!preset) return;
    setBackground({
      kind: "preset",
      preset_id: preset.id,
      color_hex: preset.defaultColorHex,
    });
    setWidthCm(preset.defaultWidthCm);
    setHeightCm(preset.defaultHeightCm);
  }, []);

  const handleColorChange = useCallback((hex: string) => {
    const clean = hex.replace(/^#/, "").toUpperCase();
    if (!/^[0-9A-F]{6}$/.test(clean)) return;
    setBackground((prev) =>
      prev.kind === "preset" ? { ...prev, color_hex: clean } : prev,
    );
  }, []);

  // ── Item mutations ────────────────────────────────────────────────
  const addItemAt = useCallback(
    (workId: string, xCm: number, yCm: number, w?: number, h?: number) => {
      // Centre the item on the drop point.
      const itemW = w ?? Math.min(DEFAULT_ITEM_WIDTH_CM, widthCm * 0.4);
      const itemH = h ?? Math.min(DEFAULT_ITEM_HEIGHT_CM, heightCm * 0.5);
      const newItem: WallItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        work_id: workId,
        x_cm: xCm - itemW / 2,
        y_cm: yCm - itemH / 2,
        width_cm: itemW,
        height_cm: itemH,
        rotation_deg: 0,
        z_index: items.length,
        frame: defaultFrameConfig("none"),
      };
      setItems((prev) => [...prev, newItem]);
      setSelectedItemId(newItem.id);
    },
    [widthCm, heightCm, items.length],
  );

  const handleSelectFromPanel = useCallback(
    (work: PanelWork) => {
      // Place at wall centre when clicked (vs dropped).
      addItemAt(work.id, widthCm / 2, heightCm / 2);
    },
    [addItemAt, widthCm, heightCm],
  );

  const handleItemChange = useCallback(
    (id: string, partial: Partial<WallItem>) => {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...partial } : i)),
      );
    },
    [],
  );

  const handleBringForward = useCallback(() => {
    if (!selectedItemId) return;
    setItems((prev) => {
      const maxZ = prev.reduce((m, i) => Math.max(m, i.z_index), 0);
      return prev.map((i) =>
        i.id === selectedItemId ? { ...i, z_index: maxZ + 1 } : i,
      );
    });
  }, [selectedItemId]);

  const handleSendBack = useCallback(() => {
    if (!selectedItemId) return;
    setItems((prev) => {
      const minZ = prev.reduce((m, i) => Math.min(m, i.z_index), 0);
      return prev.map((i) =>
        i.id === selectedItemId ? { ...i, z_index: minZ - 1 } : i,
      );
    });
  }, [selectedItemId]);

  const handleDuplicate = useCallback(() => {
    if (!selectedItem) return;
    const copy: WallItem = {
      ...selectedItem,
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      // Offset slightly so users can see they got two.
      x_cm: selectedItem.x_cm + 5,
      y_cm: selectedItem.y_cm + 5,
      z_index: items.length,
    };
    setItems((prev) => [...prev, copy]);
    setSelectedItemId(copy.id);
  }, [selectedItem, items.length]);

  const handleDelete = useCallback(() => {
    if (!selectedItemId) return;
    setItems((prev) => prev.filter((i) => i.id !== selectedItemId));
    setSelectedItemId(null);
  }, [selectedItemId]);

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="flex h-full w-full bg-stone-50">
      <WorksPanel
        mode={props.mode}
        works={works}
        loading={worksLoading}
        error={worksError}
        onSelect={handleSelectFromPanel}
      />

      <div className="relative flex-1 min-w-0">
        <WallCanvas
          background={background}
          widthCm={widthCm}
          heightCm={heightCm}
          items={items}
          workById={workById}
          selectedItemId={selectedItemId}
          onSelectItem={setSelectedItemId}
          onItemChange={handleItemChange}
          onAddItem={(workId, xCm, yCm) => addItemAt(workId, xCm, yCm)}
        />

        {/* Floating quota chip */}
        <div className="absolute top-3 right-3">
          <QuotaChip
            ownerTypeHint={ownerTypeFromMode(props.mode)}
            authToken={props.authToken ?? null}
            refreshNonce={refreshNonce}
          />
        </div>

        {/* Per-item toolbar — top centre when an item is selected */}
        {selectedItem && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-auto">
            <ItemToolbar
              item={selectedItem}
              onChange={(partial) => handleItemChange(selectedItem.id, partial)}
              onBringForward={handleBringForward}
              onSendBack={handleSendBack}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          </div>
        )}

        {/* Bottom-centre wall config bar */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
          <WallConfigBar
            currentPresetId={
              background.kind === "preset" ? background.preset_id : null
            }
            colorHex={
              background.kind === "preset" ? background.color_hex : "FFFFFF"
            }
            widthCm={widthCm}
            heightCm={heightCm}
            onPickPreset={handlePickPreset}
            onColorChange={handleColorChange}
            onWidthChange={(v) => setWidthCm(clampDimension(v))}
            onHeightChange={(v) => setHeightCm(clampDimension(v))}
            onClose={props.onClose}
          />
        </div>
      </div>
    </div>
  );
}

// ── Wall config bar ─────────────────────────────────────────────────────

interface ConfigProps {
  currentPresetId: string | null;
  colorHex: string;
  widthCm: number;
  heightCm: number;
  onPickPreset: (id: string) => void;
  onColorChange: (hex: string) => void;
  onWidthChange: (v: number) => void;
  onHeightChange: (v: number) => void;
  onClose?: () => void;
}

function WallConfigBar({
  currentPresetId,
  colorHex,
  widthCm,
  heightCm,
  onPickPreset,
  onColorChange,
  onWidthChange,
  onHeightChange,
  onClose,
}: ConfigProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/85 backdrop-blur border border-black/5 shadow-sm">
      <div className="flex items-center gap-1">
        {PRESET_WALLS.map((p) => (
          <button
            key={p.id}
            type="button"
            title={p.name}
            onClick={() => onPickPreset(p.id)}
            className={`h-6 w-6 rounded-full border ${
              currentPresetId === p.id
                ? "ring-2 ring-stone-900 ring-offset-1"
                : "border-black/10"
            }`}
            style={{ backgroundColor: `#${p.defaultColorHex}` }}
          />
        ))}
      </div>

      <span className="h-4 w-px bg-black/10" />

      <label className="flex items-center gap-1 text-[11px] text-stone-600">
        <span>Colour</span>
        <input
          type="color"
          value={`#${colorHex}`}
          onChange={(e) => onColorChange(e.target.value)}
          className="h-5 w-7 rounded border border-black/10 bg-transparent"
        />
      </label>

      <span className="h-4 w-px bg-black/10" />

      <label className="flex items-center gap-1 text-[11px] text-stone-600">
        <span>W</span>
        <input
          type="number"
          min={50}
          max={1000}
          step={5}
          value={widthCm}
          onChange={(e) => onWidthChange(Number(e.target.value))}
          className="w-14 rounded border border-black/10 px-1 py-0.5 text-xs"
        />
        <span className="text-stone-400">cm</span>
      </label>

      <label className="flex items-center gap-1 text-[11px] text-stone-600">
        <span>H</span>
        <input
          type="number"
          min={50}
          max={1000}
          step={5}
          value={heightCm}
          onChange={(e) => onHeightChange(Number(e.target.value))}
          className="w-14 rounded border border-black/10 px-1 py-0.5 text-xs"
        />
        <span className="text-stone-400">cm</span>
      </label>

      {onClose && (
        <>
          <span className="h-4 w-px bg-black/10" />
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] text-stone-500 hover:text-stone-900"
          >
            Close
          </button>
        </>
      )}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function normaliseWork(raw: Record<string, unknown>): PanelWork | null {
  const id = typeof raw.id === "string" ? raw.id : null;
  const title = typeof raw.title === "string" ? raw.title : null;
  const image = typeof raw.image === "string" ? raw.image : null;
  if (!id || !title || !image) return null;
  return {
    id,
    title,
    imageUrl: image,
    dimensions: typeof raw.dimensions === "string" ? raw.dimensions : undefined,
  };
}

function clampDimension(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.min(1000, Math.max(50, Math.round(value)));
}

function ownerTypeFromMode(mode: VisualizerEditorProps["mode"]) {
  if (mode === "venue_my_walls") return "venue" as const;
  if (mode === "artist_mockup" || mode === "artist_showroom") return "artist" as const;
  return "customer" as const;
}
