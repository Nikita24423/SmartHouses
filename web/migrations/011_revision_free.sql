BEGIN;

-- Regeneration / revision of an existing result must not consume generation credits.

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
  p_parent_generation_id text,
  p_generation_mode      text DEFAULT 'standard'
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
  v_mode text;
  v_retired_hash text;
  v_allowed constant text[] := ARRAY[
    'living', 'bedroom', 'kitchen', 'bathroom', 'toilet', 'hallway',
    'balcony', 'storage', 'office', 'dining', 'unknown'
  ];
  v_modes constant text[] := ARRAY['standard', 'techpassport', 'revision'];
BEGIN
  IF p_request_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'request_hash must be lowercase SHA-256' USING ERRCODE = '22023';
  END IF;

  v_mode := COALESCE(NULLIF(btrim(p_generation_mode), ''), 'standard');
  IF p_parent_generation_id IS NOT NULL THEN
    v_mode := 'revision';
  ELSIF NOT (v_mode = ANY (v_modes)) THEN
    v_mode := 'standard';
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
    v_room_type := COALESCE(NULLIF(btrim(p_room_type), ''), 'unknown');
    IF NOT (v_room_type = ANY (v_allowed)) THEN
      v_room_type := 'unknown';
    END IF;
    v_room_dimensions := NULLIF(p_room_dimensions, '');
    v_room_layout := NULLIF(p_room_layout, '');
  END IF;

  SELECT * INTO v_generation
  FROM generations
  WHERE user_id = p_user_id AND request_hash = p_request_hash;

  IF FOUND THEN
    IF v_generation.status IN ('pending', 'running')
      AND v_generation.created_at >= NOW() - INTERVAL '15 minutes' THEN
      RETURN QUERY SELECT v_generation.id, v_generation.status, v_generation.result_asset_id, false;
      RETURN;
    END IF;

    v_retired_hash := encode(
      digest(v_generation.request_hash || ':' || v_generation.id || ':retired', 'sha256'),
      'hex'
    );
    UPDATE generations
    SET request_hash = v_retired_hash,
        status = CASE
          WHEN status IN ('pending', 'running') THEN 'failed'
          ELSE status
        END
    WHERE id = v_generation.id AND user_id = p_user_id;
  END IF;

  IF v_mode <> 'revision' AND v_balance <= 0 THEN
    RAISE EXCEPTION 'insufficient generation credits' USING ERRCODE = '22023';
  END IF;

  INSERT INTO generations (
    id, user_id, prompt, style_id, request_hash, model_id, input_asset_id,
    room_type, room_dimensions, room_layout, parent_generation_id, status, generation_mode
  ) VALUES (
    p_id, p_user_id, p_prompt, p_style_id, p_request_hash, p_model_id, p_input_asset_id,
    v_room_type, v_room_dimensions, v_room_layout, p_parent_generation_id, 'pending', v_mode
  );

  IF v_mode <> 'revision' THEN
    UPDATE users
    SET credits_balance = credits_balance - 1,
        generations_used = generations_used + 1
    WHERE id = p_user_id;
  END IF;

  RETURN QUERY SELECT p_id, 'pending'::text, NULL::text, true;
END;
$$;

INSERT INTO schema_migrations (version)
VALUES (11)
ON CONFLICT (version) DO NOTHING;

COMMIT;
