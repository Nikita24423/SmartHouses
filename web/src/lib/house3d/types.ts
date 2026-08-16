export type WallSide = "front" | "back" | "left" | "right";

export interface OpeningSpec {
  type: "window" | "door" | "entrance";
  /** Position along wall length, 0–1 (center of opening). */
  t: number;
  width: number;
  height: number;
  /** Bottom of opening above floor (windows). Doors default to 0. */
  sillHeight: number;
}

export interface RoomBox {
  id: string;
  label: string;
  /** living | bedroom | kitchen | ... from plan analysis */
  roomType?: string;
  /** World-space origin (room corner, bottom). */
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  openings: Array<OpeningSpec & { wall: WallSide }>;
  color: string;
}

export type FurnitureKind =
  | "sofa"
  | "bed"
  | "table"
  | "chair"
  | "lamp"
  | "wardrobe"
  | "rug"
  | "counter"
  | "fridge"
  | "bathtub"
  | "toilet"
  | "vanity"
  | "tvstand"
  | "nightstand"
  | "shelf"
  | "console"
  /** @deprecated kept for old saved models — not used in auto-furnish */
  | "plant";

export interface FurnitureItem {
  id: string;
  kind: FurnitureKind;
  roomId: string;
  /** Normalized position on room floor, 0–1. */
  u: number;
  v: number;
  rotationY: number;
  /** Visual scale, default 1. */
  scale?: number;
}

/** Approximate floor footprint (meters) for fit checks. */
export const FURNITURE_FOOTPRINT: Record<FurnitureKind, { w: number; d: number }> = {
  sofa: { w: 1.7, d: 0.85 },
  bed: { w: 1.6, d: 2.1 },
  table: { w: 1.2, d: 0.8 },
  chair: { w: 0.5, d: 0.5 },
  lamp: { w: 0.4, d: 0.4 },
  wardrobe: { w: 1.3, d: 0.6 },
  rug: { w: 1.8, d: 1.3 },
  counter: { w: 2.2, d: 0.65 },
  fridge: { w: 0.7, d: 0.7 },
  bathtub: { w: 1.7, d: 0.8 },
  toilet: { w: 0.45, d: 0.65 },
  vanity: { w: 0.9, d: 0.5 },
  tvstand: { w: 1.4, d: 0.45 },
  nightstand: { w: 0.45, d: 0.4 },
  shelf: { w: 1.0, d: 0.4 },
  console: { w: 1.0, d: 0.4 },
  plant: { w: 0.45, d: 0.45 },
};

export type WallPaletteId = "cream" | "white" | "sage" | "sand" | "slate";

export interface HouseModel {
  rooms: RoomBox[];
  wallThickness: number;
  source: "default" | "plan";
  title: string;
  furniture?: FurnitureItem[];
  wallPalette?: WallPaletteId;
  /** Design style used for auto-furnish / walls */
  styleId?: string;
}

export interface WallSegment {
  /** Box center in room-local / world space (y up). */
  position: [number, number, number];
  size: [number, number, number];
  kind: "wall" | "glass" | "door";
}

export const WALL_PALETTES: Record<
  WallPaletteId,
  { wall: string; labelRu: string; labelEn: string }
> = {
  cream: { wall: "#e8e0d4", labelRu: "Кремовые", labelEn: "Cream" },
  white: { wall: "#f4f4f2", labelRu: "Белые", labelEn: "White" },
  sage: { wall: "#c5d0c4", labelRu: "Шалфей", labelEn: "Sage" },
  sand: { wall: "#e2d2b8", labelRu: "Песок", labelEn: "Sand" },
  slate: { wall: "#b8c0c8", labelRu: "Сланец", labelEn: "Slate" },
};

export const FURNITURE_CATALOG: Array<{
  kind: FurnitureKind;
  labelRu: string;
  labelEn: string;
}> = [
  { kind: "sofa", labelRu: "Диван", labelEn: "Sofa" },
  { kind: "bed", labelRu: "Кровать", labelEn: "Bed" },
  { kind: "table", labelRu: "Стол", labelEn: "Table" },
  { kind: "chair", labelRu: "Стул", labelEn: "Chair" },
  { kind: "wardrobe", labelRu: "Шкаф", labelEn: "Wardrobe" },
  { kind: "lamp", labelRu: "Лампа", labelEn: "Lamp" },
  { kind: "rug", labelRu: "Ковёр", labelEn: "Rug" },
  { kind: "counter", labelRu: "Кухонный гарнитур", labelEn: "Kitchen counter" },
  { kind: "fridge", labelRu: "Холодильник", labelEn: "Fridge" },
  { kind: "bathtub", labelRu: "Ванна", labelEn: "Bathtub" },
  { kind: "toilet", labelRu: "Унитаз", labelEn: "Toilet" },
  { kind: "vanity", labelRu: "Тумба с раковиной", labelEn: "Vanity" },
  { kind: "tvstand", labelRu: "ТВ-тумба", labelEn: "TV stand" },
  { kind: "nightstand", labelRu: "Тумбочка", labelEn: "Nightstand" },
  { kind: "shelf", labelRu: "Стеллаж", labelEn: "Shelf" },
  { kind: "console", labelRu: "Консоль", labelEn: "Console" },
];


