import type { DesignStyle } from "@/lib/styles";
import type { ParsedRoom } from "./types";
import { getRoomTypeLabelEn } from "./room-types";
import { GENERATION_CONTENT_RULES, REALISM_GEOMETRY_RULES } from "./content-filter";

export interface RoomPromptInput {
  room: ParsedRoom;
  roomTypeId: string;
  style?: DesignStyle | null;
  layoutSummary?: string;
  userNotes?: string;
  regenerate?: boolean;
  ceilingHeightM?: number;
}

const ROOM_FURNITURE_HINTS: Record<string, string> = {
  living:
    "sofa, coffee table, TV wall or media unit, area rug, curtains, ambient lighting — spacious layout",
  bedroom:
    "bed with headboard, nightstands, wardrobe/closet, soft textiles, bedside lamps",
  kitchen:
    "kitchen cabinets (upper and lower), countertop, sink, stove, refrigerator space, backsplash — NO loose dishes",
  bathroom:
    "bathtub or shower cabin, toilet, sink/vanity, mirror, towel rail, tiles — NO toiletries clutter",
  toilet: "toilet, small sink, mirror, compact tiles, minimal fixtures",
  hallway:
    "coat hooks or closet, shoe storage, mirror, compact lighting — keep passage clear",
  balcony: "outdoor furniture or planters, railing, simple flooring",
  storage: "shelving units, organized storage, minimal decoration",
  office: "desk, chair, bookshelf, task lighting",
  dining: "dining table, chairs, pendant lamp above table, sideboard optional",
  unknown: "appropriate furniture for room size and shape",
};

function buildOpeningsBlock(room: ParsedRoom): string {
  const parts: string[] = [
    "=== OPENINGS — WINDOWS & DOORS (MANDATORY — FROM FLOOR PLAN) ===",
    "The camera view MUST show openings exactly as specified. Do NOT invent extra windows or doors.",
    "Do NOT place windows on interior walls. Windows only on exterior walls.",
    "Show the door opening on the correct wall leading to the connected room.",
  ];

  if (room.exteriorWalls?.length) {
    parts.push(`Exterior walls (windows allowed): ${room.exteriorWalls.join(", ")}`);
  }

  if (room.openings?.length) {
    for (const o of room.openings) {
      const line = [
        `- ${o.type.toUpperCase()} on ${o.wall} wall`,
        o.connectsTo ? `→ connects to room ${o.connectsTo}` : "",
        o.description ?? "",
      ]
        .filter(Boolean)
        .join(" ");
      parts.push(line);
    }
  }

  if (room.windows) {
    parts.push(`Windows (plan): ${room.windows}`);
  } else {
    parts.push("Windows (plan): none — interior room, no exterior window");
  }

  if (room.doors) {
    parts.push(`Doors (plan): ${room.doors}`);
  }

  parts.push(
    "RENDERING RULES:",
    "- Natural daylight MUST enter through the specified window wall only",
    "- Door must be visible or implied on the specified wall (closed door or doorway)",
    "- Furniture must NOT block the window or door",
    "- If no window specified, use artificial lighting only — no fake exterior windows"
  );

  return parts.join("\n");
}

function buildCeilingBlock(ceilingHeightM: number): string {
  return [
    "=== CEILING HEIGHT (MANDATORY — USER SPECIFIED) ===",
    `Ceiling height: ${ceilingHeightM} m`,
    "The room volume, wall height, door height, and window proportions MUST match this ceiling height.",
    "Standard door ~2.0–2.1 m; window sill typically ~0.9 m from floor unless plan notes say otherwise.",
  ].join("\n");
}

function buildDimensionsBlock(room: ParsedRoom, ceilingHeightM?: number): string {
  const parts: string[] = [
    "=== ROOM DIMENSIONS (MANDATORY — MUST MATCH EXACTLY) ===",
  ];

  if (room.dimensions) {
    parts.push(`Dimensions (floor plan): ${room.dimensions}`);
  } else if (room.widthM && room.lengthM) {
    parts.push(`Width: ${room.widthM} m × Length: ${room.lengthM} m`);
  }

  if (room.areaSqm) parts.push(`Area: ${room.areaSqm} m²`);
  if (room.shape) parts.push(`Shape: ${room.shape}`);
  if (ceilingHeightM) parts.push(`Ceiling height: ${ceilingHeightM} m`);
  if (room.notes) parts.push(`Plan notes: ${room.notes}`);

  parts.push(
    "CRITICAL: The generated room MUST reflect these exact proportions.",
    "A 3.08m × 5.19m room must look rectangular with correct aspect ratio (~1:1.7).",
    "Do NOT invent different dimensions. Camera should show full room volume."
  );

  return parts.join("\n");
}

function buildStyleBlock(style: DesignStyle): string {
  return [
    `=== DESIGN STYLE (SURFACE / FURNITURE / DÉCOR ONLY): ${style.name.toUpperCase()} ===`,
    "Apply style WITHOUT changing plan dimensions, ceiling height, or openings.",
    style.promptDirective,
    `Atmosphere: ${style.atmosphere}`,
    `Lighting: ${style.lighting}`,
    `Color palette: ${style.colors}`,
    `Materials: ${style.materials}`,
  ].join("\n");
}

export function buildRoomGenerationPrompt(input: RoomPromptInput): string {
  const roomTypeEn = getRoomTypeLabelEn(input.roomTypeId);
  const furnitureHint =
    ROOM_FURNITURE_HINTS[input.roomTypeId] ??
    ROOM_FURNITURE_HINTS.unknown;

  const sections: string[] = [
    "You are generating a photorealistic renovation of ONE real apartment room from a technical passport.",
    "The resident wants THIS room restyled — not a larger fantasy space.",
    REALISM_GEOMETRY_RULES,
    `ROOM NUMBER: ${input.room.number}`,
    `ROOM TYPE: ${roomTypeEn}`,
    buildDimensionsBlock(input.room, input.ceilingHeightM),
    ...(input.ceilingHeightM
      ? [buildCeilingBlock(input.ceilingHeightM)]
      : []),
    buildOpeningsBlock(input.room),
  ];

  if (input.layoutSummary) {
    sections.push(
      `=== APARTMENT CONTEXT ===\n${input.layoutSummary}`
    );
  }

  if (input.style) {
    sections.push(buildStyleBlock(input.style));
    sections.push(
      "Apply the design style to finishes, furniture, lighting and décor ONLY — never by expanding the room or adding columns/arches not on the plan."
    );
  } else {
    sections.push(
      "=== STYLE: AUTO ===",
      "Choose a cohesive contemporary renovation style appropriate for this room type.",
      "Still obey REAL ROOM GEOMETRY rules."
    );
  }

  sections.push(
    `=== FURNITURE & FIXTURES (${roomTypeEn}) ===`,
    furnitureHint,
    "Furniture scale MUST match room dimensions — do not overcrowd small rooms."
  );

  if (input.regenerate && input.userNotes?.trim()) {
    sections.push(
      "=== APPLY USER CHANGES (PRIORITY) ===",
      "Regenerate this room applying these specific changes:",
      input.userNotes.trim(),
      "Keep the same room dimensions, room type, and design style unless the user explicitly asks to change them.",
      "Preserve furniture layout where possible; change only what the user requested."
    );
  } else if (input.regenerate) {
    sections.push(
      "=== REGENERATION ===",
      "Create a NEW variation of this room's renovation. Change furniture arrangement, decor details, or color accents while keeping the same dimensions and room type."
    );
  }

  if (!input.regenerate && input.userNotes?.trim()) {
    sections.push(`=== USER NOTES ===\n${input.userNotes.trim()}`);
  }

  sections.push(GENERATION_CONTENT_RULES);

  sections.push(
    "=== OUTPUT ===",
    "Single photorealistic interior photograph of this ONE room after renovation.",
    "Wide-angle lens (16-24mm), eye-level, camera positioned to show the window wall AND the door wall if possible.",
    "8K quality, natural lighting from windows on the correct wall only, realistic materials.",
    "AVOID: text, watermarks, floor plan overlay, wrong proportions, CGI artifacts, invented columns, raised ceilings, enlarged rooms."
  );

  return sections.join("\n\n");
}


