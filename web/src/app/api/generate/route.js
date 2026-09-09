import { randomUUID } from "node:crypto";
import { auth } from "../../../auth";
import { analyzeRoomGeometry } from "../../../lib/analyze-references";
import {
  buildGenerationContext,
  normalizeRoomTypeId,
  resolveRequestedRoomType,
} from "../../../lib/generation-context";
import { getUserByEmail, upsertUser } from "../../../lib/db";
import {
  claimGeneration,
  completeGeneration,
  failGeneration,
  findSourceAssetByHash,
  getRevisionContext,
  markGenerationRunning,
  saveSourceAsset,
} from "../../../lib/generation-store";
import {
  assertBlobConfigured,
  GENERATION_UNAVAILABLE_MESSAGE,
  generateImage,
  hashImageDataUrl,
  persistGeneratedImage,
  inferAspectRatioFromDataUrl,
  persistSourceImage,
  resolveImageModel,
} from "../../../lib/openrouter-image";
import { applyPlanOverrides } from "../../../lib/techpassport/types";

export const runtime = "nodejs";
export const maxDuration = 200;

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
  const roomType = normalizeRoomTypeId(label?.typeId || room.suggestedType || "unknown");
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
  let generationId = null;
  try {
    const prepared = prepareRoomContext(body);
    const description = prepared.description;
    if (description.length > 2000) {
      return json({ error: "Описание слишком длинное (макс. 2000 символов)" }, { status: 400 });
    }

    assertBlobConfigured();
    user = await getUserByEmail(email);
    if (!user) {
      user = await upsertUser(email, session.user?.name, session.user?.image);
    }

    const sourceImages = asImageList(body);
    let parentId = typeof body.previousGenerationId === "string" ? body.previousGenerationId : null;
    let previous = parentId ? await getRevisionContext(user.id, parentId) : null;
    if (parentId && !previous) {
      parentId = null;
    }
    const isFreeRevision = Boolean(parentId) || body.regenerate === true;
    const model = resolveImageModel(body.imageModel);

    let inputAssetId = null;
    let persistedSourceUrl = null;
    if (sourceImages[0]) {
      const sourceHash = hashImageDataUrl(sourceImages[0]);
      const existingSource = await findSourceAssetByHash(user.id, sourceHash);
      if (existingSource?.storage_url) {
        inputAssetId = existingSource.id;
        persistedSourceUrl = existingSource.storage_url;
      } else {
        const source = await persistSourceImage({
          sourceHash,
          value: sourceImages[0],
        });
        const asset = await saveSourceAsset({
          id: source.id,
          userId: user.id,
          imageUrl: source.url,
          imageHash: source.hash,
        });
        inputAssetId = asset.id;
        persistedSourceUrl = asset.storage_url;
      }
    }

    const photoEdit = Boolean(parentId) || (prepared.meta.mode === "standard" && sourceImages.length > 0);
    let roomGeometry = null;
    if (prepared.meta.mode === "standard" && sourceImages.length > 0 && !parentId) {
      roomGeometry = await analyzeRoomGeometry(
        [persistedSourceUrl || sourceImages[0]],
        description
      );
      if (prepared.roomType === "unknown" && roomGeometry?.roomTypeHint) {
        const hinted = normalizeRoomTypeId(roomGeometry.roomTypeHint);
        if (hinted !== "unknown") prepared.roomType = hinted;
      }
    }

    const aspectRatio =
      prepared.meta.mode === "standard" && sourceImages[0]
        ? inferAspectRatioFromDataUrl(sourceImages[0]) || "auto"
        : parentId
          ? "auto"
          : "16:9";

    console.info("generation room geometry", {
      complexity: roomGeometry?.complexity ?? null,
      openings: roomGeometry?.openings?.length ?? 0,
      constructionShell: Boolean(roomGeometry?.constructionShell),
      aspectRatio,
    });

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
      roomGeometry,
      photoEdit,
      // Always unique per request so the same photo can be re-submitted even if the client omits a nonce.
      requestNonce:
        typeof body.requestNonce === "string" && body.requestNonce.trim()
          ? body.requestNonce.trim()
          : randomUUID(),
    });

    const references = [...context.references];
    if (sourceImages[0] && persistedSourceUrl) {
      const index = references.indexOf(sourceImages[0]);
      if (index >= 0) references[index] = persistedSourceUrl;
    }

    generationId = randomUUID();
    claimed = await claimGeneration({
      id: generationId,
      userId: user.id,
      prompt: context.prompt,
      styleId: context.style.id,
      requestHash: context.requestHash,
      modelId: model,
      inputAssetId,
      roomProfile: context.roomProfile,
      parentGenerationId: parentId,
      generationMode: isFreeRevision ? "revision" : prepared.meta.mode,
    });

    if (!claimed.was_created) {
      // Only in-flight duplicates remain non-created after migration 009.
      return json(
        {
          error: "Эта генерация уже выполняется. Подождите несколько секунд и нажмите ещё раз.",
          generationId: claimed.generation_id,
          status: claimed.generation_status,
          remaining: user.credits_balance,
          reused: true,
        },
        { status: 409 }
      );
    }

    await markGenerationRunning({ id: generationId, userId: user.id });
    const image = await generateImage({
      prompt: context.prompt,
      references,
      model,
      aspectRatio,
      photoEdit,
    });
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
      await failGeneration({ id: claimed.generation_id ?? generationId, userId: user.id });
    }
    const message = error instanceof Error ? error.message : "Не удалось создать визуализацию";
    console.error("Image generation failed", {
      generationId: claimed?.generation_id ?? null,
      code: error && typeof error === "object" ? error.code : null,
      message,
    });
    if (/credits|лимит|insufficient generation credits/i.test(message)) {
      return json({ error: "Лимит генераций исчерпан" }, { status: 429 });
    }
    if (
      /техпаспорт|номер комнаты|потолк|комната №|описание|прикрепите|стиль не найден|изображен|повторн|не более трёх|неверный формат|не найдено сохранённое/i.test(
        message
      )
    ) {
      return json({ error: message }, { status: 400 });
    }
    return json({ error: GENERATION_UNAVAILABLE_MESSAGE }, { status: 500 });
  }
}
