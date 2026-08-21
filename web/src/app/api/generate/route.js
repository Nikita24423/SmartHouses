import { randomUUID } from "node:crypto";
import { auth } from "../../../auth";
import {
  buildGenerationContext,
  resolveRequestedRoomType,
} from "../../../lib/generation-context";
import {
  claimGeneration,
  completeGeneration,
  failGeneration,
  getRevisionContext,
  getUserByEmail,
  markGenerationRunning,
  attachInputAsset,
  ensureUser,
  saveSourceAsset,
} from "../../../lib/generation-store";
import {
  assertBlobConfigured,
  GENERATION_UNAVAILABLE_MESSAGE,
  generateImage,
  hashImageDataUrl,
  persistGeneratedImage,
  persistSourceImage,
  resolveImageModel,
} from "../../../lib/openrouter-image";
import { applyPlanOverrides } from "../../../lib/techpassport/types";

export const runtime = "nodejs";
export const maxDuration = 120;

function json(data, init) {
  return Response.json(data, init);
}

function asImageList(body) {
  const images = Array.isArray(body.referenceImages)
    ? body.referenceImages
    : body.techPassportImage
      ? [body.techPassportImage]
      : [];

  if (images.length > 3 || !images.every((item) => typeof item === "string" && item.length > 0)) {
    throw new Error("Можно прикрепить не более трёх корректных изображений");
  }
  return images;
}

function prepareRoomContext(body) {
  if (body.mode !== "techpassport") {
    const description = typeof body.description === "string" ? body.description : "";
    return {
      description,
      roomType: resolveRequestedRoomType(body.roomType, description),
      dimensions: body.dimensions,
      layout: body.layout,
      meta: { mode: "standard" },
    };
  }

  if (!body.planAnalysis?.rooms?.length) throw new Error("Сначала проанализируйте техпаспорт");
  if (typeof body.roomNumber !== "string" || !body.roomNumber) throw new Error("Укажите номер комнаты");

  const ceiling = Number(body.ceilingHeightM ?? 2.7);
  if (!Number.isFinite(ceiling) || ceiling < 2 || ceiling > 5) {
    throw new Error("Укажите высоту потолков от 2 до 5 м");
  }

  const analysis = applyPlanOverrides(body.planAnalysis, body.roomOverrides);
  const room = analysis.rooms.find((candidate) => candidate.number === body.roomNumber);
  if (!room) throw new Error(`Комната №${body.roomNumber} не найдена в плане`);

  const label = Array.isArray(body.roomLabels)
    ? body.roomLabels.find((candidate) => candidate.number === room.number)
    : null;
  const roomType = label?.typeId || room.suggestedType || "unknown";
  const dimensions = [
    room.dimensions,
    room.widthM && room.lengthM ? `${room.widthM} × ${room.lengthM} м` : "",
    room.areaSqm ? `площадь ${room.areaSqm} м²` : "",
    `высота потолка ${ceiling} м`,
  ].filter(Boolean).join("; ");
  const layout = [
    `Комната №${room.number}`,
    analysis.layoutSummary,
    room.shape && `форма: ${room.shape}`,
    room.windows && `окна: ${room.windows}`,
    room.doors && `двери: ${room.doors}`,
    room.openings?.length && `проёмы: ${JSON.stringify(room.openings)}`,
    room.notes,
  ].filter(Boolean).join("; ");

  return {
    description: typeof body.description === "string" ? body.description : "",
    roomType,
    dimensions,
    layout,
    meta: { mode: "techpassport", roomNumber: room.number, roomType },
  };
}

export async function POST(request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return json({ error: "Требуется авторизация" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Неверный формат запроса" }, { status: 400 });
  }

  let claimed = null;
  let user = null;
  try {
    const prepared = prepareRoomContext(body);
    const description = prepared.description;
    if (description.length > 2000) {
      return json({ error: "Описание слишком длинное (макс. 2000 символов)" }, { status: 400 });
    }

    assertBlobConfigured();
    user = await getUserByEmail(email);
    if (!user) {
      user = await ensureUser({ email, name: session.user?.name, image: session.user?.image });
    }

    const sourceImages = asImageList(body);
    const parentId = typeof body.previousGenerationId === "string" ? body.previousGenerationId : null;
    const previous = parentId ? await getRevisionContext(user.id, parentId) : null;
    const model = resolveImageModel(body.imageModel);
    const context = buildGenerationContext({
      description,
      styleId: body.styleId,
      roomType: prepared.roomType,
      dimensions: prepared.dimensions,
      layout: prepared.layout,
      modelId: model,
      previousGenerationId: parentId,
      previous: previous && {
        imageUrl: previous.image_url,
        imageHash: previous.image_hash,
        roomType: previous.room_type,
        dimensions: previous.room_dimensions,
        layout: previous.room_layout,
      },
      sourceImages,
      sourceImageHashes: sourceImages.map(hashImageDataUrl),
    });

    const generationId = randomUUID();
    claimed = await claimGeneration({
      id: generationId,
      userId: user.id,
      prompt: context.prompt,
      styleId: context.style.id,
      requestHash: context.requestHash,
      modelId: model,
      roomProfile: context.roomProfile,
      parentGenerationId: parentId,
    });

    if (!claimed.was_created) {
      if (claimed.generation_status === "completed" && claimed.result_asset_id) {
        const existing = await getRevisionContext(user.id, claimed.generation_id);
        return json({
          generationId: claimed.generation_id,
          image: existing?.image_url,
          style: context.style.name,
          model,
          roomProfile: context.roomProfile,
          imageModel: model,
          remaining: user.credits_balance,
          ...prepared.meta,
          reused: true,
        });
      }
      return json(
        { generationId: claimed.generation_id, status: claimed.generation_status, remaining: user.credits_balance, ...prepared.meta, reused: true },
        { status: 202 }
      );
    }

    const references = [...context.references];
    if (sourceImages[0]) {
      const source = await persistSourceImage({
        sourceHash: hashImageDataUrl(sourceImages[0]),
        value: sourceImages[0],
      });
      const asset = await saveSourceAsset({
        id: source.id,
        userId: user.id,
        imageUrl: source.url,
        imageHash: source.hash,
      });
      await attachInputAsset({ generationId, userId: user.id, assetId: asset.id });
      references[context.references.indexOf(sourceImages[0])] = asset.storage_url;
    }

    await markGenerationRunning({ id: generationId, userId: user.id });
    const image = await generateImage({ prompt: context.prompt, references, model });
    const stored = await persistGeneratedImage({ generationId, bytes: image.bytes, mediaType: image.mediaType });
    await completeGeneration({
      generationId,
      userId: user.id,
      assetId: stored.id,
      imageUrl: stored.url,
      imageHash: stored.hash,
    });

    const updatedUser = await getUserByEmail(email);

    return json({
      generationId,
      image: stored.url,
      style: context.style.name,
      model,
      imageModel: model,
      roomProfile: context.roomProfile,
      remaining: updatedUser?.credits_balance ?? Math.max(0, user.credits_balance - 1),
      ...prepared.meta,
      reused: false,
    });
  } catch (error) {
    if (claimed?.was_created && user) {
      await failGeneration({ id: claimed.generation_id, userId: user.id });
    }
    const message = error instanceof Error ? error.message : "Не удалось создать визуализацию";
    console.error("Image generation failed", {
      generationId: claimed?.generation_id ?? null,
      code: error && typeof error === "object" ? error.code : null,
      message,
    });
    if (/credits|лимит/i.test(message)) return json({ error: "Лимит генераций исчерпан" }, { status: 429 });
    return json({ error: GENERATION_UNAVAILABLE_MESSAGE }, { status: 500 });
  }
}
