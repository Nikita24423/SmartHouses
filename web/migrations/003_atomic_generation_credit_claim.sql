BEGIN;

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
BEGIN
  IF p_request_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'request_hash must be lowercase SHA-256'
      USING ERRCODE = '22023';
  END IF;

  -- Serializes claims for one user: a duplicate does not consume another credit.
  SELECT credits_balance
  INTO v_balance
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found'
      USING ERRCODE = '23503';
  END IF;

  SELECT *
  INTO v_generation
  FROM generations
  WHERE user_id = p_user_id
    AND request_hash = p_request_hash;

  IF FOUND THEN
    RETURN QUERY
    SELECT v_generation.id, v_generation.status, v_generation.result_asset_id, false;
    RETURN;
  END IF;

  IF v_balance <= 0 THEN
    RAISE EXCEPTION 'insufficient generation credits'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO generations (
    id,
    user_id,
    prompt,
    style_id,
    request_hash,
    model_id,
    input_asset_id,
    status
  ) VALUES (
    p_id,
    p_user_id,
    p_prompt,
    p_style_id,
    p_request_hash,
    p_model_id,
    p_input_asset_id,
    'pending'
  );

  UPDATE users
  SET credits_balance = credits_balance - 1
  WHERE id = p_user_id;

  RETURN QUERY SELECT p_id, 'pending'::text, NULL::text, true;
END;
$$;

INSERT INTO schema_migrations (version)
VALUES (3);

COMMIT;
