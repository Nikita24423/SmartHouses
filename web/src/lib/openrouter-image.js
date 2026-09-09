import { createHash, randomUUID } from "node:crypto";

function getOpenRouterHeaders(apiKey) {
  const siteUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": siteUrl,
    "X-Title": "Design by Plan",
  };
}

const ALLOWED_IMAGE_MODELS = new Set([
  "openai/gpt-image-2",
  "openai/gpt-image-1",
  "google/gemini-3-pro-image",
  "black-forest-labs/flux.2-pro",
  "bytedance-seed/seedream-4.5",
  "sourceful/riverflow-v2.5-pro",
  "google/gemini-3.1-flash-image",
  "google/gemini-2.5-flash-image",
  "sourceful/riverflow-v2.5-fast",
  "google/gemini-3.1-flash-lite-image",
]);

const DEFAULT_IMAGE_MODEL = "google/gemini-3-pro-image";

export const GENERATION_UNAVAILABLE_MESSAGE = "Не удалось создать интерьер. Попробуйте ещё раз.";

export function resolveImageModel(modelId) {
  const candidate = modelId || process.env.OPENROUTER_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;
  return ALLOWED_IMAGE_MODELS.has(candidate) ? candidate : DEFAULT_IMAGE_MODEL;
}

const ASPECT_RATIO_PRESETS = [
  [1, 1, "1:1"],
  [4, 5, "4:5"],
  [5, 4, "5:4"],
  [3, 4, "3:4"],
  [4, 3, "4:3"],
  [2, 3, "2:3"],
  [3, 2, "3:2"],
  [9, 16, "9:16"],
  [16, 9, "16:9"],
  [9, 21, "9:21"],
  [21, 9, "21:9"],
];

export function readImageDimensions(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 16) return null;

  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    if (bytes.length < 24) return null;
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }

  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset < bytes.length - 8) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      while (offset + 1 < bytes.length && bytes[offset + 1] === 0xff) offset += 1;
      const marker = bytes[offset + 1];
      if (
        marker === 0x00 ||
        marker === 0xd8 ||
        marker === 0xd9 ||
        (marker >= 0xd0 && marker <= 0xd7)
      ) {
        offset += 2;
        continue;
      }
      const isSof =
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc;
      if (isSof) {
        return {
          height: bytes.readUInt16BE(offset + 5),
          width: bytes.readUInt16BE(offset + 7),
        };
      }
      const length = bytes.readUInt16BE(offset + 2);
      if (length < 2) break;
      offset += 2 + length;
    }
    return null;
  }

  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    const kind = bytes.toString("ascii", 12, 16);
    if (kind === "VP8X" && bytes.length >= 30) {
      return {
        width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16),
        height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16),
      };
    }
    if (kind === "VP8 " && bytes.length >= 30) {
      return {
        width: bytes.readUInt16LE(26) & 0x3fff,
        height: bytes.readUInt16LE(28) & 0x3fff,
      };
    }
    if (kind === "VP8L" && bytes.length >= 25) {
      const bits = bytes.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
  }

  return null;
}

export function nearestAspectRatio(width, height) {
  if (!width || !height) return null;
  const value = width / height;
  let best = "16:9";
  let bestDelta = Infinity;
  for (const [w, h, label] of ASPECT_RATIO_PRESETS) {
    const delta = Math.abs(value - w / h);
    if (delta < bestDelta) {
      best = label;
      bestDelta = delta;
    }
  }
  return best;
}

export function inferAspectRatioFromDataUrl(value) {
  try {
    const { bytes } = decodeImageDataUrl(value);
    const size = readImageDimensions(bytes);
    return size ? nearestAspectRatio(size.width, size.height) : null;
  } catch {
    return null;
  }
}

function aspectRatioForModel(ratio, model) {
  if (model !== "openai/gpt-image-1") return ratio;
  if (ratio === "16:9" || ratio === "21:9" || ratio === "auto") return "3:2";
  if (ratio === "9:16" || ratio === "9:21") return "2:3";
  return ratio;
}

/** Build model-specific Image API fields for best quality. */
export function buildImageRequestBody({ prompt, references, model, aspectRatio, photoEdit }) {
  const hasRefs = Array.isArray(references) && references.length > 0;
  const requested = aspectRatio || (hasRefs ? "auto" : "16:9");
  const body = {
    model,
    prompt,
    aspect_ratio: aspectRatioForModel(requested, model),
    output_format: "jpeg",
  };

  if (model.startsWith("openai/gpt-image")) {
    body.quality = "high";
  }

  if (
    model.startsWith("google/gemini") ||
    model.startsWith("sourceful/riverflow") ||
    model.startsWith("bytedance-seed/")
  ) {
    body.resolution = model.includes("lite") || model.includes("fast") ? "1K" : "2K";
  }

  if (model === "google/gemini-3-pro-image" || model === "sourceful/riverflow-v2.5-pro") {
    // Photo edits benefit from 4K micro-detail (textures, edges) to close the gap with GPT Image.
    body.resolution = photoEdit ? "4K" : "2K";
  }

  if (photoEdit && model.startsWith("google/gemini")) {
    body.quality = "high";
  }

  if ((references ?? []).length > 0) {
    body.input_references = references.map((url) => ({
      type: "image_url",
      image_url: { url },
    }));
  }

  return body;
}

export function assertBlobConfigured() {
  const hasReadWriteToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const hasVercelBlobStore = Boolean(process.env.BLOB_STORE_ID);
  const hasOidcToken = Boolean(process.env.VERCEL_OIDC_TOKEN);

  if (!hasReadWriteToken && !hasVercelBlobStore && !hasOidcToken) {
    const error = new Error("Blob result storage is not configured");
    error.code = "RESULT_STORAGE_UNAVAILABLE";
    throw error;
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

export async function generateImage({ prompt, references, model, aspectRatio, photoEdit }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY не настроен");

  const body = buildImageRequestBody({ prompt, references, model, aspectRatio, photoEdit });

  const response = await fetch("https://openrouter.ai/api/v1/images", {
    method: "POST",
    headers: getOpenRouterHeaders(apiKey),
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
    allowOverwrite: true,
  });
  return { id: randomUUID(), url: blob.url, hash: sourceHash };
}
