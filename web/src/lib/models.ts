export interface ImageModelOption {
  id: string;
  name: string;
  description: string;
  provider: string;
  recommended?: boolean;
}

export const IMAGE_MODELS: ImageModelOption[] = [
  {
    id: "sourceful/riverflow-v2.5-fast",
    name: "Riverflow 2.5 Fast",
    description: "Быстрая генерация, хорошее качество интерьеров",
    provider: "Sourceful",
    recommended: true,
  },
  {
    id: "google/gemini-2.5-flash-image",
    name: "Gemini 2.5 Flash Image",
    description: "Универсальная модель Google",
    provider: "Google",
  },
  {
    id: "google/gemini-3.1-flash-lite-image",
    name: "Gemini 3.1 Flash Lite",
    description: "Лёгкая и экономичная модель",
    provider: "Google",
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


