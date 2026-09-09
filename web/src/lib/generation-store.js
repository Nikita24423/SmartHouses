import { getSql } from "./db";

export async function getRevisionContext(userId, generationId) {
  const rows = await getSql()`
    SELECT g.id, g.style_id, g.model_id, g.room_type, g.room_dimensions, g.room_layout,
      a.storage_url AS image_url, a.content_hash AS image_hash
    FROM generations AS g
    JOIN assets AS a ON a.id = g.result_asset_id AND a.user_id = g.user_id
    WHERE g.id = ${generationId} AND g.user_id = ${userId} AND g.status = 'completed'
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getGeneration(userId, generationId) {
  const rows = await getSql()`
    SELECT g.id, g.status, g.style_id, g.model_id, g.room_type, g.room_dimensions, g.room_layout,
      a.storage_url AS image_url
    FROM generations AS g
    LEFT JOIN assets AS a ON a.id = g.result_asset_id AND a.user_id = g.user_id
    WHERE g.id = ${generationId} AND g.user_id = ${userId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function claimGeneration({
  id, userId, prompt, styleId, requestHash, modelId, inputAssetId = null, roomProfile, parentGenerationId = null,
  generationMode = "standard",
}) {
  const rows = await getSql()`
    SELECT * FROM claim_generation(
      ${id}, ${userId}, ${prompt}, ${styleId}, ${requestHash}, ${modelId}, ${inputAssetId},
      ${roomProfile.roomType}, ${roomProfile.dimensions || null}, ${roomProfile.layout || null}, ${parentGenerationId},
      ${generationMode}
    )
  `;
  return rows[0];
}

export async function markGenerationRunning({ id, userId }) {
  await getSql()`UPDATE generations SET status = 'running' WHERE id = ${id} AND user_id = ${userId} AND status = 'pending'`;
}

export async function findSourceAssetByHash(userId, imageHash) {
  const rows = await getSql()`
    SELECT id, storage_url
    FROM assets
    WHERE user_id = ${userId} AND content_hash = ${imageHash}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function saveSourceAsset({ id, userId, imageUrl, imageHash }) {
  const rows = await getSql()`
    INSERT INTO assets (id, user_id, kind, storage_url, content_hash)
    VALUES (${id}, ${userId}, 'source', ${imageUrl}, ${imageHash})
    ON CONFLICT (user_id, content_hash) DO UPDATE SET storage_url = EXCLUDED.storage_url
    RETURNING id, storage_url
  `;
  return rows[0];
}

export async function attachInputAsset({ generationId, userId, assetId }) {
  const rows = await getSql()`
    UPDATE generations SET input_asset_id = ${assetId}
    WHERE id = ${generationId} AND user_id = ${userId} AND status IN ('pending', 'running')
    RETURNING id
  `;
  if (!rows[0]) throw new Error("Не удалось привязать исходное изображение к генерации");
}

export async function completeGeneration({ generationId, userId, assetId, imageUrl, imageHash }) {
  const sql = getSql();
  const assetRows = await sql`
    INSERT INTO assets (id, user_id, kind, storage_url, content_hash)
    VALUES (${assetId}, ${userId}, 'result', ${imageUrl}, ${imageHash})
    ON CONFLICT (user_id, content_hash) DO UPDATE
      SET storage_url = EXCLUDED.storage_url,
          kind = 'result'
    RETURNING id, storage_url
  `;
  const asset = assetRows[0];
  const updated = await sql`
    UPDATE generations SET result_asset_id = ${asset.id}, status = 'completed'
    WHERE id = ${generationId} AND user_id = ${userId} AND status IN ('pending', 'running')
    RETURNING id
  `;
  if (!updated[0]) throw new Error("Генерация не находится в состоянии, пригодном для завершения");
  return { assetId: asset.id, imageUrl: asset.storage_url };
}

/** A status predicate prevents a duplicate error handler from refunding twice. */
export async function failGeneration({ id, userId }) {
  const rows = await getSql()`
    WITH failed AS (
      UPDATE generations SET status = 'failed'
      WHERE id = ${id} AND user_id = ${userId} AND status IN ('pending', 'running')
      RETURNING user_id, generation_mode
    )
    UPDATE users
    SET credits_balance = credits_balance + CASE WHEN failed.generation_mode = 'revision' THEN 0 ELSE 1 END,
        generations_used = GREATEST(
          generations_used - CASE WHEN failed.generation_mode = 'revision' THEN 0 ELSE 1 END,
          0
        )
    FROM failed
    WHERE users.id = failed.user_id
    RETURNING credits_balance
  `;
  return rows[0] ?? null;
}
