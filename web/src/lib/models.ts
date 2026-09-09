export interface ImageModelOption {
  id: string;
  name: string;
  description: string;
  provider: string;
  recommended?: boolean;
  /** Hint for UI ordering: lower = shown first */
  tier?: "premium" | "balanced" | "fast";
}

export const IMAGE_MODELS: ImageModelOption[] = [
  {
    id: "google/gemini-3-pro-image",
    name: "Gemini 3 Pro Image",
    description: "Максимальное качество — детализация как у топовых AI",
    provider: "Google",
    recommended: true,
    tier: "premium",
  },
  {
    id: "black-forest-labs/flux.2-pro",
    name: "FLUX.2 Pro",
    description: "Отличный фотореализм, стабильный свет и текстуры",
    provider: "Black Forest Labs",
    tier: "premium",
  },
  {
    id: "bytedance-seed/seedream-4.5",
    name: "Seedream 4.5",
    description: "Сильная модель для интерьеров, высокое качество",
    provider: "ByteDance",
    tier: "premium",
  },
  {
    id: "sourceful/riverflow-v2.5-pro",
    name: "Riverflow 2.5 Pro",
    description: "Pro-версия — выше контроль и качество рендера",
    provider: "Sourceful",
    tier: "premium",
  },
  {
    id: "openai/gpt-image-2",
    name: "GPT Image 2",
    description: "Как в ChatGPT (может быть недоступна в регионе)",
    provider: "OpenAI",
    tier: "premium",
  },
  {
    id: "openai/gpt-image-1",
    name: "GPT Image 1",
    description: "Модель OpenAI (может быть недоступна в регионе)",
    provider: "OpenAI",
    tier: "premium",
  },
  {
    id: "google/gemini-3.1-flash-image",
    name: "Gemini 3.1 Flash Image",
    description: "Быстро и качественно, близко к Pro",
    provider: "Google",
    tier: "balanced",
  },
  {
    id: "google/gemini-2.5-flash-image",
    name: "Gemini 2.5 Flash Image",
    description: "Универсальная быстрая модель Google",
    provider: "Google",
    tier: "fast",
  },
  {
    id: "sourceful/riverflow-v2.5-fast",
    name: "Riverflow 2.5 Fast",
    description: "Самая быстрая генерация",
    provider: "Sourceful",
    tier: "fast",
  },
  {
    id: "google/gemini-3.1-flash-lite-image",
    name: "Gemini 3.1 Flash Lite",
    description: "Лёгкая и экономичная модель",
    provider: "Google",
    tier: "fast",
  },
];

export function getDefaultImageModel(): string {
  return (
    process.env.OPENROUTER_IMAGE_MODEL ??
    IMAGE_MODELS.find((m) => m.recommended)?.id ??
    IMAGE_MODELS[0].id
  );
}

export function getImageModelById(id: string): ImageModelOption | undefined {
  return IMAGE_MODELS.find((m) => m.id === id);
}

export function isValidImageModel(id: string): boolean {
  return IMAGE_MODELS.some((m) => m.id === id);
}
