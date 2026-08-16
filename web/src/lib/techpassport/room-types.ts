export interface RoomTypeOption {
  id: string;
  label: string;
  labelEn: string;
}

export const ROOM_TYPES: RoomTypeOption[] = [
  { id: "living", label: "Гостиная / жилая", labelEn: "living room" },
  { id: "bedroom", label: "Спальня", labelEn: "bedroom" },
  { id: "kitchen", label: "Кухня", labelEn: "kitchen" },
  { id: "bathroom", label: "Ванная", labelEn: "bathroom" },
  { id: "toilet", label: "Туалет", labelEn: "toilet / WC" },
  { id: "hallway", label: "Коридор / прихожая", labelEn: "hallway / corridor" },
  { id: "balcony", label: "Балкон / лоджия", labelEn: "balcony" },
  { id: "storage", label: "Кладовая", labelEn: "storage room" },
  { id: "office", label: "Кабинет", labelEn: "home office" },
  { id: "dining", label: "Столовая", labelEn: "dining room" },
  { id: "unknown", label: "Другое", labelEn: "room" },
];

export function getRoomTypeLabel(id: string): string {
  return ROOM_TYPES.find((t) => t.id === id)?.label ?? id;
}

export function getRoomTypeLabelEn(id: string): string {
  return ROOM_TYPES.find((t) => t.id === id)?.labelEn ?? "room";
}


