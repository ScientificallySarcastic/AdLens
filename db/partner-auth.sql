-- AdLens — Partner API authentication tables.
-- Run ONCE in the Neon SQL Editor (console.neon.tech → SQL Editor → paste → Run).
-- Additive only: touches nothing in your existing tables.

CREATE TABLE IF NOT EXISTS partners (
  id             TEXT PRIMARY KEY,                -- ptr_...
  name           TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'active',  -- active | suspended
  campaign_scope JSONB,                           -- array of campaign ids; NULL = all
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS partner_api_keys (
  key_id       TEXT PRIMARY KEY,                  -- public half, embedded in the token
  partner_id   TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  secret_hash  TEXT NOT NULL,                     -- sha256(secret); plaintext never stored
  env          TEXT NOT NULL DEFAULT 'live',      -- live | test
  label        TEXT NOT NULL DEFAULT '',
  scopes       JSONB NOT NULL DEFAULT '["results:read","keys:manage"]',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ,                       -- optional auto-expiry
  last_used_at TIMESTAMPTZ,                       -- dead/leaked-key auditing
  revoked_at   TIMESTAMPTZ                        -- soft revoke, instant effect
);
CREATE INDEX IF NOT EXISTS idx_partner_api_keys_partner ON partner_api_keys(partner_id);

CREATE TABLE IF NOT EXISTS partner_oauth_clients (
  client_id   TEXT PRIMARY KEY,                   -- oc_...
  partner_id  TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  secret_hash TEXT NOT NULL,
  scopes      JSONB NOT NULL DEFAULT '["results:read","keys:manage"]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS partner_audit (
  id         BIGSERIAL PRIMARY KEY,
  partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  event      TEXT NOT NULL,                       -- partner.created | key.created | key.revoked | token.issued
  detail     TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_partner_audit_partner ON partner_audit(partner_id, at DESC);

SELECT 'partner auth tables ready' AS status;
