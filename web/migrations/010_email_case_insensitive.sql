BEGIN;

-- Normalize stored emails so OAuth casing never creates duplicate accounts.
UPDATE users
SET email = lower(trim(email))
WHERE email IS DISTINCT FROM lower(trim(email));

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uq ON users (lower(email));

INSERT INTO schema_migrations (version)
VALUES (10)
ON CONFLICT (version) DO NOTHING;

COMMIT;
