BEGIN;

ALTER TABLE assets
  ADD CONSTRAINT assets_id_user_unique UNIQUE (id, user_id);

ALTER TABLE generations
  DROP CONSTRAINT IF EXISTS generations_input_asset_fkey,
  DROP CONSTRAINT IF EXISTS generations_result_asset_fkey,
  ADD CONSTRAINT generations_input_asset_owner_fkey
    FOREIGN KEY (input_asset_id, user_id)
    REFERENCES assets(id, user_id)
    ON DELETE RESTRICT,
  ADD CONSTRAINT generations_result_asset_owner_fkey
    FOREIGN KEY (result_asset_id, user_id)
    REFERENCES assets(id, user_id)
    ON DELETE RESTRICT;

CREATE INDEX payment_orders_user_created_idx
  ON payment_orders (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION claim_generation(
  p_id             text,
  p_user_id        text,
  p_prompt         text,
  p_style_id       text,
  p_request_hash   text,
  p_model_id       text,
  p_input_asset_id text DEFAULT NULL
)
RETURNS TABLE (
  generation_id text,
  generation_status text,
  result_asset_id text,
  was_created boolean
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_request_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'request_hash must be lowercase SHA-256'
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH inserted AS (
    INSERT INTO generations (
      id,
      user_id,
      prompt,
      style_id,
      request_hash,
      model_id,
      input_asset_id,
      status
    )
    VALUES (
      p_id,
      p_user_id,
      p_prompt,
      p_style_id,
      p_request_hash,
      p_model_id,
      p_input_asset_id,
      'pending'
    )
    ON CONFLICT (user_id, request_hash)
      WHERE request_hash IS NOT NULL
    DO NOTHING
    RETURNING
      id,
      status,
      generations.result_asset_id
  )
  SELECT
    inserted.id,
    inserted.status,
    inserted.result_asset_id,
    true
  FROM inserted

  UNION ALL

  SELECT
    existing.id,
    existing.status,
    existing.result_asset_id,
    false
  FROM generations AS existing
  WHERE existing.user_id = p_user_id
    AND existing.request_hash = p_request_hash
    AND NOT EXISTS (SELECT 1 FROM inserted)
  LIMIT 1;
END;
$$;

INSERT INTO schema_migrations (version)
VALUES (2);

COMMIT;
