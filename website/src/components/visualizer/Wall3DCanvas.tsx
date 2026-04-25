"use client";

/**
 * Wall3DCanvas — three.js scene mode for the visualizer.
 *
 * Scene composition:
 *   - Back wall (the wall the user is decorating).
 *   - Floor.
 *   - One side wall (a corner room — gives "different walls in
 *     different directions" the user can rotate around).
 *   - Subtle ambient + directional lighting from the front-top-left to
 *     produce realistic soft shadows under each item.
 *   - OrbitControls letting the user pan/rotate the camera within
 *     limits (no clipping behind the back wall, no flipping upside
 *     down).
 *
 * Items:
 *   - Each artwork is a textured plane, sitting `frameDepth` proud of
 *     the wall (the frame extends another small offset so it casts a
 *     shadow).
 *   - Frame is rendered as 4 thin boxes (top/right/bottom/left moulding)
 *     wrapping the artwork. This is much cheaper than CSG-subtracting
 *     a plane out of a box, and reads as a real frame in 3D.
 *   - Click an item → fires onSelectItem.
 *   - Drag an item → onItemChange with new (x_cm, y_cm). For the MVP
 *     resize lives in the toolbar dropdown, not via 3D handles.
 *
 * Coordinates:
 *   - Scene units = metres. Wall dims (cm) divide by 100 on the way in.
 *   - Wall sits centred on the origin; back wall lies on the z=0 plane,
 *     so item position (x_cm, y_cm) maps to (x_m, height-y_m, 0).
 *
 * Why this is a separate file from WallCanvas.tsx:
 *   - Different render engine (three.js vs Konva).
 *   - Different interaction model (raycasting vs DOM events).
 *   - Lets the 2D editor stay alive as a fallback / mobile path.
 */

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  Environment,
  OrbitControls,
} from "@react-three/drei";
import * as THREE from "three";
import {
  computeFrameGeometry,
  getFrameFinish,
} from "@/lib/visualizer/frames";
import type {
  LayoutBackground,
  WallItem,
} from "@/lib/visualizer/types";
import type { PanelWork } from "./WorksPanel";

// ── Scene tuning ───────────────────────────────────────────────────────

const FLOOR_DEPTH_M = 4; // how far into the room the floor extends
const SIDE_WALL_DEPTH_M = 4; // depth of the perpendicular side wall
const FRAME_PROUD_M = 0.015; // how far in front of the wall a flat work sits
const FRAME_DEPTH_M = 0.025; // additional thickness of the frame moulding
const SHADOW_OPACITY = 0.35;

interface Props {
  background: LayoutBackground;
  /** Wall width in cm (real-world). */
  widthCm: number;
  /** Wall height in cm (real-world). */
  heightCm: number;
  items: WallItem[];
  workById: Record<string, PanelWork>;
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onItemChange: (id: string, partial: Partial<WallItem>) => void;
  onAddItem: (workId: string, xCm: number, yCm: number) => void;
  /** Optional signed URL for the wall photo (uploaded walls). */
  bgImageUrl?: string | null;
}

/** Lifted to a module constant so deps in OrbitControlsRef stay stable. */
const ORBIT_DAMPING = 0.08;

export default function Wall3DCanvas({
  background,
  widthCm,
  heightCm,
  items,
  workById,
  selectedItemId,
  onSelectItem,
  onItemChange,
  onAddItem,
  bgImageUrl,
}: Props) {
  const wallW = widthCm / 100; // metres
  const wallH = heightCm / 100;

  const wallColor =
    background.kind === "preset" ? `#${background.color_hex}` : "#FFFFFF";

  // HTML drop handler — converts mouse coords to a wall-plane intersection.
  // Three.js's `useThree` is only available inside a Canvas child, so we
  // grab the camera + raycaster via a ref-bridge component below.
  const dropHandlerRef = useRef<{
    pickAt: (clientX: number, clientY: number) => { xCm: number; yCm: number } | null;
  } | null>(null);

  // OrbitControls and item drags both want pointer events. We disable
  // OrbitControls while an item is being dragged so the drag tracks
  // smoothly. State lifted here because the toggle has to be a sibling
  // of the items inside the Canvas tree.
  const [draggingItem, setDraggingItem] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const workId = e.dataTransfer.getData("application/x-wallplace-work");
      if (!workId) return;
      const hit = dropHandlerRef.current?.pickAt(e.clientX, e.clientY);
      if (!hit) return;
      onAddItem(workId, hit.xCm, hit.yCm);
    },
    [onAddItem],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="relative w-full h-full bg-stone-100"
      style={{ overflow: "hidden" }}
    >
      <Canvas
        shadows="soft"
        // Slight elevation + close-ish to give a modern photographer's
        // angle when looking at the wall straight-on.
        camera={{ position: [0, wallH * 0.55, wallW * 1.35], fov: 45 }}
        gl={{
          antialias: true,
          // preserveDrawingBuffer needed for canvas-to-blob if we ever
          // export the 3D view as a render output.
          preserveDrawingBuffer: true,
          // ACES filmic tonemapping with a slightly lifted exposure —
          // gets the room out of the "video game" gamut into something
          // that reads as a softly-photographed interior.
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
      >
        <Suspense fallback={null}>
          {/* Three-point lighting for an interior photo feel. */}
          <ambientLight intensity={0.35} />
          {/* Key — warm, top-left (sunlight from a window). */}
          <directionalLight
            position={[2.5, wallH + 1.5, 2]}
            intensity={1.4}
            color="#FFF1DC"
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-near={0.5}
            shadow-camera-far={12}
            shadow-camera-left={-wallW}
            shadow-camera-right={wallW}
            shadow-camera-top={wallH}
            shadow-camera-bottom={-1}
            shadow-bias={-0.0002}
            shadow-radius={4}
          />
          {/* Fill — cooler, lower right (bounced ambient from the floor). */}
          <directionalLight
            position={[-1.5, 1.2, 3]}
            intensity={0.35}
            color="#D8E4FF"
          />
          {/* Rim — a hint of contour on the right edge of pieces. */}
          <directionalLight
            position={[3, wallH * 0.6, -1]}
            intensity={0.25}
            color="#FFFFFF"
          />
          <Environment preset="apartment" />

          <Room
            wallW={wallW}
            wallH={wallH}
            wallColor={wallColor}
            wallImageUrl={
              bgImageUrl ??
              (background.kind === "uploaded" ? background.image_path : null)
            }
            kind={background.kind}
          />

          {items
            .slice()
            .sort((a, b) => a.z_index - b.z_index)
            .map((item) => (
              <ArtworkMesh
                key={item.id}
                item={item}
                wallW={wallW}
                wallH={wallH}
                imageUrl={workById[item.work_id]?.imageUrl}
                selected={item.id === selectedItemId}
                onSelect={() => onSelectItem(item.id)}
                onMove={(xCm, yCm) =>
                  onItemChange(item.id, { x_cm: xCm, y_cm: yCm })
                }
                onResize={(widthCm, heightCm) =>
                  onItemChange(item.id, {
                    width_cm: widthCm,
                    height_cm: heightCm,
                  })
                }
                onDragStart={() => setDraggingItem(true)}
                onDragEnd={() => setDraggingItem(false)}
              />
            ))}

          <DropPlane
            wallW={wallW}
            wallH={wallH}
            // Captures camera + raycaster + DOM rect, exposes pickAt
            // upwards for the parent's HTML drop handler.
            onReady={(api) => {
              dropHandlerRef.current = api;
            }}
            onClickEmpty={() => onSelectItem(null)}
          />

          <OrbitControls
            enabled={!draggingItem}
            enablePan={false}
            enableDamping
            dampingFactor={ORBIT_DAMPING}
            // Don't let the camera fly behind the wall or invert.
            minDistance={wallW * 0.7}
            maxDistance={wallW * 2.2}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2 - 0.05}
            // Don't let the user spin all the way around — the back of
            // the wall is a black plane.
            minAzimuthAngle={-Math.PI / 2.3}
            maxAzimuthAngle={Math.PI / 2.3}
            target={[0, wallH * 0.5, 0]}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

// ── Room ────────────────────────────────────────────────────────────────

function Room({
  wallW,
  wallH,
  wallColor,
  wallImageUrl,
  kind,
}: {
  wallW: number;
  wallH: number;
  wallColor: string;
  wallImageUrl: string | null;
  kind: LayoutBackground["kind"];
}) {
  const wallTexture = useOptionalTexture(
    kind === "uploaded" ? wallImageUrl : null,
  );
  const floorTexture = useProceduralWoodTexture();

  return (
    <group>
      {/* Back wall — z=0 plane, rises from y=0 to y=wallH. */}
      <mesh position={[0, wallH / 2, 0]} receiveShadow>
        <planeGeometry args={[wallW, wallH]} />
        {wallTexture ? (
          <meshStandardMaterial map={wallTexture} roughness={0.9} />
        ) : (
          <meshStandardMaterial
            color={wallColor}
            roughness={0.95}
          />
        )}
      </mesh>

      {/* Floor — procedural wood plank texture for warmth + grain. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, FLOOR_DEPTH_M / 2]}
        receiveShadow
      >
        <planeGeometry args={[wallW * 2.2, FLOOR_DEPTH_M]} />
        {floorTexture ? (
          <meshStandardMaterial
            map={floorTexture}
            roughness={0.55}
          />
        ) : (
          <meshStandardMaterial color="#5C432B" roughness={0.55} />
        )}
      </mesh>

      {/* Right side wall — perpendicular to back wall, recedes into z. */}
      <mesh
        position={[wallW / 2, wallH / 2, SIDE_WALL_DEPTH_M / 2]}
        rotation={[0, -Math.PI / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[SIDE_WALL_DEPTH_M, wallH]} />
        <meshStandardMaterial
          color={wallColor}
          roughness={0.95}
        />
      </mesh>

      {/* Subtle ceiling — lighter than walls, just visible at the top
          when camera tilts up. */}
      <mesh
        position={[0, wallH, SIDE_WALL_DEPTH_M / 2]}
        rotation={[Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[wallW * 2.2, SIDE_WALL_DEPTH_M]} />
        <meshStandardMaterial color="#F4F0EA" roughness={0.95} />
      </mesh>

      {/* Skirting board — small dark strip where wall meets floor.
          Reads as architecture and stops the wall/floor from looking
          like two flat planes butted together. */}
      <mesh position={[0, 0.04, 0.005]} receiveShadow>
        <planeGeometry args={[wallW, 0.08]} />
        <meshStandardMaterial color="#1F1A14" roughness={0.6} />
      </mesh>
      <mesh
        position={[wallW / 2 - 0.005, 0.04, SIDE_WALL_DEPTH_M / 2]}
        rotation={[0, -Math.PI / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[SIDE_WALL_DEPTH_M, 0.08]} />
        <meshStandardMaterial color="#1F1A14" roughness={0.6} />
      </mesh>
    </group>
  );
}

// ── Artwork mesh ────────────────────────────────────────────────────────

interface ArtworkMeshProps {
  item: WallItem;
  wallW: number;
  wallH: number;
  imageUrl: string | undefined;
  selected: boolean;
  onSelect: () => void;
  onMove: (xCm: number, yCm: number) => void;
  onResize: (widthCm: number, heightCm: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

function ArtworkMesh({
  item,
  wallW,
  wallH,
  imageUrl,
  selected,
  onSelect,
  onMove,
  onResize,
  onDragStart,
  onDragEnd,
}: ArtworkMeshProps) {
  const itemW = item.width_cm / 100;
  const itemH = item.height_cm / 100;

  // Layout JSON has y growing DOWNWARDS from the wall top. Three.js
  // y grows upwards from the wall bottom. Convert.
  const cmToMeters = (cm: number) => cm / 100;
  const xCenterM =
    cmToMeters(item.x_cm) + itemW / 2 - wallW / 2;
  const yCenterM = wallH - (cmToMeters(item.y_cm) + itemH / 2);

  // Frame geometry shared with the 2D code — gives us inner artwork
  // rect + border thickness in pixels. Rebase into metres at the same
  // unit ratio (100 px → 1 m): borderPx / 100 ≈ borderMeters.
  const SCRATCH_PX_PER_CM = 100;
  const frameGeo = useMemo(
    () =>
      computeFrameGeometry(
        itemW * SCRATCH_PX_PER_CM,
        itemH * SCRATCH_PX_PER_CM,
        item.frame,
      ),
    [itemW, itemH, item.frame],
  );
  const borderM = frameGeo.borderPx / SCRATCH_PX_PER_CM;
  const innerW = Math.max(0.001, itemW - borderM * 2);
  const innerH = Math.max(0.001, itemH - borderM * 2);
  const finishDef = getFrameFinish(item.frame.style, item.frame.finish);
  const frameColor = finishDef?.borderColor ?? "#222222";

  const texture = useOptionalTexture(imageUrl ?? null);

  // ── Drag handling ──────────────────────────────────────────────────
  // Capture pointer events on the artwork mesh and translate to wall
  // coords by intersecting the ray against the back-wall plane.
  const groupRef = useRef<THREE.Group>(null);
  const dragRef = useRef<null | {
    initialX: number;
    initialY: number;
    grabXCm: number;
    grabYCm: number;
    pointerId: number;
  }>(null);
  const wallPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
    [],
  );

  const onPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      onSelect();
      const target = e.target as Element;
      target.setPointerCapture?.(e.pointerId);
      const intersect = new THREE.Vector3();
      e.ray.intersectPlane(wallPlane, intersect);
      dragRef.current = {
        initialX: intersect.x,
        initialY: intersect.y,
        grabXCm: item.x_cm,
        grabYCm: item.y_cm,
        pointerId: e.pointerId,
      };
      onDragStart();
    },
    [item.x_cm, item.y_cm, onSelect, wallPlane, onDragStart],
  );

  const onPointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!dragRef.current) return;
      const intersect = new THREE.Vector3();
      e.ray.intersectPlane(wallPlane, intersect);
      const dxM = intersect.x - dragRef.current.initialX;
      const dyM = intersect.y - dragRef.current.initialY;
      // y grows up in 3D, but layout y grows down — invert.
      const newXCm = dragRef.current.grabXCm + dxM * 100;
      const newYCm = dragRef.current.grabYCm - dyM * 100;
      onMove(newXCm, newYCm);
    },
    [onMove, wallPlane],
  );

  const onPointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!dragRef.current) return;
      const target = e.target as Element;
      target.releasePointerCapture?.(dragRef.current.pointerId);
      dragRef.current = null;
      onDragEnd();
    },
    [onDragEnd],
  );

  // ── Resize via corner handle ──────────────────────────────────────
  // Drag any corner sphere to scale the artwork. We lock the aspect
  // ratio at item.width_cm / item.height_cm so true dimensions persist.
  // The opposite corner is the anchor — drag distance from there
  // becomes the new diagonal.
  const resizeRef = useRef<null | {
    pointerId: number;
    aspect: number;
    anchorX: number; // metres, world space
    anchorY: number;
  }>(null);

  const onCornerPointerDown = useCallback(
    (anchorOffsetX: number, anchorOffsetY: number) =>
      (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onSelect();
        const target = e.target as Element;
        target.setPointerCapture?.(e.pointerId);
        // World position of the OPPOSITE corner (the anchor).
        const anchorX = xCenterM + anchorOffsetX * itemW * -0.5;
        const anchorY = yCenterM + anchorOffsetY * itemH * -0.5;
        resizeRef.current = {
          pointerId: e.pointerId,
          aspect: itemW / itemH,
          anchorX,
          anchorY,
        };
        onDragStart();
      },
    [xCenterM, yCenterM, itemW, itemH, onSelect, onDragStart],
  );

  const onCornerPointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!resizeRef.current) return;
      const intersect = new THREE.Vector3();
      e.ray.intersectPlane(wallPlane, intersect);
      // Diagonal distance from anchor to mouse; aspect-locked.
      const dx = Math.abs(intersect.x - resizeRef.current.anchorX);
      const dy = Math.abs(intersect.y - resizeRef.current.anchorY);
      const aspect = resizeRef.current.aspect;
      // Pick whichever dimension changed more (relative to current size).
      const fromW = dx;
      const fromH = dy * aspect;
      const newW = Math.max(fromW, fromH);
      const newH = newW / aspect;
      // Convert metres back to cm; clamp to schema bounds.
      const newWCm = Math.min(1000, Math.max(5, newW * 100));
      const newHCm = Math.min(1000, Math.max(5, newH * 100));
      onResize(newWCm, newHCm);
    },
    [onResize, wallPlane],
  );

  const onCornerPointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!resizeRef.current) return;
      const target = e.target as Element;
      target.releasePointerCapture?.(resizeRef.current.pointerId);
      resizeRef.current = null;
      onDragEnd();
    },
    [onDragEnd],
  );

  // ── Render ─────────────────────────────────────────────────────────
  // Stack:
  //   - Outer group rotated/positioned at the centre of the artwork.
  //   - 4 frame mouldings (BoxGeometry strips) around the perimeter,
  //     pushed slightly more proud of the wall than the artwork.
  //   - Artwork plane in the middle, just proud of the wall.
  //   - Selection halo (a thin coloured outline) when selected.
  return (
    <group
      ref={groupRef}
      position={[xCenterM, yCenterM, FRAME_PROUD_M + FRAME_DEPTH_M / 2]}
      rotation={[0, 0, (item.rotation_deg * Math.PI) / 180]}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Frame — only when style != "none" */}
      {item.frame.style !== "none" && borderM > 0.001 && (
        <FrameMoulding
          itemW={itemW}
          itemH={itemH}
          borderM={borderM}
          color={frameColor}
        />
      )}

      {/* Artwork plane — castShadow false because a shadow from a
          near-coplanar plane onto its own wall causes ugly z-fighting;
          the soft contact shadow below handles the visual cue. */}
      <mesh receiveShadow position={[0, 0, FRAME_DEPTH_M / 2]}>
        <planeGeometry args={[innerW, innerH]} />
        {texture ? (
          <meshStandardMaterial
            map={texture}
            roughness={0.55}
            metalness={0.02}
          />
        ) : (
          <meshStandardMaterial color="#888888" roughness={0.7} />
        )}
      </mesh>

      {/* Selection: thin rectangular outline + 4 corner resize handles. */}
      {selected && (
        <>
          <SelectionOutline itemW={itemW} itemH={itemH} />
          {(
            [
              { x: -1, y: -1 },
              { x: 1, y: -1 },
              { x: 1, y: 1 },
              { x: -1, y: 1 },
            ] as const
          ).map(({ x, y }) => (
            <ResizeHandle
              key={`${x}-${y}`}
              cornerX={x}
              cornerY={y}
              itemW={itemW}
              itemH={itemH}
              onPointerDown={onCornerPointerDown(x, y)}
              onPointerMove={onCornerPointerMove}
              onPointerUp={onCornerPointerUp}
              onPointerCancel={onCornerPointerUp}
            />
          ))}
        </>
      )}

      {/* Soft contact shadow under the item — a darker plane behind
          the artwork plane, slightly larger, slightly transparent. */}
      <mesh
        position={[
          itemW * 0.04,
          -itemH * 0.04,
          -0.001,
        ]}
      >
        <planeGeometry args={[itemW * 1.05, itemH * 1.05]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={SHADOW_OPACITY * 0.4}
        />
      </mesh>
    </group>
  );
}

// ── Frame moulding ─────────────────────────────────────────────────────

function FrameMoulding({
  itemW,
  itemH,
  borderM,
  color,
}: {
  itemW: number;
  itemH: number;
  borderM: number;
  color: string;
}) {
  // Render 4 boxes — top/bottom span full width, left/right take only
  // the inner height so the corners aren't double-stacked.
  const topY = itemH / 2 - borderM / 2;
  const bottomY = -itemH / 2 + borderM / 2;
  const leftX = -itemW / 2 + borderM / 2;
  const rightX = itemW / 2 - borderM / 2;
  const sideHeight = itemH - borderM * 2;

  return (
    <group>
      {/* Top */}
      <mesh
        position={[0, topY, FRAME_DEPTH_M / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[itemW, borderM, FRAME_DEPTH_M]} />
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} />
      </mesh>
      {/* Bottom */}
      <mesh
        position={[0, bottomY, FRAME_DEPTH_M / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[itemW, borderM, FRAME_DEPTH_M]} />
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} />
      </mesh>
      {/* Left */}
      <mesh
        position={[leftX, 0, FRAME_DEPTH_M / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[borderM, sideHeight, FRAME_DEPTH_M]} />
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} />
      </mesh>
      {/* Right */}
      <mesh
        position={[rightX, 0, FRAME_DEPTH_M / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[borderM, sideHeight, FRAME_DEPTH_M]} />
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} />
      </mesh>
    </group>
  );
}

// ── Drop / empty-click plane ───────────────────────────────────────────

interface DropPlaneApi {
  pickAt: (clientX: number, clientY: number) => { xCm: number; yCm: number } | null;
}

function DropPlane({
  wallW,
  wallH,
  onReady,
  onClickEmpty,
}: {
  wallW: number;
  wallH: number;
  onReady: (api: DropPlaneApi) => void;
  onClickEmpty: () => void;
}) {
  const { camera, raycaster, gl } = useThree();
  // Sync the ref-bridge once on mount and whenever camera/wall change
  // (rare). Using a small useMemo to avoid re-instantiating the plane.
  const wallPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
    [],
  );

  useMemo(() => {
    const api: DropPlaneApi = {
      pickAt: (clientX, clientY) => {
        const rect = gl.domElement.getBoundingClientRect();
        const ndc = new THREE.Vector2(
          ((clientX - rect.left) / rect.width) * 2 - 1,
          -((clientY - rect.top) / rect.height) * 2 + 1,
        );
        raycaster.setFromCamera(ndc, camera);
        const hit = new THREE.Vector3();
        if (!raycaster.ray.intersectPlane(wallPlane, hit)) return null;
        // Clamp inside wall bounds.
        const xM = Math.min(Math.max(hit.x, -wallW / 2), wallW / 2);
        const yM = Math.min(Math.max(hit.y, 0), wallH);
        return {
          xCm: (xM + wallW / 2) * 100,
          yCm: (wallH - yM) * 100,
        };
      },
    };
    onReady(api);
  }, [camera, raycaster, gl, wallPlane, wallW, wallH, onReady]);

  return (
    <mesh
      position={[0, wallH / 2, -0.001]}
      onPointerDown={(e) => {
        // Only deselect when clicking the wall itself (no item handler intercepts).
        if (e.button !== 0) return;
        e.stopPropagation();
        onClickEmpty();
      }}
    >
      <planeGeometry args={[wallW, wallH]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
}

// ── Selection outline ──────────────────────────────────────────────────

/**
 * Thin black outline rendered just in front of the artwork, sized to the
 * outer item bounds — replaces the previous ring-geometry which only
 * worked for square items.
 */
function SelectionOutline({
  itemW,
  itemH,
}: {
  itemW: number;
  itemH: number;
}) {
  const z = FRAME_DEPTH_M / 2 + 0.002;
  const corners = useMemo(() => {
    const w = itemW / 2;
    const h = itemH / 2;
    return new Float32Array([
      -w, -h, z,
      w, -h, z,
      w, h, z,
      -w, h, z,
      -w, -h, z, // close the loop
    ]);
  }, [itemW, itemH, z]);

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[corners, 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#0F0F0F" linewidth={1} />
    </line>
  );
}

// ── Resize handle ──────────────────────────────────────────────────────

/**
 * Small white-edged sphere at one corner of a selected artwork. Drag it
 * to resize — the parent ArtworkMesh handles the actual maths via the
 * onCornerPointer* callbacks. cornerX/cornerY are -1 or +1 indicating
 * which corner this handle sits at.
 */
function ResizeHandle({
  cornerX,
  cornerY,
  itemW,
  itemH,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  cornerX: -1 | 1;
  cornerY: -1 | 1;
  itemW: number;
  itemH: number;
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
  onPointerMove: (e: ThreeEvent<PointerEvent>) => void;
  onPointerUp: (e: ThreeEvent<PointerEvent>) => void;
  onPointerCancel: (e: ThreeEvent<PointerEvent>) => void;
}) {
  // Size handle relative to the item — visible on small + huge works.
  const r = Math.max(0.012, Math.min(itemW, itemH) * 0.04);

  return (
    <mesh
      position={[
        (cornerX * itemW) / 2,
        (cornerY * itemH) / 2,
        FRAME_DEPTH_M / 2 + 0.005,
      ]}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <sphereGeometry args={[r, 16, 16]} />
      <meshStandardMaterial
        color="#FFFFFF"
        emissive="#000000"
        roughness={0.3}
      />
    </mesh>
  );
}

// ── Procedural wood floor ──────────────────────────────────────────────

/**
 * Generate a CanvasTexture that reads as wood floor planks. We draw it
 * once into an offscreen <canvas>, then hand it to THREE as a tiled
 * texture (repeat 4×3 along the floor plane). Cheaper than shipping a
 * PNG asset and tunable.
 */
function useProceduralWoodTexture(): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Plank parameters — 4 stacked planks across the canvas height.
    const plankCount = 4;
    const plankH = canvas.height / plankCount;
    const baseTones = ["#7A5A3C", "#6B4D32", "#8C6B47", "#5C4029"];

    for (let p = 0; p < plankCount; p++) {
      const baseColor = baseTones[p % baseTones.length];
      const y0 = p * plankH;

      // Solid base for the plank.
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, y0, canvas.width, plankH);

      // Long horizontal grain streaks, varying opacity.
      for (let i = 0; i < 60; i++) {
        const yJitter = (Math.random() - 0.5) * plankH * 0.85;
        const y = y0 + plankH / 2 + yJitter;
        const xStart = Math.random() * canvas.width;
        const len = 80 + Math.random() * 240;
        const opacity = 0.04 + Math.random() * 0.18;
        ctx.strokeStyle = `rgba(40, 25, 12, ${opacity})`;
        ctx.lineWidth = 0.6 + Math.random() * 1.4;
        ctx.beginPath();
        ctx.moveTo(xStart, y);
        ctx.bezierCurveTo(
          xStart + len * 0.3,
          y + (Math.random() - 0.5) * 4,
          xStart + len * 0.7,
          y + (Math.random() - 0.5) * 4,
          xStart + len,
          y,
        );
        ctx.stroke();
      }

      // Occasional darker knots.
      if (Math.random() > 0.4) {
        const kx = Math.random() * canvas.width;
        const ky = y0 + plankH * (0.3 + Math.random() * 0.4);
        const radius = 4 + Math.random() * 8;
        const grad = ctx.createRadialGradient(kx, ky, 0, kx, ky, radius);
        grad.addColorStop(0, "rgba(20, 12, 4, 0.6)");
        grad.addColorStop(1, "rgba(20, 12, 4, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(kx, ky, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Plank seam — thin dark line at the bottom edge of each plank.
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, y0 + plankH - 1, canvas.width, 1.5);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 2);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    setTexture(tex);

    return () => {
      tex.dispose();
    };
  }, []);

  return texture;
}

// ── Texture loading ────────────────────────────────────────────────────

/**
 * Load an image URL into a THREE.Texture. Returns null while loading
 * or on failure — caller renders a neutral fallback material.
 *
 * Uses useEffect (not useMemo — useMemo is for memoization, not side
 * effects, and was causing textures to never load reliably).
 */
function useOptionalTexture(url: string | null): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!url) {
      setTexture(null);
      return;
    }
    let cancelled = false;
    let createdTexture: THREE.Texture | null = null;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      url,
      (tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        // sRGB so the JPEG / WebP colours match what people see in the
        // 2D editor. Anisotropic filter for crispness at glancing angles.
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        // THREE defaults flipY=true which renders correctly on a plane
        // facing the camera — leave it at the default.
        createdTexture = tex;
        setTexture(tex);
      },
      undefined,
      (err) => {
        if (cancelled) return;
        console.warn("[Wall3DCanvas] texture load failed:", url, err);
        setTexture(null);
      },
    );

    return () => {
      cancelled = true;
      if (createdTexture) createdTexture.dispose();
    };
  }, [url]);

  return texture;
}
