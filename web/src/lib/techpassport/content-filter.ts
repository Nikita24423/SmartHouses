const BLOCKED_PATTERNS: RegExp[] = [
  /\b(животн|кот|кошк|собак|птиц|попуг|хомяк|рыбк|аквариум|pet|animal|dog|cat|bird)\w*/i,
  /\b(посуда|тарелк|чашк|кружк|столовые прибор|вилк|ложк|нож[иаеу]|бокал|тарел|dish|plate|cup|utensil)\w*/i,
  /\b(человек|люди|портрет|фото людей|person|people|human|portrait)\w*/i,
  /\b(машин|авто|car|vehicle|motorcycle)\w*/i,
  /\b(оружи|weapon|gun)\w*/i,
];

const ALLOWED_CONTEXT = [
  /кухонн\w*\s*(мойк|раковин|столешниц)/i,
  /ванн\w*\s*(комнат|узел)/i,
  /санузел/i,
  /мебел/i,
  /ремонт/i,
  /интерьер/i,
  /дизайн/i,
];

export interface ContentFilterResult {
  allowed: boolean;
  reason?: string;
}

export function filterUserContent(text: string): ContentFilterResult {
  const trimmed = text.trim();
  if (!trimmed) return { allowed: true };

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) {
      const hasAllowedContext = ALLOWED_CONTEXT.some((ctx) => ctx.test(trimmed));
      if (!hasAllowedContext) {
        return {
          allowed: false,
          reason:
            "Запрос содержит посторонние объекты (животные, посуда, люди и т.п.). Опишите только интерьер, мебель и отделку.",
        };
      }
    }
  }

  return { allowed: true };
}

export const GENERATION_CONTENT_RULES = [
  "STRICT CONTENT RULES — generate ONLY appropriate interior elements:",
  "- NO animals, pets, birds, fish, aquariums",
  "- NO loose dishes, plates, cups, utensils on surfaces (built-in kitchen fixtures are OK)",
  "- NO people, portraits, photographs of humans",
  "- NO vehicles, weapons, unrelated objects",
  "- ONLY: walls, floors, ceilings, doors, windows, built-in furniture, lighting, decor appropriate to the room type",
].join("\n");

/**
 * Priority lock: real apartment geometry beats style fantasy.
 * Style may only change finishes, furniture, lighting and décor within the existing volume.
 */
export const REALISM_GEOMETRY_RULES = [
  "=== PRIORITY: REAL ROOM GEOMETRY (OVERRIDES STYLE) ===",
  "The design STYLE is SECONDARY. The real apartment room is PRIMARY.",
  "This is a renovation of an EXISTING room for a real resident — NOT a palace, villa, loft conversion, or film set.",
  "HARD CONSTRAINTS — never violate these for style:",
  "1) Keep the EXACT same room volume: floor area, wall positions, ceiling height, and camera-visible proportions.",
  "2) Do NOT raise, vault, or multi-level the ceiling. Do NOT make the room look larger or deeper.",
  "3) Do NOT add structural architecture that is not in the reference/plan: columns, pilasters, arches, new niches, fake fireplaces as architecture, beams, mezzanines, bay windows.",
  "4) Preserve all openings: windows, balcony/terrace doors, interior doors, radiators, built-in niches — same walls, same sizes, same positions.",
  "5) Do NOT hide a balcony door or window behind theatrical full-wall drapes that erase the opening. Curtains may frame openings but must leave the opening readable.",
  "6) Keep fixed appliances/plumbing where they are (stove, sink, radiator, etc.) unless the user explicitly asks to relocate them.",
  "7) Style must be applied ONLY as: wall finishes, flooring, furniture, lighting fixtures, textiles, and décor — adapted to THIS room's real size (often compact CIS apartment).",
  "8) Prefer fewer, correctly scaled style accents over grand monumental features that require more volume than the room has.",
  "If a style traditionally needs tall columns / grand halls / factory loft volume — ADAPT it down to surface-level décor that fits this room. Never invent extra space.",
].join("\n");


