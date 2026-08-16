import { getOpenRouterHeaders } from "@/lib/openrouter-headers";

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

const ANALYSIS_SYSTEM_PROMPT = `You are an expert interior designer and visual analyst.
Analyze the attached reference image(s) for interior design image generation.
Respond in English only. Be specific and visual — describe what you SEE, not generic advice.

Structure your response with these sections (use the headers exactly):
## Room & Layout
## Colors & Materials
## Furniture & Objects
## Lighting & Atmosphere
## Detected Style
## Generation Directives

In "Room & Layout", measure and lock the REAL geometry: approximate ceiling height feel (standard residential vs tall), wall count, window/balcony/door positions, radiators, built-ins. Explicitly note what must NOT change.

In "Generation Directives", write 3-5 concrete instructions for an AI image generator:
1) preserve exact room volume and openings from the references
2) list fixed elements that must stay (stove, sink, radiator, balcony door, etc.)
3) forbid inventing columns, raised ceilings, or a larger room for style
4) camera angle and mood for a renovation of THIS room
If multiple images are attached, note relationships between them (e.g. same room, mood board, before/after).`;

function buildAnalysisUserPrompt(userDescription?: string): string {
  const parts = [
    "Analyze the attached reference image(s) for a realistic apartment renovation visualization.",
    "Priority: document the real room geometry so a later generation cannot expand or fantasize the space.",
    "Focus on visual details that must be reflected in a generated photorealistic interior render.",
  ];

  if (userDescription?.trim()) {
    parts.push(
      `The user also provided this text request (use it as additional intent, but prioritize what is visible in the images):\n"${userDescription.trim()}"`
    );
  } else {
    parts.push(
      "No text description was provided — infer the design intent entirely from the attached images."
    );
  }

  return parts.join("\n\n");
}

export async function analyzeReferenceImages(
  images: string[],
  userDescription?: string
): Promise<string> {
  if (images.length === 0) return "";

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY не настроен");
  }

  const model =
    process.env.OPENROUTER_VISION_MODEL ?? "google/gemini-2.5-flash-lite";

  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [
    { type: "text", text: buildAnalysisUserPrompt(userDescription) },
    ...images.map((url) => ({
      type: "image_url" as const,
      image_url: { url },
    })),
  ];

  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: "POST",
    headers: getOpenRouterHeaders(apiKey),
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
        { role: "user", content },
      ],
      temperature: 0.3,
      max_tokens: 600,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let message = `Ошибка анализа изображений (${response.status})`;
    try {
      const parsed = JSON.parse(errorText);
      message = parsed.error?.message ?? parsed.message ?? message;
    } catch {
      message = errorText || message;
    }
    throw new Error(message);
  }

  const data = await response.json();
  const analysis = data.choices?.[0]?.message?.content;

  if (!analysis || typeof analysis !== "string") {
    throw new Error("Модель не смогла проанализировать изображения");
  }

  return analysis.trim();
}


