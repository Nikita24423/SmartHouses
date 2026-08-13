import { neon } from "@neondatabase/serverless";

let sqlClient;

function sql() {
  if (!sqlClient) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL не задан");
    sqlClient = neon(process.env.DATABASE_URL);
  }
  return sqlClient;
}

export async function getUserByEmail(email) {
  const rows = await sql()`SELECT id, email, credits_balance FROM users WHERE email = ${email} LIMIT 1`;
  return rows[0] ?? null;
}

export async function getRevisionContext(userId, generationId) {
  const rows = await sql()`
    SELECT g.id, g.style_id, g.model_id, a.storage_url AS image_url, a.content_hash AS image_hash
    FROM generations AS g
    JOIN assets AS a ON a.id = g.result_asset_id AND a.user_id = g.user_id
    WHERE g.id = ${generationId} AND g.user_id = ${userId} AND g.status = 'completed'
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function claimGeneration({ id, userId, prompt, styleId, requestHash, modelId, inputAssetId = null }) {
  const rows = await sql()`
    SELECT * FROM claim_generation(
      ${id}, ${userId}, ${prompt}, ${styleId}, ${requestHash}, ${modelId}, ${inputAssetId}
    )
  `;
  return rows[0];
}

export async function markGenerationRunning({ id, userId }) {
  await sql()`UPDATE generations SET status = 'running' WHERE id = ${id} AND user_id = ${userId} AND status = 'pending'`;
}

export async function saveSourceAsset({ id, userId, imageUrl, imageHash }) {
  const rows = await sql()`
    INSERT INTO assets (id, user_id, kind, storage_url, content_hash)
    VALUES (${id}, ${userId}, 'source', ${imageUrl}, ${imageHash})
    ON CONFLICT (user_id, content_hash) DO UPDATE SET storage_url = EXCLUDED.storage_url
    RETURNING id, storage_url
  `;
  return rows[0];
}

export async function attachInputAsset({ generationId, userId, assetId }) {
  const rows = await sql()`
    UPDATE generations SET input_asset_id = ${assetId}
    WHERE id = ${generationId} AND user_id = ${userId} AND status IN ('pending', 'running')
    RETURNING id
  `;
  if (!rows[0]) throw new Error("Не удалось привязать исходное изображение к генерации");
}

export async function completeGeneration({ generationId, userId, assetId, imageUrl, imageHash }) {
  const client = sql();
  const assetRows = await client`
    INSERT INTO assets (id, user_id, kind, storage_url, content_hash)
    VALUES (${assetId}, ${userId}, 'result', ${imageUrl}, ${imageHash})
    ON CONFLICT (user_id, content_hash) DO UPDATE SET storage_url = EXCLUDED.storage_url
    RETURNING id, storage_url
  `;
  const asset = assetRows[0];
  const updated = await client`
    UPDATE generations SET result_asset_id = ${asset.id}, status = 'completed'
    WHERE id = ${generationId} AND user_id = ${userId} AND status IN ('pending', 'running')
    RETURNING id
  `;
  if (!updated[0]) throw new Error("Генерация не находится в состоянии, пригодном для завершения");
  return { assetId: asset.id, imageUrl: asset.storage_url };
}

/** A status predicate prevents a duplicate error handler from refunding twice. */
export async function failGeneration({ id, userId }) {
  const rows = await sql()`
    WITH failed AS (
      UPDATE generations SET status = 'failed'
      WHERE id = ${id} AND user_id = ${userId} AND status IN ('pending', 'running')
      RETURNING user_id
    )
    UPDATE users SET credits_balance = credits_balance + 1
    WHERE id IN (SELECT user_id FROM failed)
    RETURNING credits_balance
  `;
  return rows[0] ?? null;
}
