-- AdLens — live Meta tables. Run ONCE in the Neon SQL Editor
-- (console.neon.tech → your project → SQL Editor → paste ALL → Run).
-- Additive only: touches NOTHING in your existing seeded tables.

CREATE TABLE IF NOT EXISTS meta_campaigns (
  id           TEXT PRIMARY KEY,          -- Meta's own campaign id
  name         TEXT NOT NULL,
  status       TEXT DEFAULT 'ACTIVE',
  objective    TEXT DEFAULT '—',
  daily_budget NUMERIC DEFAULT 0,         -- dollars (converted from Meta's minor units at sync)
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meta_daily_metrics (
  campaign_id TEXT NOT NULL REFERENCES meta_campaigns(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  spend       NUMERIC DEFAULT 0,
  impressions BIGINT  DEFAULT 0,
  clicks      BIGINT  DEFAULT 0,
  conversions BIGINT  DEFAULT 0,
  ctr         NUMERIC DEFAULT 0,
  cpc         NUMERIC DEFAULT 0,
  roas        NUMERIC DEFAULT 0,
  PRIMARY KEY (campaign_id, date)          -- one row per campaign per day; re-syncs upsert cleanly
);

CREATE TABLE IF NOT EXISTS sync_log (
  source      TEXT PRIMARY KEY,            -- 'meta' now; 'linkedin' / 'pinterest' later
  last_synced TIMESTAMPTZ NOT NULL,
  detail      TEXT
);

SELECT 'meta tables ready' AS status;

-- ── Adset + ad level (added for live drill-down) ─────────────────────
CREATE TABLE IF NOT EXISTS meta_adsets (
  id          TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES meta_campaigns(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  status      TEXT DEFAULT 'ACTIVE',
  updated_at  TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS meta_adset_daily (
  adset_id    TEXT NOT NULL REFERENCES meta_adsets(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  spend NUMERIC DEFAULT 0, impressions BIGINT DEFAULT 0, clicks BIGINT DEFAULT 0,
  conversions BIGINT DEFAULT 0, ctr NUMERIC DEFAULT 0, cpc NUMERIC DEFAULT 0,
  roas NUMERIC DEFAULT 0, frequency NUMERIC DEFAULT 0, reach BIGINT DEFAULT 0,
  PRIMARY KEY (adset_id, date)
);
CREATE TABLE IF NOT EXISTS meta_ads (
  id         TEXT PRIMARY KEY,
  adset_id   TEXT NOT NULL REFERENCES meta_adsets(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  format     TEXT DEFAULT 'Image',
  status     TEXT DEFAULT 'ACTIVE',
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS meta_ad_daily (
  ad_id       TEXT NOT NULL REFERENCES meta_ads(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  spend NUMERIC DEFAULT 0, impressions BIGINT DEFAULT 0, clicks BIGINT DEFAULT 0,
  conversions BIGINT DEFAULT 0, ctr NUMERIC DEFAULT 0, roas NUMERIC DEFAULT 0,
  frequency NUMERIC DEFAULT 0,
  PRIMARY KEY (ad_id, date)
);

SELECT 'meta adset + ad tables ready' AS status;
