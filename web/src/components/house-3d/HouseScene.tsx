"use client";

import { useMemo } from "react";
import * as THREE from "three";
import {
  buildRoomWallSegments,
  houseBounds,
} from "@/lib/house3d/build-house-geometry";
import type { HouseModel, RoomBox } from "@/lib/house3d/types";
import { WALL_PALETTES } from "@/lib/house3d/types";
import { FurnitureMesh } from "./FurnitureMeshes";
import { RoomPickFloor, TeleportNode } from "./TourControls";

const GLASS_COLOR = "#7eb8d4";
const DOOR_COLOR = "#6b4f3a";

function RoomMesh({
  room,
  thickness,
  wallColor,
  tourMode,
  highlighted,
}: {
  room: RoomBox;
  thickness: number;
  wallColor: string;
  tourMode: boolean;
  highlighted?: boolean;
}) {
  const segments = useMemo(
    () => buildRoomWallSegments(room, thickness),
    [room, thickness]
  );

  return (
    <group>
      {segments.map((seg, i) => {
        const isFloor =
          seg.kind === "wall" &&
          seg.size[1] < 0.12 &&
          seg.position[1] < 0.1;
        const color =
          seg.kind === "glass"
            ? GLASS_COLOR
            : seg.kind === "door"
              ? DOOR_COLOR
              : isFloor
                ? highlighted
                  ? "#93c5fd"
                  : room.color
                : wallColor;
        const opacity = seg.kind === "glass" ? 0.35 : 1;
        return (
          <mesh key={i} position={seg.position} castShadow receiveShadow>
            <boxGeometry args={seg.size} />
            <meshStandardMaterial
              color={color}
              transparent={seg.kind === "glass"}
              opacity={opacity}
              roughness={seg.kind === "glass" ? 0.15 : isFloor ? 0.85 : 0.7}
              metalness={seg.kind === "glass" ? 0.1 : 0}
              side={tourMode ? THREE.DoubleSide : THREE.FrontSide}
              emissive={highlighted && isFloor ? "#3b82f6" : "#000000"}
              emissiveIntensity={highlighted && isFloor ? 0.25 : 0}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export function HouseScene({
  model,
  tourMode = true,
  currentRoomId,
  onTeleport,
  onEnterRoom,
}: {
  model: HouseModel;
  tourMode?: boolean;
  currentRoomId?: string | null;
  onTeleport?: (id: string) => void;
  /** Dollhouse: click a room floor to start the tour there. */
  onEnterRoom?: (id: string) => void;
}) {
  const { center, size } = useMemo(() => houseBounds(model), [model]);
  const wallColor = WALL_PALETTES[model.wallPalette ?? "cream"].wall;
  const roomMap = useMemo(() => {
    const m = new Map<string, RoomBox>();
    for (const r of model.rooms) m.set(r.id, r);
    return m;
  }, [model.rooms]);

  return (
    <group position={[-center[0], 0, -center[2]]}>
      {!tourMode && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[center[0], -0.01, center[2]]}
          receiveShadow
        >
          <planeGeometry args={[size * 3, size * 3]} />
          <meshStandardMaterial color="#d4d0c8" roughness={1} />
        </mesh>
      )}

      {tourMode && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[center[0], -0.02, center[2]]}
        >
          <planeGeometry args={[size * 4, size * 4]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      )}

      {model.rooms.map((room) => (
        <RoomMesh
          key={room.id}
          room={room}
          thickness={model.wallThickness}
          wallColor={wallColor}
          tourMode={tourMode}
          highlighted={!tourMode && room.id === currentRoomId}
        />
      ))}

      {(model.furniture ?? []).map((item) => {
        const room = roomMap.get(item.roomId);
        if (!room) return null;
        return <FurnitureMesh key={item.id} item={item} room={room} />;
      })}

      {tourMode &&
        onTeleport &&
        model.rooms.map((room) => (
          <TeleportNode
            key={`node-${room.id}`}
            room={room}
            active={room.id === currentRoomId}
            onTeleport={onTeleport}
          />
        ))}

      {!tourMode &&
        onEnterRoom &&
        model.rooms.map((room) => (
          <RoomPickFloor
            key={`pick-${room.id}`}
            room={room}
            onSelect={onEnterRoom}
          />
        ))}
    </group>
  );
}


