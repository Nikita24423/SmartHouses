import { getOpenRouterHeaders } from "@/lib/openrouter-headers";

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

const OPENING_TYPES = new Set([
  "window",
  "door",
  "doorway",
  "passage",
  "arch",
  "balcony",
]);

export type RoomOpeningType =
  | "window"
  | "door"
  | "doorway"
  | "passage"
  | "arch"
  | "balcony";

export type RoomOpeningSpec = {
  type: RoomOpeningType;
  wall: string;
  relativeSize: string;
  visibleThrough: string;
  mustKeepClear: boolean;
};

export type RoomGeometry = {
  complexity: "simple" | "complex";
  constructionShell: boolean;
  roomTypeHint: string;
  camera: string;
  layout: string;
  ceiling: string;
  openings: RoomOpeningSpec[];
  nestedSpaces: string[];
  solidWallsForFurniture: string;
  generationDirectives: string[];
};

const GEOMETRY_SYSTEM_PROMPT = `You extract a ROOM GRAPH from a real interior photograph for image-to-image renovation.
Respond with JSON only. No markdown. Describe what is VISIBLE, from the CAMERA'S point of view.

JSON schema:
{
  "complexity": "simple" | "complex",
  "constructionShell": true | false,
  "roomTypeHint": "living" | "bedroom" | "kitchen" | "bathroom" | "toilet" | "hallway" | "balcony" | "storage" | "office" | "dining" | "unknown",
  "camera": "viewpoint, height, lens feel, what is left/center/right in frame",
  "layout": "wall count, corners, depth, non-rectangular / nested volumes",
  "ceiling": "flat slab / unfinished concrete / height feel — note if flat vs already bulkheaded",
  "openings": [
    {
      "type": "window" | "door" | "doorway" | "passage" | "arch" | "balcony",
      "wall": "camera-relative: left | right | back | foreground-left | center-left | ...",
      "relativeSize": "exact relative size vs the wall (e.g. single mid-wall window ~1/3 wall height, NOT floor-to-ceiling)",
      "visibleThrough": "what is seen through it, or empty string for a closed door / blank window view",
      "mustKeepClear": true
    }
  ],
  "nestedSpaces": ["second room/hallway visible through an opening, with its own walls"],
  "solidWallsForFurniture": "which wall segments are solid (no opening) and safe for sofa/TV/wardrobe",
  "generationDirectives": ["3-6 short MUST rules for an image editor, including: keep window size, keep flat ceiling, keep nested depth"]
}

COMPLEX if ANY of: nested space behind a doorway/passage; construction shell (blocks/concrete, unfinished); L/U shape; more than one depth plane; a pillar/partition that occludes another room.
SIMPLE only if a single rectangular volume with no nested room visible.

CRITICAL:
- Every window, door, doorway, passage, arch, balcony opening MUST be listed. Missing an opening is a failure.
- A hole in a wall with another interior beyond it is a doorway/passage, not a window.
- For windows: state if it is a SINGLE mid-wall opening vs balcony / floor-to-ceiling — do not upgrade size in the description.
- Ceiling is usually a flat slab in construction shells — say so.
- Do not invent openings that are not in the photo.
- Camera description must lock viewpoint (do not suggest a better angle).`;

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("JSON not found in response");
  return JSON.parse(candidate.slice(start, end + 1));
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeOpeningType(raw: unknown): RoomOpeningType | null {
  const value = asString(raw).toLowerCase();
  if (OPENING_TYPES.has(value)) return value as RoomOpeningType;
  if (value.includes("balcon")) return "balcony";
  if (value.includes("window")) return "window";
  if (value.includes("arch")) return "arch";
  if (value.includes("doorway")) return "doorway";
  if (value.includes("passage") || value.includes("opening") || value.includes("corridor")) {
    return "passage";
  }
  if (value.includes("door")) return "door";
  return null;
}

function normalizeOpening(raw: unknown): RoomOpeningSpec | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const type = normalizeOpeningType(row.type);
  if (!type) return null;
  const visibleThrough = asString(row.visibleThrough);
  const isPassage = type === "doorway" || type === "passage" || type === "arch";
  return {
    type,
    wall: asString(row.wall, "unknown"),
    relativeSize: asString(row.relativeSize, "visible in frame"),
    visibleThrough,
    mustKeepClear: row.mustKeepClear !== false && (isPassage || type === "window" || type === "balcony"),
  };
}

export function normalizeRoomGeometry(raw: unknown): RoomGeometry | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const openings = (Array.isArray(row.openings) ? row.openings : [])
    .map(normalizeOpening)
    .filter((item): item is RoomOpeningSpec => item !== null);
  const nestedSpaces = (Array.isArray(row.nestedSpaces) ? row.nestedSpaces : [])
    .map((item) => asString(item))
    .filter(Boolean);
  const constructionShell = Boolean(row.constructionShell);
  const hasPassage = openings.some(
    (opening) => opening.type === "doorway" || opening.type === "passage" || opening.type === "arch"
  );
  let complexity: "simple" | "complex" = row.complexity === "complex" ? "complex" : "simple";
  if (constructionShell || nestedSpaces.length > 0 || (hasPassage && openings.length >= 2)) {
    complexity = "complex";
  }

  const directives = (Array.isArray(row.generationDirectives) ? row.generationDirectives : [])
    .map((item) => asString(item))
    .filter(Boolean);

  return {
    complexity,
    constructionShell,
    roomTypeHint: asString(row.roomTypeHint, "unknown").toLowerCase() || "unknown",
    camera: asString(row.camera),
    layout: asString(row.layout),
    ceiling: asString(row.ceiling) || (constructionShell ? "flat unfinished concrete slab" : ""),
    openings,
    nestedSpaces,
    solidWallsForFurniture: asString(row.solidWallsForFurniture),
    generationDirectives: directives,
  };
}

export function formatRoomGeometryPrompt(geometry: RoomGeometry): string {
  const openingLines = geometry.openings.length
    ? geometry.openings
        .map((opening, index) => {
          const through = opening.visibleThrough
            ? ` Visible through it: ${opening.visibleThrough}.`
            : "";
          const keep = opening.mustKeepClear
            ? " MUST stay open and unobstructed."
            : "";
          return `${index + 1}. ${opening.type.toUpperCase()} on the ${opening.wall} wall (${opening.relativeSize}).${through}${keep}`;
        })
        .join("\n")
    : "No discrete openings were listed — still copy every hole/window/door visible in the photo.";

  const nested = geometry.nestedSpaces.length
    ? geometry.nestedSpaces.map((space) => `- ${space}`).join("\n")
    : "None — single volume. Do not invent a second room, and do not erase one if the photo shows it.";

  const directives = geometry.generationDirectives.length
    ? geometry.generationDirectives.map((item) => `- ${item}`).join("\n")
    : "- Keep every opening listed above. Furniture only on solid walls.";

  return [
    "=== ROOM GEOMETRY SPEC (NON-NEGOTIABLE — FROM THE ATTACHED PHOTO) ===",
    `Complexity: ${geometry.complexity}`,
    `Construction shell / unfinished: ${geometry.constructionShell ? "yes — keep this layout; only change finishes and add furniture" : "no"}`,
    geometry.camera && `Camera (copy exactly): ${geometry.camera}`,
    geometry.layout && `Layout: ${geometry.layout}`,
    geometry.ceiling && `Ceiling: ${geometry.ceiling}`,
    "OPENINGS — each must remain in the SAME place, SAME wall, SAME size. Do not wall them over, crop them out, enlarge windows into glass walls, or cover them with a TV/wardrobe/curtains:",
    openingLines,
    "NESTED SPACES (second depth plane behind a passage — keep visible, do not close into a box):",
    nested,
    geometry.solidWallsForFurniture &&
      `Solid walls safe for furniture (use ONLY these for TV/wardrobe/sofa against a wall): ${geometry.solidWallsForFurniture}`,
    "EDIT RULES:",
    directives,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildGeometryUserPrompt(userDescription?: string): string {
  const parts = [
    "The FIRST image is the room photograph to renovate. Extract its geometry as JSON.",
    "Priority: openings, nested volumes behind doorways, camera viewpoint, construction vs finished.",
    "Remember: later generation may ONLY change furniture/finishes — architecture must be documented exactly.",
  ];
  if (userDescription?.trim()) {
    parts.push(
      `User text (intent only — do not let it invent walls or openings):\n"${userDescription.trim()}"`
    );
  }
  return parts.join("\n\n");
}

export async function analyzeRoomGeometry(
  images: string[],
  userDescription?: string
): Promise<RoomGeometry | null> {
  if (images.length === 0) return null;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const model =
    process.env.OPENROUTER_GEOMETRY_MODEL ??
    process.env.OPENROUTER_VISION_MODEL ??
    "google/gemini-2.5-flash";

  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [
    { type: "text", text: buildGeometryUserPrompt(userDescription) },
    ...images.map((url) => ({
      type: "image_url" as const,
      image_url: { url },
    })),
  ];

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25_000);
    try {
      const response = await fetch(OPENROUTER_CHAT_URL, {
        method: "POST",
        headers: getOpenRouterHeaders(apiKey),
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: GEOMETRY_SYSTEM_PROMPT },
            { role: "user", content },
          ],
          temperature: 0.1,
          max_tokens: 1600,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Room geometry analysis HTTP error", response.status, errorText.slice(0, 400));
        return null;
      }

      const data = await response.json();
      const analysis = data.choices?.[0]?.message?.content;
      if (!analysis || typeof analysis !== "string") return null;

      return normalizeRoomGeometry(extractJson(analysis));
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    console.error("Room geometry analysis failed", error);
    return null;
  }
}

/** @deprecated Prefer analyzeRoomGeometry + formatRoomGeometryPrompt */
export async function analyzeReferenceImages(
  images: string[],
  userDescription?: string
): Promise<string> {
  const geometry = await analyzeRoomGeometry(images, userDescription);
  return geometry ? formatRoomGeometryPrompt(geometry) : "";
}
