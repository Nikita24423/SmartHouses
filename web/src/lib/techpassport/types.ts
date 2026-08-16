export interface RoomOpening {
  type: "window" | "door" | "entrance";
  wall: string;
  connectsTo?: string;
  description?: string;
}

export interface ParsedRoom {
  number: string;
  label?: string;
  suggestedType: string;
  areaSqm?: number;
  widthM?: number;
  lengthM?: number;
  dimensions?: string;
  shape?: string;
  windows?: string;
  doors?: string;
  openings?: RoomOpening[];
  exteriorWalls?: string[];
  notes?: string;
  /** Normalized 0–1 position of room center on the plan image (left→right). */
  markerX?: number;
  /** Normalized 0–1 position of room center on the plan image (top→bottom). */
  markerY?: number;
  /** Camera facing on plan in degrees: 0 = up/north on image, clockwise. */
  facingDeg?: number;
}

export interface TechPassportAnalysis {
  rooms: ParsedRoom[];
  totalAreaSqm?: number;
  apartmentShape?: string;
  layoutSummary: string;
  rawAnalysis: string;
}

export interface RoomLabelOverride {
  number: string;
  typeId: string;
}

export interface RoomUserOverrides {
  windows?: string;
  doors?: string;
  notes?: string;
}

export function mergeRoomWithOverrides(
  room: ParsedRoom,
  overrides?: RoomUserOverrides
): ParsedRoom {
  if (!overrides) return room;
  const windows = overrides.windows?.trim();
  const doors = overrides.doors?.trim();
  const notes = overrides.notes?.trim();
  return {
    ...room,
    windows: windows || room.windows,
    doors: doors || room.doors,
    notes: [room.notes, notes].filter(Boolean).join("; ") || room.notes,
  };
}

export function applyPlanOverrides(
  analysis: TechPassportAnalysis,
  roomOverrides?: Record<string, RoomUserOverrides>
): TechPassportAnalysis {
  if (!roomOverrides || Object.keys(roomOverrides).length === 0) return analysis;
  return {
    ...analysis,
    rooms: analysis.rooms.map((room) =>
      mergeRoomWithOverrides(room, roomOverrides[room.number])
    ),
  };
}


