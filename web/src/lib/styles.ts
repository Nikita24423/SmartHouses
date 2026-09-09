import { GENERATION_CONTENT_RULES, REALISM_GEOMETRY_RULES } from "@/lib/techpassport/content-filter";

export interface DesignStyle {
  id: string;
  name: string;
  description: string;
  keyElements: string;
  colors: string;
  materials: string;
  atmosphere: string;
  lighting: string;
  composition: string;
  promptDirective: string;
}

export const NO_STYLE_ID = "none";

export const DESIGN_STYLES: DesignStyle[] = [
  {
    id: "empire",
    name: "Ампир",
    description:
      "Сдержанная классика с симметрией: тёмное дерево, спокойные стены, точечная латунь. Как после ремонта обычной квартиры, не дворец.",
    keyElements:
      "Симметричная мебель, тонкий потолочный молдинг, одна люстра или пара бра, латунная фурнитура, зеркало в раме. Без колонн и золотых стен.",
    colors: "Кремовый, беж, тёплый белый; тёмное дерево; латунь точечно, не сплошным золотом.",
    materials: "Краска, паркет или инженерная доска, текстиль, шпон/массив дерева, латунь на ручках и светильниках.",
    atmosphere: "Calm neoclassical apartment, formal but livable, renovation-scale elegance",
    lighting: "One modest chandelier or pair of wall sconces, warm lamps, daylight from existing windows",
    composition: "Bilateral symmetry with ordinary furniture scale; walls stay flat painted surfaces",
    promptDirective:
      "Empire as a REAL APARTMENT RENOVATION, not a palace. Cream or beige painted walls (plain, maybe one quiet wallpaper panel). Thin residential crown molding only — not palace plaster. Dark-wood bed/wardrobe/nightstands of NORMAL bedroom scale with small brass handles. One gilt-framed mirror or two sconces. Simple drapes at existing windows. Optional deep-green or burgundy textile accent (throw, headboard fabric) — not gilded walls. STRICTLY FORBIDDEN: Corinthian or any columns/pilasters; gold filigree or relief covering walls; floor-to-ceiling ornate gold wardrobes as architecture; palace-scale carved beds; wall-to-wall gilded ornament.",
  },
  {
    id: "bauhaus",
    name: "Баухаус",
    description:
      "Функциональность, доступность, универсальность. Минималистичный интерьер с простыми геометрическими формами.",
    keyElements:
      "Лаконичная модульная мебель, складные стулья, диваны-трансформеры. Минимум декора, стильные светильники.",
    colors: "Спокойная палитра с яркими акцентами красного, оранжевого, синего, жёлтого.",
    materials: "Пластик, стекло, металл, дерево.",
    atmosphere: "Rational, modernist, form-follows-function clarity",
    lighting: "Clean functional lighting, geometric pendant lamps, even illumination",
    composition: "Grid-based furniture layout within existing walls, objects as sculpture — do not remove walls",
    promptDirective:
      "Bauhaus as a real flat: tubular-steel or plywood chairs, modular sofa/bed, white/gray walls, one red/yellow/blue accent (cushion or lamp). No ornament. Keep the real room volume. Furniture must look commercially available.",
  },
  {
    id: "boho",
    name: "Бохо",
    description:
      "Яркий свободный стиль без строгих правил. Сочетает восточные, африканские и европейские мотивы.",
    keyElements:
      "Африканские маски, декоративные подушки, пледы, пёстрые ковры, винтажные светильники.",
    colors: "Тёплые яркие цвета, ткани с орнаментом.",
    materials: "Древесина, камень, шерстяные и хлопковые ткани, кожа с выраженной фактурой.",
    atmosphere: "Eclectic, free-spirited, globally inspired warmth",
    lighting: "Layered warm lamps, Moroccan lanterns, string lights, golden ambient glow",
    composition: "Organic clustering, layered textiles, collected-over-time arrangement",
    promptDirective:
      "Boho as a furnished apartment: kilim or jute rug, rattan or wood furniture of normal size, layered textiles, a few plants, warm earth tones. Lived-in, not a bazaar or tent. Do not change room size or ceiling height. No wall-to-wall hanging clutter.",
  },
  {
    id: "industrial",
    name: "Индустриальный",
    description:
      "Обстановка промышленного завода: монохромное оформление, грубые материалы, открытые коммуникации.",
    keyElements:
      "Кирпичная или бетонная отделка стен, металлические полки и светильники, грубые фактуры — без несущих балок и двойной высоты",
    colors: "Белый, беж в сочетании с серым и чёрным.",
    materials: "Кирпич, металл, дерево, бетон.",
    atmosphere: "Urban apartment with industrial finishes, not a factory conversion",
    lighting: "Track lights or metal pendants sized for a flat, warm practical light",
    composition: "Utilitarian furniture within the real room footprint — no invented loft volume",
    promptDirective:
      "Industrial as a city-apartment renovation: brick-look or microcement on existing walls, metal shelves, leather sofa or bed of normal size, track/Edison lighting. Charcoal, rust, cream, black. Do NOT invent factory loft height, exposed structural steel beams, double-height volume, or enlarge windows.",
  },
  {
    id: "classic",
    name: "Классический",
    description:
      "Сдержанный европейский интерьер: дерево, симметрия, спокойные стены. Достижимо обычным ремонтом.",
    keyElements:
      "Деревянная мебель, паркет, картины в рамах, скромная люстра или торшер, текстиль.",
    colors: "Беж, серый, тёплое дерево, приглушённый синий или зелёный; золото только на рамах и фурнитуре.",
    materials: "Дерево, краска, натуральные ткани, кожа.",
    atmosphere: "Quiet European apartment classic, livable and proportional",
    lighting: "Daylight plus one modest chandelier or floor lamps — not a ballroom fixture",
    composition: "Paired nightstands or chairs, balanced but not ceremonial",
    promptDirective:
      "Classic as a finished city apartment, not a manor. Painted walls, herringbone or oak flooring, wooden furniture of store-bought scale, tufted or simple upholstery, 1–2 framed artworks, modest molding. Gold only as small hardware or picture frames. FORBIDDEN: palace halls, columns, heavy baroque plaster covering walls, oversized crystal chandeliers, invented fireplaces.",
  },
  {
    id: "country",
    name: "Кантри",
    description:
      "Уют провинциального быта. Комфортное пространство для отдыха от суеты.",
    keyElements:
      "Простая массивная мебель, тёплые покрывала, льняные занавески, вазы с цветами, плетёные корзины.",
    colors: "Коричневый, зелёный, песочный, терракотовый.",
    materials: "Дерево, камень, глина, натуральные ткани.",
    atmosphere: "Rustic warmth, pastoral comfort, slow living",
    lighting: "Warm sunlight through linen curtains, ceramic table lamps, soft ambient glow",
    composition: "Cozy grouping around farmhouse table, handmade touches — no new hearth or ceiling beams",
    promptDirective:
      "Country as an apartment, not a farmhouse: oak or pine furniture, linen curtains, checked or solid textiles, ceramic lamp, maybe open shelves. Earth tones. FORBIDDEN: stone fireplace, exposed rustic ceiling beams, cottage hall volume.",
  },
  {
    id: "kitsch",
    name: "Китч",
    description:
      "Креативная мешанина цветов и принтов, создающая уникальную эстетику из хаоса.",
    keyElements:
      "Предметы из разных эпох и стилей, яркие обои, винтажные постеры, статуэтки, безделушки.",
    colors: "Яркие принты, контрастные сочетания.",
    materials: "Разнообразные: пластик, текстиль с ярким принтом, винтажные предметы.",
    atmosphere: "Playful irreverence, deliberately camp, joyfully chaotic",
    lighting: "Colorful lamps, neon accents, mismatched quirky fixtures",
    composition: "Maximalist layering, curated chaos, every surface tells a story",
    promptDirective:
      "Kitsch as a real apartment with personality: one patterned wallpaper wall or bright textiles, mixed vintage pieces, posters, a few figurines. Still a usable bedroom/living room with normal furniture scale. Do not fill every surface or invent palace baroque architecture. Do not alter room volume.",
  },
  {
    id: "minimalism",
    name: "Минимализм",
    description:
      "Лаконичный, простой и функциональный интерьер с рациональным использованием пространства.",
    keyElements:
      "Минимум мебели геометрической формы, LED-лампы, зеркало в металлической раме, растение в горшке.",
    colors: "Монохромная сдержанная палитра: бежевый, серый, синий, пастельные тона, белый и чёрный.",
    materials: "Чистые линии, гладкие поверхности, натуральные материалы.",
    atmosphere: "Serene clarity, intentional emptiness, meditative calm",
    lighting: "Recessed LED, hidden sources, abundant natural light, no visible clutter",
    composition: "Negative space as design element, single accent piece, hidden storage",
    promptDirective:
      "Minimalist interior: radical simplicity within the existing room. Few furniture pieces, flush surfaces, monochrome palette, one accent plant. Use existing windows as-is — do NOT invent floor-to-ceiling glass walls or expand openings. Every object essential; keep real ceiling height and footprint.",
  },
  {
    id: "pop-art",
    name: "Поп-арт",
    description:
      "Эпатажный стиль, отражающий культуру потребления. Атмосфера галереи с символами поп-культуры.",
    keyElements:
      "Мягкая мебель округлой формы, картины, постеры, афиши, комиксы, портреты знаменитостей.",
    colors: "Жёлтый, красный, насыщенный синий, фиолетовый, розовый.",
    materials: "Стекло, металл, бумага.",
    atmosphere: "Bold, gallery-like, mass culture celebration",
    lighting: "Gallery spotlights on artwork, bright even illumination, graphic shadows",
    composition: "Art as focal point, furniture frames the gallery wall",
    promptDirective:
      "Pop Art as a livable apartment: white or light walls, 2–4 graphic posters (comic/pop prints), one bold-color sofa or armchair, simple modern table. Saturated accents without turning the room into a museum. Preserve real room size. No wall-to-wall artwork installation, no gallery-scale hanging systems.",
  },
  {
    id: "scandinavian",
    name: "Скандинавский",
    description:
      "Просторное светлое помещение с комфортной мебелью из экологичных материалов.",
    keyElements:
      "Мебель простых форм, картины с чёрными рамами, зеркала, светильники, живые растения.",
    colors: "Белый, серый, голубой, беж с оттенками дерева.",
    materials: "Дерево, натуральный текстиль.",
    atmosphere: "Airy brightness, hygge-adjacent calm, functional beauty",
    lighting: "Maximum daylight, simple pendant lamps, candle clusters for evening",
    composition: "Light wood against white walls, functional zones, uncluttered surfaces",
    promptDirective:
      "Scandinavian interior: bright Nordic simplicity. White walls, light birch/oak flooring, functional mid-century furniture. Black-framed art prints, sheepskin throws, simple ceramic vases. Pale gray, soft blue, white with natural wood warmth. Simple curtains on existing windows, pendant paper lamps, green plants. Clean lines, cozy without clutter. Do not enlarge the room.",
  },
  {
    id: "mediterranean",
    name: "Средиземноморский",
    description:
      "Жизнерадостный стиль приморских регионов Южной Европы, ощущение курортного домика.",
    keyElements:
      "Белая штукатурка, паркет, плитка, массивная деревянная мебель, металлические светильники.",
    colors: "Жёлтый, песочный, терракотовый, зелёный, голубой, синий.",
    materials: "Дерево, камень, плитка, каменная мозаика.",
    atmosphere: "Sun-drenched coastal warmth, vacation home serenity",
    lighting: "Bright Mediterranean sun, wrought iron fixtures, terracotta lamp glow",
    composition: "Terracotta and tile textures, relaxed furniture zones within existing openings — no new arches",
    promptDirective:
      "Mediterranean as painted/stucco-look walls, terracotta or tile-look floor, linen, olive plant, wrought-iron lamp. Azure and sand accents. FORBIDDEN: new arches cut through walls, indoor-outdoor villa openings, enlarged villa volume.",
  },
  {
    id: "futurism",
    name: "Футуризм",
    description:
      "Технологичный дизайн будущего, вдохновлённый космосом. Обтекаемые формы и холодные цвета.",
    keyElements:
      "Округлые формы мебели, глянцевые поверхности, LED-подсветка, встроенная техника.",
    colors: "Холодный белый, серый, металл, глянцевый чёрный с 2-3 яркими акцентами.",
    materials: "Пластик, керамогранит, бетон, стекло, металл.",
    atmosphere: "Sleek contemporary apartment with tech finishes, still a real home",
    lighting: "Recessed or indirect LED, practical lamps — no holographic sci-fi glow",
    composition: "Low sleek furniture, flat walls, existing window openings",
    promptDirective:
      "Futurism as a 2020s apartment upgrade: lacquer or matte millwork, LED strip under cabinets, modular furniture with rounded corners, cool whites and chrome. Must still look inhabitable. FORBIDDEN: curved rebuilt walls, multi-level ceilings, transparent floors, spaceship viewports, holographic effects.",
  },
  {
    id: "hi-tech",
    name: "Хай-тек",
    description:
      "Смесь минимализма и футуризма: лаконичный, технологичный интерьер с чёткой геометрией.",
    keyElements:
      "Минималистичная мебель, световые панели, прожекторы, галогенные лампы, современная техника.",
    colors: "Холодные монохромные: белый, серый, серебро, чёрный.",
    materials: "Стекло, хром, пластик, фактурная штукатурка, дерево, камень.",
    atmosphere: "Technological precision, urban sophistication, machine aesthetic",
    lighting: "Halogen spots, light panels, chrome fixtures, clinical brightness",
    composition: "Geometric rigor, visible technology, glass and metal dominance",
    promptDirective:
      "Hi-Tech as a contemporary apartment: glass/metal furniture, dark or light millwork, smart TV, halogen or LED spots. Monochrome plus one accent. Do not add glass walls that invent new rooms or change openings.",
  },
  {
    id: "hygge",
    name: "Хюгге",
    description:
      "Простое домашнее счастье — уют, комфорт, спокойствие. Теплее скандинавского стиля.",
    keyElements:
      "Текстиль, тёплое освещение, свечи, милые украшения, живые цветы, аромалампа.",
    colors: "Тёплые натуральные оттенки.",
    materials: "Фактурное дерево, камень, кожа, льняная ткань.",
    atmosphere: "Intimate warmth, Danish coziness, sensory comfort",
    lighting: "Candle clusters, warm dim lamps, golden hour glow — no new fireplace architecture",
    composition: "Reading nook, layered blankets, gathered comfort zones",
    promptDirective:
      "Hygge interior: ultimate Danish cozy comfort. Chunky knit blankets, sheepskin rugs, soft wool cushions on a deep sofa. Multiple candles, soft amber lamps (not a built-in fireplace or wood stove unless already in the room). Natural materials — raw wood, linen, wool, ceramic mugs. Muted warm tones — oatmeal, caramel, dusty rose, forest green. Soft textures everywhere. Keep real room size; do not invent a hearth niche.",
  },
  {
    id: "shabby-chic",
    name: "Шебби-шик",
    description:
      "Романтическая «потёртая» старина с винтажными или состаренными вещами.",
    keyElements:
      "Изящная классическая мебель, покрывала, подушки, тюли, антикварные аксессуары, сухоцветы.",
    colors: "Нежные бежевый, розовый, голубой, сиреневый, пастельно-жёлтый.",
    materials: "Винтажный текстиль, состаренная мебель, хендмейд-поделки.",
    atmosphere: "Romantic nostalgia, gentle faded beauty, feminine grace",
    lighting: "Soft diffused daylight through sheer curtains, vintage crystal lamps",
    composition: "Distressed furniture as hero, floral arrangements, delicate layering",
    promptDirective:
      "Shabby chic as painted furniture and floral textiles in a normal room: distressed white dresser, pastel bedding, sheer curtains. Not a manor. Do not alter room volume or add palace plaster.",
  },
  {
    id: "japanese",
    name: "Японский",
    description:
      "Аскетичный стиль с природными мотивами, минимализмом и экологичностью.",
    keyElements:
      "Низкие столы, ширмы, татами, посуда для чайной церемонии, бонсай, японские статуэтки.",
    colors: "Бежевый, коричневый, зелёный, терракотовый с чёрными или красными акцентами.",
    materials: "Дерево, камень, натуральная ткань, глина, бамбук, рисовая бумага.",
    atmosphere: "Zen tranquility, wabi-sabi imperfection, nature harmony",
    lighting: "Paper lantern glow, shoji screen diffusion, subtle indirect light",
    composition: "Ma (negative space), low horizontal furniture lines — no new wall alcoves",
    promptDirective:
      "Japanese as a calm apartment: light wood, low or standard bed, simple storage, paper lantern or warm pendant, one plant. Tatami/shoji only as a rug or screen furniture — do NOT rebuild walls into tokonoma, add room-dividing shoji architecture, or change openings.",
  },
];
export function getStyleById(id: string): DesignStyle | undefined {
  if (id === NO_STYLE_ID) return undefined;
  return DESIGN_STYLES.find((s) => s.id === id);
}

export interface BuildPromptInput {
  description?: string;
  style?: DesignStyle | null;
  attachmentAnalysis?: string;
  hasAttachments: boolean;
}

const PHOTO_QUALITY_BLOCK = [
  "OUTPUT: Single photorealistic interior photograph.",
  "CAMERA: If a reference room photo is attached, MATCH its exact viewpoint, height, framing, and perspective — do NOT invent a new wide architectural hero angle. Without a photo reference, use a wide-angle architectural lens (24mm) at eye level.",
  "QUALITY: 8K detail, accurate material textures, natural color grading, soft shadows, no CGI artifacts.",
  "AVOID: Text, watermarks, logos, distorted furniture, floating objects, unrealistic proportions, cartoon style, camera angle changes when a reference photo exists.",
  GENERATION_CONTENT_RULES,
].join("\n");

function buildStyleBlock(style: DesignStyle): string {
  return [
    `=== DESIGN STYLE (SURFACE / FURNITURE / DÉCOR ONLY): ${style.name.toUpperCase()} ===`,
    "Apply this style WITHOUT changing room geometry. Adapt monumental style features down to apartment scale.",
    "The look must be achievable by renovating this apartment (paint, flooring, furniture, lighting, textiles) — not by rebuilding it as a palace.",
    style.promptDirective,
    `Atmosphere: ${style.atmosphere}`,
    `Lighting: ${style.lighting}`,
    `Composition rules (within existing walls): ${style.composition}`,
    `Preferred décor elements (only if they fit the real room): ${style.keyElements}`,
    `Color palette: ${style.colors}`,
    `Materials: ${style.materials}`,
  ].join("\n");
}

function buildAttachmentBlock(analysis: string): string {
  return [
    "=== REFERENCE IMAGE ANALYSIS ===",
    "The AI has analyzed the user's attached reference image(s). Use this analysis as authoritative visual guidance.",
    "CRITICAL: Preserve the reference room's geometry, openings, and scale. Style changes are finishes and furnishing only.",
    "Preserve key elements, colors, layout cues and mood from references unless the user explicitly asks to change them.",
    analysis,
  ].join("\n\n");
}

function buildUserIntentBlock(description?: string): string {
  if (!description?.trim()) {
    return "=== USER REQUEST ===\nNo text description provided. Base the visualization on reference analysis and/or inferred intent.";
  }
  return `=== USER REQUEST ===\n${description.trim()}`;
}

export function buildGenerationPrompt(input: BuildPromptInput): string {
  const sections: string[] = [
    "You are generating a photorealistic renovation of a REAL apartment room.",
    "The resident wants THEIR existing room restyled — not a fantasy palace or enlarged space.",
    REALISM_GEOMETRY_RULES,
    "Even without a reference photo, assume a typical compact residential room (CIS apartment scale): flat ceiling ~2.5–2.8 m unless stated otherwise — never a palace hall.",
  ];

  if (input.style) {
    sections.push(buildStyleBlock(input.style));
    sections.push(
      "Apply the selected design style to finishes, furniture, lighting and décor ONLY — never by expanding or rebuilding the room."
    );
  } else {
    sections.push(
      "=== STYLE MODE: AUTO ===",
      "No specific design style was selected.",
      "Infer a cohesive contemporary renovation style from the user request and/or reference image analysis.",
      "Still obey REAL ROOM GEOMETRY rules above."
    );
  }

  if (input.attachmentAnalysis) {
    sections.push(buildAttachmentBlock(input.attachmentAnalysis));
  } else if (input.hasAttachments) {
    sections.push(
      "=== REFERENCE IMAGES ===",
      "Reference photos of the real room are attached. Lock to their geometry: same walls, ceiling height, windows/doors/balcony, radiator and fixed fixtures.",
      "Lock the EXACT camera angle, viewpoint height, and framing from the reference photo — the result must look like the same shot after renovation.",
      "Restyle surfaces and furniture only; do not invent columns, taller ceilings, or a larger footprint."
    );
  }

  sections.push(buildUserIntentBlock(input.description));
  sections.push(PHOTO_QUALITY_BLOCK);

  return sections.join("\n\n");
}

/** @deprecated Use buildGenerationPrompt */
export function buildStyledPrompt(description: string, style: DesignStyle): string {
  return buildGenerationPrompt({
    description,
    style,
    hasAttachments: false,
  });
}


