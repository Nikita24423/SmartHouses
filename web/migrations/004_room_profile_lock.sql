BEGIN;

ALTER TABLE generations
  ADD COLUMN IF NOT EXISTS room_type text,
  ADD COLUMN IF NOT EXISTS room_dimensions text,
  ADD COLUMN IF NOT EXISTS room_layout text,
  ADD COLUMN IF NOT EXISTS parent_generation_id text;

-- Older results have no reliable structured room profile. They remain editable
-- from their saved image, but are explicitly marked as an unknown room type.
UPDATE generations
SET room_type = 'unknown'
WHERE room_type IS NULL;

ALTER TABLE generations
  ALTER COLUMN room_type SET DEFAULT 'unknown',
  ALTER COLUMN room_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'generations_id_user_unique'
  ) THEN
    ALTER TABLE generations
      ADD CONSTRAINT generations_id_user_unique UNIQUE (id, user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'generations_parent_owner_fkey'
  ) THEN
    ALTER TABLE generations
      ADD CONSTRAINT generations_parent_owner_fkey
      FOREIGN KEY (parent_generation_id, user_id)
      REFERENCES generations(id, user_id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'generations_room_type_valid'
  ) THEN
    ALTER TABLE generations
      ADD CONSTRAINT generations_room_type_valid
      CHECK (room_type IN (
        'living', 'bedroom', 'kitchen', 'bathroom', 'toilet', 'hallway',
        'balcony', 'storage', 'office', 'dining', 'unknown'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS generations_parent_created_idx
  ON generations (user_id, parent_generation_id, created_at DESC)
  WHERE parent_generation_id IS NOT NULL;

DROP FUNCTION IF EXISTS claim_generation(text, text, text, text, text, text, text);

CREATE FUNCTION claim_generation(
  p_id                   text,
  p_user_id              text,
  p_prompt               text,
  p_style_id             text,
  p_request_hash         text,
  p_model_id             text,
  p_input_asset_id       text,
  p_room_type            text,
  p_room_dimensions      text,
  p_room_layout          text,
  p_parent_generation_id text
)
RETURNS TABLE (
  generation_id     text,
  generation_status text,
  result_asset_id   text,
  was_created       boolean
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_balance integer;
  v_generation generations%ROWTYPE;
  v_room_type text;
  v_room_dimensions text;
  v_room_layout text;
BEGIN
  IF p_request_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'request_hash must be lowercase SHA-256' USING ERRCODE = '22023';
  END IF;

  SELECT credits_balance INTO v_balance
  FROM users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found' USING ERRCODE = '23503';
  END IF;

  -- The database is the authority for revision geometry. A request cannot
  -- relabel a bedroom as a kitchen or change a saved plan by posting new JSON.
  IF p_parent_generation_id IS NOT NULL THEN
    SELECT room_type, room_dimensions, room_layout
    INTO v_room_type, v_room_dimensions, v_room_layout
    FROM generations
    WHERE id = p_parent_generation_id
      AND user_id = p_user_id
      AND status = 'completed';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'completed parent generation not found' USING ERRCODE = '23503';
    END IF;
  ELSE
    v_room_type := COALESCE(NULLIF(p_room_type, ''), 'unknown');
    v_room_dimensions := NULLIF(p_room_dimensions, '');
    v_room_layout := NULLIF(p_room_layout, '');
  END IF;

  SELECT * INTO v_generation
  FROM generations
  WHERE user_id = p_user_id AND request_hash = p_request_hash;
  IF FOUND THEN
    RETURN QUERY SELECT v_generation.id, v_generation.status, v_generation.result_asset_id, false;
    RETURN;
  END IF;

  IF v_balance <= 0 THEN
    RAISE EXCEPTION 'insufficient generation credits' USING ERRCODE = '22023';
  END IF;

  INSERT INTO generations (
    id, user_id, prompt, style_id, request_hash, model_id, input_asset_id,
    room_type, room_dimensions, room_layout, parent_generation_id, status
  ) VALUES (
    p_id, p_user_id, p_prompt, p_style_id, p_request_hash, p_model_id, p_input_asset_id,
    v_room_type, v_room_dimensions, v_room_layout, p_parent_generation_id, 'pending'
  );

  UPDATE users SET credits_balance = credits_balance - 1 WHERE id = p_user_id;
  RETURN QUERY SELECT p_id, 'pending'::text, NULL::text, true;
END;
$$;

INSERT INTO schema_migrations (version) VALUES (4);

COMMIT;
