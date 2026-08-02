// Regression: switching ad accounts must NOT return the previously fetched
// account's name/currency/timezone. The identity cache was a single global
// slot, so the first account fetched won for every account afterwards.
// Run: npx tsx tests/account-isolation.test.mts

import assert from "node:assert/strict";

process.env.META_ACCESS_TOKEN = "test-token";
process.env.META_AD_ACCOUNT_ID = "1036948902205514"; // Puzzles Club

const ACCOUNTS: Record<string, { name: string; currency: string; timezone_name: string }> = {
  "1036948902205514": { name: "Puzzles Club Business", currency: "INR", timezone_name: "Asia/Kolkata" },
  "9998887776665":    { name: "Seven Labs",            currency: "USD", timezone_name: "America/New_York" },
};

const fetched: string[] = [];
globalThis.fetch = (async (url: unknown) => {
  const u = String(url);
  const m = u.match(/\/act_(\d+)\?/);
  if (m) {
    fetched.push(m[1]);
    const a = ACCOUNTS[m[1]];
    return new Response(JSON.stringify(a), { status: 200, headers: { "content-type": "application/json" } });
  }
  return new Response(JSON.stringify({ data: [] }), { status: 200, headers: { "content-type": "application/json" } });
}) as typeof fetch;

const { fetchAccountInfo, accountCurrency, setActiveAccount } = await import("../lib/meta.js");

// 1. Puzzles Club first — this is what used to poison the cache.
setActiveAccount("1036948902205514");
const puzzles = await fetchAccountInfo();
assert.equal(puzzles?.name, "Puzzles Club Business");
assert.equal(puzzles?.currency, "INR");
console.log("  ✓ first account resolves correctly");

// 2. Switch to Seven Labs — must NOT inherit Puzzles Club's identity.
setActiveAccount("9998887776665");
const seven = await fetchAccountInfo();
assert.equal(seven?.id, "9998887776665");
assert.equal(seven?.name, "Seven Labs", "name must not come from the previous account");
assert.equal(seven?.currency, "USD", "CURRENCY must not leak across accounts");
assert.equal(seven?.timezone, "America/New_York", "timezone must not leak across accounts");
console.log("  ✓ switching accounts returns the right name, currency and timezone");

// 3. Currency helper (used to format every metric) follows the active account.
assert.equal(await accountCurrency(), "USD");
setActiveAccount("1036948902205514");
assert.equal(await accountCurrency(), "INR");
console.log("  ✓ accountCurrency() tracks the active account");

// 4. Caching still works — each account fetched once, not on every call.
const before = fetched.length;
await fetchAccountInfo();
await fetchAccountInfo();
assert.equal(fetched.length, before, "repeat reads are served from the per-account cache");
assert.deepEqual(fetched, ["1036948902205514", "9998887776665"], "one Graph call per account");
console.log("  ✓ per-account caching still avoids repeat Graph calls");

console.log("\n4 passed");
