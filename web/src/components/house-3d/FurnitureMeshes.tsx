"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import type { FurnitureItem, FurnitureKind, RoomBox } from "@/lib/house3d/types";
import { furnitureLocalPos } from "@/lib/house3d/furniture-utils";

const WOOD = "#8b6914";
const WOOD_DARK = "#5c4030";
const WOOD_LIGHT = "#c4a574";
const FABRIC = "#6b7c8a";
const FABRIC_SOFT = "#a89078";
const METAL = "#9aa3ad";
const METAL_DARK = "#5a626b";
const WHITE = "#f0eeea";
const CERAMIC = "#e8e4df";
const RUG = "#c45c4a";
const COUNTERTOP = "#d9d4cc";
const APPLIANCE = "#d0d4d8";

function Sofa() {
  return (
    <group>
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.28, 0.7]} />
        <meshStandardMaterial color={FABRIC} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.48, -0.28]} castShadow>
        <boxGeometry args={[1.6, 0.4, 0.18]} />
        <meshStandardMaterial color={FABRIC} roughness={0.85} />
      </mesh>
      <mesh position={[-0.78, 0.35, 0.05]} castShadow>
        <boxGeometry args={[0.12, 0.3, 0.55]} />
        <meshStandardMaterial color={FABRIC_SOFT} roughness={0.85} />
      </mesh>
      <mesh position={[0.78, 0.35, 0.05]} castShadow>
        <boxGeometry args={[0.12, 0.3, 0.55]} />
        <meshStandardMaterial color={FABRIC_SOFT} roughness={0.85} />
      </mesh>
    </group>
  );
}

function Bed() {
  return (
    <group>
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.28, 2]} />
        <meshStandardMaterial color="#d8cfc4" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.38, -0.7]} castShadow>
        <boxGeometry args={[1.45, 0.18, 0.45]} />
        <meshStandardMaterial color="#ebe4dc" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.45, 0.92]} castShadow>
        <boxGeometry args={[1.5, 0.55, 0.08]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
      </mesh>
    </group>
  );
}

function Table() {
  return (
    <group>
      <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.06, 0.7]} />
        <meshStandardMaterial color={WOOD} roughness={0.55} />
      </mesh>
      {[
        [-0.45, 0.36, -0.28],
        [0.45, 0.36, -0.28],
        [-0.45, 0.36, 0.28],
        [0.45, 0.36, 0.28],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <boxGeometry args={[0.06, 0.72, 0.06]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function Chair() {
  return (
    <group>
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[0.42, 0.06, 0.42]} />
        <meshStandardMaterial color={WOOD} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.7, -0.18]} castShadow>
        <boxGeometry args={[0.42, 0.5, 0.06]} />
        <meshStandardMaterial color={WOOD} roughness={0.6} />
      </mesh>
      {[
        [-0.16, 0.21, -0.16],
        [0.16, 0.21, -0.16],
        [-0.16, 0.21, 0.16],
        [0.16, 0.21, 0.16],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <boxGeometry args={[0.04, 0.42, 0.04]} />
          <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
      ))}
    </group>
  );
}

function Wardrobe() {
  return (
    <group>
      <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 2.1, 0.5]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.65} />
      </mesh>
      <mesh position={[-0.28, 1.05, 0.26]}>
        <boxGeometry args={[0.02, 0.12, 0.02]} />
        <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0.28, 1.05, 0.26]}>
        <boxGeometry args={[0.02, 0.12, 0.02]} />
        <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Lamp() {
  return (
    <group>
      <mesh position={[0, 0.03, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.06, 16]} />
        <meshStandardMaterial color={METAL} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 1.3, 8]} />
        <meshStandardMaterial color={METAL} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.35, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.28, 0.28, 16]} />
        <meshStandardMaterial
          color="#f2ece3"
          emissive="#f5e6c8"
          emissiveIntensity={0.35}
        />
      </mesh>
      <pointLight
        position={[0, 1.2, 0]}
        intensity={0.55}
        distance={4}
        color="#fff4e0"
      />
    </group>
  );
}

/** Kept for old saved house models — not placed by auto-furnish. */
function Plant() {
  return (
    <group>
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.1, 0.24, 12]} />
        <meshStandardMaterial color="#8a6a4a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.38, 0]} castShadow>
        <sphereGeometry args={[0.18, 10, 10]} />
        <meshStandardMaterial color="#4a7c59" roughness={0.85} />
      </mesh>
    </group>
  );
}

function Rug() {
  return (
    <mesh position={[0, 0.015, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1.6, 1.1]} />
      <meshStandardMaterial color={RUG} roughness={1} />
    </mesh>
  );
}

/** Kitchen base cabinets + countertop + upper cabinets. */
function Counter() {
  return (
    <group>
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.84, 0.58]} />
        <meshStandardMaterial color={WOOD_LIGHT} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.86, 0]} castShadow>
        <boxGeometry args={[2.24, 0.05, 0.62]} />
        <meshStandardMaterial color={COUNTERTOP} roughness={0.35} />
      </mesh>
      {/* Sink basin */}
      <mesh position={[0.45, 0.88, 0.05]}>
        <boxGeometry args={[0.42, 0.04, 0.35]} />
        <meshStandardMaterial color={METAL} metalness={0.55} roughness={0.25} />
      </mesh>
      {/* Cooktop */}
      <mesh position={[-0.55, 0.89, 0.05]}>
        <boxGeometry args={[0.5, 0.02, 0.4]} />
        <meshStandardMaterial color={METAL_DARK} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Upper cabinets */}
      <mesh position={[-0.35, 1.85, -0.12]} castShadow>
        <boxGeometry args={[1.4, 0.7, 0.35]} />
        <meshStandardMaterial color={WOOD_LIGHT} roughness={0.7} />
      </mesh>
    </group>
  );
}

function Fridge() {
  return (
    <group>
      <mesh position={[0, 0.95, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.65, 1.9, 0.65]} />
        <meshStandardMaterial color={APPLIANCE} roughness={0.35} metalness={0.15} />
      </mesh>
      <mesh position={[0.28, 1.15, 0.33]}>
        <boxGeometry args={[0.04, 0.35, 0.03]} />
        <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.55, 0.33]}>
        <boxGeometry args={[0.55, 0.02, 0.02]} />
        <meshStandardMaterial color={METAL_DARK} />
      </mesh>
    </group>
  );
}

function Bathtub() {
  return (
    <group>
      <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.55, 0.72]} />
        <meshStandardMaterial color={CERAMIC} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[1.4, 0.08, 0.52]} />
        <meshStandardMaterial color="#c8dce8" roughness={0.2} metalness={0.05} />
      </mesh>
    </group>
  );
}

function Toilet() {
  return (
    <group>
      <mesh position={[0, 0.22, 0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.38, 0.42, 0.5]} />
        <meshStandardMaterial color={WHITE} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.55, -0.12]} castShadow>
        <boxGeometry args={[0.4, 0.45, 0.18]} />
        <meshStandardMaterial color={WHITE} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.48, 0.08]}>
        <boxGeometry args={[0.32, 0.06, 0.28]} />
        <meshStandardMaterial color={WHITE} roughness={0.4} />
      </mesh>
    </group>
  );
}

function Vanity() {
  return (
    <group>
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.85, 0.78, 0.45]} />
        <meshStandardMaterial color={WOOD_LIGHT} roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.82, 0]} castShadow>
        <boxGeometry args={[0.9, 0.05, 0.48]} />
        <meshStandardMaterial color={CERAMIC} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.86, 0.02]}>
        <cylinderGeometry args={[0.14, 0.12, 0.08, 16]} />
        <meshStandardMaterial color={METAL} metalness={0.5} roughness={0.25} />
      </mesh>
      {/* Mirror */}
      <mesh position={[0, 1.45, -0.2]} castShadow>
        <boxGeometry args={[0.55, 0.7, 0.04]} />
        <meshStandardMaterial color="#b8c8d4" metalness={0.4} roughness={0.15} />
      </mesh>
    </group>
  );
}

function TvStand() {
  return (
    <group>
      <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.35, 0.55, 0.4]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.65} />
      </mesh>
      {/* TV screen */}
      <mesh position={[0, 0.95, -0.05]} castShadow>
        <boxGeometry args={[1.1, 0.65, 0.06]} />
        <meshStandardMaterial color="#1a1a1e" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.95, -0.02]}>
        <boxGeometry args={[1.0, 0.55, 0.02]} />
        <meshStandardMaterial color="#2a3540" emissive="#1a3040" emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}

function Nightstand() {
  return (
    <group>
      <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.4, 0.55, 0.38]} />
        <meshStandardMaterial color={WOOD} roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.58, 0.16]}>
        <boxGeometry args={[0.12, 0.02, 0.02]} />
        <meshStandardMaterial color={METAL} />
      </mesh>
    </group>
  );
}

function Shelf() {
  return (
    <group>
      <mesh position={[0, 1.0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.95, 1.9, 0.35]} />
        <meshStandardMaterial color={WOOD_LIGHT} roughness={0.7} />
      </mesh>
      {[0.35, 0.75, 1.15, 1.55].map((y) => (
        <mesh key={y} position={[0, y, 0.02]}>
          <boxGeometry args={[0.88, 0.03, 0.32]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function Console() {
  return (
    <group>
      <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.95, 0.06, 0.35]} />
        <meshStandardMaterial color={WOOD} roughness={0.55} />
      </mesh>
      <mesh position={[-0.4, 0.36, 0]} castShadow>
        <boxGeometry args={[0.06, 0.72, 0.3]} />
        <meshStandardMaterial color={WOOD_DARK} />
      </mesh>
      <mesh position={[0.4, 0.36, 0]} castShadow>
        <boxGeometry args={[0.06, 0.72, 0.3]} />
        <meshStandardMaterial color={WOOD_DARK} />
      </mesh>
    </group>
  );
}

const RENDERERS: Record<FurnitureKind, () => ReactNode> = {
  sofa: Sofa,
  bed: Bed,
  table: Table,
  chair: Chair,
  wardrobe: Wardrobe,
  lamp: Lamp,
  plant: Plant,
  rug: Rug,
  counter: Counter,
  fridge: Fridge,
  bathtub: Bathtub,
  toilet: Toilet,
  vanity: Vanity,
  tvstand: TvStand,
  nightstand: Nightstand,
  shelf: Shelf,
  console: Console,
};

export function FurnitureMesh({
  item,
  room,
}: {
  item: FurnitureItem;
  room: RoomBox;
}) {
  const Mesh = RENDERERS[item.kind] ?? Plant;
  const pos = useMemo(
    () => furnitureLocalPos(room, item),
    [room, item]
  );
  return (
    <group
      position={pos}
      rotation={[0, item.rotationY, 0]}
      scale={item.scale ?? 1}
    >
      <Mesh />
    </group>
  );
}

