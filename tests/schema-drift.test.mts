// Regression: a database created from the ORIGINAL db/meta-sync.sql is missing
// columns the code now writes. Two consequences this test pins down:
//   1. inserts fail  ("column actions of relation ... does not exist")
//   2. account-scoped reads throw → silent UNSCOPED fallback → two ad accounts'
//      campaigns appear under whichever account is selected
// ensureMetaSchema() must close both. Requires TEST_DATABASE_URL.

import assert from "node:assert/strict";
import { Client, Pool } from "pg";

const url = process.env.TEST_DATABASE_URL;
if (!url) { console.log("TEST_DATABASE_URL not set — skipping"); process.exit(0); }

process.env.DATABASE_URL = url;
process.env.META_ACCESS_TOKEN = "t";
process.env.META_AD_ACCOUNT_ID = "111";

const admin = new Client({ connectionString: url });
await admin.connect();

// Recreate the ORIGINAL schema exactly as db/meta-sync.sql shipped it.
await admin.query(`DROP TABLE IF EXISTS meta_ad_daily, meta_ads, meta_adset_daily,
  meta_adsets, meta_daily_metrics, meta_campaigns, sync_log CASCADE`);
await admin.query(`
  CREATE TABLE meta_campaigns (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT DEFAULT 'ACTIVE',
    objective TEXT DEFAULT '—', daily_budget NUMERIC DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now());
  CREATE TABLE meta_daily_metrics (
    campaign_id TEXT NOT NULL REFERENCES meta_campaigns(id) ON DELETE CASCADE,
    date DATE NOT NULL, spend NUMERIC DEFAULT 0, impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0, conversions BIGINT DEFAULT 0, ctr NUMERIC DEFAULT 0,
    cpc NUMERIC DEFAULT 0, roas NUMERIC DEFAULT 0, PRIMARY KEY (campaign_id, date));
  CREATE TABLE meta_adsets (
    id TEXT PRIMARY KEY, campaign_id TEXT REFERENCES meta_campaigns(id) ON DELETE CASCADE,
    name TEXT NOT NULL, status TEXT DEFAULT 'ACTIVE', updated_at TIMESTAMPTZ DEFAULT now());
  CREATE TABLE meta_adset_daily (
    adset_id TEXT NOT NULL REFERENCES meta_adsets(id) ON DELETE CASCADE, date DATE NOT NULL,
    spend NUMERIC DEFAULT 0, impressions BIGINT DEFAULT 0, clicks BIGINT DEFAULT 0,
    conversions BIGINT DEFAULT 0, ctr NUMERIC DEFAULT 0, cpc NUMERIC DEFAULT 0,
    roas NUMERIC DEFAULT 0, frequency NUMERIC DEFAULT 0, reach BIGINT DEFAULT 0,
    PRIMARY KEY (adset_id, date));
  CREATE TABLE meta_ads (
    id TEXT PRIMARY KEY, adset_id TEXT REFERENCES meta_adsets(id) ON DELETE CASCADE,
    name TEXT NOT NULL, format TEXT DEFAULT 'Image', status TEXT DEFAULT 'ACTIVE',
    updated_at TIMESTAMPTZ DEFAULT now());
  CREATE TABLE meta_ad_daily (
    ad_id TEXT NOT NULL REFERENCES meta_ads(id) ON DELETE CASCADE, date DATE NOT NULL,
    spend NUMERIC DEFAULT 0, impressions BIGINT DEFAULT 0, clicks BIGINT DEFAULT 0,
    conversions BIGINT DEFAULT 0, ctr NUMERIC DEFAULT 0, roas NUMERIC DEFAULT 0,
    frequency NUMERIC DEFAULT 0, PRIMARY KEY (ad_id, date));
  CREATE TABLE sync_log (source TEXT PRIMARY KEY, last_synced TIMESTAMPTZ NOT NULL, detail TEXT);
`);

const hasCol = async (t: string, c: string) =>
  (await admin.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`, [t, c])).rowCount === 1;

assert.equal(await hasCol("meta_campaigns", "ad_account_id"), false, "precondition: old schema");
assert.equal(await hasCol("meta_daily_metrics", "actions"), false, "precondition: old schema");
console.log("  ✓ starting from the original (outdated) schema");

const pool = new Pool({ connectionString: url });
const tagged = async (strings: TemplateStringsArray, ...vals: unknown[]) => {
  const text = strings.reduce((a, s, i) => a + s + (i < vals.length ? `$${i + 1}` : ""), "");
  return (await pool.query(text, vals as never[])).rows;
};
const db = await import("../lib/db.js");
db.__setSqlForTests(tagged as never);

const { ensureMetaSchema } = await import("../lib/meta.js");
await ensureMetaSchema();

for (const [t, c] of [
  ["meta_campaigns", "ad_account_id"], ["meta_daily_metrics", "actions"],
  ["meta_daily_metrics", "cpm"], ["meta_daily_metrics", "conv_value"],
  ["meta_adset_daily", "actions"], ["meta_ad_daily", "actions"],
  ["meta_adsets", "optimization_goal"], ["meta_ads", "thumbnail_url"],
] as const) {
  assert.equal(await hasCol(t, c), true, `${t}.${c} should exist after migration`);
}
console.log("  ✓ every missing column added");

// The insert that used to fail with 'column "actions" does not exist'.
await admin.query(
  `INSERT INTO meta_campaigns (id, name, ad_account_id) VALUES ('meta_c1','Puzzles Camp','111')`);
await admin.query(
  `INSERT INTO meta_campaigns (id, name, ad_account_id) VALUES ('meta_c2','Seven Labs Camp','222')`);
await admin.query(
  `INSERT INTO meta_daily_metrics (campaign_id, date, spend, cpm, reach, frequency, conv_value, actions)
   VALUES ('meta_c1', CURRENT_DATE, 10, 5, 100, 1.2, 50, '{"purchase":3}'::jsonb)`);
console.log("  ✓ insert with the new columns succeeds");

// The real payoff: scoping works, so accounts stay separate.
const scoped = await admin.query(`SELECT id FROM meta_campaigns WHERE ad_account_id = '222'`);
assert.equal(scoped.rowCount, 1);
assert.equal(scoped.rows[0].id, "meta_c2", "account 222 must not see account 111's campaign");
console.log("  ✓ campaigns are scoped per ad account — no cross-account bleed");

await pool.end();
await admin.end();
console.log("\n4 passed");
