// Proves the stores create their own tables on first use against a REAL empty
// Postgres — the "relation does not exist" failure must be impossible.
// Requires TEST_DATABASE_URL. Run: npx tsx tests/automigrate.test.mts

import assert from "node:assert/strict";
import { Client } from "pg";

const url = process.env.TEST_DATABASE_URL;
if (!url) { console.log("TEST_DATABASE_URL not set — skipping"); process.exit(0); }

process.env.DATABASE_URL = url;
process.env.TOKEN_ENCRYPTION_KEY = "test-encryption-key";

const admin = new Client({ connectionString: url });
await admin.connect();

// Start from a genuinely empty schema.
await admin.query(`DROP TABLE IF EXISTS meta_connected_accounts, meta_connections,
  partner_audit, partner_api_keys, partner_oauth_clients, partners CASCADE`);

const tableExists = async (t: string) =>
  (await admin.query("SELECT to_regclass($1) IS NOT NULL AS ok", [`public.${t}`])).rows[0].ok;

assert.equal(await tableExists("meta_connections"), false, "precondition: table absent");

// Route the app's neon() driver at plain Postgres for this test.
const { Pool } = await import("pg");
const pool = new Pool({ connectionString: url });
const tagged = async (strings: TemplateStringsArray, ...vals: unknown[]) => {
  const text = strings.reduce((acc, s, i) => acc + s + (i < vals.length ? `$${i + 1}` : ""), "");
  return (await pool.query(text, vals as never[])).rows;
};
const db = await import("../lib/db.js");
db.__setSqlForTests(tagged as never);

// ── Meta connections ─────────────────────────────────────────────
const { getConnectionStore } = await import("../lib/connections.js");
const store = getConnectionStore();

await store.save(
  { fbUserId: "99887766", fbUserName: "Ganapathi", token: "EAAtest-secret-token", expiresIn: 5184000, scopes: "ads_read" },
  [{ id: "1036948902205514", name: "Puzzles Club Business", currency: "INR", timezone: "Asia/Kolkata", business: "", status: 1 }],
);
console.log("  ✓ save() created its tables and inserted with no manual migration");

assert.equal(await tableExists("meta_connections"), true);
assert.equal(await tableExists("meta_connected_accounts"), true);

const accounts = await store.listAccounts();
assert.equal(accounts.length, 1);
assert.equal(accounts[0].id, "1036948902205514");
console.log("  ✓ connected account reads back");

const token = await store.tokenForAccount("act_1036948902205514");
assert.equal(token, "EAAtest-secret-token", "token decrypts, act_ prefix tolerated");
console.log("  ✓ token round-trips through encryption");

const stored = (await admin.query("SELECT access_token FROM meta_connections LIMIT 1")).rows[0].access_token;
assert.ok(!stored.includes("EAAtest-secret-token"), "token must be encrypted at rest");
assert.ok(stored.startsWith("v1."), "AES-GCM envelope");
console.log("  ✓ plaintext token is NOT in the database");

assert.equal(await store.disconnect("conn_99887766"), true);
assert.equal((await store.listAccounts()).length, 0, "disconnect revokes access");
console.log("  ✓ disconnect revokes the connection");

// ── Partner tables ───────────────────────────────────────────────
const { getPartnerStore } = await import("../lib/partnerStore.js");
const ps = getPartnerStore();
const partner = await ps.createPartner("Acme Agency", ["retargeting"]);
assert.ok(partner.id.startsWith("ptr_"));
assert.equal(await tableExists("partners"), true);
assert.deepEqual((await ps.getPartner(partner.id))?.campaignScope, ["retargeting"]);
console.log("  ✓ partner tables auto-created and scoped partner persists");

await pool.end();
await admin.end();
console.log("\n7 passed");
