import { getDefaultImageModel, isValidImageModel } from "@/lib/models";
import { getOpenRouterHeaders } from "@/lib/openrouter-headers";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/images";

export interface GenerateImageInput {
  prompt: string;
  referenceImages?: string[];
  aspectRatio?: string;
  model?: string;
}

export interface GenerateImageResult {
  imageDataUrl: string;
  model: string;
}

export async function generateImage(input: GenerateImageInput): Promise<GenerateImageResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY не настроен");
  }

  const model =
    input.model && isValidImageModel(input.model)
      ? input.model
      : getDefaultImageModel();

  const body: Record<string, unknown> = {
    model,
    prompt: input.prompt,
    aspect_ratio: input.aspectRatio ?? "16:9",
    resolution: "1K",
    output_format: "jpeg",
  };

  if (input.referenceImages && input.referenceImages.length > 0) {
    body.input_references = input.referenceImages.map((url) => ({
      type: "image_url",
      image_url: { url },
    }));
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: getOpenRouterHeaders(apiKey),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let message = `OpenRouter API error (${response.status})`;
    try {
      const parsed = JSON.parse(errorText);
      message = parsed.error?.message ?? parsed.message ?? message;
    } catch {
      message = errorText || message;
    }
    throw new Error(message);
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  const mediaType = data.data?.[0]?.media_type ?? "image/jpeg";

  if (!b64) {
    throw new Error("Модель не вернула изображение");
  }

  return {
    imageDataUrl: `data:${mediaType};base64,${b64}`,
    model,
  };
}


