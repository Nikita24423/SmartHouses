import { createHash } from "node:crypto";

export const PROMPT_VERSION = "interior-context-v1";

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

function normalizeText(value) {
  return typeof value === "string"
    ? value.normalize("NFC").trim().replace(/\s+/g, " ")
    : "";
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

/**
 * Builds an immutable generation context. A revision must carry a stored image
 * hash and URL from the database; accepting a browser-provided image URL here
 * would let a request silently lose its actual design context.
 */
export function buildGenerationContext(input) {
  const description = normalizeText(input.description);
  const roomType = normalizeText(input.roomType).toLowerCase() || "unknown";
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

  const dimensions = normalizeText(input.dimensions);
  const layout = normalizeText(input.layout);
  const furniture = ROOM_PROGRAM[roomType] ?? ROOM_PROGRAM.unknown;
  const references = [
    ...(previous ? [previous.imageUrl] : []),
    ...(Array.isArray(input.sourceImages) ? input.sourceImages : []),
  ];

  const prompt = [
    "Generate one photorealistic interior visualization. This is a usable completed room, not a finish-material moodboard.",
    `PROMPT VERSION: ${PROMPT_VERSION}`,
    `STYLE (${style.name}): ${style.directive}`,
    `ROOM TYPE: ${roomType}`,
    `FURNITURE, APPLIANCES & FIXTURES (MANDATORY): ${furniture}. Furnish the room completely and keep every item to realistic scale.`,
    dimensions && `DIMENSIONS (MUST MATCH): ${dimensions}`,
    layout && `PLAN CONSTRAINTS (MUST MATCH): ${layout}`,
    isRevision
      ? "REVISION MODE: Use the first reference image as the exact existing room. Preserve the same room shell, dimensions, window and door positions, camera viewpoint, proportions, and all unchanged objects. Apply only the requested change; do not invent a different room."
      : "INITIAL MODE: Respect all supplied plan and reference information.",
    description && `USER REQUEST: ${description}`,
    "AVOID: empty rooms, finish-only renderings, missing required appliances, floating or distorted furniture, altered windows or doors, text, logos, watermarks, CGI artifacts.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const canonicalInput = {
    promptVersion: PROMPT_VERSION,
    description,
    styleId: style.id,
    roomType,
    dimensions,
    layout,
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
  };
}
