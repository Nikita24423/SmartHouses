import { createHash, randomUUID } from "node:crypto";

const ALLOWED_IMAGE_MODELS = new Set([
  "sourceful/riverflow-v2.5-fast",
  "google/gemini-2.5-flash-image",
  "google/gemini-3.1-flash-lite-image",
]);

export function resolveImageModel(modelId) {
  const candidate = modelId || process.env.OPENROUTER_IMAGE_MODEL || "sourceful/riverflow-v2.5-fast";
  return ALLOWED_IMAGE_MODELS.has(candidate) ? candidate : "sourceful/riverflow-v2.5-fast";
}

export function assertBlobConfigured() {
  const hasReadWriteToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const hasVercelOidc = Boolean(
    process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN
  );
  if (!hasReadWriteToken && !hasVercelOidc) {
    throw new Error("Хранилище результатов не подключено");
  }
}

export function decodeImageDataUrl(value) {
  const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i.exec(value);
  if (!match) throw new Error("Исходное изображение должно быть JPEG, PNG или WebP в формате data URL");
  return { mediaType: match[1].toLowerCase().replace("image/jpg", "image/jpeg"), bytes: Buffer.from(match[2], "base64") };
}

export function hashImageDataUrl(value) {
  return createHash("sha256").update(decodeImageDataUrl(value).bytes).digest("hex");
}

export async function generateImage({ prompt, references, model }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY не настроен");

  const body = { model, prompt, aspect_ratio: "16:9", resolution: "1K", output_format: "jpeg" };
  if (references.length > 0) {
    body.input_references = references.map((url) => ({ type: "image_url", image_url: { url } }));
  }

  const response = await fetch("https://openrouter.ai/api/v1/images", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${text.slice(0, 500)}`);
  }

  const payload = await response.json();
  const base64 = payload.data?.[0]?.b64_json;
  const mediaType = payload.data?.[0]?.media_type ?? "image/jpeg";
  if (!base64) throw new Error("Модель не вернула изображение");
  return { bytes: Buffer.from(base64, "base64"), mediaType };
}

export async function persistGeneratedImage({ generationId, bytes, mediaType }) {
  assertBlobConfigured();
  const { put } = await import("@vercel/blob");
  const extension = mediaType === "image/png" ? "png" : "jpg";
  const blob = await put(`generations/${generationId}.${extension}`, bytes, {
    access: "public",
    contentType: mediaType,
    addRandomSuffix: false,
  });
  return {
    id: randomUUID(),
    url: blob.url,
    hash: createHash("sha256").update(bytes).digest("hex"),
  };
}

export async function persistSourceImage({ sourceHash, value }) {
  assertBlobConfigured();
  const { bytes, mediaType } = decodeImageDataUrl(value);
  const { put } = await import("@vercel/blob");
  const extension = mediaType === "image/png" ? "png" : mediaType === "image/webp" ? "webp" : "jpg";
  const blob = await put(`sources/${sourceHash}.${extension}`, bytes, {
    access: "public",
    contentType: mediaType,
    addRandomSuffix: false,
  });
  return { id: randomUUID(), url: blob.url, hash: sourceHash };
}
