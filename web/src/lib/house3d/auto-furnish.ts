import type {
  FurnitureItem,
  FurnitureKind,
  HouseModel,
  RoomBox,
  WallPaletteId,
} from "./types";
import { FURNITURE_FOOTPRINT } from "./types";

/** Map design style → wall palette for the 3D apartment. */
export function wallPaletteForStyle(styleId: string | undefined): WallPaletteId {
  switch (styleId) {
    case "industrial":
    case "hi-tech":
    case "bauhaus":
    case "futurism":
      return "slate";
    case "boho":
    case "country":
    case "mediterranean":
    case "kitsch":
    case "shabby-chic":
      return "sand";
    case "scandinavian":
    case "hygge":
    case "japanese":
    case "minimalism":
    case "pop-art":
      return "white";
    case "classic":
    case "empire":
      return "cream";
    default:
      return "cream";
  }
}

type RoomKind =
  | "living"
  | "bedroom"
  | "kitchen"
  | "dining"
  | "bathroom"
  | "toilet"
  | "hallway"
  | "office"
  | "balcony"
  | "storage"
  | "generic";

type Slot = {
  kind: FurnitureKind;
  u: number;
  v: number;
  rot: number;
  scale?: number;
  /** Skip if room area (m²) is below this. */
  minArea?: number;
};

function inferRoomKind(room: RoomBox): RoomKind {
  if (room.roomType) {
    const t = room.roomType.toLowerCase();
    if (t === "toilet" || t.includes("toilet") || t === "wc") return "toilet";
    if (t.includes("bath") || t === "bathroom") return "bathroom";
    if (t.includes("bed") || t === "bedroom") return "bedroom";
    if (t.includes("kitchen") || t === "kitchen") return "kitchen";
    if (t.includes("hall") || t === "hallway") return "hallway";
    if (t.includes("offic") || t === "office") return "office";
    if (t.includes("dining") || t === "dining") return "dining";
    if (t.includes("balcon") || t === "balcony") return "balcony";
    if (t.includes("stor") || t === "storage") return "storage";
    if (t.includes("living") || t === "living") return "living";
  }

  const label = `${room.label} ${room.id}`.toLowerCase();
  if (/туалет|toilet|wc/.test(label)) return "toilet";
  if (/ванн|сануз|bath/.test(label)) return "bathroom";
  if (/спальн|bedroom/.test(label)) return "bedroom";
  if (/кухн|kitchen/.test(label)) return "kitchen";
  if (/коридор|прихож|hall/.test(label)) return "hallway";
  if (/кабинет|office/.test(label)) return "office";
  if (/столов|dining/.test(label)) return "dining";
  if (/балкон|лоджи|balcon/.test(label)) return "balcony";
  if (/кладов|storage|гардероб/.test(label)) return "storage";
  if (/гостин|living|зал/.test(label)) return "living";
  return "generic";
}

/**
 * Scale furniture to ordinary apartment room sizes (not villa proportions).
 * Typical living ~12–16 m² → 1.0; kitchen ~5–8 m² → ~0.75–0.85.
 */
function apartmentScale(room: RoomBox): number {
  const area = room.width * room.depth;
  if (area < 4) return 0.65;
  if (area < 6) return 0.75;
  if (area < 9) return 0.82;
  if (area < 12) return 0.9;
  if (area < 18) return 0.95;
  return 1;
}

/**
 * Compact apartment presets by room type — furniture only, no plants/trees.
 * Layouts hug walls like a real flat, not an open loft.
 */
function layoutForRoom(kind: RoomKind): Slot[] {
  switch (kind) {
    case "bedroom":
      return [
        { kind: "bed", u: 0.55, v: 0.42, rot: 0, scale: 0.92 },
        { kind: "nightstand", u: 0.2, v: 0.22, rot: 0, scale: 0.95, minArea: 8 },
        { kind: "nightstand", u: 0.88, v: 0.22, rot: 0, scale: 0.95, minArea: 10 },
        { kind: "wardrobe", u: 0.12, v: 0.72, rot: 1, scale: 0.88, minArea: 8 },
        { kind: "lamp", u: 0.88, v: 0.75, rot: 0, scale: 0.85, minArea: 7 },
        { kind: "rug", u: 0.55, v: 0.55, rot: 0, scale: 0.85, minArea: 10 },
      ];

    case "kitchen":
      // Typical small kitchen: wall units + fridge; table only if space allows
      return [
        { kind: "counter", u: 0.55, v: 0.16, rot: 0, scale: 0.82 },
        { kind: "fridge", u: 0.12, v: 0.18, rot: 0, scale: 0.9 },
        { kind: "table", u: 0.55, v: 0.62, rot: 0, scale: 0.72, minArea: 7 },
        { kind: "chair", u: 0.55, v: 0.42, rot: 0, scale: 0.9, minArea: 7 },
        { kind: "chair", u: 0.35, v: 0.62, rot: 1, scale: 0.9, minArea: 9 },
      ];

    case "dining":
      return [
        { kind: "table", u: 0.5, v: 0.5, rot: 0, scale: 0.9 },
        { kind: "chair", u: 0.5, v: 0.24, rot: 0, scale: 0.95 },
        { kind: "chair", u: 0.5, v: 0.76, rot: 2, scale: 0.95 },
        { kind: "chair", u: 0.24, v: 0.5, rot: 1, scale: 0.95, minArea: 9 },
        { kind: "chair", u: 0.76, v: 0.5, rot: 3, scale: 0.95, minArea: 9 },
        { kind: "lamp", u: 0.5, v: 0.5, rot: 0, scale: 0.8 },
        { kind: "rug", u: 0.5, v: 0.5, rot: 0, scale: 0.9, minArea: 10 },
      ];

    case "office":
      return [
        { kind: "table", u: 0.55, v: 0.28, rot: 0, scale: 0.85 },
        { kind: "chair", u: 0.55, v: 0.52, rot: 2, scale: 0.95 },
        { kind: "shelf", u: 0.14, v: 0.55, rot: 1, scale: 0.85 },
        { kind: "lamp", u: 0.82, v: 0.25, rot: 0, scale: 0.8 },
      ];

    case "bathroom":
      return [
        { kind: "bathtub", u: 0.32, v: 0.22, rot: 0, scale: 0.88, minArea: 3 },
        { kind: "vanity", u: 0.78, v: 0.22, rot: 0, scale: 0.85 },
        { kind: "toilet", u: 0.78, v: 0.72, rot: 2, scale: 0.95 },
      ];

    case "toilet":
      return [
        { kind: "toilet", u: 0.5, v: 0.28, rot: 0, scale: 0.95 },
        { kind: "vanity", u: 0.5, v: 0.78, rot: 2, scale: 0.75 },
      ];

    case "hallway":
      return [
        { kind: "wardrobe", u: 0.22, v: 0.45, rot: 1, scale: 0.75, minArea: 3.5 },
        { kind: "console", u: 0.75, v: 0.3, rot: 0, scale: 0.8, minArea: 3 },
        { kind: "lamp", u: 0.75, v: 0.7, rot: 0, scale: 0.75, minArea: 3 },
      ];

    case "balcony":
      return [
        { kind: "chair", u: 0.4, v: 0.4, rot: 0, scale: 0.85 },
        { kind: "table", u: 0.55, v: 0.7, rot: 0, scale: 0.55, minArea: 2.5 },
      ];

    case "storage":
      return [
        { kind: "shelf", u: 0.3, v: 0.35, rot: 0, scale: 0.9 },
        { kind: "shelf", u: 0.7, v: 0.35, rot: 0, scale: 0.9, minArea: 3 },
        { kind: "wardrobe", u: 0.5, v: 0.75, rot: 2, scale: 0.8, minArea: 4 },
      ];

    case "living":
    case "generic":
    default:
      return [
        { kind: "sofa", u: 0.5, v: 0.2, rot: 0, scale: 0.9 },
        { kind: "table", u: 0.5, v: 0.48, rot: 0, scale: 0.72 },
        { kind: "tvstand", u: 0.5, v: 0.88, rot: 2, scale: 0.9 },
        { kind: "rug", u: 0.5, v: 0.5, rot: 0, scale: 0.9, minArea: 10 },
        { kind: "lamp", u: 0.14, v: 0.28, rot: 0, scale: 0.85 },
        { kind: "chair", u: 0.86, v: 0.45, rot: 3, scale: 0.9, minArea: 14 },
      ];
  }
}

function fitsInRoom(room: RoomBox, kind: FurnitureKind, scale: number): boolean {
  const fp = FURNITURE_FOOTPRINT[kind];
  const w = fp.w * scale;
  const d = fp.d * scale;
  const maxSide = Math.max(room.width, room.depth) * 0.9;
  const minSide = Math.min(room.width, room.depth) * 0.9;
  const long = Math.max(w, d);
  const short = Math.min(w, d);
  return long <= maxSide && short <= minSide;
}

function furnishRoom(room: RoomBox, _styleId: string | undefined): FurnitureItem[] {
  const kind = inferRoomKind(room);
  const layout = layoutForRoom(kind);
  const area = room.width * room.depth;
  const roomScale = apartmentScale(room);

  return layout
    .filter((slot) => {
      if (slot.kind === "plant") return false;
      if (slot.minArea != null && area < slot.minArea) return false;
      const scale = (slot.scale ?? 1) * roomScale;
      return fitsInRoom(room, slot.kind, scale);
    })
    .map((slot) => ({
      id: crypto.randomUUID(),
      kind: slot.kind,
      roomId: room.id,
      u: slot.u,
      v: slot.v,
      rotationY: slot.rot * (Math.PI / 2),
      scale: (slot.scale ?? 1) * roomScale,
    }));
}

/**
 * Auto-place apartment furniture by room type + wall palette from design style.
 * Sized for ordinary flats; no plants/trees.
 */
export function autoFurnishHouse(
  model: HouseModel,
  styleId?: string
): HouseModel {
  const furniture = model.rooms.flatMap((room) => furnishRoom(room, styleId));
  return {
    ...model,
    styleId: styleId && styleId !== "none" ? styleId : model.styleId,
    wallPalette: wallPaletteForStyle(styleId),
    furniture,
  };
}


