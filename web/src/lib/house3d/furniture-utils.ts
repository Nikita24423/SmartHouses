import type { FurnitureItem, RoomBox } from "./types";

/** Tighter margins in small apartment rooms so furniture stays usable. */
function roomMargin(room: RoomBox): number {
  const short = Math.min(room.width, room.depth);
  if (short < 2) return 0.22;
  if (short < 3) return 0.3;
  return 0.4;
}

export function furnitureLocalPos(
  room: RoomBox,
  item: FurnitureItem
): [number, number, number] {
  const margin = roomMargin(room);
  const usableW = Math.max(0.15, room.width - margin * 2);
  const usableD = Math.max(0.15, room.depth - margin * 2);
  const x = room.x + margin + item.u * usableW;
  const z = room.z + margin + item.v * usableD;
  return [x, 0, z];
}

export function uvFromLocalXZ(
  room: RoomBox,
  x: number,
  z: number
): { u: number; v: number } {
  const margin = roomMargin(room);
  const usableW = Math.max(0.15, room.width - margin * 2);
  const usableD = Math.max(0.15, room.depth - margin * 2);
  const u = Math.min(1, Math.max(0, (x - room.x - margin) / usableW));
  const v = Math.min(1, Math.max(0, (z - room.z - margin) / usableD));
  return { u, v };
}

export function findRoomAtPoint(
  rooms: RoomBox[],
  x: number,
  z: number,
  preferredId?: string
): RoomBox | null {
  if (preferredId) {
    const preferred = rooms.find((r) => r.id === preferredId);
    if (
      preferred &&
      x >= preferred.x &&
      x <= preferred.x + preferred.width &&
      z >= preferred.z &&
      z <= preferred.z + preferred.depth
    ) {
      return preferred;
    }
  }
  return (
    rooms.find(
      (r) =>
        x >= r.x &&
        x <= r.x + r.width &&
        z >= r.z &&
        z <= r.z + r.depth
    ) ?? null
  );
}

export function nextFurnitureSlot(
  existing: FurnitureItem[],
  roomId: string
): { u: number; v: number; rotationY: number } {
  const count = existing.filter((f) => f.roomId === roomId).length;
  const col = count % 3;
  const row = Math.floor(count / 3) % 3;
  return {
    u: 0.28 + col * 0.22,
    v: 0.28 + row * 0.22,
    rotationY: (count % 4) * (Math.PI / 2) * 0.15,
  };
}


