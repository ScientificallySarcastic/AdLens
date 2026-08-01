-- AdLens — self-service Meta account connections ("Connect with Facebook").
-- Run ONCE in the Neon SQL Editor. Additive only.
--
-- Replaces the single-tenant META_ACCESS_TOKEN env var: each user connects
-- their own Meta account through OAuth and every ad account they granted is
-- stored here. Tokens are encrypted at rest (see lib/tokenCrypto.ts).

CREATE TABLE IF NOT EXISTS meta_connections (
  id             TEXT PRIMARY KEY,                 -- conn_...
  owner          TEXT NOT NULL DEFAULT 'default',  -- workspace/user this belongs to
  fb_user_id     TEXT NOT NULL,                    -- who authorised
  fb_user_name   TEXT NOT NULL DEFAULT '',
  access_token   TEXT NOT NULL,                    -- AES-256-GCM envelope, never plaintext
  token_expires  TIMESTAMPTZ,                      -- long-lived ≈ 60 days; NULL = no expiry
  scopes         TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_meta_connections_owner ON meta_connections(owner);

CREATE TABLE IF NOT EXISTS meta_connected_accounts (
  account_id     TEXT NOT NULL,                    -- numeric id, no act_ prefix
  connection_id  TEXT NOT NULL REFERENCES meta_connections(id) ON DELETE CASCADE,
  name           TEXT NOT NULL DEFAULT '',
  currency       TEXT NOT NULL DEFAULT '',
  timezone       TEXT NOT NULL DEFAULT '',
  business       TEXT NOT NULL DEFAULT '',
  status         INT  NOT NULL DEFAULT 1,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, connection_id)
);
CREATE INDEX IF NOT EXISTS idx_meta_connected_accounts_conn ON meta_connected_accounts(connection_id);

SELECT 'meta oauth tables ready' AS status;
