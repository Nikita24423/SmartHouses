import { createHash } from "node:crypto";

export const PROMPT_VERSION = "interior-context-v8";

const REALISM_BLOCK = [
  "This is a photorealistic renovation of a REAL apartment room a contractor could finish — not a palace, museum, villa, loft conversion, or film set.",
  "Style is applied ONLY as paint, flooring, furniture, lighting, textiles, and décor of retail/human scale.",
  "FORBIDDEN for any style: structural or decorative columns/pilasters; wall-covering gold filigree or gilded relief; palace-scale carved beds; floor-to-ceiling ornate wardrobes as architecture; raised/vaulted ceilings; invented arches, beams, or extra volume.",
].join(" ");

const DESIGN_PRIORITY_BLOCK = [
  "PRIORITY HIERARCHY (HIGHEST → LOWEST):",
  "1) ARCHITECTURE FROM THE USER PHOTO IS FROZEN: walls, partitions, corners, ceiling, floor plane, and EVERY opening (windows, doors, doorways, passages, balconies) — exact count, place, size, and shape as in the photo. ZERO new walls. ZERO new windows. ZERO removed openings. ZERO relocated openings.",
  "2) DESIGN CHANGE IS THE GOAL: apply the selected style through furniture, appliances, paint/wallpaper, flooring finish, lighting fixtures, textiles, and décor that fit INSIDE the frozen architecture.",
  "3) Photoreal quality and style mood come AFTER architecture fidelity — never by rebuilding the room.",
].join(" ");

const PHOTO_FIDELITY_BLOCK = [
  "PHOTO FIDELITY (MATCH TOP TIER IMAGE EDITORS — NON-NEGOTIABLE):",
  "Output must look like a real smartphone/DSLR photograph of a finished apartment, NOT a CGI architectural visualization or furniture catalog render.",
  "Micro-detail required: visible wood grain, fabric weave, plaster/paint texture, soft contact shadows under furniture, natural imperfect edges.",
  "Preserve the source photo's lighting direction (usually the window). Soft daylight, realistic falloff into passages — no flat studio fill.",
  "Slight lived-in realism is better than empty showroom staging. Avoid plastic CGI sheen, perfect bilateral symmetry, and floating furniture.",
].join(" ");

const CAMERA_LOCK_BLOCK = [
  "CAMERA LOCK (NON-NEGOTIABLE):",
  "This is an EDIT of the attached photo — same pixels of architecture, same viewpoint, standing position, eye height, lens FOV, framing, and perspective distortion.",
  "Do NOT orbit, pan, tilt, zoom, step sideways, recrop to a wider cinematic frame, or switch to a hero architectural shot.",
].join(" ");

const GEOMETRY_LOCK_BLOCK = [
  "ARCHITECTURE LOCK — OVERRIDES STYLE, FURNITURE, AND USER STYLE REQUESTS:",
  "The user photo defines the ONLY allowed architecture. Copy wall positions, lengths, depth/width, ceiling height, floor plane, corners, partitions, and pillars EXACTLY.",
  "Do NOT invent new walls, niches, bulkheads, columns, or partitions. Do NOT remove existing walls.",
  "Do NOT invent new windows, doors, doorways, passages, arches, or balconies. Do NOT remove or relocate any opening from the photo.",
  "Every doorway, passage, corridor, arch, window, and balcony in the photo MUST remain — same place, size, and wall.",
  "WINDOW SIZE LOCK: a single rectangular window stays ONE window of the SAME height/width — do NOT enlarge it into floor-to-ceiling glass, twin balcony doors, or a glass wall.",
  "CEILING LOCK: keep a FLAT ceiling plane matching the photo — no stepped bulkheads, coffers, false beams, or invented dropped ceiling geometry.",
  "Do NOT close a passage into a rectangular box. Do not cover openings with TV units, wardrobes, or curtains.",
  "If the photo is a construction shell (blocks/concrete), keep that layout; only change surface finishes and add furniture that fits.",
].join(" ");

const PHOTO_EDIT_LEAD = [
  "EDIT the attached photograph in place.",
  "CREATIVE GOAL: redesign furniture, finishes, lighting, and décor.",
  "HARD LIMIT: architecture must stay identical to the user photo — no new walls, no new windows, no new openings.",
  "Output the SAME camera frame after renovation — not a newly composed room, not a different angle, not a catalog interior.",
].join(" ");

const AUTO_STYLE = {
  id: "auto",
  name: "Авто",
  directive:
    "Choose one coherent contemporary apartment renovation style that fits the room type. Keep it livable and installable. Do not invent palatial architecture or blend incompatible styles.",
};

const STYLES = new Map([
  [
    "empire",
    [
      "Ампир",
      "Empire as a REAL APARTMENT RENOVATION, not a palace. Cream or beige painted walls (plain, maybe one quiet wallpaper panel). Thin residential crown molding only. Dark-wood bed/wardrobe/nightstands of NORMAL bedroom scale with small brass handles. One gilt-framed mirror or two sconces. Simple drapes at existing windows. Optional deep-green or burgundy textile accent — not gilded walls. STRICTLY FORBIDDEN: Corinthian or any columns/pilasters; gold filigree or relief covering walls; floor-to-ceiling ornate gold wardrobes as architecture; palace-scale carved beds; wall-to-wall gilded ornament.",
    ],
  ],
  [
    "bauhaus",
    [
      "Баухаус",
      "Bauhaus as a real flat: tubular-steel or plywood chairs, modular sofa/bed, white/gray walls, one red/yellow/blue accent. No ornament. Furniture must look commercially available.",
    ],
  ],
  [
    "boho",
    [
      "Бохо",
      "Boho as a furnished apartment: kilim or jute rug, rattan or wood furniture of normal size, layered textiles, a few plants, warm earth tones. Lived-in, not a bazaar or tent.",
    ],
  ],
  [
    "industrial",
    [
      "Индустриальный",
      "Industrial as a city-apartment renovation: brick-look or microcement on existing walls, metal shelves, leather sofa or bed of normal size, track lighting. Do NOT invent factory loft height, exposed structural steel beams, or double-height volume.",
    ],
  ],
  [
    "classic",
    [
      "Классический",
      "Classic as a finished city apartment, not a manor. Painted walls, oak or herringbone flooring, wooden furniture of store-bought scale, 1–2 framed artworks, modest molding. Gold only as small hardware or picture frames. FORBIDDEN: palace halls, columns, heavy baroque plaster covering walls, oversized crystal chandeliers.",
    ],
  ],
  [
    "country",
    [
      "Кантри",
      "Country as an apartment, not a farmhouse: oak or pine furniture, linen curtains, checked or solid textiles. FORBIDDEN: stone fireplace, exposed rustic ceiling beams, cottage hall volume.",
    ],
  ],
  [
    "kitsch",
    [
      "Китч",
      "Kitsch as a real apartment with personality: one patterned wallpaper wall or bright textiles, mixed vintage pieces, a few posters. Still a usable room with normal furniture scale — not palace baroque architecture.",
    ],
  ],
  [
    "minimalism",
    [
      "Минимализм",
      "Calm apartment minimalism: few furniture pieces, flush surfaces, monochrome palette, one plant. Do NOT invent floor-to-ceiling glass walls or expand openings.",
    ],
  ],
  [
    "pop-art",
    [
      "Поп-арт",
      "Pop Art as a livable apartment: light walls, 2–4 graphic posters, one bold-color sofa or armchair, simple modern table. Not a museum hanging system.",
    ],
  ],
  [
    "scandinavian",
    [
      "Скандинавский",
      "Bright Scandinavian apartment: white walls, light oak/birch, mid-century furniture of normal scale, simple curtains, plants. Cozy without clutter. Do not enlarge the room.",
    ],
  ],
  [
    "mediterranean",
    [
      "Средиземноморский",
      "Mediterranean apartment finishes: stucco-look paint, terracotta or tile-look floor, linen, olive plant. FORBIDDEN: new arches, villa indoor-outdoor openings, enlarged villa volume.",
    ],
  ],
  [
    "futurism",
    [
      "Футуризм",
      "Futurism as a 2020s apartment upgrade: lacquer or matte millwork, LED under cabinets, modular furniture, cool whites. Inhabitable. FORBIDDEN: rebuilt curved walls, transparent floors, spaceship viewports, holographic effects.",
    ],
  ],
  [
    "hi-tech",
    [
      "Хай-тек",
      "Hi-Tech contemporary apartment: glass/metal furniture, millwork, LED/halogen spots, smart TV. Do not add glass walls that invent new rooms.",
    ],
  ],
  [
    "hygge",
    [
      "Хюгге",
      "Hygge apartment: knit throws, warm lamps, candles, wool and linen. No invented fireplace or wood stove unless already in the room.",
    ],
  ],
  [
    "shabby-chic",
    [
      "Шебби-шик",
      "Shabby chic as painted furniture and floral textiles in a normal room. Not a manor. No palace plaster.",
    ],
  ],
  [
    "japanese",
    [
      "Японский",
      "Japanese as a calm apartment: light wood, simple storage, paper lantern or warm pendant, one plant. Shoji/tatami only as furniture or rug — do not rebuild walls or change openings.",
    ],
  ],
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
  if (!roomType || roomType === "auto") return "unknown";
  if (ROOM_PROGRAM[roomType]) return roomType;
  const aliases = {
    "living room": "living",
    living_room: "living",
    lounge: "living",
    wc: "toilet",
  };
  return aliases[roomType] && ROOM_PROGRAM[aliases[roomType]] ? aliases[roomType] : "unknown";
}

export function normalizeRoomTypeId(value) {
  return normalizeRoomType(value);
}

export function inferRoomType(description) {
  const text = normalizeText(description);
  const found = ROOM_TYPE_KEYWORDS.find(([, matcher]) => matcher.test(text));
  return found ? found[0] : "unknown";
}

export function resolveRequestedRoomType(roomType, description) {
  const requested = normalizeRoomTypeId(roomType);
  if (requested !== "unknown") return requested;
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

export function hasPassages(geometry) {
  return Boolean(
    geometry?.complexity === "complex" ||
      geometry?.constructionShell ||
      geometry?.nestedSpaces?.length ||
      geometry?.openings?.some((opening) =>
        ["doorway", "passage", "arch", "door"].includes(opening.type)
      )
  );
}

function furnitureProgram(roomType, geometry, photoEdit) {
  const base = ROOM_PROGRAM[roomType] || ROOM_PROGRAM.unknown;
  if (!photoEdit && !geometry) return base;

  const skipWallTv = roomType === "living" && (hasPassages(geometry) || !geometry);

  const adapted = skipWallTv
    ? "sofa, coffee table, area rug, curtains framing WINDOWS only (not covering them), layered ambient lighting. A TV/media unit is optional and ONLY on a solid wall that has no doorway or passage — skip it if it would cover an opening. Leave breathing room; do not fill every wall"
    : base;

  return `${adapted}. Place furniture ONLY on solid wall segments. Never block or fill a doorway, passage, window, or nested space from the photo. Prefer fewer correctly scaled pieces over catalog overcrowding`;
}

function formatGeometryBlock(geometry) {
  if (!geometry) return "";
  const openingLines = Array.isArray(geometry.openings)
    ? geometry.openings
        .map((opening, index) => {
          const through = opening.visibleThrough
            ? ` Visible through it: ${opening.visibleThrough}.`
            : "";
          return `${index + 1}. ${String(opening.type).toUpperCase()} on the ${opening.wall} wall (${opening.relativeSize || "visible"}).${through} MUST stay open.`;
        })
        .join("\n")
    : "";
  const nested = Array.isArray(geometry.nestedSpaces) && geometry.nestedSpaces.length
    ? geometry.nestedSpaces.map((space) => `- ${space}`).join("\n")
    : "";
  const directives = Array.isArray(geometry.generationDirectives)
    ? geometry.generationDirectives.map((item) => `- ${item}`).join("\n")
    : "";

  return [
    "=== ROOM GEOMETRY SPEC (FROM PHOTO ANALYSIS — NON-NEGOTIABLE) ===",
    `Complexity: ${geometry.complexity || "unknown"}`,
    `Construction shell: ${geometry.constructionShell ? "yes — keep unfinished layout; restyle surfaces only" : "no"}`,
    geometry.ceiling && `Ceiling: ${geometry.ceiling} — keep this plane flat; do not invent bulkheads`,
    geometry.camera && `Camera: ${geometry.camera}`,
    geometry.layout && `Layout: ${geometry.layout}`,
    "OPENINGS (keep each one — copy every hole/window/door visible in the photo even if the list is incomplete):",
    openingLines || "None listed by analysis — still copy every doorway, passage, and window visible in the attached photo. Do not invent a closed box.",
    nested && `NESTED SPACES (keep as a second depth plane, do not wall off):\n${nested}`,
    geometry.solidWallsForFurniture &&
      `Solid walls for furniture: ${geometry.solidWallsForFurniture}`,
    directives && `Analysis rules:\n${directives}`,
  ]
    .filter(Boolean)
    .join("\n");
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
  const modelId = normalizeText(input.modelId) || "google/gemini-3-pro-image";
  const isRevision = Boolean(input.previousGenerationId);
  const previous = input.previous ?? null;
  const requestNonce = normalizeText(input.requestNonce);

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
  const roomGeometry = input.roomGeometry ?? null;
  const roomIdentity = ROOM_IDENTITY[roomProfile.roomType];
  const references = [
    ...(previous ? [previous.imageUrl] : []),
    ...(Array.isArray(input.sourceImages) ? input.sourceImages : []),
  ];

  const hasReferences = references.length > 0;
  const photoEdit = input.photoEdit ?? hasReferences;
  const furniture = furnitureProgram(roomProfile.roomType, roomGeometry, photoEdit);
  const geometryBlock = formatGeometryBlock(roomGeometry);

  const prompt = [
    photoEdit
      ? PHOTO_EDIT_LEAD
      : "Generate one photorealistic interior photograph of a completed, livable apartment room.",
    `PROMPT VERSION: ${PROMPT_VERSION}`,
    photoEdit && `PRIORITY: ${DESIGN_PRIORITY_BLOCK}`,
    `REALISM: ${REALISM_BLOCK}`,
    photoEdit && `CAMERA: ${CAMERA_LOCK_BLOCK}`,
    photoEdit && `STRUCTURE: ${GEOMETRY_LOCK_BLOCK}`,
    photoEdit && `FIDELITY: ${PHOTO_FIDELITY_BLOCK}`,
    geometryBlock,
    `STYLE (${style.name}) — DESIGN ONLY, NEVER CHANGE ARCHITECTURE: ${style.directive}`,
    `ROOM TYPE (IMMUTABLE FOR THIS ROOM): ${roomProfile.roomType}`,
    `ROOM IDENTITY (NON-NEGOTIABLE): ${roomIdentity}`,
    `FURNITURE, APPLIANCES & FIXTURES (THIS IS THE DESIGN TASK): ${furniture}. Use realistic store-bought scale. Do not overcrowd and do not monumentally oversize pieces. Furniture must fit the existing walls/openings from the photo — never by adding walls or windows.`,
    roomProfile.dimensions && `DIMENSIONS (MUST MATCH): ${roomProfile.dimensions}`,
    roomProfile.layout && `PLAN CONSTRAINTS (MUST MATCH): ${roomProfile.layout}`,
    isRevision
      ? "REVISION MODE — ROOM PROFILE LOCKED: Use the first reference image as the exact existing room. Preserve wall footprint, ceiling height, room dimensions, all windows, doors, passages, plumbing locations, and the EXACT camera viewpoint/framing/perspective. Apply only the requested design change (furniture/finishes). Do not enlarge, shrink, reconfigure, relocate, reframe, close openings, add walls/windows, or invent a different room or angle."
      : photoEdit
        ? "PHOTO EDIT MODE: Redesign furniture, finishes, lighting and décor ONLY. Architecture = the user photo (no new walls, no new windows, no new openings). Keep identical geometry, identical openings, AND identical camera framing."
        : hasReferences
          ? "PLAN / REFERENCE MODE: The attached image is a floor plan or supporting drawing, NOT a room photograph to edit. Generate a photorealistic 3D interior matching PLAN CONSTRAINTS. Do not output a 2D plan drawing."
          : "INITIAL MODE: No photo reference — assume a typical compact residential room with a flat 2.5–2.8 m ceiling.",
    description && `USER REQUEST (design intent only — never invent walls or windows to satisfy it): ${description}`,
    photoEdit
      ? "AVOID: new walls, new windows, new doors/passages, erased openings, enlarged windows / balcony glass walls, stepped ceilings, moved openings, changed wall lengths, recropped framing, palaces, columns, gold-covered walls, empty unfinished rooms, CGI catalog look, furniture blocking passages, floating furniture, text, logos, watermarks."
      : "AVOID: palaces, columns, gold-covered walls, empty rooms, finish-only moodboards, missing required appliances, floating or distorted furniture, altered walls or openings, CGI artifacts, text, logos, watermarks.",
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
    // Each intentional Generate click sends a unique nonce so the same photo
    // can be regenerated (better model / retry) without being blocked as a duplicate.
    requestNonce: requestNonce || null,
  };

  return {
    style,
    prompt,
    references,
    requestHash: sha256(stableJson(canonicalInput)),
    canonicalInput,
    roomProfile,
    roomGeometry,
  };
}
