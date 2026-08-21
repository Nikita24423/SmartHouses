import { createHash } from "node:crypto";

export const PROMPT_VERSION = "interior-context-v2";

const AUTO_STYLE = {
  id: "auto",
  name: "Авто",
  directive:
    "Select one coherent contemporary interior style that fits the room type, dimensions, daylight, and user request. Commit to that style consistently; do not leave the room undesigned or blend incompatible styles.",
};

const STYLES = new Map([
  ["empire", ["Ампир", "formal French Empire interior with symmetry, refined classical detailing, rich materials, and restrained gold accents"]],
  ["bauhaus", ["Баухаус", "functional Bauhaus geometry, modular furniture, primary accents, and no unnecessary ornament"]],
  ["boho", ["Бохо", "warm layered bohemian interior with natural materials, textiles, plants, and collected details"]],
  ["industrial", ["Индустриальный", "authentic industrial loft with brick, concrete, black steel, and practical furnishings"]],
  ["classic", ["Классический", "timeless European classic interior with balanced proportions, wood, textiles, and elegant lighting"]],
  ["country", ["Кантри", "comfortable country interior with wood, natural textiles, handmade details, and functional furniture"]],
  ["kitsch", ["Китч", "intentional, curated kitsch with bold color and pattern, while retaining a usable room layout"]],
  ["minimalism", ["Минимализм", "calm minimalist interior with concealed storage, essential furniture, and intentional negative space"]],
  ["pop-art", ["Поп-арт", "graphic pop-art interior with bold color, art-led accents, and complete practical furnishing"]],
  ["scandinavian", ["Скандинавский", "bright Scandinavian interior with light wood, comfortable furniture, natural textiles, and soft daylight"]],
  ["mediterranean", ["Средиземноморский", "sunlit Mediterranean interior with plaster, warm tile or stone, wood, and practical furnishings"]],
  ["futurism", ["Футуризм", "functional futuristic interior with integrated technology, controlled lighting, and human-scale furniture"]],
  ["hi-tech", ["Хай-тек", "precise high-tech interior with integrated appliances, glass, metal, and ergonomic furniture"]],
  ["hygge", ["Хюгге", "warm hygge interior with comfortable seating, layered textiles, and soft practical lighting"]],
  ["shabby-chic", ["Шебби-шик", "romantic shabby-chic interior with distressed pieces, soft textiles, and practical room furnishing"]],
  ["japanese", ["Японский", "calm Japanese-inspired interior with natural materials, low visual noise, and practical storage"]],
]);

const ROOM_PROGRAM = {
  living: "sofa, coffee table, TV/media unit, area rug, curtains, layered ambient lighting",
  bedroom: "bed with headboard, nightstands, wardrobe or closet, soft textiles, bedside lighting",
  kitchen: "full kitchen cabinetry, countertop, sink, refrigerator, cooktop, oven, extractor hood, dishwasher when space allows, dining seating",
  bathroom: "vanity with sink, mirror, shower or bathtub, toilet, washing machine when space allows, storage, realistic plumbing fixtures",
  toilet: "toilet, compact sink, mirror, storage, durable tile and realistic plumbing fixtures",
  hallway: "entry closet or coat storage, shoe storage, mirror, practical lighting, a clear circulation path",
  balcony: "weather-appropriate seating or planters, compact storage, safe clear access to the railing",
  storage: "organized shelving, closed storage, practical lighting, and unobstructed access",
  office: "desk, ergonomic chair, task lighting, storage, and bookshelves when space allows",
  dining: "dining table, correctly sized chairs, pendant lighting, and sideboard when space allows",
  unknown: "complete, room-appropriate furniture, lighting, storage, and appliances where function requires them",
};

const ROOM_IDENTITY = {
  living: "This is a living room, not a bedroom. Do not add a bed.",
  bedroom: "This is a bedroom. A bed is required; do not turn it into a kitchen.",
  kitchen: "This is a kitchen, never a bedroom. Kitchen cabinetry and appliances are required. Do not add a bed.",
  bathroom: "This is a bathroom, not a bedroom or kitchen. Use realistic plumbing fixtures only.",
  toilet: "This is a WC, not a bedroom or kitchen. Use compact realistic plumbing fixtures only.",
  hallway: "This is an entry hall or corridor, not a bedroom. Keep a clear circulation path and do not add a bed.",
  balcony: "This is a balcony or loggia, not a bedroom. Keep a safe clear path to the railing and do not add a bed.",
  storage: "This is a storage room, not a bedroom. Prioritize shelving and storage; do not add a bed.",
  office: "This is a home office, not a bedroom. A desk and ergonomic chair are required; do not add a bed.",
  dining: "This is a dining room, not a bedroom. A dining table and chairs are required; do not add a bed.",
  unknown: "Follow the user's description and supplied references to determine the room function.",
};

const ROOM_TYPE_KEYWORDS = [
  ["kitchen", /кух|kitchen/i],
  ["bedroom", /спаль|кроват|bedroom/i],
  ["bathroom", /ванн|душ|bathroom|санузел/i],
  ["toilet", /туалет|\bwc\b|\bтоалет/i],
  ["living", /гостин|\bзал\b|living room/i],
  ["hallway", /прихож|коридор|hallway|corridor/i],
  ["balcony", /балкон|лоджи|balcony|loggia/i],
  ["storage", /кладов|гардеробн|storage room|pantry/i],
  ["office", /кабинет|рабоч(?:ая|ий) комнат|home office/i],
  ["dining", /столов(?:ая|ую)|dining room/i],
];

function normalizeText(value) {
  return typeof value === "string"
    ? value.normalize("NFC").trim().replace(/\s+/g, " ")
    : "";
}

function normalizeRoomType(value) {
  const roomType = normalizeText(value).toLowerCase();
  return ROOM_PROGRAM[roomType] ? roomType : "unknown";
}

export function inferRoomType(description) {
  const text = normalizeText(description);
  const found = ROOM_TYPE_KEYWORDS.find(([, matcher]) => matcher.test(text));
  return found ? found[0] : "unknown";
}

export function resolveRequestedRoomType(roomType, description) {
  const requested = normalizeText(roomType).toLowerCase();
  if (requested && requested !== "auto" && ROOM_PROGRAM[requested]) return requested;
  return inferRoomType(description);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function resolveStyle(styleId) {
  const id = normalizeText(styleId).toLowerCase();
  if (!id || id === "auto" || id === "none") return AUTO_STYLE;

  const found = STYLES.get(id);
  if (!found) throw new Error("Стиль не найден");
  return { id, name: found[0], directive: found[1] };
}

export function resolveRoomProfile({ roomType, dimensions, layout, previous = null }) {
  if (previous) {
    return {
      roomType: normalizeRoomType(previous.roomType),
      dimensions: normalizeText(previous.dimensions),
      layout: normalizeText(previous.layout),
      locked: true,
    };
  }

  return {
    roomType: normalizeRoomType(roomType),
    dimensions: normalizeText(dimensions),
    layout: normalizeText(layout),
    locked: false,
  };
}

/**
 * Builds an immutable generation context. A revision must carry a stored image
 * hash and URL from the database; accepting a browser-provided image URL here
 * would let a request silently lose its actual design context.
 */
export function buildGenerationContext(input) {
  const description = normalizeText(input.description);
  const style = resolveStyle(input.styleId);
  const modelId = normalizeText(input.modelId) || "sourceful/riverflow-v2.5-fast";
  const isRevision = Boolean(input.previousGenerationId);
  const previous = input.previous ?? null;

  if (!description && !previous && !(input.sourceImages?.length > 0)) {
    throw new Error("Введите описание или прикрепите изображение");
  }

  if (isRevision && (!previous?.imageUrl || !previous?.imageHash)) {
    throw new Error("Не найдено сохранённое изображение для повторного запроса");
  }

  const roomProfile = resolveRoomProfile({
    roomType: input.roomType,
    dimensions: input.dimensions,
    layout: input.layout,
    previous,
  });
  const furniture = ROOM_PROGRAM[roomProfile.roomType];
  const roomIdentity = ROOM_IDENTITY[roomProfile.roomType];
  const references = [
    ...(previous ? [previous.imageUrl] : []),
    ...(Array.isArray(input.sourceImages) ? input.sourceImages : []),
  ];

  const prompt = [
    "Generate one photorealistic interior visualization. This is a usable completed room, not a finish-material moodboard.",
    `PROMPT VERSION: ${PROMPT_VERSION}`,
    `STYLE (${style.name}): ${style.directive}`,
    `ROOM TYPE (IMMUTABLE FOR THIS ROOM): ${roomProfile.roomType}`,
    `ROOM IDENTITY (NON-NEGOTIABLE): ${roomIdentity}`,
    `FURNITURE, APPLIANCES & FIXTURES (MANDATORY): ${furniture}. Furnish the room completely and keep every item to realistic scale.`,
    roomProfile.dimensions && `DIMENSIONS (MUST MATCH): ${roomProfile.dimensions}`,
    roomProfile.layout && `PLAN CONSTRAINTS (MUST MATCH): ${roomProfile.layout}`,
    isRevision
      ? "REVISION MODE — ROOM PROFILE LOCKED: Use the first reference image as the exact existing room. Preserve wall footprint, ceiling height, room dimensions, all windows, doors, columns, plumbing locations, camera viewpoint, perspective, proportions, and every unchanged object. Apply only the requested change. Do not enlarge, shrink, reconfigure, relocate, or invent a different room; do not invent a different room."
      : "INITIAL MODE: Respect all supplied plan and reference information.",
    description && `USER REQUEST: ${description}`,
    "AVOID: empty rooms, finish-only renderings, missing required appliances, floating or distorted furniture, altered walls, ceiling height, windows, doors, columns, plumbing, room size, camera viewpoint, text, logos, watermarks, CGI artifacts.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const canonicalInput = {
    promptVersion: PROMPT_VERSION,
    description,
    styleId: style.id,
    roomProfile,
    modelId,
    previousImageHash: previous?.imageHash ?? null,
    sourceImageHashes: Array.isArray(input.sourceImageHashes)
      ? [...input.sourceImageHashes].sort()
      : [],
  };

  return {
    style,
    prompt,
    references,
    requestHash: sha256(stableJson(canonicalInput)),
    canonicalInput,
    roomProfile,
  };
}
