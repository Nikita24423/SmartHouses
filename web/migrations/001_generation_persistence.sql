BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version     integer PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS credits_balance integer;

UPDATE users
SET credits_balance = GREATEST(
  COALESCE(generations_limit, 5) - COALESCE(generations_used, 0),
  0
)
WHERE credits_balance IS NULL;

ALTER TABLE users
  ALTER COLUMN credits_balance SET DEFAULT 5,
  ALTER COLUMN credits_balance SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_credits_balance_nonnegative'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_credits_balance_nonnegative
      CHECK (credits_balance >= 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS assets (
  id           text PRIMARY KEY,
  user_id      text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind         text NOT NULL,
  storage_url  text NOT NULL,
  content_hash text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assets_kind_valid
    CHECK (kind IN ('source', 'result')),
  CONSTRAINT assets_content_hash_valid
    CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT assets_user_content_hash_unique
    UNIQUE (user_id, content_hash)
);

CREATE INDEX IF NOT EXISTS assets_user_created_idx
  ON assets (user_id, created_at DESC);

ALTER TABLE generations
  ADD COLUMN IF NOT EXISTS request_hash text,
  ADD COLUMN IF NOT EXISTS model_id text,
  ADD COLUMN IF NOT EXISTS input_asset_id text,
  ADD COLUMN IF NOT EXISTS result_asset_id text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'legacy';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'generations_request_hash_valid'
  ) THEN
    ALTER TABLE generations
      ADD CONSTRAINT generations_request_hash_valid
      CHECK (request_hash IS NULL OR request_hash ~ '^[0-9a-f]{64}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'generations_status_valid'
  ) THEN
    ALTER TABLE generations
      ADD CONSTRAINT generations_status_valid
      CHECK (status IN (
        'legacy', 'pending', 'running', 'completed', 'failed', 'cancelled'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'generations_input_asset_fkey'
  ) THEN
    ALTER TABLE generations
      ADD CONSTRAINT generations_input_asset_fkey
      FOREIGN KEY (input_asset_id) REFERENCES assets(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'generations_result_asset_fkey'
  ) THEN
    ALTER TABLE generations
      ADD CONSTRAINT generations_result_asset_fkey
      FOREIGN KEY (result_asset_id) REFERENCES assets(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS generations_user_request_hash_uq
  ON generations (user_id, request_hash)
  WHERE request_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS generations_user_created_idx
  ON generations (user_id, created_at DESC);

INSERT INTO schema_migrations (version)
VALUES (1)
ON CONFLICT (version) DO NOTHING;

COMMIT;
