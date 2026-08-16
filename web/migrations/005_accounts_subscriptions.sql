BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS image text,
  ADD COLUMN IF NOT EXISTS generations_used integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS generations_limit integer,
  ADD COLUMN IF NOT EXISTS subscription_plan text,
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz;

UPDATE users SET generations_used = 0 WHERE generations_used IS NULL;
ALTER TABLE users ALTER COLUMN generations_used SET DEFAULT 0;

CREATE TABLE IF NOT EXISTS payment_orders (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email text NOT NULL,
  package_id text NOT NULL,
  credits integer NOT NULL,
  amount integer NOT NULL,
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  tracking_id text UNIQUE NOT NULL,
  bepaid_token text,
  bepaid_uid text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE INDEX IF NOT EXISTS payment_orders_user_created_idx
  ON payment_orders (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION claim_generation(
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

  UPDATE users
  SET credits_balance = credits_balance - 1,
      generations_used = COALESCE(generations_used, 0) + 1
  WHERE id = p_user_id;

  RETURN QUERY SELECT p_id, 'pending'::text, NULL::text, true;
END;
$$;

INSERT INTO schema_migrations (version)
VALUES (5)
ON CONFLICT (version) DO NOTHING;

COMMIT;
