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
      "Имперская роскошь, величественный и помпезный стиль с элегантностью. Симметричный интерьер с центральным объектом композиции.",
    keyElements:
      "Симметрия, лепнина/молдинги (без колонн), тяжёлые портьеры у окон, позолоченные акценты, мотивы льва/лавра в декоре. Люстра или бра, канделябры — по масштабу комнаты.",
    colors: "Белый, беж, благородные оттенки красного, синего, зелёного. Позолоченные или серебряные элементы.",
    materials: "Натуральное дерево, паркет, камень, мраморная мозаика, фактурные обои.",
    atmosphere: "Imperial grandeur, ceremonial elegance, Napoleonic-era luxury",
    lighting: "Warm chandelier glow, candelabra highlights, dramatic but refined ambient light",
    composition: "Strict bilateral symmetry, central focal point (console or dining table), axial furniture layout within existing walls",
    promptDirective:
      "French Empire (Ampir) FINISHES for a normal apartment room: imperial luxury through décor and furniture ONLY — not architecture. Symmetry, ornate ceiling moldings scaled to a flat residential ceiling, silk/velvet drapes framing existing windows (do not block balcony doors), gilded bronze accents, laurel/lion motifs as wall décor, marble-look or patterned flooring, crystal chandelier sized to the room. Jewel tones with cream and gold. NEVER add Corinthian columns, never raise the ceiling, never enlarge the room into a palace hall.",
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
      "Bauhaus interior: pure functional modernism with geometric precision. Tubular steel furniture, modular seating, flat planes and right angles. Primary color accents — red, yellow, blue — on neutral white/gray base. Chrome, glass, bent plywood, leather straps. No ornamentation. Each object serves a purpose. Bauhaus school aesthetic: Wassily chairs, nesting tables, industrial craftsmanship meets art. Keep the real room volume unchanged.",
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
      "Bohemian interior: eclectic global fusion with rich layered textures. Kilim rugs, macramé wall hangings, embroidered cushions, rattan furniture, vintage brass lamps. Mix of African masks, Indian textiles, Moroccan poufs. Warm earth tones — terracotta, ochre, rust — with jewel-tone accents. Plants everywhere, books stacked casually. Collected, artistic, lived-in soul without clutter chaos. Do not change room size or ceiling height.",
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
    atmosphere: "Raw, urban, converted warehouse authenticity",
    lighting: "Exposed Edison bulbs, track lighting, metal cage pendants, dramatic shadows",
    composition: "Raw materials and utilitarian furniture within the real room footprint — no invented loft volume",
    promptDirective:
      "Industrial interior adapted to a normal apartment: brick-look or concrete wall finishes, metal shelves, Edison/track lighting, reclaimed wood and leather accents. Charcoal, rust, cream, black. Suggest industrial mood with materials and fixtures — do NOT invent factory loft height, exposed steel beams, open double-height volume, or enlarge windows beyond what exists.",
  },
  {
    id: "classic",
    name: "Классический",
    description:
      "Сдержанный благородный интерьер с геометричностью и симметрией. Элементы ампира, барокко, рококо.",
    keyElements:
      "Строгая мебель из дерева, антиквариат, картины в золочёных рамах, хрустальные люстры.",
    colors: "Пастельные бежевый, серый, голубой; глубокие синий, зелёный, коричневый; золотистый, перламутровый.",
    materials: "Натуральное дерево, кожа, натуральные ткани.",
    atmosphere: "Refined dignity, timeless European elegance",
    lighting: "Crystal chandelier scaled to the room, sconces, soft diffused light from existing windows",
    composition: "Paired furniture, balanced symmetry, console or table as anchor — no new fireplace architecture",
    promptDirective:
      "Classic European apartment interior: restrained elegance via furniture and finishes. Mahogany pieces, tufted upholstery, gilt-framed art, modest crown molding on the EXISTING flat ceiling, herringbone or classic parquet look. Crystal chandelier scaled to the room. Muted palette with gold accents. No palace halls, no new columns, no raised ceilings, no invented fireplace chimney breast.",
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
      "Country cottage interior adapted to an apartment: rustic charm via furniture and textiles. Heavy oak farmhouse table, checked tablecloth, open wooden shelving with ceramic dishes, terracotta-look flooring, woven baskets, dried wildflowers, patchwork quilts. Earth tones — sage, warm brown, sand, burnt orange. Do NOT add stone fireplaces, exposed ceiling beams, or enlarge the room into a cottage hall.",
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
      "Kitsch interior: deliberately bold camp aesthetic where bad taste becomes art. Clashing patterns — floral wallpaper meets leopard print cushions. Vintage plastic chairs next to baroque mirror, novelty figurines, retro posters. Hot pink, lime green, electric blue combinations. Plastic, laminate, faux fur, chrome. Self-aware humor, pop culture references, gallery of found objects. Controlled creative disorder. Do not alter room volume.",
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
      "Pop Art interior: vibrant gallery-meets-living-space. Lichtenstein-style comic panels, Warhol-inspired portraits, bold graphic posters on clean white walls. Rounded modular sofa in primary yellow or red, acrylic coffee table, chrome accents. Saturated colors — electric blue, hot pink, lemon yellow. Ben-Day dots, bold outlines, consumer culture icons. Playful, provocative, museum-quality pop art collection in a modern room. Preserve real room size.",
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
      "Mediterranean apartment finishes: whitewashed/stucco wall texture, terracotta or tile flooring look, wrought iron lighting, blue ceramics, linen textiles, olive plants. Azure, sand, terracotta, olive. Suggest coastal villa mood with materials — do NOT cut new arches through walls, invent indoor-outdoor openings, or enlarge into a villa volume.",
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
    atmosphere: "Space-age vision, technological sublime, otherworldly",
    lighting: "LED color strips, holographic glow, indirect cove lighting, no traditional fixtures",
    composition: "Curved furniture, floating shelves, sleek surfaces within existing walls",
    promptDirective:
      "Futuristic apartment interior: sci-fi mood via furniture and finishes only. Glossy surfaces, LED accents, sleek modular pieces, cool white/chrome palette. Do NOT rebuild walls into curves, do NOT add multi-level ceilings, transparent floors, or panoramic viewports that replace real windows.",
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
      "Hi-Tech interior: precision modern luxury with glass, chrome, leather and steel furniture within the existing room. Smart-home accents, monochrome with one accent. Do not add glass partitions that invent new room volumes or change openings.",
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
      "Shabby Chic interior: romantic weathered elegance. Distressed white-painted furniture with chipped finish, floral chintz upholstery, lace doilies. Pastel palette — soft pink, baby blue, lavender, cream. Vintage picture frames, dried flower bouquets, antique mirrors with patina. Tulle curtains, quilted bedspreads, hand-painted ceramics. Feminine, nostalgic, gently worn aristocratic charm. Do not alter room volume.",
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
      "Japanese interior: zen minimalist sanctuary adapted to an apartment. Low table, zabuton, bamboo accents, natural wood, earth tones, paper lanterns, bonsai. Suggest shoji/tatami mood with finishes and furniture — do NOT rebuild walls into tokonoma alcoves, add shoji partitions that invent new rooms, or change openings.",
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
  "CAMERA: Wide-angle architectural lens (24mm), eye-level perspective, professional real estate photography.",
  "QUALITY: 8K detail, accurate material textures, natural color grading, soft shadows, no CGI artifacts.",
  "AVOID: Text, watermarks, logos, distorted furniture, floating objects, unrealistic proportions, cartoon style.",
  GENERATION_CONTENT_RULES,
].join("\n");

function buildStyleBlock(style: DesignStyle): string {
  return [
    `=== DESIGN STYLE (SURFACE / FURNITURE / DÉCOR ONLY): ${style.name.toUpperCase()} ===`,
    "Apply this style WITHOUT changing room geometry. Adapt monumental style features down to apartment scale.",
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


