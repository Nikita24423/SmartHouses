import type { ParsedRoom, TechPassportAnalysis, RoomOpening } from "./types";
import { getOpenRouterHeaders } from "@/lib/openrouter-headers";

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

const TECHPASSPORT_SYSTEM_PROMPT = `You are an expert analyst of Russian/CIS apartment technical passports (техпаспорт квартиры) and architectural floor plans.

Your TOP PRIORITY is to read OPENINGS correctly: windows, interior doors, and the apartment entrance.

=== HOW TO READ CIS FLOOR PLAN SYMBOLS ===

WINDOWS (on EXTERIOR walls only):
- Break/gap in the thick exterior wall line
- Often shown with 2-3 parallel thin lines across the wall gap (glass symbol)
- May have a thin line in the middle of the room wall (window sill projection)
- Rooms 14-17 m² along the building perimeter usually have exactly ONE window on the exterior wall
- Bathrooms/toilets often have NO window (interior rooms)

DOORS:
- A straight gap in the wall line (door opening)
- A quarter-circle arc (door swing) attached to one side of the gap — the arc shows which way the door opens
- Interior doors connect rooms — note WHICH room number is on the other side
- The apartment ENTRANCE door is on the perimeter, usually opening from outside into the hallway (прихожая/коридор)

WALL TYPES:
- Thick solid lines = structural/exterior walls
- Thin lines = interior partitions
- Trace each room boundary and identify which walls are exterior (building outline) vs interior (shared with another numbered room)

ORIENTATION ON PLAN:
- Use plan-relative directions: "top wall", "bottom wall", "left wall", "right wall" as drawn on the image
- Also list exteriorWalls: which sides touch the building exterior (where windows can exist)

=== OTHER RULES ===
1. Use EXACT room numbers from the plan (1, 2, 3...). Do NOT renumber.
2. If labels instead of numbers ("кухня", "жилая", "с/у") — use label as number field.
3. Dimensions in METERS exactly as printed on walls.
4. Area in m² if shown below room number.
5. Suggest room type from size, symbols, position in typical CIS layouts.
6. For EVERY room estimate its CENTER on the floor-plan IMAGE as normalized coordinates:
   - markerX: 0 = left edge of the image, 1 = right edge
   - markerY: 0 = top edge of the image, 1 = bottom edge
   Place the point inside the room polygon near where the room number is printed.
7. facingDeg: approximate viewing direction for a photo taken from that room center
   (0 = toward top of image, 90 = right, 180 = bottom, 270 = left). Prefer looking toward the main window or into the room depth.

Every room MUST have openings analyzed. If a room has no window, explicitly set windows to "none" and explain why (interior room / bathroom).

Respond with valid JSON only, no markdown:
{
  "apartmentShape": "L-shaped, entrance from east",
  "totalAreaSqm": 58.5,
  "layoutSummary": "Summary including entrance location and circulation",
  "entranceDescription": "where apartment entrance is and which room it opens to",
  "rooms": [
    {
      "number": "1",
      "label": null,
      "suggestedType": "bedroom",
      "areaSqm": 16.1,
      "widthM": 3.08,
      "lengthM": 5.19,
      "dimensions": "3.08 x 5.19 m",
      "shape": "rectangular",
      "markerX": 0.28,
      "markerY": 0.62,
      "facingDeg": 180,
      "exteriorWalls": ["bottom wall"],
      "windows": "one window centered on bottom (exterior) wall",
      "doors": "door on top wall opening into room 6 (hallway)",
      "openings": [
        { "type": "window", "wall": "bottom", "description": "single window on exterior wall, ~1.5m wide" },
        { "type": "door", "wall": "top", "connectsTo": "6", "description": "interior door swing into hallway" }
      ],
      "notes": "any symbols: radiator, balcony access, etc."
    }
  ]
}`;

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("JSON not found in response");
  return JSON.parse(candidate.slice(start, end + 1));
}

function normalizeOpening(raw: Record<string, unknown>): RoomOpening | null {
  const type = String(raw.type ?? "");
  if (type !== "window" && type !== "door" && type !== "entrance") return null;
  return {
    type,
    wall: String(raw.wall ?? "unknown"),
    connectsTo: raw.connectsTo ? String(raw.connectsTo) : undefined,
    description: raw.description ? String(raw.description) : undefined,
  };
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function normalizeMarkerCoord(raw: unknown): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return undefined;
  // Accept 0–100 as percent, otherwise treat as 0–1
  const v = raw > 1 && raw <= 100 ? raw / 100 : raw;
  if (v < 0 || v > 1) return undefined;
  return clamp01(v);
}

function normalizeFacingDeg(raw: unknown): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return undefined;
  const deg = ((raw % 360) + 360) % 360;
  return deg;
}

function normalizeRoom(raw: Record<string, unknown>): ParsedRoom {
  const openingsRaw = Array.isArray(raw.openings) ? raw.openings : [];
  const openings = openingsRaw
    .map((o) => normalizeOpening(o as Record<string, unknown>))
    .filter((o): o is RoomOpening => o !== null);

  const exteriorWalls = Array.isArray(raw.exteriorWalls)
    ? raw.exteriorWalls.map(String)
    : undefined;

  return {
    number: String(raw.number ?? raw.label ?? "?"),
    label: raw.label ? String(raw.label) : undefined,
    suggestedType: String(raw.suggestedType ?? "unknown"),
    areaSqm: typeof raw.areaSqm === "number" ? raw.areaSqm : undefined,
    widthM: typeof raw.widthM === "number" ? raw.widthM : undefined,
    lengthM: typeof raw.lengthM === "number" ? raw.lengthM : undefined,
    dimensions: raw.dimensions ? String(raw.dimensions) : undefined,
    shape: raw.shape ? String(raw.shape) : undefined,
    exteriorWalls,
    windows: raw.windows ? String(raw.windows) : undefined,
    doors: raw.doors ? String(raw.doors) : undefined,
    openings: openings.length > 0 ? openings : undefined,
    notes: raw.notes ? String(raw.notes) : undefined,
    markerX: normalizeMarkerCoord(raw.markerX),
    markerY: normalizeMarkerCoord(raw.markerY),
    facingDeg: normalizeFacingDeg(raw.facingDeg),
  };
}

function enrichLayoutSummary(
  parsed: Record<string, unknown>,
  rooms: ParsedRoom[]
): string {
  const base = parsed.layoutSummary ? String(parsed.layoutSummary) : "";
  const entrance = parsed.entranceDescription
    ? String(parsed.entranceDescription)
    : "";
  const openingsNote = rooms
    .map((r) => {
      const parts: string[] = [];
      if (r.windows) parts.push(`windows: ${r.windows}`);
      if (r.doors) parts.push(`doors: ${r.doors}`);
      if (parts.length === 0) return null;
      return `Room ${r.number}: ${parts.join("; ")}`;
    })
    .filter(Boolean)
    .join(". ");
  return [base, entrance, openingsNote].filter(Boolean).join(" ");
}

export async function analyzeTechPassport(
  imageDataUrl: string,
  userNotes?: string
): Promise<TechPassportAnalysis> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY не настроен");

  const model =
    process.env.OPENROUTER_PLAN_VISION_MODEL ??
    process.env.OPENROUTER_VISION_MODEL ??
    "google/gemini-2.5-flash";

  const userText = [
    "Analyze this technical passport floor plan.",
    "CRITICAL: For EVERY room identify windows (exterior wall gaps with glass symbols) and doors (wall gaps with swing arcs).",
    "Identify the apartment entrance door and which room it connects to.",
    "Also estimate markerX/markerY (0–1) for each room center on the IMAGE, and facingDeg for the natural photo view.",
    userNotes?.trim() ? `User notes: "${userNotes.trim()}"` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: "POST",
    headers: getOpenRouterHeaders(apiKey),
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: TECHPASSPORT_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
      temperature: 0.05,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let message = `Ошибка анализа техпаспорта (${response.status})`;
    try {
      const parsed = JSON.parse(errorText);
      message = parsed.error?.message ?? parsed.message ?? message;
    } catch {
      message = errorText || message;
    }
    throw new Error(message);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("Модель не смогла проанализировать техпаспорт");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = extractJson(content) as Record<string, unknown>;
  } catch {
    throw new Error(
      "Не удалось распознать структуру плана. Попробуйте более чёткое фото техпаспорта."
    );
  }

  const roomsRaw = Array.isArray(parsed.rooms) ? parsed.rooms : [];
  const rooms = roomsRaw.map((r) =>
    normalizeRoom(r as Record<string, unknown>)
  );

  if (rooms.length === 0) {
    throw new Error("На плане не найдено комнат. Проверьте качество изображения.");
  }

  return {
    rooms,
    totalAreaSqm:
      typeof parsed.totalAreaSqm === "number" ? parsed.totalAreaSqm : undefined,
    apartmentShape: parsed.apartmentShape
      ? String(parsed.apartmentShape)
      : undefined,
    layoutSummary: enrichLayoutSummary(parsed, rooms),
    rawAnalysis: content.trim(),
  };
}


