import type { ParsedRoom, RoomOpening, TechPassportAnalysis } from "@/lib/techpassport/types";
import type { HouseModel, OpeningSpec, RoomBox, WallSegment, WallSide } from "./types";

const ROOM_COLORS = [
  "#c4a574",
  "#8fa68a",
  "#7a9bb8",
  "#b89a7a",
  "#9a8ab0",
  "#a89078",
  "#6d8f9c",
  "#b08878",
];

const WALL_ALIASES: Record<string, WallSide> = {
  front: "front",
  back: "back",
  left: "left",
  right: "right",
  top: "back",
  bottom: "front",
  north: "back",
  south: "front",
  east: "right",
  west: "left",
  верх: "back",
  низ: "front",
  лево: "left",
  право: "right",
  север: "back",
  юг: "front",
  восток: "right",
  запад: "left",
};

function normalizeWall(raw?: string): WallSide | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  return WALL_ALIASES[key] ?? null;
}

function inferDims(room: ParsedRoom): { width: number; depth: number } {
  let width = room.widthM;
  let depth = room.lengthM;
  if ((!width || !depth) && room.dimensions) {
    const nums = room.dimensions.match(/(\d+[.,]?\d*)/g)?.map((n) => parseFloat(n.replace(",", ".")));
    if (nums && nums.length >= 2) {
      width = width ?? nums[0];
      depth = depth ?? nums[1];
    }
  }
  if ((!width || !depth) && room.areaSqm && room.areaSqm > 0) {
    const side = Math.sqrt(room.areaSqm);
    width = width ?? side;
    depth = depth ?? side;
  }
  width = Math.max(1.5, Math.min(12, width ?? 3.5));
  depth = Math.max(1.5, Math.min(12, depth ?? 4));
  return { width, depth };
}

function parseOpeningHints(
  text: string | undefined,
  type: "window" | "door"
): Array<OpeningSpec & { wall: WallSide }> {
  if (!text?.trim()) return [];
  const lower = text.toLowerCase();
  const countMatch = lower.match(/(\d+)/);
  const count = countMatch ? Math.min(4, Math.max(1, parseInt(countMatch[1], 10))) : 1;
  const wallHint = ["top", "bottom", "left", "right", "front", "back", "верх", "низ", "лево", "право"].find(
    (w) => lower.includes(w)
  );
  const wall =
    normalizeWall(wallHint) ?? (type === "window" ? "back" : "front");

  return Array.from({ length: count }, (_, i) => ({
    type,
    wall,
    t: count === 1 ? 0.5 : (i + 1) / (count + 1),
    width: type === "window" ? 1.2 : 0.9,
    height: type === "window" ? 1.4 : 2.1,
    sillHeight: type === "window" ? 0.9 : 0,
  }));
}

function openingsFromRoom(room: ParsedRoom, ceilingH: number): Array<OpeningSpec & { wall: WallSide }> {
  const fromStructured: Array<OpeningSpec & { wall: WallSide }> = [];
  const seen = new Set<string>();

  const push = (o: RoomOpening) => {
    const wall = normalizeWall(o.wall) ?? (o.type === "window" ? "back" : "front");
    const key = `${o.type}-${wall}`;
    const index = [...seen].filter((k) => k.startsWith(`${o.type}-`)).length;
    seen.add(key + index);
    const isWindow = o.type === "window";
    fromStructured.push({
      type: o.type,
      wall,
      t: 0.35 + (index % 3) * 0.15,
      width: isWindow ? 1.2 : 0.9,
      height: isWindow ? Math.min(1.5, ceilingH * 0.55) : Math.min(2.2, ceilingH * 0.85),
      sillHeight: isWindow ? 0.9 : 0,
    });
  };

  if (room.openings?.length) {
    for (const o of room.openings) push(o);
  }

  if (fromStructured.length === 0) {
    fromStructured.push(...parseOpeningHints(room.windows, "window"));
    fromStructured.push(...parseOpeningHints(room.doors, "door"));
  }

  if (fromStructured.length === 0) {
    fromStructured.push({
      type: "window",
      wall: "back",
      t: 0.5,
      width: 1.2,
      height: 1.4,
      sillHeight: 0.9,
    });
    fromStructured.push({
      type: "door",
      wall: "front",
      t: 0.5,
      width: 0.9,
      height: Math.min(2.1, ceilingH * 0.8),
      sillHeight: 0,
    });
  }

  return fromStructured.map((o) => ({
    ...o,
    height: Math.min(o.height, ceilingH - o.sillHeight - 0.05),
  }));
}

/** Pack rooms into a grid on the XZ plane. */
function packRooms(
  rooms: ParsedRoom[],
  ceilingHeightM: number,
  labels: Record<string, string>,
  roomTypes?: Record<string, string>
): RoomBox[] {
  const gap = 0.15;
  const boxes: RoomBox[] = [];
  let cursorX = 0;
  let cursorZ = 0;
  let rowDepth = 0;
  let rowWidth = 0;
  const maxRowWidth = 14;

  rooms.forEach((room, i) => {
    const { width, depth } = inferDims(room);
    if (rowWidth + width > maxRowWidth && boxes.length > 0) {
      cursorX = 0;
      cursorZ += rowDepth + gap;
      rowDepth = 0;
      rowWidth = 0;
    }
    boxes.push({
      id: room.number,
      label: labels[room.number] ?? room.label ?? `№${room.number}`,
      roomType: roomTypes?.[room.number] ?? room.suggestedType,
      x: cursorX,
      z: cursorZ,
      width,
      depth,
      height: ceilingHeightM,
      openings: openingsFromRoom(room, ceilingHeightM),
      color: ROOM_COLORS[i % ROOM_COLORS.length],
    });
    cursorX += width + gap;
    rowWidth += width + gap;
    rowDepth = Math.max(rowDepth, depth);
  });

  // Center around origin
  if (boxes.length === 0) return boxes;
  const minX = Math.min(...boxes.map((b) => b.x));
  const maxX = Math.max(...boxes.map((b) => b.x + b.width));
  const minZ = Math.min(...boxes.map((b) => b.z));
  const maxZ = Math.max(...boxes.map((b) => b.z + b.depth));
  const ox = (minX + maxX) / 2;
  const oz = (minZ + maxZ) / 2;
  return boxes.map((b) => ({ ...b, x: b.x - ox, z: b.z - oz }));
}

export function buildHouseFromPlan(
  analysis: TechPassportAnalysis,
  opts: {
    ceilingHeightM: number;
    roomNumbers?: string[];
    labels?: Record<string, string>;
    roomTypes?: Record<string, string>;
  }
): HouseModel {
  const selected = opts.roomNumbers?.length
    ? analysis.rooms.filter((r) => opts.roomNumbers!.includes(r.number))
    : analysis.rooms;

  return {
    rooms: packRooms(
      selected,
      opts.ceilingHeightM,
      opts.labels ?? {},
      opts.roomTypes
    ),
    wallThickness: 0.15,
    source: "plan",
    title: analysis.layoutSummary?.slice(0, 80) || "Квартира по плану",
  };
}

/**
 * Default demo: ordinary compact apartment (typical CIS 2-room flat scale),
 * not a cottage or villa.
 */
export function buildDefaultHouse(ceilingHeightM = 2.7): HouseModel {
  const h = ceilingHeightM;
  return {
    wallThickness: 0.15,
    source: "default",
    title: "Типовая квартира",
    rooms: [
      {
        id: "hallway",
        label: "Прихожая",
        roomType: "hallway",
        x: -3.6,
        z: -0.6,
        width: 1.3,
        depth: 3.2,
        height: h,
        color: ROOM_COLORS[4],
        openings: [
          { type: "entrance", wall: "front", t: 0.45, width: 0.95, height: 2.1, sillHeight: 0 },
          { type: "door", wall: "right", t: 0.35, width: 0.85, height: 2.05, sillHeight: 0 },
          { type: "door", wall: "right", t: 0.75, width: 0.85, height: 2.05, sillHeight: 0 },
        ],
      },
      {
        id: "living",
        label: "Гостиная",
        roomType: "living",
        x: -2.15,
        z: -1.7,
        width: 4.4,
        depth: 3.4,
        height: h,
        color: ROOM_COLORS[0],
        openings: [
          { type: "door", wall: "left", t: 0.35, width: 0.85, height: 2.05, sillHeight: 0 },
          { type: "window", wall: "back", t: 0.35, width: 1.35, height: 1.4, sillHeight: 0.9 },
          { type: "window", wall: "back", t: 0.7, width: 1.35, height: 1.4, sillHeight: 0.9 },
        ],
      },
      {
        id: "kitchen",
        label: "Кухня",
        roomType: "kitchen",
        x: -2.15,
        z: 1.85,
        width: 2.5,
        depth: 2.6,
        height: h,
        color: ROOM_COLORS[2],
        openings: [
          { type: "door", wall: "front", t: 0.3, width: 0.8, height: 2.05, sillHeight: 0 },
          { type: "window", wall: "back", t: 0.55, width: 1.2, height: 1.35, sillHeight: 0.9 },
        ],
      },
      {
        id: "bedroom",
        label: "Спальня",
        roomType: "bedroom",
        x: 2.4,
        z: -1.55,
        width: 3.1,
        depth: 3.3,
        height: h,
        color: ROOM_COLORS[1],
        openings: [
          { type: "door", wall: "left", t: 0.3, width: 0.85, height: 2.05, sillHeight: 0 },
          { type: "window", wall: "right", t: 0.5, width: 1.3, height: 1.4, sillHeight: 0.9 },
        ],
      },
      {
        id: "bathroom",
        label: "Ванная",
        roomType: "bathroom",
        x: 2.4,
        z: 1.9,
        width: 1.7,
        depth: 2.2,
        height: h,
        color: ROOM_COLORS[3],
        openings: [
          { type: "door", wall: "front", t: 0.45, width: 0.75, height: 2.0, sillHeight: 0 },
        ],
      },
    ],
  };
}

/**
 * Build wall / glass / door box segments for one room (world space).
 * Walls are split around openings so windows and doors appear as cutouts.
 */
export function buildRoomWallSegments(
  room: RoomBox,
  thickness: number
): WallSegment[] {
  const segments: WallSegment[] = [];
  const t = thickness;
  const h = room.height;
  const w = room.width;
  const d = room.depth;

  const walls: Array<{
    side: WallSide;
    length: number;
    // Map local u (0..length) and y into world position for a box center of size (sx,sy,sz)
    place: (uCenter: number, yCenter: number, su: number, sy: number) => WallSegment;
  }> = [
    {
      side: "front",
      length: w,
      place: (u, y, su, sy) => ({
        position: [room.x + u, y, room.z + t / 2],
        size: [su, sy, t],
        kind: "wall",
      }),
    },
    {
      side: "back",
      length: w,
      place: (u, y, su, sy) => ({
        position: [room.x + u, y, room.z + d - t / 2],
        size: [su, sy, t],
        kind: "wall",
      }),
    },
    {
      side: "left",
      length: d,
      place: (u, y, su, sy) => ({
        position: [room.x + t / 2, y, room.z + u],
        size: [t, sy, su],
        kind: "wall",
      }),
    },
    {
      side: "right",
      length: d,
      place: (u, y, su, sy) => ({
        position: [room.x + w - t / 2, y, room.z + u],
        size: [t, sy, su],
        kind: "wall",
      }),
    },
  ];

  for (const wall of walls) {
    const openings = room.openings
      .filter((o) => o.wall === wall.side)
      .map((o) => {
        const half = o.width / 2;
        let center = o.t * wall.length;
        center = Math.max(half + 0.05, Math.min(wall.length - half - 0.05, center));
        return {
          ...o,
          start: center - half,
          end: center + half,
          center,
        };
      })
      .sort((a, b) => a.start - b.start);

    // Merge overlapping openings on same wall
    type Op = (typeof openings)[number];
    const merged: Op[] = [];
    for (const op of openings) {
      const last = merged[merged.length - 1];
      if (last && op.start < last.end) {
        last.end = Math.max(last.end, op.end);
        last.center = (last.start + last.end) / 2;
        last.width = last.end - last.start;
      } else {
        merged.push({ ...op });
      }
    }

    let cursor = 0;
    const addSolid = (from: number, to: number, y0: number, y1: number) => {
      const len = to - from;
      if (len < 0.04) return;
      const u = (from + to) / 2;
      const sy = y1 - y0;
      const y = (y0 + y1) / 2;
      segments.push({ ...wall.place(u, y, len, sy), kind: "wall" });
    };

    for (const op of merged) {
      addSolid(cursor, op.start, 0, h);
      // below opening (sill)
      if (op.sillHeight > 0.04) {
        addSolid(op.start, op.end, 0, op.sillHeight);
      }
      // above opening (header)
      const top = op.sillHeight + op.height;
      if (top < h - 0.04) {
        addSolid(op.start, op.end, top, h);
      }
      // fill (glass or door) — slightly inset
      const fillH = op.height;
      const fillY = op.sillHeight + fillH / 2;
      const fill = wall.place(op.center, fillY, op.width * 0.96, fillH * 0.96);
      const isDoor = op.type === "door" || op.type === "entrance";
      segments.push({
        ...fill,
        kind: isDoor ? "door" : "glass",
        size: [
          fill.size[0],
          fill.size[1],
          Math.max(0.04, fill.size[2] * 0.35),
        ],
      });
      cursor = op.end;
    }
    addSolid(cursor, wall.length, 0, h);
  }

  // Floor slab
  segments.push({
    position: [room.x + w / 2, 0.04, room.z + d / 2],
    size: [w - t * 0.5, 0.08, d - t * 0.5],
    kind: "wall",
  });

  return segments;
}

export function houseBounds(model: HouseModel): {
  center: [number, number, number];
  size: number;
} {
  if (model.rooms.length === 0) {
    return { center: [0, 1.2, 0], size: 8 };
  }
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity,
    maxY = 0;
  for (const r of model.rooms) {
    minX = Math.min(minX, r.x);
    maxX = Math.max(maxX, r.x + r.width);
    minZ = Math.min(minZ, r.z);
    maxZ = Math.max(maxZ, r.z + r.depth);
    maxY = Math.max(maxY, r.height);
  }
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const span = Math.max(maxX - minX, maxZ - minZ, maxY) || 8;
  return { center: [cx, maxY / 2, cz], size: span };
}


